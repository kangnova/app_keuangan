"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, ArrowRight, Loader2, FileSpreadsheet, FileText, Printer, Scale, Wallet,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/client";
import { formatRupiah, formatRupiahShort } from "@/lib/format";
import { currentKey, shiftKey, type Period, type ReportData } from "@/lib/periods";
import { useLanguage } from "@/lib/i18n";

const PIE_COLORS = ["#059669", "#3b82f6", "#8b5cf6", "#f97316", "#ec4899", "#eab308", "#06b6d4", "#ef4444", "#84cc16", "#94a3b8"];

export default function ReportsPage() {
  const { t, language } = useLanguage();
  const [period, setPeriod] = useState<Period>("month");
  const [key, setKey] = useState(() => currentKey("month"));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const periods: { value: Period; label: string }[] = [
    { value: "day", label: t.reports.day },
    { value: "week", label: t.reports.week },
    { value: "month", label: t.reports.month },
    { value: "year", label: t.reports.year },
  ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch<ReportData>(`/api/reports?period=${period}&key=${encodeURIComponent(key)}`);
      setData(d);
    } finally {
      setLoading(false);
    }
  }, [period, key]);

  useEffect(() => {
    load();
  }, [load]);

  const exportUrl = (format: string) => `/api/export?format=${format}&period=${period}&key=${encodeURIComponent(key)}`;

  async function download(format: "xlsx" | "pdf") {
    setExporting(format);
    try {
      const res = await fetch(exportUrl(format));
      if (!res.ok) throw new Error(t.common.error);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${period}-${key}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(exportUrl(format), "_blank");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-lg font-bold">{t.reports.title}</h1>

      {/* Tabs periode */}
      <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-black/5 p-1 dark:bg-white/10">
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => {
              setPeriod(p.value);
              setKey(currentKey(p.value));
            }}
            className={`rounded-lg py-2 text-xs font-semibold transition ${period === p.value ? "bg-card shadow-sm" : "text-muted"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Navigasi periode */}
      <div className="flex items-center justify-between rounded-xl bg-card px-2 py-1.5 shadow-sm">
        <button onClick={() => setKey((k) => shiftKey(period, k, -1))} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Previous">
          <ArrowLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold">{data?.label ?? "..."}</span>
        <button onClick={() => setKey((k) => shiftKey(period, k, 1))} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Next">
          <ArrowRight className="size-4" />
        </button>
      </div>

      {/* Export */}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" loading={exporting === "xlsx"} onClick={() => download("xlsx")}>
          <FileSpreadsheet className="size-4 text-emerald-600" /> {t.reports.excel}
        </Button>
        <Button variant="outline" size="sm" loading={exporting === "pdf"} onClick={() => download("pdf")}>
          <FileText className="size-4 text-rose-600" /> {t.reports.pdf}
        </Button>
        <a href={exportUrl("html")} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm">
            <Printer className="size-4 text-sky-600" /> {t.reports.print}
          </Button>
        </a>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-14">
          <Loader2 className="size-6 animate-spin text-muted" />
        </div>
      ) : data ? (
        <>
          {/* Kartu ringkasan */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-card p-3.5 shadow-sm">
              <p className="text-[11px] text-muted">{t.reports.income}</p>
              <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatRupiah(data.summary.income)}</p>
            </div>
            <div className="rounded-xl bg-card p-3.5 shadow-sm">
              <p className="text-[11px] text-muted">{t.reports.expense}</p>
              <p className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">{formatRupiah(data.summary.expense)}</p>
            </div>
            <div className="rounded-xl bg-card p-3.5 shadow-sm">
              <p className="text-[11px] text-muted">{data.summary.net >= 0 ? t.reports.surplus : t.reports.deficit}</p>
              <p className={`text-sm font-bold tabular-nums ${data.summary.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {formatRupiah(data.summary.net)}
              </p>
            </div>
            <div className="rounded-xl bg-card p-3.5 shadow-sm">
              <p className="text-[11px] text-muted">{t.reports.avgPerActiveDay}</p>
              <p className="text-sm font-bold tabular-nums">{formatRupiah(data.summary.avgExpensePerActiveDay)}</p>
            </div>
          </div>

          {/* Butir terpisah */}
          {(data.summary.debtPayment > 0 || data.summary.transferTotal > 0) && (
            <div className="flex flex-wrap gap-2 text-[11px]">
              {data.summary.debtPayment > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 font-medium text-amber-700 dark:text-amber-400">
                  <Scale className="size-3" /> {t.reports.debtPaymentOutside}: {formatRupiah(data.summary.debtPayment)}
                </span>
              )}
              {data.summary.transferTotal > 0 && (
                <span className="rounded-full bg-sky-500/10 px-2.5 py-1 font-medium text-sky-700 dark:text-sky-400">
                  {t.reports.transferTotal}: {formatRupiah(data.summary.transferTotal)}
                </span>
              )}
            </div>
          )}

          {/* Tren */}
          {data.trend.length > 0 && (
            <div className="rounded-xl bg-card p-3 shadow-sm">
              <p className="mb-1 text-xs font-semibold">{t.reports.trendTitle}</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.trend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v: number) => formatRupiahShort(v)} tick={{ fontSize: 9 }} width={64} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v) => formatRupiah(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="expense" name={t.transactions.expenseTab} fill="#e11d48" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="income" name={t.transactions.incomeTab} fill="#059669" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Donut kategori */}
          <div className="grid grid-cols-1 gap-3">
            {data.expenseByCategory.length > 0 && (
              <CategoryDonut title={t.reports.expenseByCategory} slices={data.expenseByCategory} />
            )}
            {data.incomeByCategory.length > 0 && (
              <CategoryDonut title={t.reports.incomeSource} slices={data.incomeByCategory} />
            )}
          </div>

          {/* Top pengeluaran */}
          {data.topExpenses.length > 0 && (
            <section>
              <p className="mb-1.5 px-1 text-xs font-semibold">{t.reports.topExpenses}</p>
              <div className="flex flex-col gap-1.5">
                {data.topExpenses.slice(0, 5).map((txItem) => (
                  <div key={txItem.id} className="flex items-center justify-between rounded-xl bg-card px-3 py-2.5 shadow-sm">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{txItem.note ?? txItem.categoryName ?? (language === "en" ? "(no note)" : "(tanpa catatan)")}</p>
                      <p className="text-[10px] text-muted">{txItem.date.slice(5)} · {txItem.categoryName ?? "-"}</p>
                    </div>
                    <span className="text-xs font-bold tabular-nums text-rose-600 dark:text-rose-400">−{formatRupiah(txItem.amount)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Snapshot kondisi */}
          <div className="rounded-xl bg-card p-3.5 shadow-sm">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
              <Wallet className="size-3.5 text-brand" /> {t.reports.currentCondition}
            </p>
            {data.accounts.map((a) => (
              <div key={a.id} className="flex justify-between py-1 text-xs">
                <span className="text-muted">{a.name}</span>
                <span className="font-semibold tabular-nums">{formatRupiah(a.balance)}</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t border-line pt-1.5 text-xs">
              <span className="font-semibold">{t.reports.totalAllAccounts}</span>
              <span className="font-bold tabular-nums text-brand">{formatRupiah(data.accountsTotal)}</span>
            </div>
            {data.totalDebt > 0 && (
              <div className="mt-1.5 flex justify-between rounded-lg bg-rose-500/5 px-2 py-1.5 text-xs">
                <span className="text-muted">{t.reports.remainingRunningDebt}</span>
                <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400">{formatRupiah(data.totalDebt)}</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <EmptyState icon={FileText} title={t.reports.noData} />
      )}
    </div>
  );
}

function CategoryDonut({ title, slices }: { title: string; slices: ReportData["expenseByCategory"] }) {
  return (
    <div className="rounded-xl bg-card p-3 shadow-sm">
      <p className="mb-1 text-xs font-semibold">{title}</p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="total" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} strokeWidth={0}>
              {slices.map((s, i) => (
                <Cell key={s.id} fill={s.color || PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v, n) => [formatRupiah(Number(v)), String(n)]} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-col gap-1">
        {slices.slice(0, 5).map((s) => (
          <div key={s.id} className="flex items-center gap-2 text-[11px]">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="flex-1 truncate">{s.name}</span>
            <span className="text-muted">{s.pct}%</span>
            <span className="font-semibold tabular-nums">{formatRupiah(s.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
