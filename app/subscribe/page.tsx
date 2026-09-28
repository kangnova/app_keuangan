"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield, Sparkles, CreditCard, Check } from "lucide-react";
import { toast } from "sonner";

const PLANS = [
  {
    id: "pro_monthly",
    name: "PRO Bulanan",
    price: 29000,
    period: "/bulan",
    features: [
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
    name: "PRO Tahunan",
    price: 290000,
    period: "/tahun",
    features: [
      "Semua fitur PRO Bulanan",
      "Hemat ~17% (gratis 2 bulan)",
      "AI Scan Struk unlimited",
      "Export PDF/Excel/HTML unlimited",
      "Dukungan prioritas",
    ],
    popular: false,
  },
];

function SubscribeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [loading, setLoading] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("TRIAL");

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
        body: JSON.stringify({ planId, redirectUrl: `${window.location.origin}/subscribe/success?redirect=${encodeURIComponent(redirect)}` }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat langganan");
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand/80">
            <Sparkles className="size-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Upgrade ke PRO</h1>
          <p className="text-muted mt-2">
            Buka akses penuh AI Scan Struk, export unlimited, & laporan lengkap
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {PLANS.map((plan) => (
            <Card key={plan.id} className={`relative ${plan.popular ? "ring-2 ring-brand" : ""}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand text-white text-xs font-medium rounded-full">
                  Populer
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
                      Memproses...
                    </>
                  ) : (
                    <>
                      <CreditCard className="size-4 mr-2" />
                      Pilih {plan.name}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="size-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Pembayaran via Midtrans</p>
                <p>Transfer bank, Virtual Account, e-Wallet (GoPay, ShopeePay, Dana), QRIS, Kartu Kredit</p>
                <p className="mt-2">Setelah pembayaran berhasil, akses PRO diaktifkan otomatis via webhook.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted">
          <Link href="/" className="text-brand hover:underline">
            ← Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted">Memuat...</div>}>
      <SubscribeContent />
    </Suspense>
  );
}