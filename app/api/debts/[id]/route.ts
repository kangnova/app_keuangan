import { db } from "@/lib/db";
import { handle, ok, notFound, fail, parseBody } from "@/lib/api";
import { debtUpdateSchema } from "@/lib/validators";
import { getUserIdFromRequest } from "@/lib/api-auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const userId = await getUserIdFromRequest(req as any);
    if (!userId) return fail(401, "Unauthorized");

    const { id } = await params;
    const existing = await db.debt.findFirst({ where: { id, userId } });
    if (!existing) return notFound("Hutang");

    const input = await parseBody(req, debtUpdateSchema);
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.creditorName !== undefined) data.creditorName = input.creditorName;
    if (input.initialAmount !== undefined) data.initialAmount = input.initialAmount;
    if (input.dueDate !== undefined)
      data.dueDate = input.dueDate ? new Date(`${input.dueDate}T00:00:00`) : null;
    if (input.interestInfo !== undefined) data.interestInfo = input.interestInfo;
    if (input.accountId !== undefined) data.accountId = input.accountId;
    if (input.note !== undefined) data.note = input.note;
    if (input.status !== undefined) data.status = input.status;

    const debt = await db.debt.update({ where: { id }, data });
    return ok(debt);
  });
}

export async function DELETE(req: Request, { params }: Ctx) {
  return handle(async () => {
    const userId = await getUserIdFromRequest(req as any);
    if (!userId) return fail(401, "Unauthorized");

    const { id } = await params;
    const existing = await db.debt.findFirst({ where: { id, userId } });
    if (!existing) return notFound("Hutang");

    const txCount = await db.transaction.count({ where: { debtId: id, userId } });
    if (txCount > 0) {
      return fail(409, "Hutang ini sudah punya riwayat pembayaran/pencairan, tidak bisa dihapus.");
    }
    await db.debt.delete({ where: { id } });
    return ok({ deleted: id });
  });
}