import { db } from "@/lib/db";
import { handle, ok, notFound, badRequest, fail, parseBody } from "@/lib/api";
import { scanConfirmSchema } from "@/lib/validators";
import { formatRupiah } from "@/lib/format";
import { getUserIdFromRequest } from "@/lib/api-auth";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const userId = await getUserIdFromRequest(req as any);
    if (!userId) return fail(401, "Unauthorized");

    const { id } = await params;
    // Cek kepemilikan scan — cegah IDOR (user lain tidak bisa konfirmasi scan orang lain)
    const scan = await db.receiptScan.findFirst({ where: { id, userId } });
    if (!scan) return notFound("Scan");
    if (scan.status !== "PENDING") {
      return fail(409, `Scan ini sudah diproses (status: ${scan.status})`);
    }

    const input = await parseBody(req, scanConfirmSchema);
    const account = await db.account.findFirst({ where: { id: input.accountId, userId } });
    if (!account) return badRequest("Akun sumber tidak ditemukan");

    const parsed = JSON.parse(scan.parsedJson) as { total: number; merchant: string; date: string | null };
    if (!parsed.total || parsed.total <= 0) return badRequest("Total struk tidak valid");

    // Kategori opsional; kalau dipilih harus EXPENSE
    let categoryId: string | null = input.categoryId ?? null;
    if (categoryId) {
      const cat = await db.category.findFirst({ where: { id: categoryId, userId } });
      if (!cat) return badRequest("Kategori tidak ditemukan");
      if (cat.type !== "EXPENSE") return badRequest("Pilih kategori pengeluaran");
    }

    const dateStr = input.date ?? parsed.date; // tanggal dari struk, bisa dioverride
    const txDate = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();

    const [transaction] = await db.$transaction([
      db.transaction.create({
        data: {
          type: "EXPENSE",
          amount: parsed.total,
          date: txDate,
          note: input.note ?? `${parsed.merchant} (struk)`,
          accountId: input.accountId,
          categoryId,
          source: "AI_SCAN",
          userId,
          receipt: { connect: { id: scan.id } },
        },
        include: { category: true, account: true },
      }),
      db.receiptScan.update({ where: { id }, data: { status: "APPROVED" } }),
    ]);

    return ok({ transaction, message: `Pengeluaran ${formatRupiah(parsed.total)} tersimpan` }, { status: 201 });
  });
}
