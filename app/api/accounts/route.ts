import { db } from "@/lib/db";
import { getAccountBalances } from "@/lib/balance";
import { handle, ok, parseBody } from "@/lib/api";
import { accountCreateSchema } from "@/lib/validators";

export async function GET() {
  return handle(async () => {
    const [accounts, balances] = await Promise.all([
      db.account.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "asc" }] }),
      getAccountBalances(),
    ]);
    const withBalance = accounts.map((a) => ({ ...a, balance: balances.get(a.id) ?? 0 }));
    const total = withBalance.filter((a) => a.isActive).reduce((s, a) => s + a.balance, 0);
    return ok({ accounts: withBalance, total });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const input = await parseBody(req, accountCreateSchema);
    const account = await db.account.create({ data: input });
    return ok(account, { status: 201 });
  });
}
