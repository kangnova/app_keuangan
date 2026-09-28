// Semua nilai uang di database = integer rupiah.
// Helper ini satu-satunya tempat formatting rupiah, biar konsisten di semua UI.

const formatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/** Format integer rupiah, cth: 15000 -> "Rp 15.000" */
export function formatRupiah(amount: number): string {
  return formatter.format(amount).replace(/\s/g, " ");
}

/** Format ringkas untuk chart/kartu, cth: 1250000 -> "Rp 1,25 jt" */
export function formatRupiahShort(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  if (abs >= 1_000) return `Rp ${Math.round(amount / 1_000)} rb`;
  return formatRupiah(amount);
}
