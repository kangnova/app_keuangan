"use client";

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...init,
  });
  let json: { ok?: boolean; data?: T; error?: string } = {};
  try {
    json = await res.json();
  } catch {
    /* response bukan JSON */
  }
  if (!res.ok || !json.ok) throw new Error(json.error ?? "Terjadi kesalahan jaringan");
  return json.data as T;
}
