import { decodeIdToken } from "arctic";
import { google } from "@/lib/oauth";
import { APP_URL } from "@/lib/app-url";
import { db } from "@/lib/db";
import { lucia } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

interface GoogleIdTokenClaims {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("google_oauth_state")?.value;
  const storedCodeVerifier = cookieStore.get("google_code_verifier")?.value;

  if (!code || !state || !storedState || !storedCodeVerifier || state !== storedState) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_oauth_state", APP_URL)
    );
  }

  try {
    const tokens = await google.validateAuthorizationCode(code, storedCodeVerifier);
    const idToken = tokens.idToken();
    const claims = decodeIdToken(idToken) as GoogleIdTokenClaims;

    if (!claims.email) {
      return NextResponse.redirect(
        new URL("/login?error=no_email_provided", APP_URL)
      );
    }

    const googleId = claims.sub;
    const email = claims.email.toLowerCase();
    const name = claims.name || email.split("@")[0];
    const avatarUrl = claims.picture || null;

    // 1. Cari user berdasarkan googleId
    let user = await db.user.findUnique({
      where: { googleId },
    });

    if (!user) {
      // 2. Jika belum ada berdasarkan googleId, cek berdasarkan email
      const existingUserByEmail = await db.user.findUnique({
        where: { email },
      });

      if (existingUserByEmail) {
        // Tautkan akun yang sudah ada dengan Google ID
        user = await db.user.update({
          where: { id: existingUserByEmail.id },
          data: {
            googleId,
            avatarUrl: existingUserByEmail.avatarUrl || avatarUrl,
            name: existingUserByEmail.name || name,
          },
        });
      } else {
        // 3. Buat akun baru via Google
        const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 hari trial
        user = await db.user.create({
          data: {
            email,
            name,
            passwordHash: `oauth_google_${googleId}`,
            googleId,
            avatarUrl,
            role: "USER",
            plan: "TRIAL",
            trialEndsAt,
          },
        });
      }
    }

    // Buat session Lucia
    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

    // Hapus temporary cookies
    cookieStore.delete("google_oauth_state");
    cookieStore.delete("google_code_verifier");

    return NextResponse.redirect(new URL("/", APP_URL));
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", APP_URL)
    );
  }
}
