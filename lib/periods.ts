// Utilitas periode laporan — MURNI (tanpa import db), aman untuk client & server.
import { dayStringToDate, monthRange, monthLabel, toISODate, formatTanggal } from "./datetime";

export type Period = "day" | "week" | "month" | "year";

export const PERIODS: { value: Period; label: string }[] = [
  { value: "day", label: "Harian" },
  { value: "week", label: "Mingguan" },
  { value: "month", label: "Bulanan" },
  { value: "year", label: "Tahunan" },
];

export function isValidPeriodKey(period: Period, key: string): boolean {
  return (
    (period === "day" && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(key)) ||
    (period === "week" && /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(key)) ||
    (period === "month" && /^\d{4}-(0[1-9]|1[0-2])$/.test(key)) ||
    (period === "year" && /^\d{4}$/.test(key))
  );
}

/** Senin 00:00 s.d. Senin berikutnya untuk kunci "YYYY-Www" (ISO). */
export function weekRange(weekKey: string): { start: Date; end: Date; weekNo: number } {
  const [y, w] = weekKey.split("-W").map(Number);
  const jan4 = new Date(y, 0, 4);
  const dow = (jan4.getDay() + 6) % 7; // 0 = Senin
  const start = new Date(y, 0, 4 - dow + (w - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end, weekNo: w };
}

export function periodRange(period: Period, key: string): { start: Date; end: Date } {
  if (period === "day") {
    const start = dayStringToDate(key);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return { start, end };
  }
  if (period === "week") return weekRange(key);
  if (period === "month") return monthRange(key);
  return { start: new Date(Number(key), 0, 1), end: new Date(Number(key) + 1, 0, 1) };
}

export function periodLabel(period: Period, key: string): string {
  const { start, end } = periodRange(period, key);
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d);
  if (period === "day") return formatTanggal(start);
  if (period === "week") {
    const w = weekRange(key);
    const lastDay = new Date(end.getTime() - 864e5);
    return `Minggu ke-${w.weekNo} · ${fmt(start)} – ${fmt(lastDay)}`;
  }
  if (period === "month") return monthLabel(key);
  return `Tahun ${key}`;
}

/** Geser kunci periode (delta bisa minus). */
export function shiftKey(period: Period, key: string, delta: number): string {
  if (period === "day") {
    const d = dayStringToDate(key);
    d.setDate(d.getDate() + delta);
    return toISODate(d);
  }
  if (period === "week") {
    const { start } = weekRange(key);
    start.setDate(start.getDate() + delta * 7);
    const target = new Date(start);
    const jan4 = new Date(target.getFullYear(), 0, 4);
    const dow = (jan4.getDay() + 6) % 7;
    const weekNo = Math.ceil(((target.getTime() - jan4.getTime()) / 864e5 + dow) / 7);
    return `${target.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  }
  if (period === "month") {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return String(Number(key) + delta);
}

export function currentKey(period: Period, now = new Date()): string {
  if (period === "day") return toISODate(now);
  if (period === "month") return toISODate(now).slice(0, 7);
  if (period === "year") return String(now.getFullYear());
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const dow = (jan4.getDay() + 6) % 7;
  const weekNo = Math.ceil(((now.getTime() - jan4.getTime()) / 864e5 + dow) / 7);
  return `${now.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// ===== Tipe hasil laporan (dipakai client & server) =====
export type CategorySlice = { id: string; name: string; color: string; total: number; count: number; pct: number };
export type TrendPoint = { label: string; expense: number; income: number };
export type TxItem = {
  id: string;
  date: string;
  type: string;
  amount: number;
  note: string | null;
  categoryName: string | null;
  categoryName2: string | null;
  accountName: string;
  debtName: string | null;
};

export type ReportData = {
  period: Period;
  key: string;
  label: string;
  userId: string;
  summary: {
    income: number;
    expense: number;
    net: number;
    avgExpensePerActiveDay: number;
    activeDays: number;
    txCount: number;
    debtPayment: number;
    debtDisbursement: number;
    transferTotal: number;
  };
  expenseByCategory: CategorySlice[];
  incomeByCategory: CategorySlice[];
  trend: TrendPoint[];
  topExpenses: TxItem[];
  incomeItems: TxItem[];
  accounts: { id: string; name: string; type: string; balance: number }[];
  accountsTotal: number;
  totalDebt: number;
};
