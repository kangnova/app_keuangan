import { db } from "@/lib/db";
import { getDebtRemaining } from "@/lib/balance";
import { handle, ok, notFound, badRequest, fail, parseBody } from "@/lib/api";
import { debtActionSchema } from "@/lib/validators";
import { formatRupiah } from "@/lib/format";
import { getUserIdFromRequest } from "@/lib/api-auth";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const userId = await getUserIdFromRequest(req as any);
    if (!userId) return fail(401, "Unauthorized");

    const { id } = await params;
    const debt = await db.debt.findFirst({ where: { id, userId } });
    if (!debt) return notFound("Hutang");

    const input = await parseBody(req, debtActionSchema);
    const remaining = await getDebtRemaining(id, userId);
    if (remaining === null) return notFound("Hutang");
    if (remaining <= 0) return badRequest("Hutang ini sudah lunas");
    if (input.amount > remaining) {
      return badRequest(`Pembayaran melebihi sisa pokok (sisa: ${formatRupiah(remaining)})`);
    }

    const accountId = input.accountId ?? debt.accountId;
    const account = await db.account.findFirst({ where: { id: accountId, userId } });
    if (!account) return badRequest("Akun pembayaran tidak ditemukan");

    const willBeSettled = remaining - input.amount === 0;
    const [transaction] = await db.$transaction([
      db.transaction.create({
        data: {
          type: "DEBT_PAYMENT",
          amount: input.amount,
          date: input.date ? new Date(`${input.date}T00:00:00`) : new Date(),
          note: input.note ?? `Cicilan ${debt.name}`,
          accountId,
          debtId: id,
          source: "MANUAL",
          userId,
        },
        include: { account: true, debt: true },
      }),
      db.debt.update({
        where: { id },
        data: { paidAmount: { increment: input.amount }, status: willBeSettled ? "SETTLED" : "ACTIVE" },
      }),
    ]);
    return ok({ transaction, remaining: remaining - input.amount, settled: willBeSettled }, { status: 201 });
  });
}
