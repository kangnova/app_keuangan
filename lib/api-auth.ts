import { lucia } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const sessionId = lucia.readSessionCookie(request.headers.get("cookie") || "");
  if (!sessionId) return null;

  const { session } = await lucia.validateSession(sessionId);
  if (!session) return null;

  return session.userId;
}

export async function getUserFromRequest(request: NextRequest) {
  const sessionId = lucia.readSessionCookie(request.headers.get("cookie") || "");
  if (!sessionId) return null;

  const { session, user } = await lucia.validateSession(sessionId);
  if (!session) return null;

  return user;
}