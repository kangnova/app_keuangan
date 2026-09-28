import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { lucia } from "@/lib/auth";

const PUBLIC_PATHS = ["/", "/login", "/register", "/demo", "/subscribe", "/api/auth", "/api/payments/webhook"];

const PROTECTED_PATHS = ["/settings", "/scan", "/reports", "/accounts", "/categories", "/debts", "/transactions"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const sessionId = lucia.readSessionCookie(request.headers.get("cookie") || "");

  if (!sessionId) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { session, user } = await lucia.validateSession(sessionId);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("Set-Cookie", lucia.createBlankSessionCookie().serialize());
    return response;
  }

  if (session.fresh) {
    const response = NextResponse.next();
    response.headers.set("Set-Cookie", lucia.createSessionCookie(session.id).serialize());
    return response;
  }

  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

  if (isProtected) {
    const isTrial = user.plan === "TRIAL" && user.trialEndsAt && new Date(user.trialEndsAt) > new Date();
    const isSubscribed = user.plan === "PRO" && user.subscriptionEndsAt && new Date(user.subscriptionEndsAt) > new Date();
    const isDemo = user.isDemo && user.demoExpiresAt && new Date(user.demoExpiresAt) > new Date();

    if (!isTrial && !isSubscribed && !isDemo) {
      const subscribeUrl = new URL("/subscribe", request.url);
      subscribeUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(subscribeUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};