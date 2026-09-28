// Helper tanggal — aman dipakai di client & server.
// Konvensi: tanggal transaksi disimpan sebagai Date lokal (tengah malam),
// string hari berformat "YYYY-MM-DD".

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dayStringToDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Awal & akhir (eksklusif) bulan "YYYY-MM" dalam Date lokal. */
export function monthRange(ym: string): { start: Date; end: Date } {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, 1);
  const end = new Date(y, m ?? 1, 1);
  return { start, end };
}

export function currentMonthKey(d = new Date()): string {
  return toISODate(d).slice(0, 7);
}

/** "2026-09" -> "September 2026" */
export function monthLabel(ym: string): string {
  const { start } = monthRange(ym);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(start);
}

/** Label tanggal: "Hari ini" / "Kemarin" / "Sen, 28 Sep" */
export function dayLabel(d: Date, today = new Date()): string {
  const a = toISODate(d);
  const b = toISODate(today);
  if (a === b) return "Hari ini";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (a === toISODate(yesterday)) return "Kemarin";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

export function formatTanggal(d: Date, withTime = false): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}
