import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://artaku.my.id";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Duitku — Aplikasi Catatan Keuangan Pribadi & AI Scan Struk",
    template: "%s | Duitku",
  },
  description:
    "Aplikasi catatan keuangan pribadi: catat pemasukan, pengeluaran, tabungan, dan hutang dalam satu tempat. Scan struk belanja otomatis pakai AI. Laporan harian hingga tahunan + export PDF/Excel. Gratis trial 3 hari.",
  keywords: [
    "aplikasi keuangan",
    "catatan keuangan",
    "aplikasi catatan pengeluaran",
    "pencatat keuangan pribadi",
    "scan struk AI",
    "aplikasi hutang",
    "aplikasi tabungan",
    "laporan keuangan",
    "kelola keuangan",
    "duitku",
  ],
  applicationName: "Duitku",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Duitku",
    title: "Duitku — Aplikasi Catatan Keuangan Pribadi & AI Scan Struk",
    description:
      "Catat pemasukan, pengeluaran, tabungan, dan hutang. Scan struk belanja otomatis pakai AI. Gratis trial 3 hari.",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "Duitku — Aplikasi Catatan Keuangan Pribadi",
    description:
      "Catat keuangan pribadi + scan struk otomatis pakai AI. Gratis trial 3 hari.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.add(d?'dark':'light');}catch(e){document.documentElement.classList.add('light');}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Duitku",
              url: SITE_URL,
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web",
              inLanguage: "id",
              description:
                "Aplikasi catatan keuangan pribadi dengan AI scan struk: catat pemasukan, pengeluaran, tabungan, dan hutang.",
              offers: {
                "@type": "Offer",
                price: "29000",
                priceCurrency: "IDR",
                description: "Langganan PRO bulanan Duitku",
              },
            }),
          }}
        />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
