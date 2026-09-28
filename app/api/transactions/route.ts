import { db } from "@/lib/db";
import { handle, ok, badRequest, parseBody } from "@/lib/api";
import { transactionCreateSchema, noteRequiredError } from "@/lib/validators";
import { currentMonthKey, monthRange } from "@/lib/datetime";

export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const month = url.searchParams.get("month") ?? currentMonthKey();
    if (!/^\d{4}-\d{2}$/.test(month)) return badRequest("Format bulan harus YYYY-MM");
    const type = url.searchParams.get("type");
    const accountId = url.searchParams.get("accountId");
    const categoryId = url.searchParams.get("categoryId");

    const { start, end } = monthRange(month);
    const transactions = await db.transaction.findMany({
      where: {
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
    const input = await parseBody(req, transactionCreateSchema);
    const [account, toAccount, category] = await Promise.all([
      db.account.findUnique({ where: { id: input.accountId } }),
      input.toAccountId ? db.account.findUnique({ where: { id: input.toAccountId } }) : null,
      input.categoryId ? db.category.findUnique({ where: { id: input.categoryId } }) : null,
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
      },
      include: { category: true, account: true, toAccount: true },
    });
    return ok(transaction, { status: 201 });
  });
}
