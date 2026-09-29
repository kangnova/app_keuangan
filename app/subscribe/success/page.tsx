"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";

function SubscribeSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [checking, setChecking] = useState(true);
  const [activated, setActivated] = useState(false);
  const { t, language } = useLanguage();

  useEffect(() => {
    async function checkSubscription() {
      try {
        const res = await fetch("/api/payments/subscription-status");
        if (res.ok) {
          const data = await res.json();
          if (data.status === "pro") {
            setActivated(true);
            toast.success(
              language === "en"
                ? "PRO subscription is active! Enjoy full Duitku features."
                : "Langganan PRO aktif! Selamat menikmati fitur lengkap Duitku."
            );
          }
        }
      } catch {
        // ignore
      } finally {
        setChecking(false);
      }
    }
    checkSubscription();
  }, [language]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <Loader2 className="size-8 mx-auto text-brand animate-spin" />
            <p className="mt-4 text-muted">
              {language === "en" ? "Verifying payment..." : "Memverifikasi pembayaran..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {activated ? (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-emerald-950/40">
                <CheckCircle className="size-8 text-green-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-2xl">
                {language === "en" ? "Subscription Active!" : "Langganan Aktif!"}
              </CardTitle>
              <CardDescription>
                {language === "en"
                  ? "Payment verified successfully. PRO access is now available."
                  : "Pembayaran berhasil diverifikasi, akses PRO sudah tersedia"}
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/40">
                <Loader2 className="size-8 text-amber-600 dark:text-amber-400 animate-spin" />
              </div>
              <CardTitle className="text-2xl">
                {language === "en" ? "Awaiting Verification" : "Menunggu Verifikasi"}
              </CardTitle>
              <CardDescription>
                {language === "en"
                  ? "Payment is processing, usually takes 1-5 minutes."
                  : "Pembayaran sedang diproses, biasanya butuh 1-5 menit"}
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {activated && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-sm text-green-800 dark:text-emerald-300">
              <p className="font-medium flex items-center gap-2">
                <Sparkles className="size-4" />
                {language === "en" ? "All PRO features are now unlocked" : "Semua fitur PRO sekarang terbuka"}
              </p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>{language === "en" ? "Unlimited AI Receipt Scans" : "AI Scan Struk unlimited"}</li>
                <li>{language === "en" ? "Unlimited PDF/Excel/HTML Exports" : "Export PDF/Excel/HTML unlimited"}</li>
                <li>{language === "en" ? "Comprehensive Multi-period Reports" : "Laporan lengkap semua periode"}</li>
              </ul>
            </div>
          )}

          <Button
            onClick={() => router.push(redirect)}
            className="w-full"
            size="lg"
          >
            <ArrowRight className="size-4 mr-2" />
            {activated
              ? (language === "en" ? "Proceed to Dashboard" : "Lanjut ke Dashboard")
              : (language === "en" ? "Check Status Again" : "Cek Status Lagi")}
          </Button>

          <div className="text-center text-sm text-muted">
            <Link href="/subscribe" className="text-brand hover:underline">
              {language === "en" ? "Back to Subscription Page" : "Kembali ke halaman langganan"}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SubscribeSuccessPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted">{t.common.loading}</div>}>
      <SubscribeSuccessContent />
    </Suspense>
  );
}