import { convertDemoToRealUser, lucia } from "@/lib/auth";
import { db } from "@/lib/db";
import { hash } from "argon2";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { demoUserId, email, password, name } = await request.json();

    if (!demoUserId || !email || !password || !name) {
      return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Kata sandi minimal 8 karakter" }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }

    const demoUser = await db.user.findUnique({ where: { id: demoUserId } });
    if (!demoUser || !demoUser.isDemo) {
      return NextResponse.json({ error: "User demo tidak valid" }, { status: 400 });
    }

    const passwordHash = await hash(password, {
      type: "argon2id",
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const user = await convertDemoToRealUser(demoUserId, email, passwordHash, name);
    await db.user.update({
      where: { id: user.id },
      data: { trialEndsAt },
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
        trialEndsAt: user.trialEndsAt,
      },
    });

    response.headers.set("Set-Cookie", sessionCookie.serialize());

    return response;
  } catch (error) {
    console.error("Convert demo error:", error);
    return NextResponse.json({ error: "Gagal mengubah akun demo" }, { status: 500 });
  }
}