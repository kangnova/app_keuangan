import { db } from "@/lib/db";
import { getAccountBalances } from "@/lib/balance";
import { handle, ok, parseBody } from "@/lib/api";
import { accountCreateSchema, accountUpdateSchema } from "@/lib/validators";
import { getUserIdFromRequest } from "@/lib/api-auth";

export async function GET(req: Request) {
  return handle(async () => {
    const userId = await getUserIdFromRequest(req as any);
    if (!userId) return { accounts: [], total: 0 };

    const [accounts, balances] = await Promise.all([
      db.account.findMany({ where: { userId }, orderBy: [{ isActive: "desc" }, { createdAt: "asc" }] }),
      getAccountBalances(userId),
    ]);
    const withBalance = accounts.map((a) => ({ ...a, balance: balances.get(a.id) ?? 0 }));
    const total = withBalance.filter((a) => a.isActive).reduce((s, a) => s + a.balance, 0);
    return ok({ accounts: withBalance, total });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const userId = await getUserIdFromRequest(req as any);
    if (!userId) return fail(401, "Unauthorized");

    const input = await parseBody(req, accountCreateSchema);
    const account = await db.account.create({ data: { ...input, userId } });
    return ok(account, { status: 201 });
  });
}

function fail(status: number, message: string) {
  return { status, message };
}