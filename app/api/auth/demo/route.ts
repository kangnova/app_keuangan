import { createDemoUser, lucia } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { user, session, sessionCookie } = await createDemoUser();

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        isDemo: user.isDemo,
        demoExpiresAt: user.demoExpiresAt,
      },
    });

    response.headers.set("Set-Cookie", sessionCookie.serialize());

    return response;
  } catch (error) {
    console.error("Demo creation error:", error);
    return NextResponse.json({ error: "Gagal membuat sesi demo" }, { status: 500 });
  }
}