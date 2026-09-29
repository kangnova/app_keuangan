"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield, Sparkles, CreditCard, Check } from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";

function SubscribeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [loading, setLoading] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("TRIAL");
  const { t, language } = useLanguage();

  const plans = [
    {
      id: "pro_monthly",
      name: t.landing.monthlyPlan,
      price: 29000,
      period: t.landing.monthlyPeriod,
      features:
        language === "en"
          ? [
              "Unlimited AI Receipt Scans",
              "Unlimited PDF, Excel & HTML Exports",
              "Full Multi-period Reports & Analytics",
              "Multi-device Cloud Sync",
              "Priority Customer Support",
            ]
          : [
              "AI Scan Struk unlimited",
              "Export PDF/Excel/HTML unlimited",
              "Laporan lengkap semua periode",
              "Sinkronisasi multi-device",
              "Dukungan prioritas",
            ],
      popular: true,
    },
    {
      id: "pro_yearly",
      name: t.landing.yearlyPlan,
      price: 290000,
      period: t.landing.yearlyPeriod,
      features:
        language === "en"
          ? [
              "All Monthly PRO features",
              "Save ~17% (2 Months Free)",
              "Unlimited AI Receipt Scans",
              "Unlimited PDF, Excel & HTML Exports",
              "Priority Customer Support",
            ]
          : [
              "Semua fitur PRO Bulanan",
              "Hemat ~17% (gratis 2 bulan)",
              "AI Scan Struk unlimited",
              "Export PDF/Excel/HTML unlimited",
              "Dukungan prioritas",
            ],
      popular: false,
    },
  ];

  useEffect(() => {
    async function checkUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUserPlan(data.user?.plan || "TRIAL");
        }
      } catch {}
    }
    checkUser();
  }, []);

  async function subscribe(planId: string) {
    setLoading(planId);
    try {
      const res = await fetch("/api/payments/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          redirectUrl: `${window.location.origin}/subscribe/success?redirect=${encodeURIComponent(redirect)}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || (language === "en" ? "Failed to create subscription" : "Gagal membuat langganan"));
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-end mb-4">
          <LanguageToggle />
        </div>
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand/80">
            <Sparkles className="size-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">{t.subscribe.title}</h1>
          <p className="text-muted mt-2">
            {t.subscribe.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative ${plan.popular ? "ring-2 ring-brand" : ""}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand text-white text-xs font-medium rounded-full">
                  {language === "en" ? "Popular" : "Populer"}
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>
                  <div className="text-4xl font-bold text-brand mt-2">
                    Rp{plan.price.toLocaleString("id-ID")}<span className="text-xl font-normal text-muted">{plan.period}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="size-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  size="lg"
                  variant={plan.popular ? "primary" : "outline"}
                  onClick={() => subscribe(plan.id)}
                  loading={loading === plan.id}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      {language === "en" ? "Processing..." : "Memproses..."}
                    </>
                  ) : (
                    <>
                      <CreditCard className="size-4 mr-2" />
                      {language === "en" ? `Choose ${plan.name}` : `Pilih ${plan.name}`}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="size-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-300">
                <p className="font-medium">{language === "en" ? "Payment via Midtrans" : "Pembayaran via Midtrans"}</p>
                <p>
                  {language === "en"
                    ? "Bank Transfer, Virtual Account, e-Wallets (GoPay, ShopeePay, Dana), QRIS, Credit Card"
                    : "Transfer bank, Virtual Account, e-Wallet (GoPay, ShopeePay, Dana), QRIS, Kartu Kredit"}
                </p>
                <p className="mt-2">
                  {language === "en"
                    ? "Once payment is confirmed, PRO features are unlocked automatically."
                    : "Setelah pembayaran berhasil, akses PRO diaktifkan otomatis via webhook."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted">
          <Link href="/" className="text-brand hover:underline">
            {language === "en" ? "← Back to Dashboard" : "← Kembali ke Dashboard"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted">{t.common.loading}</div>}>
      <SubscribeContent />
    </Suspense>
  );
}