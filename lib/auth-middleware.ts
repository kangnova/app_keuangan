import { NextRequest, NextResponse } from "next/server";
import { validateRequest, lucia } from "@/lib/auth";
import { APP_URL } from "@/lib/app-url";

export async function authMiddleware(
  request: NextRequest,
  options: { requireAuth?: boolean; requireSubscription?: boolean; redirectTo?: string } = {}
) {
  const { requireAuth = true, requireSubscription = false, redirectTo = "/login" } = options;

  const { user, session } = await validateRequest();

  if (requireAuth && !user) {
    const loginUrl = new URL(redirectTo, APP_URL);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && requireSubscription) {
    const isTrial = user.plan === "TRIAL" && user.trialEndsAt && new Date(user.trialEndsAt) > new Date();
    const isSubscribed = user.plan === "PRO" && user.subscriptionEndsAt && new Date(user.subscriptionEndsAt) > new Date();
    const isDemo = user.isDemo && user.demoExpiresAt && new Date(user.demoExpiresAt) > new Date();

    if (!isTrial && !isSubscribed && !isDemo) {
      const subscribeUrl = new URL("/subscribe", APP_URL);
      subscribeUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(subscribeUrl);
    }
  }

  return { user, session };
}

export function getAuthHeaders(userId: string) {
  return {
    "x-user-id": userId,
  };
}

export async function checkSubscription(userId: string) {
  const { db } = await import("@/lib/db");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { hasAccess: false, reason: "user_not_found" };

  const now = new Date();
  const isTrial = user.plan === "TRIAL" && user.trialEndsAt && new Date(user.trialEndsAt) > now;
  const isSubscribed = user.plan === "PRO" && user.subscriptionEndsAt && new Date(user.subscriptionEndsAt) > now;
  const isDemo = user.isDemo && user.demoExpiresAt && new Date(user.demoExpiresAt) > now;

  if (isTrial) return { hasAccess: true, plan: "TRIAL", expiresAt: user.trialEndsAt };
  if (isSubscribed) return { hasAccess: true, plan: "PRO", expiresAt: user.subscriptionEndsAt };
  if (isDemo) return { hasAccess: true, plan: "DEMO", expiresAt: user.demoExpiresAt };

  return { hasAccess: false, reason: "subscription_required" };
}