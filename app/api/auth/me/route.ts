import { validateRequest } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const { user, session } = await validateRequest();

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      trialEndsAt: user.trialEndsAt,
      subscriptionEndsAt: user.subscriptionEndsAt,
      isDemo: user.isDemo,
      demoExpiresAt: user.demoExpiresAt,
    },
    session: session ? { id: session.id, expiresAt: session.expiresAt } : null,
  });
}