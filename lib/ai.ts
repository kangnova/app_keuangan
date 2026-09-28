import OpenAI from "openai";
import { z } from "zod";
import { getScanVisionModel, isScanMockMode } from "@/lib/settings";

// ===== Skema hasil parse struk =====
export const receiptItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  qty: z.coerce.number().int().min(1),
  price: z.coerce.number().int().min(0),
});
export type ReceiptItem = z.infer<typeof receiptItemSchema>;

export const receiptParsedSchema = z.object({
  merchant: z.string().trim().min(1).max(80),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal harus YYYY-MM-DD")
    .nullable()
    .transform((v) => v ?? null),
  items: z.array(receiptItemSchema).max(60).default([]),
  subtotal: z.coerce.number().int().min(0),
  discount: z.coerce.number().int().min(0).default(0),
  tax: z.coerce.number().int().min(0).default(0),
  service: z.coerce.number().int().min(0).default(0),
  total: z.coerce.number().int().positive(),
  payment_method: z.string().trim().max(40).nullish().transform((v) => v ?? null),
  category_suggestion: z.string().trim().max(40).nullish().transform((v) => v ?? null),
});
export type ReceiptParsed = z.infer<typeof receiptParsedSchema>;

/** Warning konsistensi angka untuk ditampilkan di UI review. */
export function receiptWarnings(r: ReceiptParsed): string[] {
  const w: string[] = [];
  const itemsSum = r.items.reduce((s, i) => s + i.qty * i.price, 0);
  const expected = r.subtotal + r.tax + r.service - r.discount;
  if (Math.abs(expected - r.total) > Math.max(2, r.total * 0.02)) {
    w.push(
      `Angka tidak konsisten: subtotal+tax+service−discount (${expected.toLocaleString("id-ID")}) ≠ total (${r.total.toLocaleString("id-ID")}).`,
    );
  }
  if (r.items.length > 0 && Math.abs(itemsSum - r.subtotal) > Math.max(2, r.subtotal * 0.05)) {
    w.push(`Jumlah item (${itemsSum.toLocaleString("id-ID")}) ≠ subtotal (${r.subtotal.toLocaleString("id-ID")}).`);
  }
  if (r.total <= 0) w.push("Total tidak boleh 0.");
  return w;
}

// ===== Klien Sumopod (OpenAI-compatible) =====
function getClient(): OpenAI {
  const apiKey = process.env.SUMOPOD_API_KEY;
  if (!apiKey) throw new Error("SUMOPOD_API_KEY belum diisi di .env — ambil dari dashboard Sumopod");
  return new OpenAI({
    apiKey,
    baseURL: process.env.SUMOPOD_BASE_URL ?? "https://ai.sumopod.com/v1",
    timeout: 60_000,
    maxRetries: 1,
  });
}

const SYSTEM_PROMPT = `Kamu adalah mesin pembaca struk belanja Indonesia (Indomaret, Alfamart, Superindo, restoran, warung, kafe, apotek, dll).
Tugasmu: ekstrak informasi dari foto struk dan balas HANYA JSON valid tanpa teks lain, tanpa markdown.

Format JSON yang wajib dipatuhi:
{
  "merchant": "nama toko",
  "date": "YYYY-MM-DD" atau null jika tidak terbaca,
  "items": [{"name": "nama item", "qty": 1, "price": 15000}],
  "subtotal": 0,
  "discount": 0,
  "tax": 0,
  "service": 0,
  "total": 0,
  "payment_method": "cash/qris/debit/kredit" atau null,
  "category_suggestion": "satu kata kategori belanja terbaik (Makan, Transport, Belanja, Kesehatan, Tagihan, Hiburan, Lain)" 
}

Aturan:
- Semua angka rupiah INTEGER tanpa titik/koma (15000, bukan 15.000).
- price = harga satuan; gunakan qty untuk jumlah.
- Jika struk tidak punya pajak/diskon/service, isi 0.
- total = angka TOTAL yang tercetak di struk (yang harus dibayar).
- Abaikan poin/reward/saldo. Jika teks tidak terbaca, tebak paling masuk akal dan tetap isi total.
- Balas JSON murni. Tidak boleh ada teks di luar JSON.`;

/** Panggil vision model untuk mem-parsing foto struk (dataURL base64). */
export async function parseReceiptImage(dataUrl: string): Promise<ReceiptParsed> {
  // Model bisa dioverride dari halaman Pengaturan (DB), fallback ke env/default.
  const { value: model } = await getScanVisionModel();
  const client = getClient();

  const completion = await client.chat.completions.create({
    model,
    max_tokens: 1200,
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Baca struk ini dan balas JSON sesuai format." },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  return parseReceiptText(raw);
}

/** Parse teks hasil AI → objek tervalidasi. Tahan markdown fence & omongan AI. */
export function parseReceiptText(raw: string): ReceiptParsed {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("AI tidak mengembalikan JSON");
  const json = JSON.parse(text.slice(start, end + 1));
  return receiptParsedSchema.parse(json);
}

// ===== Mock mode (dev & smoke test tanpa kredit AI) =====
const MOCK_RECEIPT: ReceiptParsed = {
  merchant: "Indomaret Demo",
  date: new Date().toISOString().slice(0, 10),
  items: [
    { name: "Indomie Goreng", qty: 2, price: 3500 },
    { name: "Teh Kotak 250ml", qty: 1, price: 5000 },
    { name: "Roti Tawar", qty: 1, price: 14500 },
  ],
  subtotal: 26500,
  discount: 0,
  tax: 0,
  service: 0,
  total: 26500,
  payment_method: "cash",
  category_suggestion: "Makan",
};

export async function parseReceipt(dataUrl: string): Promise<{ parsed: ReceiptParsed; mock: boolean }> {
  if (await isScanMockMode()) {
    // Sedikit variasi biar beberapa scan punya total berbeda
    const mock = { ...MOCK_RECEIPT, total: MOCK_RECEIPT.total };
    return { parsed: mock, mock: true };
  }
  const parsed = await parseReceiptImage(dataUrl);
  return { parsed, mock: false };
}
