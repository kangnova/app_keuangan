# 📱 Rencana Aplikasi: "Duitku" — Personal Finance Tracker + AI Receipt Scanner

> Aplikasi keuangan pribadi untuk melacak saldo gabungan (tabungan & cash), mencatat
> pemasukan per sumber, pengeluaran harian, dengan AI untuk membaca struk belanja
> secara otomatis, plus laporan & export (HTML/PDF/Excel).

---

## 1. Ringkasan Kebutuhan

| # | Kebutuhan | Solusi |
|---|-----------|--------|
| 1 | Tahu total uang yang dimiliki (beberapa tabungan + cash) | Modul **Akun** dengan saldo gabungan real-time |
| 2 | Catat pemasukan + sumbernya | Modul **Transaksi** tipe INCOME + Kategori pemasukan |
| 3 | Catat pengeluaran harian | Modul **Transaksi** tipe EXPENSE + input cepat |
| 4 | Baca struk/nota belanja otomatis dengan AI | **Sumopod AI Gateway** (OpenAI-compatible) + vision model |
| 5 | Laporan harian / mingguan / bulanan / tahunan | Modul **Laporan** dengan agregasi per periode |
| 6 | Export laporan ke HTML / PDF / Excel | Export engine (print HTML, PDF, ExcelJS) |
| 7 | Bisa dipakai nyaman dari HP | **PWA** (installable, kamera untuk foto struk) |
| 8 | Catat hutang & cicilannya, terpisah dari pengeluaran | Modul **Hutang** (DEBT_PAYMENT / DEBT_DISBURSEMENT) |

---

## 2. Tech Stack (standar industri)

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| Framework | **Next.js 15 (App Router) + TypeScript** | Full-stack satu repo, SSR + API routes, standar industri |
| UI | **Tailwind CSS + shadcn/ui + lucide-react** | Cepat dikembangkan, konsisten, mobile-first |
| Database | **SQLite + Prisma ORM** (mudah migrasi ke PostgreSQL) | Praktis untuk personal app; Prisma bikin ganti DB painless |
| AI | **Sumopod AI Gateway** (base URL OpenAI-compatible, `openai` SDK) + vision model (GPT-4o / Gemini) | Sudah punya akun; cukup ganti `baseURL` & `apiKey` |
| Charts | **Recharts** | Grafik tren & kategori |
| Validasi | **Zod** | Validasi hasil parse AI & input user |
| Export | **Print CSS (HTML)**, **pdfmake / print-to-PDF**, **ExcelJS** | Excel multi-sheet, PDF siap cetak |
| PWA | **next-pwa / Serwist** | Installable di HP, offline shell, kamera via `<input capture>` |
| Auth | Passcode/PIN sederhana (single-user) — opsional naik ke NextAuth | Aplikasi personal, cukup proteksi ringan |
| Deploy | **Docker → Sumopod Container** | Satu ekosistem dengan AI Gateway-nya |

---

## 3. Arsitektur & Data Model (Prisma)

```
Account ──< Transaction >── Category
                │
             (TRANSFER antar Account)
Debt ──< Transaction (DEBT_PAYMENT: bayar cicilan · DEBT_DISBURSEMENT: uang cair masuk akun)
ReceiptScan ──(setelah review)──> Transaction
```

```prisma
model Account {
  id             String   @id @default(cuid())
  name           String              // "BCA", "GoPay", "Dompet Cash"
  type           String              // BANK | EWALLET | CASH
  initialBalance Int                  // saldo awal (rupiah, integer)
  isActive       Boolean  @default(true)
  transactions   Transaction[]
}

model Category {
  id           String   @id @default(cuid())
  name         String              // "Makan", "Transport", "Gaji"
  type         String              // INCOME | EXPENSE
  color        String?
  icon         String?
  transactions Transaction[]
}

model Transaction {
  id         String    @id @default(cuid())
  type       String               // INCOME | EXPENSE | TRANSFER | DEBT_PAYMENT | DEBT_DISBURSEMENT
  amount     Int                  // rupiah, selalu positif
  date       DateTime
  note       String?
  source     String    @default("MANUAL") // MANUAL | AI_SCAN
  account    Account   @relation(fields: [accountId], references: [id])
  accountId  String
  toAccountId String?  // khusus TRANSFER
  category   Category? @relation(fields: [categoryId], references: [id])
  categoryId String?
  receipt    ReceiptScan?
  createdAt  DateTime  @default(now())
}

model ReceiptScan {
  id            String   @id @default(cuid())
  imagePath     String   // arsip foto struk
  status        String   // PENDING | APPROVED | DISCARDED
  parsedJson    String   // hasil AI mentah (JSON)
  transactionId String?  @unique
  transaction   Transaction? @relation(fields: [transactionId], references: [id])
  createdAt     DateTime @default(now())
}

model Debt {
  id            String    @id @default(cuid())
  name          String              // "Paylater Shopee", "KPR Rumah", "Pinjem Budi"
  creditorName  String?             // pemberi hutang (opsional)
  initialAmount Int                 // pokok hutang
  dueDate       DateTime?           // jatuh tempo
  interestInfo  String?             // cth: "bunga 2%/bulan"
  accountId     String              // akun pembayaran / pencairan
  status        String    @default("ACTIVE") // ACTIVE | SETTLED
  transactions  Transaction[]
}
```

**Rumus saldo** = `initialBalance + Σ(income) − Σ(expense) + Σ(transfer masuk) − Σ(transfer keluar)`
— selalu dihitung dari transaksi (bukan disimpan), jadi tidak pernah "melenceng".

**Rumus hutang (payable)** = `initialAmount + Σ(DEBT_DISBURSEMENT) − Σ(DEBT_PAYMENT)` —
sisa pokok berjalan, **tidak termasuk dalam saldo aset**.

> 📌 **Schema final (source of truth): [`prisma/schema.prisma`](./prisma/schema.prisma)** —
> sudah termasuk model `Debt` (status ACTIVE/SETTLED) dan tipe transaksi hutang.

---

## 4. Fitur & Halaman

1. **Dashboard** — kartu total saldo gabungan + per akun, ringkasan total hutang berjalan,
   grafik pengeluaran 7/30 hari,
   transaksi terakhir, tombol cepat: "+ Pemasukan", "− Pengeluaran", "📷 Scan Struk".
2. **Akun** — CRUD tabungan/e-wallet/cash + saldo awal; lihat saldo per akun & total.
3. **Transaksi** — daftar dengan filter tanggal/kategori/akun; form input cepat;
   transfer antar akun; edit/hapus; form juga menangani aksi hutang
   (bayar cicilan / catat pencairan).
4. **Hutang** ⚖️ — daftar hutang berjalan (paylater, KPR, pinjem temen) dengan sisa
   pokok & jatuh tempo; aksi **Bayar** (`DEBT_PAYMENT`) dan **Cair** (`DEBT_DISBURSEMENT`);
   riwayat cicilan per hutang; status ACTIVE/SETTLED.
5. **Kategori** — preset Indonesia (Makan, Transport, Belanja, Tagihan, Hiburan, Gaji, Bonus, dll)
   + custom dengan warna & ikon.
6. **AI Scan Struk** ⭐ — alur:
   - Upload foto / ambil dari kamera (PWA)
   - Gambar → base64 → Route Handler → Sumopod AI Gateway (vision model)
   - Prompt mengembalikan JSON terstruktur: `{ merchant, date, items[{name, qty, price}], subtotal, discount, tax, total, category_suggestion, payment_method }`
   - Validasi Zod → tampil sebagai **draft review** (user bisa koreksi sebelum simpan)
   - User pilih akun sumber → simpan → otomatis jadi pengeluaran + arsip foto struk
7. **Laporan** — tab Harian / Mingguan / Bulanan / Tahunan:
   - Total pemasukan vs pengeluaran, surplus/defisit
   - Ringkasan hutang berjalan (total sisa pokok & jatuh tempo terdekat)
   - Rata-rata belanja per hari
   - Breakdown per kategori (donut chart) & tren (line/bar chart)
   - Top pengeluaran terbesar
8. **Export** — dari halaman Laporan:
   - **HTML**: halaman report siap-print (print CSS)
   - **PDF**: via print-to-PDF (styling print) — cepat & konsisten
   - **Excel**: ExcelJS, multi-sheet (Ringkasan, Transaksi, Per Kategori)
9. **Pengaturan** — mata uang (IDR), tanggal awal bulan, PIN, backup/restore JSON.

---

## 5. Pipeline AI (Sumopod)

```
[Foto struk] → [POST /api/scan] → [base64 → Sumopod AI Gateway]
   → vision model + prompt parse JSON → [Zod validate]
   → [simpan ReceiptScan: PENDING] → [UI review & edit]
   → [APPROVE → Transaction EXPENSE + kurangi saldo akun]
```

- SDK: package `openai` dengan `baseURL` mengarah ke Sumopod, `apiKey` dari dashboard.
- Model vision direkomendasikan: `gpt-4o` (atau varian Gemini vision yang tersedia di Sumopod).
- **Fallback & guard**: JSON parse gagal → minta AI perbaiki; total tidak konsisten →
  tandai warning di UI review; semua hasil AI **wajib direview user** sebelum masuk saldo.

### Environment variables (`.env`)
```env
DATABASE_URL="file:./dev.db"
SUMOPOD_API_KEY="isi-dari-dashboard-sumopod"
SUMOPOD_BASE_URL="https://api.sumopod.com/v1"   # konfirmasi base URL persis dari dashboard
SUMOPOD_VISION_MODEL="gpt-4o"                    # sesuaikan model vision yang tersedia
APP_PIN="123456"                                 # proteksi sederhana
```
> ⚠️ **Perlu dari lo:** API key + base URL persis + daftar model vision yang aktif
> di dashboard Sumopod (dashboard → AI Models).

---

## 6. Struktur Folder

> ℹ️ *Diupdate setelah Milestone 1: proyek dibuat tanpa folder `src/`, jadi `app/`,
> `components/`, dan `lib/` berada di root — sesuai konvensi create-next-app terbaru.*

```
app/                       # Next.js App Router (root-level)
  page.tsx                 # Dashboard (M3)
  accounts/page.tsx        # Akun & saldo (M2)
  transactions/page.tsx    # Daftar & input transaksi (M2)
  scan/page.tsx            # Scan struk + review (M4)
  reports/page.tsx         # Laporan + export (M3/M5)
  settings/page.tsx        # Pengaturan (M6)
  api/
    accounts/route.ts + accounts/[id]/route.ts   (M2)
    transactions/route.ts + transactions/[id]/route.ts (M2)
    categories/route.ts + categories/[id]/route.ts (M2)
    scan/route.ts          # kirim gambar → Sumopod AI (M4)
    reports/route.ts       # agregasi per periode (M3)
    export/route.ts        # generate excel/pdf/html (M5)
components/                # UI + charts + form
lib/
  db.ts                    # ✅ Prisma client (sudah ada)
  format.ts                # ✅ helper format rupiah (sudah ada)
  validators.ts            # skema Zod untuk API (M2)
  balance.ts               # kalkulasi saldo dari transaksi (M2)
  ai.ts                    # Sumopod AI client + prompt parser (M4)
  reports.ts               # agregasi harian/mingguan/bulanan/tahunan (M3)
  export.ts                # ExcelJS / PDF helpers (M5)
prisma/
  schema.prisma            # ✅ 4 model: Account, Category, Transaction, ReceiptScan
  seed.ts                  # ✅ kategori preset + akun contoh (idempoten)
  dev.db                   # SQLite lokal (gitignored)
```

---

## 7. Milestone (urutan pengerjaan)

| Fase | Isi | Hasil |
|------|-----|-------|
| **1** | Init Next.js + TS + Tailwind + Prisma, schema DB, seed kategori & akun contoh | Fondasi jalan |
| **2** | CRUD Akun + saldo, CRUD Transaksi (income/expense/transfer), Kategori, **Pencatatan Hutang** | Inti pencatatan ✅ |
| **3** | Dashboard + Laporan (harian/mingguan/bulanan/tahunan) + charts | Analitik ✅ |
| **4** | AI Scan Struk via Sumopod + flow review & approve | Fitur bintang ⭐ |
| **5** | Export HTML / PDF / Excel dari laporan | Pelaporan ✅ |
| **6** | PWA (installable, kamera), passcode, polish UI | Siap pakai ✅ |
| **7** | Dockerfile + deploy ke Sumopod Container | Online ✅ |

**Nanti (opsional):** budget per kategori, transaksi berulang (langganan),
notifikasi pengeluaran harian melebihi rata-rata, multi-perangkat dengan PostgreSQL.

---

## 7.1 Detail Teknis Milestone 2 — Inti Pencatatan

**API endpoints (App Router route handlers, validasi Zod di `lib/validators.ts`):**

| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/api/accounts` | GET, POST | List akun (+ saldo terhitung) & buat akun baru |
| `/api/accounts/[id]` | PATCH, DELETE | Edit / nonaktifkan akun |
| `/api/transactions` | GET, POST | List (filter bulan/tipe/akun/kategori) & catat transaksi |
| `/api/transactions/[id]` | PATCH, DELETE | Edit / hapus transaksi |
| `/api/categories` | GET, POST | List & tambah kategori |
| `/api/categories/[id]` | PATCH, DELETE | Edit / hapus kategori |
| `/api/debts` | GET, POST | List hutang (+ sisa pokok terhitung) & catat hutang baru |
| `/api/debts/[id]` | PATCH, DELETE | Update info / hapus hutang (hanya jika belum ada transaksi) |
| `/api/debts/[id]/pay` | POST | Bayar/cicil hutang → buat transaksi `DEBT_PAYMENT` dari akun terkait |
| `/api/debts/[id]/disburse` | POST | Catat pencairan → uang hutang masuk akun via `DEBT_DISBURSEMENT` |

**Aturan bisnis:**
- `TRANSFER`: `accountId` = akun sumber, `toAccountId` = akun tujuan (wajib berbeda), tanpa kategori.
- Hapus akun yang masih punya transaksi → **ditolak**; tawarkan nonaktifkan (`isActive=false`)
  supaya riwayat laporan tetap utuh.
- Hapus kategori yang masih punya transaksi → transaksi otomatis dipindah ke
  "Lain-lain" (expense) / "Pendapatan Lain" (income).
- Saldo **selalu dihitung ulang di server** (`lib/balance.ts`) — tidak ada field saldo yang bisa "rusak".
- **Hutang ≠ pengeluaran**: mencatat hutang tidak mengubah total saldo aset;
  cicilan (`DEBT_PAYMENT`) mengurangi saldo akun tapi **tidak masuk agregat
  pengeluaran harian**; pencairan (`DEBT_DISBURSEMENT`) menambah saldo tapi
  **bukan pemasukan**.
- `DEBT_PAYMENT` ditolak jika melebihi sisa pokok; hutang otomatis `SETTLED` saat sisa pokok = 0.
- Hapus hutang hanya boleh jika belum punya transaksi terkait.
- Input nominal di UI pakai format ribuan ("15.000") → disimpan sebagai integer rupiah.

**UI (mobile-first, bottom navigation):**
- Layout shell: bottom nav — **Beranda · Transaksi · Hutang · 📷 Scan (tombol tengah menonjol) · Laporan · Akun**.
- Halaman Akun: kartu saldo per akun + total gabungan di atas; dialog tambah/edit
  (nama, tipe, saldo awal, warna).
- Halaman Transaksi: daftar dikelompokkan per tanggal + subtotal harian; filter chip
  (bulan, tipe, akun); tombol **+** membuka bottom-sheet form dengan toggle
  Pengeluaran/Pemasukan/Transfer, input nominal berpemisah ribuan, picker kategori/akun/tanggal.
- Feedback: toast sukses/gagal, list auto-refresh (`router.refresh()`).

**Kriteria selesai (acceptance criteria):**
1. Bisa tambah akun baru → total saldo gabungan ter-update.
2. Bisa catat pemasukan, pengeluaran, dan transfer → saldo akun terkait berubah dengan benar.
3. Bisa edit & hapus transaksi → saldo kembali akurat.
4. Daftar transaksi bisa difilter per bulan, tipe, dan akun.
5. Bisa catat hutang, cairkan, dan bayar cicilan → sisa pokok & status ter-update,
   saldo akun berubah dengan benar, laporan pengeluaran tidak terkotorkan.
6. `tsc --noEmit` bersih dan `npm run build` sukses.

> 📌 *Detail teknis milestone berikutnya (M3 dst.) akan ditambahkan ke dokumen ini
> di awal pengerjaan tiap milestone, mengikuti pola yang sama.*

---

## 8. Prinsip Desain

- **Mobile-first**: mayoritas pemakaian dari HP (input cepat + foto struk).
- **Rupiah = integer** (tanpa desimal) untuk hindari bug pembulatan.
- **AI tidak pernah otomatis mengubah saldo** — selalu lewat review user.
- **Semua laporan bisa direproduksi** dari data transaksi murni.
- **Hutang dilacak terpisah** — cicilan hutang bukan "kebutuhan belanja", jadi tidak
  mengotoriti rata-rata pengeluaran harian lo.
