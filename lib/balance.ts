import { db } from "./db";

// Saldo TIDAK pernah disimpan — selalu dihitung dari transaksi:
//   saldo = initialBalance + Σ(income, disbursement) − Σ(expense, payment)
//           + Σ(transfer masuk) − Σ(transfer keluar)

export async function getAccountBalances(userId: string): Promise<Map<string, number>> {
  const [plusRows, minusRows, transferOutRows, transferInRows, accounts] = await Promise.all([
    db.transaction.groupBy({
      by: ["accountId"],
      _sum: { amount: true },
      where: { userId, type: { in: ["INCOME", "DEBT_DISBURSEMENT"] } },
    }),
    db.transaction.groupBy({
      by: ["accountId"],
      _sum: { amount: true },
      where: { userId, type: { in: ["EXPENSE", "DEBT_PAYMENT"] } },
    }),
    db.transaction.groupBy({ by: ["accountId"], _sum: { amount: true }, where: { userId, type: "TRANSFER" } }),
    db.transaction.groupBy({
      by: ["toAccountId"],
      _sum: { amount: true },
      where: { userId, type: "TRANSFER", toAccountId: { not: null } },
    }),
    db.account.findMany({ where: { userId }, select: { id: true, initialBalance: true } }),
  ]);

  const map = new Map<string, number>();
  for (const a of accounts) map.set(a.id, a.initialBalance);
  for (const r of plusRows) map.set(r.accountId, (map.get(r.accountId) ?? 0) + (r._sum.amount ?? 0));
  for (const r of transferInRows)
    map.set(r.toAccountId!, (map.get(r.toAccountId!) ?? 0) + (r._sum.amount ?? 0));
  for (const r of minusRows) map.set(r.accountId, (map.get(r.accountId) ?? 0) - (r._sum.amount ?? 0));
  for (const r of transferOutRows) map.set(r.accountId, (map.get(r.accountId) ?? 0) - (r._sum.amount ?? 0));
  return map;
}

// Sisa pokok hutang = initialAmount + Σ(pencairan manual) − Σ(pembayaran).
// Pencairan bertanda source "DEBT_OPENING" (uang cair saat hutang dicatat)
// TIDAK dihitung karena pokoknya sudah terwakili oleh initialAmount.
export async function getDebtRemainingMap(userId: string): Promise<Map<string, number>> {
  const [debts, disbursedRows, paidRows] = await Promise.all([
    db.debt.findMany({ where: { userId }, select: { id: true, initialAmount: true } }),
    db.transaction.groupBy({
      by: ["debtId"],
      _sum: { amount: true },
      where: { userId, type: "DEBT_DISBURSEMENT", debtId: { not: null }, source: { not: "DEBT_OPENING" } },
    }),
    db.transaction.groupBy({
      by: ["debtId"],
      _sum: { amount: true },
      where: { userId, type: "DEBT_PAYMENT", debtId: { not: null } },
    }),
  ]);

  const map = new Map<string, number>();
  for (const d of debts) map.set(d.id, d.initialAmount);
  for (const r of disbursedRows) map.set(r.debtId!, (map.get(r.debtId!) ?? 0) + (r._sum.amount ?? 0));
  for (const r of paidRows) map.set(r.debtId!, (map.get(r.debtId!) ?? 0) - (r._sum.amount ?? 0));
  return map;
}

export async function getDebtRemaining(debtId: string, userId: string): Promise<number | null> {
  const map = await getDebtRemainingMap(userId);
  return map.get(debtId) ?? null;
}