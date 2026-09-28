import { db } from "@/lib/db";
import { getAccountBalances, getDebtRemainingMap } from "@/lib/balance";
import { currentMonthKey, monthRange, formatTanggal } from "@/lib/datetime";
import { formatRupiah } from "@/lib/format";
import { getIcon } from "@/lib/icons";
import { QuickActions } from "@/components/quick-actions";
import { ChevronRight, Scale, Tags, ScanLine, BarChart3, Settings, Wallet, ArrowDownUp, FileDown, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { validateRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const FEATURES = [
  {
    icon: Wallet,
    title: "Saldo Gabungan Real-time",
    desc: "Gabungkan saldo semua rekening, e-wallet, dan uang tunai. Total uangmu terlihat dalam satu kartu.",
  },
  {
    icon: ScanLine,
    title: "AI Scan Struk",
    desc: "Foto struk belanja, AI otomatis membaca merchant, item, dan total. Tanpa ketik manual satu per satu.",
  },
  {
    icon: ArrowDownUp,
    title: "Pemasukan & Pengeluaran",
    desc: "Catat setiap rupiah masuk dan keluar. Sumber pemasukan jelas, pengeluaran harian terkontrol.",
  },
  {
    icon: Scale,
    title: "Lacak Hutang & Cicilan",
    desc: "Pantau paylater, KPR, atau pinjaman: sisa pokok, jatuh tempo, dan riwayat cicilan.",
  },
  {
    icon: BarChart3,
    title: "Laporan Lengkap",
    desc: "Laporan harian, mingguan, bulanan, dan tahunan. Lihat ke mana uangmu pergi setiap periode.",
  },
  {
    icon: FileDown,
    title: "Export PDF & Excel",
    desc: "Unduh laporan ke PDF, Excel, atau HTML. Siap untuk arsip pribadi atau keperluan lain.",
  },
];

const STEPS = [
  { title: "Daftar gratis", desc: "Buat akun dan mulai trial 3 hari — tanpa kartu kredit." },
  { title: "Catat transaksi", desc: "Input manual atau foto struk, AI yang mengisi detailnya otomatis." },
  { title: "Pantau & laporkan", desc: "Lihat saldo, grafik pengeluaran, dan export laporan kapan saja." },
];

const FAQ = [
  {
    q: "Apakah Duitku gratis?",
    a: "Ya, ada trial gratis 3 hari dengan semua fitur terbuka. Setelah itu, lanjutkan dengan PRO Rp29.000/bulan atau Rp290.000/tahun.",
  },
  {
    q: "Bagaimana cara AI scan struk bekerja?",
    a: "Kamu foto struk belanja, AI membaca merchant, item, dan total secara otomatis. Hasilnya kamu review dulu sebelum disimpan — AI tidak pernah mengubah saldo tanpa persetujuanmu.",
  },
  {
    q: "Apakah data keuangan saya aman?",
    a: "Data kamu privat dan hanya bisa diakses dengan akunmu. Kami tidak menjual atau membagikan data kamu ke pihak ketiga.",
  },
  {
    q: "Bisa dipakai di HP?",
    a: "Bisa. Duitku dirancang mobile-first, jadi nyaman dipakai dari HP maupun komputer.",
  },
];

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
      <div className="flex min-h-dvh flex-col bg-background">
        <Header />
        <main className="flex-1">
          {/* Hero */}
          <section className="mx-auto max-w-5xl px-4 pb-12 pt-16 text-center sm:pt-24">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-4 py-1.5 text-xs font-medium text-brand">
              <Sparkles className="size-3.5" /> Aplikasi keuangan pribadi + AI scan struk
            </div>
            <h1 className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Catat Keuangan Pribadi Jadi Mudah,{" "}
              <span className="text-brand">dari Scan Struk sampai Laporan Bulanan</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted sm:text-lg">
              Duitku bantu kamu catat pemasukan, pengeluaran, tabungan, dan hutang dalam satu
              aplikasi. Foto struk belanja, AI yang membacanya — tanpa ketik manual. Gratis trial 3
              hari, tanpa kartu kredit.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="/demo"
                className="w-full rounded-xl bg-amber-500 px-7 py-3.5 text-center font-semibold text-white transition hover:bg-amber-600 sm:w-auto"
              >
                Coba Demo 3 Hari Gratis
              </a>
              <a
                href="/register"
                className="w-full rounded-xl bg-brand px-7 py-3.5 text-center font-semibold text-white transition hover:bg-brand/90 sm:w-auto"
              >
                Daftar &amp; Mulai Trial
              </a>
            </div>
            <p className="mt-4 text-xs text-muted">
              Tanpa kartu kredit · Batalkan kapan saja · Data kamu privat
            </p>
          </section>

          {/* Fitur */}
          <section className="border-t border-line bg-muted/30 py-16">
            <div className="mx-auto max-w-5xl px-4">
              <h2 className="text-center text-2xl font-bold sm:text-3xl">
                Semua yang kamu butuhkan untuk kelola uang
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted sm:text-base">
                Satu aplikasi untuk saldo, transaksi, hutang, dan laporan — dilengkapi AI yang
                membaca struk belanja otomatis.
              </p>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((f) => (
                  <div key={f.title} className="rounded-2xl border border-line bg-card p-5 shadow-sm">
                    <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <f.icon className="size-5" />
                    </div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Cara kerja */}
          <section className="py-16">
            <div className="mx-auto max-w-5xl px-4">
              <h2 className="text-center text-2xl font-bold sm:text-3xl">Mulai dalam 3 langkah</h2>
              <div className="mt-10 grid gap-6 sm:grid-cols-3">
                {STEPS.map((s, i) => (
                  <div key={s.title} className="text-center">
                    <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                      {i + 1}
                    </div>
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing teaser */}
          <section className="border-t border-line bg-muted/30 py-16">
            <div className="mx-auto max-w-3xl px-4 text-center">
              <h2 className="text-2xl font-bold sm:text-3xl">
                Gratis 3 hari, lalu <span className="text-brand">Rp29.000/bulan</span>
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted sm:text-base">
                Semua fitur terbuka selama trial. Setelah itu, lanjutkan dengan PRO bulanan
                Rp29.000 atau tahunan Rp290.000 (hemat ~17%).
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href="/subscribe"
                  className="w-full rounded-xl border border-line bg-card px-7 py-3 text-center font-semibold transition hover:bg-accent sm:w-auto"
                >
                  Lihat Paket PRO
                </a>
                <a
                  href="/register"
                  className="w-full rounded-xl bg-brand px-7 py-3 text-center font-semibold text-white transition hover:bg-brand/90 sm:w-auto"
                >
                  Mulai Trial Gratis
                </a>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16">
            <div className="mx-auto max-w-3xl px-4">
              <h2 className="text-center text-2xl font-bold sm:text-3xl">
                Pertanyaan yang sering diajukan
              </h2>
              <div className="mt-8 space-y-4">
                {FAQ.map((f) => (
                  <div key={f.q} className="rounded-2xl border border-line bg-card p-5">
                    <h3 className="font-semibold">{f.q}</h3>
                    <p className="mt-1.5 text-sm text-muted">{f.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA akhir */}
          <section className="border-t border-line py-16">
            <div className="mx-auto max-w-3xl px-4 text-center">
              <h2 className="text-2xl font-bold sm:text-3xl">Siap lebih tenang soal uang?</h2>
              <p className="mt-2 text-sm text-muted sm:text-base">
                Mulai catat keuanganmu hari ini. Gratis, tanpa kartu kredit.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href="/register"
                  className="w-full rounded-xl bg-brand px-8 py-3.5 text-center font-semibold text-white transition hover:bg-brand/90 sm:w-auto"
                >
                  Daftar Sekarang
                </a>
                <a
                  href="/demo"
                  className="w-full rounded-xl bg-amber-500 px-8 py-3.5 text-center font-semibold text-white transition hover:bg-amber-600 sm:w-auto"
                >
                  Coba Demo
                </a>
              </div>
            </div>
          </section>
        </main>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQ.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            }),
          }}
        />
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

        {user.role === "ADMIN" && (
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
        )}
      </main>
    </div>
  );
}