import { db } from "@/lib/db";
import { getAccountBalances, getDebtRemainingMap } from "@/lib/balance";
import { currentMonthKey, monthRange } from "@/lib/datetime";
import type { Metadata } from "next";
import { validateRequest } from "@/lib/auth";
import { LandingPageClient } from "@/components/landing-page-client";
import { DashboardClient } from "@/components/dashboard-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

async function getUserData() {
  const { user } = await validateRequest();
  if (!user) return null;

  const now = new Date();
  const { start, end } = monthRange(currentMonthKey(now));

  const [accounts, balances, debtMap, recent, incomeAgg, expenseAgg, debts, categories] = await Promise.all([
    db.account.findMany({ where: { userId: user.id, isActive: true }, orderBy: { createdAt: "asc" } }),
    getAccountBalances(user.id),
    getDebtRemainingMap(user.id),
    db.transaction.findMany({
      take: 5,
      where: { userId: user.id },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        category: true,
        account: { select: { id: true, name: true, color: true } },
        toAccount: { select: { id: true, name: true, color: true } },
        debt: { select: { id: true, name: true } },
      },
    }),
    db.transaction.aggregate({
      _sum: { amount: true },
      where: { userId: user.id, type: "INCOME", date: { gte: start, lt: end } },
    }),
    db.transaction.aggregate({
      _sum: { amount: true },
      where: { userId: user.id, type: "EXPENSE", date: { gte: start, lt: end } },
    }),
    db.debt.findMany({ where: { userId: user.id, status: "ACTIVE" } }),
    db.category.findMany({ where: { userId: user.id }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
  ]);

  const total = accounts.reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);
  const monthIncome = incomeAgg._sum.amount ?? 0;
  const monthExpense = expenseAgg._sum.amount ?? 0;

  let totalDebt = 0;
  let debtCount = 0;
  for (const d of debts) {
    const rem = debtMap.get(d.id) ?? d.initialAmount;
    if (rem > 0) {
      totalDebt += rem;
      debtCount++;
    }
  }

  return {
    user,
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      color: a.color,
      icon: a.icon,
      isActive: a.isActive,
      initialBalance: a.initialBalance,
      type: a.type,
      balance: balances.get(a.id) ?? 0,
    })),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      isPreset: c.isPreset,
      type: c.type as "INCOME" | "EXPENSE",
    })),
    total,
    monthIncome,
    monthExpense,
    totalDebt,
    debtCount,
    recent: recent.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      date: t.date.toISOString(),
      note: t.note,
      category: t.category ? { id: t.category.id, name: t.category.name, icon: t.category.icon, color: t.category.color } : null,
      account: { id: t.account.id, name: t.account.name, color: t.account.color },
      toAccount: t.toAccount ? { id: t.toAccount.id, name: t.toAccount.name, color: t.toAccount.color } : null,
      debt: t.debt ? { id: t.debt.id, name: t.debt.name } : null,
    })),
  };
}

export default async function HomePage() {
  const data = await getUserData();

  if (!data) {
    return <LandingPageClient />;
  }

  return (
    <DashboardClient
      accounts={data.accounts}
      categories={data.categories}
      total={data.total}
      monthIncome={data.monthIncome}
      monthExpense={data.monthExpense}
      totalDebt={data.totalDebt}
      debtCount={data.debtCount}
      recent={data.recent}
      userRole={data.user.role}
    />
  );
}