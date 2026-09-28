import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const { user } = await validateRequest();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const isTrial = user.plan === "TRIAL" && user.trialEndsAt && new Date(user.trialEndsAt) > now;
  const isSubscribed = user.plan === "PRO" && user.subscriptionEndsAt && new Date(user.subscriptionEndsAt) > now;
  const isDemo = user.isDemo && user.demoExpiresAt && new Date(user.demoExpiresAt) > now;

  let status: "trial" | "pro" | "demo" | "expired" = "expired";
  let expiresAt: Date | null = null;

  if (isTrial) {
    status = "trial";
    expiresAt = user.trialEndsAt;
  } else if (isSubscribed) {
    status = "pro";
    expiresAt = user.subscriptionEndsAt;
  } else if (isDemo) {
    status = "demo";
    expiresAt = user.demoExpiresAt;
  }

  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return NextResponse.json({
    plan: user.plan,
    status,
    expiresAt,
    daysLeft: Math.max(0, daysLeft),
    isDemo: user.isDemo,
    trialEndsAt: user.trialEndsAt,
    subscriptionEndsAt: user.subscriptionEndsAt,
    demoExpiresAt: user.demoExpiresAt,
  });
}