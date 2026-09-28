import { lucia } from "@/lib/auth";
import { db } from "@/lib/db";
import { argon2id, hash } from "argon2";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Kata sandi minimal 8 karakter" }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }

    const passwordHash = await hash(password, {
      type: argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: "USER",
        plan: "TRIAL",
        trialEndsAt,
      },
    });

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
    console.error("Register error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}