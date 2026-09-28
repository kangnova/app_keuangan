import { db } from "@/lib/db";
import { getDebtRemainingMap } from "@/lib/balance";
import { handle, ok, badRequest, fail, parseBody } from "@/lib/api";
import { debtCreateSchema } from "@/lib/validators";
import { getUserIdFromRequest } from "@/lib/api-auth";

export async function GET(req: Request) {
  return handle(async () => {
    const userId = await getUserIdFromRequest(req as any);
    if (!userId) return ok({ debts: [], totalRemaining: 0 });

    const [debts, remainingMap] = await Promise.all([
      db.debt.findMany({
        where: { userId },
        include: { account: { select: { id: true, name: true, color: true } } },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      }),
      getDebtRemainingMap(userId),
    ]);

    const paidRows = await db.transaction.groupBy({
      by: ["debtId"],
      _sum: { amount: true },
      where: { userId, type: "DEBT_PAYMENT", debtId: { not: null } },
    });
    const paidMap = new Map(paidRows.map((r) => [r.debtId!, r._sum.amount ?? 0]));

    const withComputed = debts.map((d) => {
      const remaining = remainingMap.get(d.id) ?? d.initialAmount;
      return {
        ...d,
        remaining,
        paidTotal: paidMap.get(d.id) ?? 0,
        status: remaining <= 0 ? "SETTLED" : d.status,
      };
    });
    const totalRemaining = withComputed
      .filter((d) => d.status === "ACTIVE")
      .reduce((s, d) => s + d.remaining, 0);
    return ok({ debts: withComputed, totalRemaining });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const userId = await getUserIdFromRequest(req as any);
    if (!userId) return fail(401, "Unauthorized");

    const input = await parseBody(req, debtCreateSchema);
    const account = await db.account.findFirst({ where: { id: input.accountId, userId } });
    if (!account) return badRequest("Akun terkait tidak ditemukan");

    const debt = await db.$transaction(async (tx) => {
      const created = await tx.debt.create({
        data: {
          name: input.name,
          creditorName: input.creditorName,
          initialAmount: input.initialAmount,
          dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00`) : null,
          interestInfo: input.interestInfo,
          accountId: input.accountId,
          note: input.note,
          userId,
        },
      });
      if (input.moneyReceived) {
        await tx.transaction.create({
          data: {
            type: "DEBT_DISBURSEMENT",
            amount: input.initialAmount,
            date: new Date(),
            note: `Pencairan ${input.name}`,
            accountId: input.accountId,
            debtId: created.id,
            source: "DEBT_OPENING",
            userId,
          },
        });
      }
      return created;
    });
    return ok(debt, { status: 201 });
  });
}
