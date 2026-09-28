# 💰 Duitku

Aplikasi keuangan untuk pengeluaran harian, dan jumlah uang yang masih ada —
dilengkapi **AI scan struk** (via [Sumopod AI Gateway](https://sumopod.com)) dan
laporan harian/mingguan/bulanan/tahunan yang bisa di-export ke HTML/PDF/Excel.

> 📋 Rencana lengkap aplikasi ada di [`RENCANA.md`](./RENCANA.md).

## Tech Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4
- **Prisma 6** + SQLite (siap migrasi ke PostgreSQL)
- **Recharts** (grafik) · **ExcelJS** (export .xlsx) · **pdfmake 0.2** (export PDF)
- **AI Scan Struk**: Sumopod AI Gateway (OpenAI-compatible, SDK `openai`)

## Status Milestone

| Fase | Isi | Status |
|------|-----|--------|
| 1 | Fondasi: Next.js + TS + Prisma + schema DB + seed | ✅ |
| 2 | CRUD Akun, Transaksi (income/expense/transfer), Kategori, **Pencatatan Hutang** | ✅ |
| 3 | Dashboard + Laporan 4 periode + charts + **Export Excel/PDF/HTML** | ✅ |
| 4 | AI Scan Struk via Sumopod + flow review | ✅ *(isi API key untuk aktif)* |
| 5 | Export HTML / PDF / Excel | 🔜 |
| 6 | PWA + passcode + polish UI | 🔜 |
| 7 | Docker + deploy Sumopod Container | 🔜 |

## Mulai Cepat

```bash
# 1. Install dependencies (otomatis generate prisma client via postinstall)
npm install

# 2. Setup database (buat file prisma/dev.db + jalankan seed)
npx prisma migrate dev
npm run db:seed

# 3. Jalanin dev server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

> 📷 **Aktifkan AI Scan Struk**: isi `SUMOPOD_API_KEY` di `.env` (dashboard Sumopod →
> AI Models). Tanpa API key, set `SCAN_MOCK_MODE=1` untuk mencoba alur scan dengan
> data demo.

### Command database

```bash
npm run db:migrate   # buat/jalankan migrasi baru
npm run db:seed      # isi kategori preset + akun contoh (idempoten)
npm run db:studio    # buka Prisma Studio (GUI database)
```

### Smoke test API (82 assertion end-to-end)

```bash
rm -f prisma/test.db && DATABASE_URL="file:./test.db" npx prisma migrate deploy
DATABASE_URL="file:./test.db" npm run db:seed
DATABASE_URL="file:./test.db" npx next start -p 3111 &   # di terminal terpisah
node scripts/smoke.mjs
```

## Konvensi Penting

- 💵 **Semua nilai uang = integer rupiah** (tanpa desimal) — hindari bug pembulatan.
- 🧮 **Saldo akun tidak disimpan**, selalu dihitung dari transaksi
  (`initialBalance + income - expense ± transfer`) — tidak pernah melenceng.
- 🤖 **AI tidak pernah langsung mengubah saldo** — semua hasil scan struk wajib
  direview user sebelum jadi transaksi.
- ⚖️ **Hutang dilacak terpisah** (`model Debt`) — cicilan hutang (`DEBT_PAYMENT`)
  mengurangi saldo akun tapi **tidak dihitung sebagai pengeluaran harian**;
  pencairan hutang (`DEBT_DISBURSEMENT`) menambah saldo tapi bukan pemasukan.
  Sisa pokok = `initialAmount + Σ pencairan manual − Σ pembayaran`.
  Hutang baru dengan `moneyReceived: true` otomatis membuat transaksi cair
  `source: "DEBT_OPENING"` (naikkan saldo, tidak dobel di pokok).
- 🧪 **PATCH API bersifat parsial** — field yang tidak dikirim tidak pernah berubah.

## Environment Variables

Lihat `.env.example`. Untuk fitur AI (Milestone 4) nanti dibutuhkan:

```env
SUMOPOD_API_KEY="sk-... dari dashboard sumopod"
SUMOPOD_BASE_URL="https://ai.sumopod.com/v1"
SUMOPOD_VISION_MODEL="gpt-4o-mini"   # atau gpt-4o / gemini-2.5-flash
SCAN_MOCK_MODE="0"                    # 1 = demo tanpa panggil AI (untuk tes UI)
```
