# 💰 Duitku — Personal Finance Tracker & AI Receipt Scanner

<div align="center">

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-artaku.my.id-059669?style=for-the-badge&logo=google-chrome&logoColor=white)](https://artaku.my.id)
[![Try Demo](https://img.shields.io/badge/⚡_Try_Demo_3_Days-Free-amber-500?style=for-the-badge&logo=sparkles&logoColor=white)](https://artaku.my.id/demo)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkangnova%2Fapp_keuangan&env=DATABASE_URL,APP_ENCRYPTION_KEY,SUMOPOD_API_KEY,SUMOPOD_BASE_URL,SUMOPOD_VISION_MODEL,SCAN_MOCK_MODE,NEXT_PUBLIC_APP_URL,MIDTRANS_SERVER_KEY,MIDTRANS_CLIENT_KEY,MIDTRANS_IS_PRODUCTION,GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET)

**Aplikasi Pencatat Keuangan Pribadi Modern + AI Scan Struk Belanja Otomatis**  
*Tersedia dalam 2 Bahasa: English (Default) & Bahasa Indonesia*

</div>

---

## 🌟 Fitur Utama (Key Features)

- 🌐 **Multi-Language (Bilingual)**: English & Bahasa Indonesia dengan peralihan instan.
- 💳 **Saldo Gabungan Real-Time**: Sinkronisasi saldo rekening bank, e-wallet, dan uang tunai.
- 📸 **AI Scan Struk Belanja**: Foto nota fisik/digital, AI otomatis mengekstrak merchant, item breakdown, dan nominal tanpa ketik manual.
- 📊 **Laporan Multi-Periode & Analitik**: Laporan harian, mingguan, bulanan, dan tahunan dengan chart interaktif.
- 📑 **Export Dokumen**: Download ringkasan keuangan ke format Excel (.xlsx), PDF, dan HTML.
- ⚖️ **Manajemen Hutang & Cicilan**: Pantau pokok pinjaman, jatuh tempo, dan riwayat pembayaran cicilan.
- 🔒 **Keamanan & Autentikasi**: Lucia Auth v3 (Session Cookies) + Google OAuth Sign-In.
- 👑 **Langganan PRO & Midtrans Gateway**: Integrasi pembayaran otomatis (GoPay, QRIS, VA, Transfer Bank, Kartu Kredit).
- 🛡️ **Admin Console & AI Config**: Panel admin desktop untuk memantau pengguna, server status, dan konfigurasi model AI secara dinamis.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router + Turbopack) & React 19
- **Bahasa**: TypeScript 5
- **Styling**: Tailwind CSS v4 + Lucide Icons + Sonner Toasts
- **Database & ORM**: Prisma 6 + SQLite (Lokal) / PostgreSQL / Turso (Cloud)
- **Autentikasi**: Lucia Auth v3 + Arctic (Google OAuth)
- **Export Engine**: ExcelJS (`.xlsx`) & pdfmake (`.pdf`)
- **AI Gateway**: Sumopod AI Vision API (OpenAI compatible)

---

## 🚀 Panduan Deploy ke Vercel (Deployment Guide)

Karena Vercel adalah platform *Serverless* (read-only filesystem pada runtime), database SQLite lokal (`dev.db`) tidak disarankan untuk production jangka panjang di Vercel karena data akan di-reset setiap redeploy.

Gunakan salah satu database cloud gratis berikut (seperti **Turso SQLite**, **Supabase PostgreSQL**, atau **Neon PostgreSQL**):

### Langkah 1: Siapkan Database Cloud (Rekomendasi: Turso / Supabase / Neon)
1. Buat database di [Turso](https://turso.tech) (SQLite Cloud) atau [Supabase](https://supabase.com) / [Neon](https://neon.tech) (PostgreSQL).
2. Dapatkan connection string `DATABASE_URL`.

### Langkah 2: Hubungkan Repository ke Vercel
1. Buka [Vercel Dashboard](https://vercel.com/dashboard) dan klik **Add New > Project**.
2. Import repository **`kangnova/app_keuangan`**.
3. Pada bagian **Environment Variables**, tambahkan variabel berikut:

| Key | Contoh Nilai | Keterangan |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` atau `postgres://...` | Connection string database |
| `APP_ENCRYPTION_KEY` | `openssl rand -base64 32` | Kunci enkripsi autentikasi |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | URL domain Vercel Anda |
| `SUMOPOD_API_KEY` | `sk-...` | (Opsional) API Key AI Vision Sumopod |
| `SUMOPOD_BASE_URL` | `https://ai.sumopod.com/v1` | Base URL AI Gateway |
| `SUMOPOD_VISION_MODEL` | `gpt-4o-mini` | Model vision pembaca struk |
| `SCAN_MOCK_MODE` | `0` (atau `1` untuk testing demo) | `1` = mock dummy data |
| `GOOGLE_CLIENT_ID` | `...apps.googleusercontent.com` | (Opsional) Client ID Google OAuth |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | (Opsional) Client Secret Google OAuth |
| `MIDTRANS_SERVER_KEY` | `SB-Mid-server-...` | (Opsional) Server Key Midtrans |
| `MIDTRANS_CLIENT_KEY` | `SB-Mid-client-...` | (Opsional) Client Key Midtrans |
| `MIDTRANS_IS_PRODUCTION` | `false` | `true` jika live production |

### Langkah 3: Build & Deploy
1. Klik **Deploy**.
2. Vercel akan menjalankan build otomatis dengan `next build`.
3. Jalankan migrasi dan seed database pertama kali:
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

---

## 💻 Menjalankan di Lokal (Local Development)

```bash
# 1. Clone repository
git clone https://github.com/kangnova/app_keuangan.git
cd app_keuangan

# 2. Install dependencies
npm install

# 3. Setup database lokal
npx prisma migrate dev
npm run db:seed

# 4. Jalankan server dev
npm run dev
```

Buka browser di `http://localhost:3000`.

---

## 📁 Struktur Database & Arsitektur

- 💵 **Semua nilai uang adalah integer rupiah**: Mencegah bug desimal dan presisi komputasi.
- 🧮 **Saldo akun tidak disimpan statis**: Selalu dihitung dinamis dari transaksi (`initialBalance + pemasukan - pengeluaran ± transfer`) untuk konsistensi data 100%.
- 🤖 **AI tidak memodifikasi saldo secara sepihak**: Semua scan struk disimpan sebagai draft pending untuk diverifikasi user terlebih dahulu.

---

## 📄 Lisensi
Dilisensikan di bawah [MIT License](LICENSE).