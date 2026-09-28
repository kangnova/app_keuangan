import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { Prisma } from "@prisma/client";

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(status: number, message: string, extra?: unknown) {
  return NextResponse.json({ ok: false, error: message, details: extra ?? null }, { status });
}

export const badRequest = (msg: string, details?: unknown) => fail(400, msg, details);
export const notFound = (what = "Data") => fail(404, `${what} tidak ditemukan`);

/** Bungkus handler supaya error Zod/Prisma jadi response rapi, bukan 500 mentah. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ZodError) {
      const first = e.issues[0];
      return badRequest(first?.message ?? "Data tidak valid", e.issues);
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return fail(409, "Data dengan nama itu sudah ada");
      if (e.code === "P2025") return notFound();
      if (e.code === "P2003") return badRequest("Data terkait tidak valid (relasi rusak)");
    }
    console.error("[api]", e);
    return fail(500, "Terjadi kesalahan server");
  }
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ZodError([
      { code: "custom", message: "Body JSON tidak valid", path: [] } as never,
    ]);
  }
  return schema.parse(raw);
}
