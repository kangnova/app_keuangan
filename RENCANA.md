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
| **2** | CRUD Akun + saldo, CRUD Transaksi (income/expense/transfer), Kategori, **Pencatatan Hutang** | Inti pencatatan ✅ **SELESAI** |
| **3** | Dashboard + Laporan (harian/mingguan/bulanan/tahunan) + charts | Analitik ✅ **SELESAI** |
| **4** | AI Scan Struk via Sumopod + flow review & approve | Fitur bintang ⭐ **SELESAI** |
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
- **Konvensi opening balance hutang**: mencatat hutang baru dengan `moneyReceived: true`
  (default, uang langsung masuk rekening) otomatis membuat transaksi
  `DEBT_DISBURSEMENT` bertanda `source: "DEBT_OPENING"` — menambah saldo akun tapi
  **tidak dihitung ulang** di rumus sisa pokok (pokok sudah terwakili `initialAmount`).
  Untuk hutang lama yang uangnya sudah lama terpakai: `moneyReceived: false`.
  Pencairan manual berikutnya (top-up) TETAP menambah pokok.
- PATCH bersifat parsial: field yang tidak dikirim tidak boleh berubah
  (transform Zod hanya "" → null, undefined tetap undefined).
- **Keterangan transaksi (catatan):** pemasukan SELALU wajib catatan asal uang
  ("gaji dari PT Maju", "hadiah dari Budi"); pengeluaran wajib catatan keperluan
  jika tanpa kategori atau ke kategori generik ("Lain-lain"); transfer opsional.
  Ditegakkan di API (`noteRequiredError`) dan diarahkan UI lewat placeholder
  dinamis per kategori — supaya riwayat & laporan sumber pendapatan selalu jelas.
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
6. `tsc --noEmit` bersih, `npm run build` sukses, dan smoke test end-to-end
   `node scripts/smoke.mjs` lulus semua (60 assertion).

> ✅ **Milestone 2 SELESAI** — 10 API route + 6 halaman + 60 smoke test lulus.
> (+) Keterangan transaksi wajib untuk pemasukan & pengeluaran generik.
>
---

## 7.2 Detail Teknis Milestone 3 — Laporan & Analitik

**Resolusi periode** (dipilih via tab, navigasi panah untuk geser periode):

| Periode | Parameter | Rentang |
|---------|-----------|---------|
| Harian | `date=YYYY-MM-DD` | 1 hari kalender |
| Mingguan | `week=YYYY-Www` | Senin–Minggu (ISO) |
| Bulanan | `month=YYYY-MM` | 1 hari terakhir bulan |
| Tahunan | `year=YYYY` | 1 Jan–31 Des |

**Isi laporan** (`GET /api/reports?period=month&key=2026-09` → JSON):
1. **Ringkasan**: pemasukan, pengeluaran, surplus/defisit, rata-rata pengeluaran/hari
   (jumlah hari dengan transaksi keluar), total cicilan hutang (dipisah, bukan pengeluaran),
   jumlah transaksi.
2. **Per kategori** (expense & income terpisah): total, persentase, jumlah transaksi → donut chart.
3. **Tren**: time-series sesuai resolusi (per jam→hari untuk daily, per hari untuk
   week/month, per bulan untuk year) → bar chart.
4. **Top 10 pengeluaran** & **sumber pemasukan** (agregasi per catatan/kategori).
5. Saldo akhir semua akun aktif + total sisa hutang berjalan (snapshot kondisi).

**Aturan agregat yang sama dengan saldo:** hanya `INCOME`/`EXPENSE` yang masuk
pemasukan/pengeluaran; `DEBT_*` dan `TRANSFER` dilaporkan terpisah (butir khusus).

**Export** (`GET /api/export?format=xlsx|pdf|html&period=...&key=...`):
- **Excel** (ExcelJS, mime `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`):
  sheet 1 Ringkasan, sheet 2 Per Kategori, sheet 3 Transaksi (detail lengkap).
- **PDF** (pdfmake + @types/pdfmake): layout laporan siap cetak (ringkasan, tabel
  kategori, top pengeluaran) — font standar, file langsung ter-download.
- **HTML**: halaman `/reports/print?period=...&key=...` dengan print CSS —
  tombol "Cetak / Simpan PDF" memanggil `window.print()` (print-to-PDF browser).

**UI** `/reports`: tab 4 periode + panah navigasi, kartu ringkasan, donut kategori
(Recharts), bar tren, daftar top pengeluaran & sumber pemasukan, tombol Export
(Excel/PDF/HTML) — semua memanggil endpoint di atas dengan periode aktif.

**Kriteria selesai M3:**
1. Laporan keempat periode akurat terhadap data transaksi (diverifikasi smoke test).
2. Cicilan hutang tidak masuk agregat pengeluaran, muncul di butir terpisah.
3. Export Excel ter-download sebagai file .xlsx valid (zip PK), PDF berawalan %PDF,
   HTML print-layout siap cetak.
4. Smoke test diperluas untuk /api/reports & /api/export; `tsc` + build bersih.

> ✅ **Milestone 3 SELESAI** — 22 assertion laporan/export baru (total 82 smoke test lulus).
> Catatan implementasi: **pdfmake di-pin ke 0.2.10** (0.3.x menggantung di Node),
> vfs diambil dari `vfs_fonts.pdfMake.vfs`, `getBuffer` dengan timeout 20s;
> exceljs/pdfmake/prisma didaftarkan di `serverExternalPackages`.

---

## 7.3 Detail Teknis Milestone 4 — AI Scan Struk (Sumopod)

**Koneksi (terkonfirmasi dari dokumentasi SDK Sumopod):**
- Base URL: `https://ai.sumopod.com/v1` (OpenAI-compatible — pakai SDK `openai`)
- API key: `sk-...` dari dashboard Sumopod
- Model vision: default `gpt-4o-mini` (alternatif: `gpt-4o`, `gpt-4.1`, `gemini-2.5-flash`)
- Env: `SUMOPOD_API_KEY`, `SUMOPOD_BASE_URL`, `SUMOPOD_VISION_MODEL`, `SCAN_MOCK_MODE`

**Alur:** foto/kamera → kompres client-side (canvas, sisi panjang ≤1280px, JPEG q0.8)
→ POST `/api/scan` (dataURL) → kirim image_url ke vision model dengan prompt parse JSON
→ validasi Zod (`ReceiptParsed`) → simpan `ReceiptScan` status PENDING → UI review →
confirm (`DEBT_`-style: buat transaksi EXPENSE atomik) atau discard.

**Prompt keluaran AI (JSON ketat):** `{ merchant, date(YYYY-MM-DD|null), items[{name, qty,
price}], subtotal, discount, tax, service, total, payment_method, category_suggestion }` —
angka integer rupiah. Validasi silang: `subtotal+tax+service-discount ≈ total` (toleransi
1-2%), item menjumlah ≈ total; ketidakkonsistenan ditandai warning di UI review.

**Guard & aturan:**
- AI TIDAK PERNAH langsung mengubah saldo — semua lewat review user.
- `/api/scan` butuh `SUMOPOD_API_KEY`; jika kosong → 503 dengan pesan jelas.
- `SCAN_MOCK_MODE=1`: parse dummy deterministik (tanpa panggil AI) untuk dev & smoke test.
- Harga/rp dianggap integer; qty ≥1; total > 0.
- `confirm` membuat transaksi `EXPENSE, source: AI_SCAN` + link `receiptId` +
  simpan kategori pilihan user; `discard` set status DISCARDED.
- 1 scan = 1 transaksi (`transactionId` unique).

**UI `/scan`:** tombol kamera (input capture) + upload galeri → preview + kompres →
analisa (loading) → kartu hasil: merchant, tanggal, item list, total (editable bila perlu),
warning konsistensi → pilih akun & kategori → Simpan / Buang. Kartu antrean PENDING
di bawah untuk scan yang belum dikonfirmasi.

**Kriteria selesai M4:**
1. Foto struk → hasil parse tampil → user koreksi/pilih akun → simpan → saldo akun berkurang,
   transaksi bertanda AI_SCAN, foto terarsip di ReceiptScan.
2. Scan bisa dibuang sebelum/sesudah diproses tanpa memengaruhi saldo.
3. Mock mode menghasilkan alur identik untuk smoke test; mode API asli siap dengan API key.
4. Smoke test ditambah untuk seluruh alur scan; tsc + build bersih.

> ✅ **Milestone 4 SELESAI** — 17 assertion scan baru (total 100 smoke test lulus).
> Mode API asli aktif otomatis begitu `SUMOPOD_API_KEY` diisi di `.env`;
> `SCAN_MOCK_MODE=1` untuk demo/dev tanpa kredit AI.

> 📌 *Detail teknis milestone berikutnya (M4 dst.) akan ditambahkan ke dokumen ini
> di awal pengerjaan tiap milestone, mengikuti pola yang sama.*

---

## 8. Prinsip Desain

- **Mobile-first**: mayoritas pemakaian dari HP (input cepat + foto struk).
- **Rupiah = integer** (tanpa desimal) untuk hindari bug pembulatan.
- **AI tidak pernah otomatis mengubah saldo** — selalu lewat review user.
- **Semua laporan bisa direproduksi** dari data transaksi murni.
- **Hutang dilacak terpisah** — cicilan hutang bukan "kebutuhan belanja", jadi tidak
  mengotoriti rata-rata pengeluaran harian lo.
