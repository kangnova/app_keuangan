import { db } from "@/lib/db";
import { getAccountBalances, getDebtRemainingMap } from "@/lib/balance";
import { currentMonthKey, monthRange, formatTanggal } from "@/lib/datetime";
import { formatRupiah } from "@/lib/format";
import { getIcon } from "@/lib/icons";
import { QuickActions } from "@/components/quick-actions";
import { ChevronRight, Scale, Tags, ScanLine, BarChart3, Settings } from "lucide-react";
import { Header } from "@/components/layout/header";
import { validateRequest } from "@/lib/auth";
import { getUserIdFromRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

async function getUserData() {
  const { user } = await validateRequest();
  if (!user) return null;

  const now = new Date();
  const { start, end } = monthRange(currentMonthKey(now));

  const [accounts, balances, debtMap, recent, incomeAgg, expenseAgg, debts] = await Promise.all([
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
    now,
    accounts,
    balances,
    total,
    monthIncome,
    monthExpense,
    totalDebt,
    debtCount,
    recent,
  };
}

export default async function HomePage() {
  const data = await getUserData();

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Duitku 💰</h1>
            <p className="mt-2 text-muted">Kelola keuangan pribadi dengan AI scan struk</p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="/demo" className="rounded-lg bg-amber-500 px-6 py-3 text-white font-medium hover:bg-amber-600 transition">
                Coba Demo 3 Hari Gratis
              </a>
              <a href="/register" className="rounded-lg bg-brand px-6 py-3 text-white font-medium hover:bg-brand/90 transition">
                Daftar & Mulai Trial
              </a>
              <a href="/login" className="rounded-lg border border-line px-6 py-3 font-medium hover:bg-accent transition">
                Masuk
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { user, now, accounts, balances, total, monthIncome, monthExpense, totalDebt, debtCount, recent } = data;

  return (
    <div className="flex flex-col gap-4">
      <Header />
      <main className="flex-1 px-4 pb-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Duitku 💰</h1>
            <p className="text-xs text-muted">{formatTanggal(now)}</p>
          </div>
          <a href="/categories" className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-muted shadow-sm">
            <Tags className="size-3.5" /> Kategori
          </a>
        </header>

        {/* Hero saldo */}
        <a href="/accounts" className="block rounded-2xl bg-gradient-to-br from-brand to-emerald-600 p-5 text-white shadow-lg shadow-brand/20 transition active:scale-[0.99]">
          <p className="text-xs opacity-80">Total uang lo</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{formatRupiah(total)}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {accounts.map((a) => (
              <span key={a.id} className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
                {a.name}: {formatRupiah(balances.get(a.id) ?? 0)}
              </span>
            ))}
            {accounts.length === 0 && <span className="text-[11px] opacity-80">Tap untuk tambah akun →</span>}
          </div>
        </a>

        {/* Ringkasan bulan */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-card p-3.5 shadow-sm">
            <p className="text-[11px] text-muted">Masuk bulan ini</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatRupiah(monthIncome)}
            </p>
          </div>
          <div className="rounded-xl bg-card p-3.5 shadow-sm">
            <p className="text-[11px] text-muted">Keluar bulan ini</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
              {formatRupiah(monthExpense)}
            </p>
          </div>
        </div>

        {/* Hutang */}
        {totalDebt > 0 && (
          <a href="/debts" className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5 transition active:scale-[0.99]">
            <div className="flex size-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
              <Scale className="size-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted">Sisa hutang ({debtCount} berjalan)</p>
              <p className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">{formatRupiah(totalDebt)}</p>
            </div>
            <ChevronRight className="size-4 text-muted" />
          </a>
        )}

        <QuickActions
          accounts={accounts.map((a) => ({ ...a, balance: balances.get(a.id) ?? 0 }))}
          categories={(await db.category.findMany({ where: { userId: user.id }, orderBy: [{ type: "asc" }, { name: "asc" }] })).map((c) => ({
            ...c,
            type: c.type as "INCOME" | "EXPENSE",
          }))}
        />

        {/* Transaksi terakhir */}
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold">Transaksi Terakhir</h2>
            <a href="/transactions" className="flex items-center text-xs font-medium text-brand">
              Lihat semua <ChevronRight className="size-3.5" />
            </a>
          </div>
          {recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-5 text-center text-xs text-muted">
              Belum ada transaksi. Mulai catat lewat tombol di atas 📷
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recent.map((t) => {
                const Icon = getIcon(t.category?.icon ?? null);
                const color = t.category?.color ?? t.account.color ?? "#94a3b8";
                const isPlus = t.type === "INCOME" || t.type === "DEBT_DISBURSEMENT";
                const title =
                  t.note || t.category?.name ||
                  (t.type === "TRANSFER" ? `Transfer ke ${t.toAccount?.name}` : null) ||
                  t.debt?.name ||
                  (t.type === "INCOME" ? "Pemasukan" : t.type === "DEBT_PAYMENT" ? "Cicilan Hutang" : "Pengeluaran");
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}22`, color }}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{title}</p>
                      <p className="text-[11px] text-muted">{formatTanggal(new Date(t.date))} · {t.account.name}</p>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${isPlus ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {isPlus ? "+" : "−"}{formatRupiah(t.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Menu lanjutan */}
        <div className="grid grid-cols-2 gap-2 pb-2">
          <a href="/scan" className="flex items-center gap-2.5 rounded-xl bg-card p-3.5 shadow-sm transition active:scale-[0.99]">
            <ScanLine className="size-5 text-brand" />
            <div>
              <p className="text-sm font-semibold">Scan Struk</p>
              <p className="text-[11px] text-muted">AI baca nota (M4)</p>
            </div>
          </a>
          <a href="/reports" className="flex items-center gap-2.5 rounded-xl bg-card p-3.5 shadow-sm transition active:scale-[0.99]">
            <BarChart3 className="size-5 text-brand" />
            <div>
              <p className="text-sm font-semibold">Laporan</p>
              <p className="text-[11px] text-muted">Harian–tahunan (M3)</p>
            </div>
          </a>
        </div>

        <a
          href="/settings"
          className="flex items-center gap-2.5 rounded-xl bg-card px-3.5 py-3 shadow-sm transition active:scale-[0.99]"
        >
          <Settings className="size-5 text-brand" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Pengaturan</p>
            <p className="text-[11px] text-muted">Model AI & mode demo</p>
          </div>
          <ChevronRight className="size-4 text-muted" />
        </a>
      </main>
    </div>
  );
}