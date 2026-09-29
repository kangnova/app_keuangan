"use client";

import { useLanguage } from "@/lib/i18n";
import { Header } from "@/components/layout/header";
import { QuickActions } from "@/components/quick-actions";
import { formatRupiah } from "@/lib/format";
import { formatTanggal } from "@/lib/datetime";
import { getIcon } from "@/lib/icons";
import type { AccountRow, CategoryRow } from "@/lib/types";
import {
  ChevronRight,
  Scale,
  Tags,
  ScanLine,
  BarChart3,
  Settings,
} from "lucide-react";

interface RecentTxItem {
  id: string;
  type: string;
  amount: number;
  date: string; // ISO string
  note: string | null;
  category: { id: string; name: string; icon: string | null; color: string | null } | null;
  account: { id: string; name: string; color: string | null };
  toAccount: { id: string; name: string; color: string | null } | null;
  debt: { id: string; name: string } | null;
}

interface DashboardClientProps {
  accounts: AccountRow[];
  categories: CategoryRow[];
  total: number;
  monthIncome: number;
  monthExpense: number;
  totalDebt: number;
  debtCount: number;
  recent: RecentTxItem[];
  userRole: string;
}

export function DashboardClient({
  accounts,
  categories,
  total,
  monthIncome,
  monthExpense,
  totalDebt,
  debtCount,
  recent,
  userRole,
}: DashboardClientProps) {
  const { t, language } = useLanguage();
  const now = new Date();

  return (
    <div className="flex flex-col gap-4">
      <Header />
      <main className="flex-1 px-4 pb-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{t.common.appName} 💰</h1>
            <p className="text-xs text-muted">{formatTanggal(now, false, language)}</p>
          </div>
          <a
            href="/categories"
            className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-muted shadow-sm hover:text-foreground"
          >
            <Tags className="size-3.5" /> {t.categories.title}
          </a>
        </header>

        {/* Hero balance */}
        <a
          href="/accounts"
          className="mt-3 block rounded-2xl bg-gradient-to-br from-brand to-emerald-600 p-5 text-white shadow-lg shadow-brand/20 transition active:scale-[0.99]"
        >
          <p className="text-xs opacity-80">{t.dashboard.combinedBalance}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{formatRupiah(total)}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {accounts.map((a) => (
              <span
                key={a.id}
                className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium backdrop-blur"
              >
                {a.name}: {formatRupiah(a.balance ?? 0)}
              </span>
            ))}
            {accounts.length === 0 && (
              <span className="text-[11px] opacity-80">
                {language === "en" ? "Tap to add accounts →" : "Tap untuk tambah akun →"}
              </span>
            )}
          </div>
        </a>

        {/* Month summary */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-card p-3.5 shadow-sm">
            <p className="text-[11px] text-muted">{t.dashboard.incomeThisMonth}</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatRupiah(monthIncome)}
            </p>
          </div>
          <div className="rounded-xl bg-card p-3.5 shadow-sm">
            <p className="text-[11px] text-muted">{t.dashboard.expenseThisMonth}</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
              {formatRupiah(monthExpense)}
            </p>
          </div>
        </div>

        {/* Debt warning */}
        {totalDebt > 0 && (
          <a
            href="/debts"
            className="mt-3 flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5 transition active:scale-[0.99]"
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
              <Scale className="size-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted">
                {language === "en"
                  ? `Remaining debt (${debtCount} active)`
                  : `Sisa hutang (${debtCount} berjalan)`}
              </p>
              <p className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
                {formatRupiah(totalDebt)}
              </p>
            </div>
            <ChevronRight className="size-4 text-muted" />
          </a>
        )}

        <div className="mt-3">
          <QuickActions accounts={accounts} categories={categories} />
        </div>

        {/* Recent transactions */}
        <section className="mt-4">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold">{t.dashboard.recentTransactions}</h2>
            <a href="/transactions" className="flex items-center text-xs font-medium text-brand">
              {t.dashboard.viewAll} <ChevronRight className="size-3.5" />
            </a>
          </div>
          {recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-5 text-center text-xs text-muted">
              {t.dashboard.noTransactionsYet}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recent.map((tx) => {
                const Icon = getIcon(tx.category?.icon ?? null);
                const color = tx.category?.color ?? tx.account.color ?? "#94a3b8";
                const isPlus = tx.type === "INCOME" || tx.type === "DEBT_DISBURSEMENT";
                const title =
                  tx.note ||
                  tx.category?.name ||
                  (tx.type === "TRANSFER"
                    ? `${language === "en" ? "Transfer to" : "Transfer ke"} ${tx.toAccount?.name}`
                    : null) ||
                  tx.debt?.name ||
                  (tx.type === "INCOME"
                    ? t.dashboard.income
                    : tx.type === "DEBT_PAYMENT"
                    ? t.debts.payDebt
                    : t.dashboard.expense);

                return (
                  <div key={tx.id} className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm">
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{title}</p>
                      <p className="text-[11px] text-muted">
                        {formatTanggal(new Date(tx.date), false, language)} · {tx.account.name}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        isPlus
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {isPlus ? "+" : "−"}
                      {formatRupiah(tx.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Action shortcuts */}
        <div className="mt-4 grid grid-cols-2 gap-2 pb-2">
          <a
            href="/scan"
            className="flex items-center gap-2.5 rounded-xl bg-card p-3.5 shadow-sm transition active:scale-[0.99] hover:border-brand"
          >
            <ScanLine className="size-5 text-brand" />
            <div>
              <p className="text-sm font-semibold">{t.scan.title}</p>
              <p className="text-[11px] text-muted">
                {language === "en" ? "AI Receipt OCR" : "AI baca nota"}
              </p>
            </div>
          </a>
          <a
            href="/reports"
            className="flex items-center gap-2.5 rounded-xl bg-card p-3.5 shadow-sm transition active:scale-[0.99] hover:border-brand"
          >
            <BarChart3 className="size-5 text-brand" />
            <div>
              <p className="text-sm font-semibold">{t.reports.title}</p>
              <p className="text-[11px] text-muted">
                {language === "en" ? "Daily–Yearly" : "Harian–tahunan"}
              </p>
            </div>
          </a>
        </div>

        {userRole === "ADMIN" && (
          <a
            href="/settings"
            className="mt-2 flex items-center gap-2.5 rounded-xl bg-card px-3.5 py-3 shadow-sm transition active:scale-[0.99]"
          >
            <Settings className="size-5 text-brand" />
            <div className="flex-1">
              <p className="text-sm font-semibold">{t.settings.title}</p>
              <p className="text-[11px] text-muted">
                {language === "en" ? "AI Model & Demo Mode" : "Model AI & mode demo"}
              </p>
            </div>
            <ChevronRight className="size-4 text-muted" />
          </a>
        )}
      </main>
    </div>
  );
}
