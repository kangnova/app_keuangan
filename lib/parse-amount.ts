// Konversi input nominal bebas -> integer rupiah.
// Menerima: "15000", "15.000", "Rp 15.000", "15,000", "1.250.000", " 15 000 ".
// Rupiah tidak punya desimal, jadi semua pemisah dianggap pemisah ribuan.

export function parseRupiah(input: string | number): number {
  if (typeof input === "number") return Math.trunc(input);
  const digits = input.replace(/\D/g, "");
  if (!digits) return 0;
  return Number.parseInt(digits, 10);
}

/** Format saat user mengetik di input: 1500000 -> "1.500.000" */
export function formatThousand(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}
