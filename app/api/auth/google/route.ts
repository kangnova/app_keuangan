import { generateCodeVerifier, generateState } from "arctic";
import { google, isGoogleOAuthConfigured } from "@/lib/oauth";
import { APP_URL } from "@/lib/app-url";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/login?error=google_not_configured", APP_URL)
    );
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const url = google.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "profile",
    "email",
  ]);

  const cookieStore = await cookies();

  cookieStore.set("google_oauth_state", state, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 menit
    sameSite: "lax",
  });

  cookieStore.set("google_code_verifier", codeVerifier, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 menit
    sameSite: "lax",
  });

  return NextResponse.redirect(url);
}
