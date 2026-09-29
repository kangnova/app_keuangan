import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AppShell } from "@/components/app-shell";
import { LanguageProvider } from "@/lib/i18n";
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
    default: "Duitku — Personal Finance & AI Receipt Scanner",
    template: "%s | Duitku",
  },
  description:
    "Personal finance app: track income, expenses, accounts, and debts effortlessly. Scan receipts instantly with AI. Detailed daily to annual reports + PDF/Excel export. Free 3-day trial.",
  keywords: [
    "personal finance",
    "expense tracker",
    "receipt scanner AI",
    "budget manager",
    "debt tracker",
    "financial reports",
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
    title: "Duitku — Personal Finance & AI Receipt Scanner",
    description:
      "Track income, expenses, savings, and debts. Scan receipts automatically with AI. Free 3-day trial.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Duitku — Personal Finance & AI Receipt Scanner",
    description:
      "Personal finance tracking + automatic AI receipt scanning. Free 3-day trial.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.add(d?'dark':'light');var l=localStorage.getItem('duitku_lang')||'en';document.documentElement.lang=l;}catch(e){document.documentElement.classList.add('light');}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <LanguageProvider defaultLanguage="en">
          <AppShell>{children}</AppShell>
        </LanguageProvider>
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
              inLanguage: ["en", "id"],
              description:
                "Personal finance app with AI receipt scanning: record income, expenses, accounts, and debts.",
              offers: {
                "@type": "Offer",
                price: "29000",
                priceCurrency: "IDR",
                description: "Monthly PRO Subscription",
              },
            }),
          }}
        />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
