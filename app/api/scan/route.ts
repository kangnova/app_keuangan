import { db } from "@/lib/db";
import { handle, ok, badRequest, fail } from "@/lib/api";
import { parseReceipt, receiptWarnings } from "@/lib/ai";

export const maxDuration = 120;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB setelah kompres client

export async function POST(req: Request) {
  return handle(async () => {
    if (process.env.SCAN_MOCK_MODE !== "1" && !process.env.SUMOPOD_API_KEY) {
      return fail(503, "Fitur scan belum dikonfigurasi: isi SUMOPOD_API_KEY di .env (dashboard Sumopod), atau set SCAN_MOCK_MODE=1 untuk demo.");
    }

    let body: { image?: unknown };
    try {
      body = await req.json();
    } catch {
      return badRequest("Body JSON tidak valid");
    }
    const image = body.image;
    if (typeof image !== "string" || !image.startsWith("data:image/")) {
      return badRequest("Kirim foto struk sebagai dataURL (data:image/...)");
    }
    // ~ 1 char = 1 byte untuk base64 dataURL
    if (image.length > MAX_IMAGE_BYTES) {
      return badRequest("Foto terlalu besar (maks 4MB setelah kompres)");
    }

    let parsed;
    let mock = false;
    try {
      const result = await parseReceipt(image);
      parsed = result.parsed;
      mock = result.mock;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal membaca struk";
      return fail(422, `AI gagal membaca struk: ${msg}`);
    }

    const scan = await db.receiptScan.create({
      data: {
        status: "PENDING",
        merchant: parsed.merchant,
        parsedJson: JSON.stringify(parsed),
        imageData: image,
      },
    });

    return ok(
      {
        scan: { id: scan.id, status: scan.status, createdAt: scan.createdAt, merchant: scan.merchant },
        parsed,
        warnings: receiptWarnings(parsed),
        mock,
      },
      { status: 201 },
    );
  });
}

export async function GET() {
  return handle(async () => {
    const scans = await db.receiptScan.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        merchant: true,
        parsedJson: true,
        transactionId: true,
        createdAt: true,
      },
    });
    const mapped = scans.map((s) => ({
      ...s,
      parsed: s.parsedJson ? JSON.parse(s.parsedJson) : null,
      total: s.parsedJson ? (JSON.parse(s.parsedJson).total ?? 0) : 0,
    }));
    return ok({ scans: mapped });
  });
}
