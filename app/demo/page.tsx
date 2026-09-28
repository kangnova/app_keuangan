"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield, Clock, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function DemoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [loading, setLoading] = useState(false);

  async function startDemo() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal memulai demo");
      }

      toast.success("Mode demo aktif! Selamat mencoba Duitku selama 3 hari.");
      router.push(redirect);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500">
            <Sparkles className="size-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Coba Demo Gratis 3 Hari</CardTitle>
          <CardDescription>
            Eksplorasi semua fitur Duitku tanpa daftar — termasuk AI scan struk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <Clock className="size-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Masa Aktif: 3 Hari</p>
                <p className="text-amber-700">Mulai dari saat Anda klik tombol di bawah</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
              <Shield className="size-5 text-green-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-green-800">Data Aman & Privat</p>
                <p className="text-green-700">Data demo hanya tersimpan sementara, tidak dikaitkan dengan identitas nyata</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <Sparkles className="size-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Fitur Lengkap</p>
                <p className="text-blue-700">CRUD transaksi, laporan, export, AI scan struk (mode demo)</p>
              </div>
            </div>
          </div>

          <Button onClick={startDemo} className="w-full" size="lg" loading={loading}>
            <ArrowRight className="size-4 mr-2" />
            Mulai Demo Sekarang
          </Button>

          <div className="text-center text-sm text-muted">
            Atau <Link href="/login" className="text-brand hover:underline">masuk</Link> /{" "}
            <Link href="/register" className="text-brand hover:underline">daftar</Link> untuk trial 3 hari + simpan data permanen
          </div>
        </CardContent>
      </Card>
    </div>
  );
}