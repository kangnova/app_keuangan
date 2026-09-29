"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Pencil, Trash2, ScanLine, Scale, ArrowLeftRight, Loader2, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TxForm } from "@/components/tx-form";
import { apiFetch } from "@/lib/client";
import { formatRupiah } from "@/lib/format";
import { currentMonthKey, dayLabel, dayStringToDate, monthLabel } from "@/lib/datetime";
import { getIcon } from "@/lib/icons";
import { useLanguage } from "@/lib/i18n";
import type { AccountRow, CategoryRow, TxRow } from "@/lib/types";

export function TxList({
  accounts,
  categories,
  initialMonth,
}: {
  accounts: AccountRow[];
  categories: CategoryRow[];
  initialMonth?: string;
}) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [month, setMonth] = useState(initialMonth ?? currentMonthKey());
  const [type, setType] = useState("");
  const [accountId, setAccountId] = useState("");
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TxRow | null>(null);

  const typeFilters = [
    { value: "", label: t.transactions.allTypes },
    { value: "EXPENSE", label: t.transactions.expenseTab },
    { value: "INCOME", label: t.transactions.incomeTab },
    { value: "TRANSFER", label: t.transactions.transferTab },
  ] as const;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month });
      if (type) params.set("type", type);
      if (accountId) params.set("accountId", accountId);
      const data = await apiFetch<{ transactions: TxRow[] }>(`/api/transactions?${params}`);
      setRows(data.transactions);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }, [month, type, accountId, t.common.error]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, TxRow[]>();
    for (const txItem of rows) {
      const key = txItem.date.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(txItem);
      map.set(key, arr);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  const monthSummary = useMemo(() => {
    let income = 0, expense = 0;
    for (const txItem of rows) {
      if (txItem.type === "INCOME") income += txItem.amount;
      if (txItem.type === "EXPENSE") expense += txItem.amount;
    }
    return { income, expense };
  }, [rows]);

  async function remove(txItem: TxRow) {
    if (!window.confirm(`${t.transactions.deleteConfirm} (${formatRupiah(txItem.amount)})`)) return;
    try {
      await apiFetch(`/api/transactions/${txItem.id}`, { method: "DELETE" });
      toast.success(t.transactions.deletedSuccess);
      load();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.common.error);
    }
  }

  function shiftMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Navigasi bulan */}
      <div className="flex items-center justify-between rounded-xl bg-card px-2 py-1.5 shadow-sm">
        <button onClick={() => shiftMonth(-1)} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Previous month">
          <ArrowLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold">{monthLabel(month, language)}</span>
        <button onClick={() => shiftMonth(1)} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Next month">
          <ArrowRight className="size-4" />
        </button>
      </div>

      {/* Ringkasan bulan */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-card p-3 shadow-sm">
          <p className="text-[11px] text-muted">{t.dashboard.incomeThisMonth}</p>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {formatRupiah(monthSummary.income)}
          </p>
        </div>
        <div className="rounded-xl bg-card p-3 shadow-sm">
          <p className="text-[11px] text-muted">{t.dashboard.expenseThisMonth}</p>
          <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
            {formatRupiah(monthSummary.expense)}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {typeFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setType(f.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              type === f.value ? "bg-brand text-white" : "bg-card text-muted shadow-sm"
            }`}
          >
            {f.label}
          </button>
        ))}
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="shrink-0 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-muted shadow-sm outline-none"
        >
          <option value="">{t.transactions.filterByAccount}</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-muted" />
        </div>
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title={t.transactions.noTransactionsFound}
          subtitle={t.dashboard.startFirstTx}
        />
      ) : (
        grouped.map(([day, items]) => {
          const dayExpense = items.filter((item) => item.type === "EXPENSE").reduce((s, item) => s + item.amount, 0);
          return (
            <div key={day} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between px-1">
                <span className="text-xs font-semibold">{dayLabel(dayStringToDate(day), undefined, language)}</span>
                {dayExpense > 0 && (
                  <span className="text-[11px] text-muted">
                    {t.dashboard.expense}: <b className="text-rose-600 dark:text-rose-400">{formatRupiah(dayExpense)}</b>
                  </span>
                )}
              </div>
              {items.map((item) => (
                <TxRowCard
                  key={item.id}
                  tx={item}
                  lang={language}
                  onEdit={() => {
                    setEditing(item);
                    setFormOpen(true);
                  }}
                  onDelete={() => remove(item)}
                />
              ))}
            </div>
          );
        })
      )}

      {/* Tombol tambah mengambang */}
      <button
        onClick={() => {
          setEditing(null);
          setFormOpen(true);
        }}
        className="fixed inset-x-0 bottom-24 z-30 mx-auto flex size-12 max-w-md items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/40 transition active:scale-95"
        style={{ width: "3rem" }}
        aria-label={t.transactions.addTransaction}
      >
        <Plus className="size-5" />
      </button>

      <TxForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        accounts={accounts}
        categories={categories}
        mode={editing ? { kind: "edit", tx: editing } : { kind: "create" }}
        onSaved={load}
      />
    </div>
  );
}

function TxRowCard({ tx, lang, onEdit, onDelete }: { tx: TxRow; lang: string; onEdit: () => void; onDelete: () => void }) {
  const Icon = getIcon(tx.category?.icon ?? (tx.type === "TRANSFER" ? "banknote" : null));
  const color = tx.category?.color ?? tx.account.color ?? "#94a3b8";
  const sign = tx.type === "INCOME" || tx.type === "DEBT_DISBURSEMENT" ? "+" : "−";
  const amountTone =
    tx.type === "INCOME" || tx.type === "DEBT_DISBURSEMENT"
      ? "text-emerald-600 dark:text-emerald-400"
      : tx.type === "TRANSFER"
        ? "text-sky-600 dark:text-sky-400"
        : "text-rose-600 dark:text-rose-400";

  const defaultTypeLabel =
    lang === "en"
      ? ({ INCOME: "Income", EXPENSE: "Expense", TRANSFER: "Transfer", DEBT_PAYMENT: "Debt Payment", DEBT_DISBURSEMENT: "Debt Disbursement" }[tx.type] ?? tx.type)
      : ({ INCOME: "Pemasukan", EXPENSE: "Pengeluaran", TRANSFER: "Transfer", DEBT_PAYMENT: "Cicilan Hutang", DEBT_DISBURSEMENT: "Cair Hutang" }[tx.type] ?? tx.type);

  const title =
    tx.note ||
    tx.category?.name ||
    (tx.type === "TRANSFER" ? `${lang === "en" ? "To" : "Ke"} ${tx.toAccount?.name ?? (lang === "en" ? "other account" : "akun lain")}` : null) ||
    tx.debt?.name ||
    defaultTypeLabel;

  const subtitle =
    tx.type === "TRANSFER"
      ? `${tx.account.name} → ${tx.toAccount?.name}`
      : [tx.category?.name ?? tx.debt?.name ?? null, tx.account.name].filter(Boolean).join(" · ");

  return (
    <div className="group flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}22`, color }}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          {title}
          {tx.source === "AI_SCAN" && (
            <Badge tone="blue">
              <ScanLine className="size-3" /> AI
            </Badge>
          )}
          {tx.debt && <Badge tone="amber"><Scale className="size-3" /> {lang === "en" ? "Debt" : "Hutang"}</Badge>}
        </p>
        <p className="truncate text-xs text-muted">{subtitle}</p>
      </div>
      <div className="flex flex-col items-end">
        <span className={`text-sm font-bold tabular-nums ${amountTone}`}>
          {sign}
          {formatRupiah(tx.amount)}
        </span>
        <div className="mt-0.5 flex gap-0.5 opacity-60 transition group-hover:opacity-100">
          <button onClick={onEdit} className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Edit">
            <Pencil className="size-3.5 text-muted" />
          </button>
          <button onClick={onDelete} className="rounded-md p-1 hover:bg-rose-500/10" aria-label="Delete">
            <Trash2 className="size-3.5 text-rose-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
