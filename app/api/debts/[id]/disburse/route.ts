import { db } from "@/lib/db";
import { handle, ok, notFound, badRequest, parseBody } from "@/lib/api";
import { debtActionSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const debt = await db.debt.findUnique({ where: { id } });
    if (!debt) return notFound("Hutang");

    const input = await parseBody(req, debtActionSchema);
    const accountId = input.accountId ?? debt.accountId;
    const account = await db.account.findUnique({ where: { id: accountId } });
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
        },
        include: { account: true, debt: true },
      }),
      // Hutang yang tadinya lunas bisa aktif lagi kalau dicairkan ulang
      db.debt.update({ where: { id }, data: { status: "ACTIVE" } }),
    ]);
    return ok({ transaction }, { status: 201 });
  });
}
