import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { user } = await validateRequest();

  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Akses ditolak. Khusus Administrator." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.toLowerCase().trim() || "";
  const filter = searchParams.get("filter") || "all"; // all | pro | trial | expired | demo

  const now = new Date();

  // Ambil semua user untuk metrik & daftar
  const allUsers = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      plan: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
      isDemo: true,
      googleId: true,
      avatarUrl: true,
      createdAt: true,
      _count: {
        select: {
          transactions: true,
          receiptScans: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Hitung metrik
  const realUsers = allUsers.filter((u) => !u.isDemo);
  const demoUsers = allUsers.filter((u) => u.isDemo);

  const proUsers = realUsers.filter((u) => {
    return u.plan === "PRO" && u.subscriptionEndsAt && new Date(u.subscriptionEndsAt) > now;
  });

  const trialUsers = realUsers.filter((u) => {
    const isPro = u.plan === "PRO" && u.subscriptionEndsAt && new Date(u.subscriptionEndsAt) > now;
    return !isPro && u.trialEndsAt && new Date(u.trialEndsAt) > now;
  });

  const expiredUsers = realUsers.filter((u) => {
    const isPro = u.plan === "PRO" && u.subscriptionEndsAt && new Date(u.subscriptionEndsAt) > now;
    const isTrial = u.trialEndsAt && new Date(u.trialEndsAt) > now;
    return !isPro && !isTrial;
  });

  const googleUsers = realUsers.filter((u) => Boolean(u.googleId));

  const metrics = {
    totalRealUsers: realUsers.length,
    totalDemoUsers: demoUsers.length,
    totalPro: proUsers.length,
    totalTrial: trialUsers.length,
    totalExpired: expiredUsers.length,
    totalGoogle: googleUsers.length,
  };

  // Filter daftar pengguna berdasarkan status
  let filtered = allUsers.map((u) => {
    const isPro = u.plan === "PRO" && u.subscriptionEndsAt && new Date(u.subscriptionEndsAt) > now;
    const isTrial = !isPro && u.trialEndsAt && new Date(u.trialEndsAt) > now;
    const isExpired = !u.isDemo && !isPro && !isTrial;

    let status: "PRO" | "TRIAL" | "EXPIRED" | "DEMO" = "EXPIRED";
    if (u.isDemo) status = "DEMO";
    else if (isPro) status = "PRO";
    else if (isTrial) status = "TRIAL";

    let daysLeft = 0;
    if (isPro && u.subscriptionEndsAt) {
      daysLeft = Math.max(0, Math.ceil((new Date(u.subscriptionEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    } else if (isTrial && u.trialEndsAt) {
      daysLeft = Math.max(0, Math.ceil((new Date(u.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return {
      ...u,
      calculatedStatus: status,
      daysLeft,
    };
  });

  if (filter === "pro") {
    filtered = filtered.filter((u) => u.calculatedStatus === "PRO");
  } else if (filter === "trial") {
    filtered = filtered.filter((u) => u.calculatedStatus === "TRIAL");
  } else if (filter === "expired") {
    filtered = filtered.filter((u) => u.calculatedStatus === "EXPIRED");
  } else if (filter === "demo") {
    filtered = filtered.filter((u) => u.calculatedStatus === "DEMO");
  } else if (filter === "real") {
    filtered = filtered.filter((u) => !u.isDemo);
  }

  if (search) {
    filtered = filtered.filter((u) => {
      const emailMatch = u.email.toLowerCase().includes(search);
      const nameMatch = u.name?.toLowerCase().includes(search);
      return emailMatch || nameMatch;
    });
  }

  return NextResponse.json({
    metrics,
    users: filtered,
  });
}
