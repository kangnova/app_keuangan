import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user: adminUser } = await validateRequest();

  if (!adminUser || adminUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Akses ditolak. Khusus Administrator." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action, durationMonths, extendDays, newRole } = body;

  const targetUser = await db.user.findUnique({
    where: { id },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  const now = new Date();
  let updateData: Record<string, unknown> = {};

  if (action === "ACTIVATE_PRO") {
    const months = Number(durationMonths) || 1;
    // Jika masih ada masa aktif PRO, tambahkan dari tanggal expired sekarang, jika tidak dari hari ini
    const baseDate = targetUser.subscriptionEndsAt && new Date(targetUser.subscriptionEndsAt) > now
      ? new Date(targetUser.subscriptionEndsAt)
      : new Date();
    baseDate.setMonth(baseDate.getMonth() + months);

    updateData = {
      plan: "PRO",
      subscriptionEndsAt: baseDate,
      isDemo: false,
    };
  } else if (action === "EXTEND_TRIAL") {
    const days = Number(extendDays) || 7;
    const baseDate = targetUser.trialEndsAt && new Date(targetUser.trialEndsAt) > now
      ? new Date(targetUser.trialEndsAt)
      : new Date();
    baseDate.setDate(baseDate.getDate() + days);

    updateData = {
      plan: "TRIAL",
      trialEndsAt: baseDate,
      isDemo: false,
    };
  } else if (action === "SET_FREE") {
    updateData = {
      plan: "FREE",
      subscriptionEndsAt: null,
      trialEndsAt: new Date(now.getTime() - 1000), // Lewat masa trial
    };
  } else if (action === "TOGGLE_ROLE") {
    const role = newRole === "ADMIN" ? "ADMIN" : "USER";
    if (targetUser.id === adminUser.id && role !== "ADMIN") {
      return NextResponse.json({ error: "Anda tidak dapat menghapus hak admin Anda sendiri" }, { status: 400 });
    }
    updateData = { role };
  } else {
    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({
    message: "Berhasil memperbarui data pengguna",
    user: updated,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user: adminUser } = await validateRequest();

  if (!adminUser || adminUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Akses ditolak. Khusus Administrator." }, { status: 403 });
  }

  const { id } = await params;

  if (id === adminUser.id) {
    return NextResponse.json({ error: "Anda tidak dapat menghapus akun Anda sendiri" }, { status: 400 });
  }

  await db.user.delete({
    where: { id },
  });

  return NextResponse.json({ message: "Pengguna berhasil dihapus" });
}
