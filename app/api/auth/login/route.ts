import { lucia } from "@/lib/auth";
import { db } from "@/lib/db";
import { argon2id, verify } from "argon2";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan kata sandi wajib diisi" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });

    if (!user || user.passwordHash === "demo_no_password") {
      return NextResponse.json({ error: "Email atau kata sandi salah" }, { status: 401 });
    }

    const validPassword = await verify(user.passwordHash, password);
    if (!validPassword) {
      return NextResponse.json({ error: "Email atau kata sandi salah" }, { status: 401 });
    }

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        isDemo: user.isDemo,
      },
    });

    response.headers.set("Set-Cookie", sessionCookie.serialize());

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}