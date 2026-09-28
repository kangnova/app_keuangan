import { lucia } from "@/lib/auth";
import { validateRequest } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  const { session } = await validateRequest();

  if (!session) {
    return NextResponse.json({ error: "Tidak ada session aktif" }, { status: 401 });
  }

  await lucia.invalidateSession(session.id);

  const sessionCookie = lucia.createBlankSessionCookie();

  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", sessionCookie.serialize());

  return response;
}