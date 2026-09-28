"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function SubscribeSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [checking, setChecking] = useState(true);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    async function checkSubscription() {
      try {
        const res = await fetch("/api/payments/subscription-status");
        if (res.ok) {
          const data = await res.json();
          if (data.status === "pro") {
            setActivated(true);
            toast.success("Langganan PRO aktif! Selamat menikmati fitur lengkap Duitku.");
          }
        }
      } catch {
        // ignore
      } finally {
        setChecking(false);
      }
    }
    checkSubscription();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <Loader2 className="size-8 mx-auto text-brand animate-spin" />
            <p className="mt-4 text-muted">Memverifikasi pembayaran...</p>
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
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
                <CheckCircle className="size-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Langganan Aktif!</CardTitle>
              <CardDescription>Pembayaran berhasil diverifikasi, akses PRO sudah tersedia</CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
                <Loader2 className="size-8 text-amber-600 animate-spin" />
              </div>
              <CardTitle className="text-2xl">Menunggu Verifikasi</CardTitle>
              <CardDescription>Pembayaran sedang diproses, biasanya butuh 1-5 menit</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {activated && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
              <p className="font-medium flex items-center gap-2">
                <Sparkles className="size-4" />
                Semua fitur PRO sekarang terbuka
              </p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>AI Scan Struk unlimited</li>
                <li>Export PDF/Excel/HTML unlimited</li>
                <li>Laporan lengkap semua periode</li>
              </ul>
            </div>
          )}

          <Button
            onClick={() => router.push(redirect)}
            className="w-full"
            size="lg"
          >
            <ArrowRight className="size-4 mr-2" />
            {activated ? "Lanjut ke Dashboard" : "Cek Status Lagi"}
          </Button>

          <div className="text-center text-sm text-muted">
            <Link href="/subscribe" className="text-brand hover:underline">
              Kembali ke halaman langganan
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}