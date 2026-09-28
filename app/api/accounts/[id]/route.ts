import { db } from "@/lib/db";
import { handle, ok, notFound, fail, parseBody } from "@/lib/api";
import { accountUpdateSchema } from "@/lib/validators";
import { getUserIdFromRequest } from "@/lib/api-auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const userId = await getUserIdFromRequest(req as any);
    if (!userId) return fail(401, "Unauthorized");

    const { id } = await params;
    const input = await parseBody(req, accountUpdateSchema);
    const existing = await db.account.findFirst({ where: { id, userId } });
    if (!existing) return notFound("Akun");
    const account = await db.account.update({ where: { id }, data: input });
    return ok(account);
  });
}

export async function DELETE(req: Request, { params }: Ctx) {
  return handle(async () => {
    const userId = await getUserIdFromRequest(req as any);
    if (!userId) return fail(401, "Unauthorized");

    const { id } = await params;
    const existing = await db.account.findFirst({ where: { id, userId } });
    if (!existing) return notFound("Akun");

    const [txCount, transferInCount, debtCount] = await Promise.all([
      db.transaction.count({ where: { accountId: id, userId } }),
      db.transaction.count({ where: { toAccountId: id, userId } }),
      db.debt.count({ where: { accountId: id, userId } }),
    ]);

    if (txCount > 0 || transferInCount > 0 || debtCount > 0) {
      return fail(
        409,
        "Akun masih punya riwayat transaksi/hutang, jadi tidak bisa dihapus. Nonaktifkan saja supaya laporan tetap utuh.",
      );
    }
    await db.account.delete({ where: { id } });
    return ok({ deleted: id });
  });
}