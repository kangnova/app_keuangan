import { db } from "@/lib/db";
import { handle, ok, badRequest, fail } from "@/lib/api";
import { parseReceipt, receiptWarnings } from "@/lib/ai";
import { isScanMockMode } from "@/lib/settings";
import { getUserIdFromRequest } from "@/lib/api-auth";

export const maxDuration = 120;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  return handle(async () => {
    const userId = await getUserIdFromRequest(req as any);
    if (!userId) {
      return fail(401, "Unauthorized");
    }

    if (!(await isScanMockMode()) && !process.env.SUMOPOD_API_KEY) {
      return fail(503, "Fitur scan belum dikonfigurasi: isi SUMOPOD_API_KEY di .env (dashboard Sumopod), atau aktifkan Mode Demo di halaman Pengaturan.");
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
        userId,
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

export async function GET(req: Request) {
  return handle(async () => {
    const userId = await getUserIdFromRequest(req as any);
    if (!userId) {
      return fail(401, "Unauthorized");
    }

    const scans = await db.receiptScan.findMany({
      where: { userId },
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