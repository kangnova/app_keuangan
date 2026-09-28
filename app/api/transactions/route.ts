import { db } from "@/lib/db";
import { handle, ok, badRequest, parseBody } from "@/lib/api";
import { transactionCreateSchema, noteRequiredError } from "@/lib/validators";
import { currentMonthKey, monthRange } from "@/lib/datetime";
import { getUserIdFromRequest } from "@/lib/api-auth";

export async function GET(req: Request) {
  return handle(async () => {
    const userId = await getUserIdFromRequest(req as any);
    if (!userId) return { transactions: [], month: currentMonthKey() };

    const url = new URL(req.url);
    const month = url.searchParams.get("month") ?? currentMonthKey();
    if (!/^\d{4}-\d{2}$/.test(month)) return badRequest("Format bulan harus YYYY-MM");
    const type = url.searchParams.get("type");
    const accountId = url.searchParams.get("accountId");
    const categoryId = url.searchParams.get("categoryId");

    const { start, end } = monthRange(month);
    const transactions = await db.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lt: end },
        ...(type ? { type } : {}),
        ...(accountId ? { accountId } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        category: true,
        account: { select: { id: true, name: true, color: true } },
        toAccount: { select: { id: true, name: true, color: true } },
        debt: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return ok({ transactions, month });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const userId = await getUserIdFromRequest(req as any);
    if (!userId) return fail(401, "Unauthorized");

    const input = await parseBody(req, transactionCreateSchema);
    const [account, toAccount, category] = await Promise.all([
      db.account.findFirst({ where: { id: input.accountId, userId } }),
      input.toAccountId ? db.account.findFirst({ where: { id: input.toAccountId, userId } }) : null,
      input.categoryId ? db.category.findFirst({ where: { id: input.categoryId, userId } }) : null,
    ]);
    if (!account) return badRequest("Akun sumber tidak ditemukan");
    if (input.toAccountId && !toAccount) return badRequest("Akun tujuan tidak ditemukan");
    if (input.categoryId && !category) return badRequest("Kategori tidak ditemukan");
    if (category && category.type === "INCOME" && input.type === "EXPENSE") {
      return badRequest("Kategori pemasukan tidak bisa dipakai untuk pengeluaran");
    }
    if (category && category.type === "EXPENSE" && input.type === "INCOME") {
      return badRequest("Kategori pengeluaran tidak bisa dipakai untuk pemasukan");
    }
    const noteError = noteRequiredError(input.type, category?.name ?? null, input.note);
    if (noteError) return badRequest(noteError);

    const transaction = await db.transaction.create({
      data: {
        type: input.type,
        amount: input.amount,
        date: input.date ? new Date(`${input.date}T00:00:00`) : new Date(),
        note: input.note,
        accountId: input.accountId,
        toAccountId: input.toAccountId,
        categoryId: input.categoryId,
        source: "MANUAL",
        userId,
      },
      include: { category: true, account: true, toAccount: true },
    });
    return ok(transaction, { status: 201 });
  });
}

function fail(status: number, message: string) {
  return { status, message };
}