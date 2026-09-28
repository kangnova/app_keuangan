import { db } from "@/lib/db";
import { handle, ok, notFound, badRequest, parseBody } from "@/lib/api";
import { transactionUpdateSchema, noteRequiredError } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const existing = await db.transaction.findUnique({ where: { id } });
    if (!existing) return notFound("Transaksi");

    const input = await parseBody(req, transactionUpdateSchema);
    const data: Record<string, unknown> = {};
    if (input.amount !== undefined) data.amount = input.amount;
    if (typeof input.date === "string") data.date = new Date(`${input.date}T00:00:00`);
    if (input.note !== undefined) data.note = input.note;
    if (input.accountId !== undefined) data.accountId = input.accountId;
    if (input.toAccountId !== undefined) data.toAccountId = input.toAccountId;
    if (input.categoryId !== undefined) data.categoryId = input.categoryId;

    if (data.toAccountId && existing.type !== "TRANSFER") {
      return badRequest("Akun tujuan hanya untuk transfer");
    }
    if (existing.type === "TRANSFER") {
      const toId = (data.toAccountId as string | null | undefined) ?? existing.toAccountId;
      const fromId = (data.accountId as string | undefined) ?? existing.accountId;
      if (toId && toId === fromId) return badRequest("Akun tujuan tidak boleh sama");
      if (data.categoryId) return badRequest("Transfer tidak pakai kategori");
    }
    if (data.categoryId && (existing.type === "TRANSFER" || existing.type.startsWith("DEBT_"))) {
      return badRequest("Transaksi hutang/transfer tidak pakai kategori");
    }
    // Aturan catatan dicek saat create, atau saat PATCH menyentuh note/kategori
    if (input.note !== undefined || input.categoryId !== undefined) {
      const effCategoryId = (data.categoryId as string | null | undefined) ?? existing.categoryId;
      const effNote = (data.note as string | null | undefined) ?? existing.note;
      let catName: string | null = null;
      if (effCategoryId) {
        const c = await db.category.findUnique({ where: { id: effCategoryId }, select: { name: true } });
        catName = c?.name ?? null;
      }
      const noteError = noteRequiredError(existing.type, catName, effNote);
      if (noteError) return badRequest(noteError);
    }

    const transaction = await db.transaction.update({
      where: { id },
      data,
      include: { category: true, account: true, toAccount: true },
    });
    return ok(transaction);
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const existing = await db.transaction.findUnique({ where: { id } });
    if (!existing) return notFound("Transaksi");
    await db.transaction.delete({ where: { id } });
    return ok({ deleted: id });
  });
}
