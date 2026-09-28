import { db } from "./db";
import { getAccountBalances, getDebtRemainingMap } from "./balance";
import { toISODate } from "./datetime";
import { periodRange, periodLabel, type Period, type CategorySlice, type TrendPoint, type TxItem, type ReportData } from "./periods";

// Server-only: mesin agregasi laporan. Utilitas periode murni ada di lib/periods.ts.
export * from "./periods";

const UNCATEGORIZED = "Tanpa kategori";

function toSlice(
  map: Map<string, { name: string; color: string | null; total: number; count: number }>,
  grand: number,
): CategorySlice[] {
  return [...map.entries()]
    .map(([id, v]) => ({
      id,
      name: v.name,
      color: v.color ?? "#94a3b8",
      total: v.total,
      count: v.count,
      pct: grand > 0 ? Math.round((v.total / grand) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

function toTxItem(t: {
  id: string;
  date: Date;
  type: string;
  amount: number;
  note: string | null;
  category: { name: string } | null;
  toAccount: { name: string } | null;
  account: { name: string };
  debt: { name: string } | null;
}): TxItem {
  return {
    id: t.id,
    date: toISODate(t.date),
    type: t.type,
    amount: t.amount,
    note: t.note,
    categoryName: t.category?.name ?? null,
    categoryName2: t.toAccount?.name ?? null,
    accountName: t.account.name,
    debtName: t.debt?.name ?? null,
  };
}

function dayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function buildReport(userId: string, period: Period, key: string): Promise<ReportData> {
  const { start, end } = periodRange(period, key);

  const txs = await db.transaction.findMany({
    where: { userId, date: { gte: start, lt: end } },
    include: {
      category: { select: { name: true, color: true } },
      account: { select: { id: true, name: true, color: true } },
      toAccount: { select: { id: true, name: true, color: true } },
      debt: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  // ===== Ringkasan =====
  let income = 0, expense = 0, debtPayment = 0, debtDisbursement = 0, transferTotal = 0;
  const activeDays = new Set<string>();
  for (const t of txs) {
    if (t.type === "INCOME") income += t.amount;
    else if (t.type === "EXPENSE") {
      expense += t.amount;
      activeDays.add(toISODate(t.date));
    } else if (t.type === "DEBT_PAYMENT") debtPayment += t.amount;
    else if (t.type === "DEBT_DISBURSEMENT") debtDisbursement += t.amount;
    else if (t.type === "TRANSFER") transferTotal += t.amount;
  }

  // ===== Per kategori =====
  const expMap = new Map<string, { name: string; color: string | null; total: number; count: number }>();
  const incMap = new Map<string, { name: string; color: string | null; total: number; count: number }>();
  for (const t of txs) {
    if (t.type === "EXPENSE") {
      const id = t.categoryId ?? UNCATEGORIZED;
      const cur = expMap.get(id) ?? { name: t.category?.name ?? UNCATEGORIZED, color: t.category?.color ?? null, total: 0, count: 0 };
      cur.total += t.amount;
      cur.count++;
      expMap.set(id, cur);
    } else if (t.type === "INCOME") {
      const id = t.categoryId ?? UNCATEGORIZED;
      const cur = incMap.get(id) ?? { name: t.category?.name ?? UNCATEGORIZED, color: t.category?.color ?? null, total: 0, count: 0 };
      cur.total += t.amount;
      cur.count++;
      incMap.set(id, cur);
    }
  }

  // ===== Tren =====
  const trend: TrendPoint[] = [];
  if (period === "week" || period === "month") {
    const days = Math.round((end.getTime() - start.getTime()) / 864e5);
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * 864e5);
      trend.push({ label: new Intl.DateTimeFormat("id-ID", { day: "numeric" }).format(d), expense: 0, income: 0 });
    }
    for (const t of txs) {
      const diff = Math.round((dayStart(t.date).getTime() - start.getTime()) / 864e5);
      if (diff < 0 || diff >= trend.length) continue;
      if (t.type === "EXPENSE") trend[diff].expense += t.amount;
      if (t.type === "INCOME") trend[diff].income += t.amount;
    }
  } else if (period === "year") {
    const names = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    for (let m = 0; m < 12; m++) trend.push({ label: names[m], expense: 0, income: 0 });
    for (const t of txs) {
      const m = t.date.getMonth();
      if (t.type === "EXPENSE") trend[m].expense += t.amount;
      if (t.type === "INCOME") trend[m].income += t.amount;
    }
  }

  // ===== Top pengeluaran & sumber pemasukan =====
  const topExpenses = txs
    .filter((t) => t.type === "EXPENSE")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)
    .map(toTxItem);
  const incomeItems = txs.filter((t) => t.type === "INCOME").map(toTxItem);

  // ===== Snapshot kondisi =====
  const [accounts, balances, debtMap] = await Promise.all([
    db.account.findMany({ where: { userId, isActive: true }, orderBy: { createdAt: "asc" } }),
    getAccountBalances(userId),
    getDebtRemainingMap(userId),
  ]);
  let accountsTotal = 0;
  const accountRows = accounts.map((a) => {
    const b = balances.get(a.id) ?? 0;
    accountsTotal += b;
    return { id: a.id, name: a.name, type: a.type, balance: b };
  });
  let totalDebt = 0;
  for (const d of await db.debt.findMany({ where: { userId, status: "ACTIVE" } })) {
    const rem = debtMap.get(d.id) ?? d.initialAmount;
    if (rem > 0) totalDebt += rem;
  }

  return {
    period,
    key,
    label: periodLabel(period, key),
    userId,
    summary: {
      income,
      expense,
      net: income - expense,
      avgExpensePerActiveDay: activeDays.size > 0 ? Math.round(expense / activeDays.size) : 0,
      activeDays: activeDays.size,
      txCount: txs.length,
      debtPayment,
      debtDisbursement,
      transferTotal,
    },
    expenseByCategory: toSlice(expMap, expense),
    incomeByCategory: toSlice(incMap, income),
    trend,
    topExpenses,
    incomeItems,
    accounts: accountRows,
    accountsTotal,
    totalDebt,
  };
}