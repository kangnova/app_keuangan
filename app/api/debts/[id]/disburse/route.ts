import { db } from "@/lib/db";
import { handle, ok, notFound, badRequest, fail, parseBody } from "@/lib/api";
import { debtActionSchema } from "@/lib/validators";
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
    const accountId = input.accountId ?? debt.accountId;
    const account = await db.account.findFirst({ where: { id: accountId, userId } });
    if (!account) return badRequest("Akun penerima tidak ditemukan");

    const [transaction] = await db.$transaction([
      db.transaction.create({
        data: {
          type: "DEBT_DISBURSEMENT",
          amount: input.amount,
          date: input.date ? new Date(`${input.date}T00:00:00`) : new Date(),
          note: input.note ?? `Pencairan ${debt.name}`,
          accountId,
          debtId: id,
          source: "MANUAL",
          userId,
        },
        include: { account: true, debt: true },
      }),
      db.debt.update({ where: { id }, data: { status: "ACTIVE" } }),
    ]);
    return ok({ transaction }, { status: 201 });
  });
}
