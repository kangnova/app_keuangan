"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Clock, Sparkles, ArrowRight } from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";

function DemoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [loading, setLoading] = useState(false);
  const { t, language } = useLanguage();

  async function startDemo() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || (language === "en" ? "Failed to start demo" : "Gagal memulai demo"));
      }

      toast.success(
        language === "en"
          ? "Demo mode activated! Enjoy exploring Duitku for 3 days."
          : "Mode demo aktif! Selamat mencoba Duitku selama 3 hari."
      );
      router.push(redirect);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md mb-3 flex justify-end">
        <LanguageToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500">
            <Sparkles className="size-8 text-white" />
          </div>
          <CardTitle className="text-2xl">{t.demo.title}</CardTitle>
          <CardDescription>{t.demo.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40">
              <Clock className="size-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-400">{t.demo.activeDuration}</p>
                <p className="text-amber-700 dark:text-amber-300">{t.demo.activeDurationDesc}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-emerald-950/20 dark:border-emerald-900/40">
              <Shield className="size-5 text-green-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-green-800 dark:text-emerald-400">{t.demo.noCard}</p>
                <p className="text-green-700 dark:text-emerald-300">{t.demo.noCardDesc}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-sky-950/20 dark:border-sky-900/40">
              <Sparkles className="size-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 dark:text-sky-400">{t.demo.fullAccess}</p>
                <p className="text-blue-700 dark:text-sky-300">{t.demo.fullAccessDesc}</p>
              </div>
            </div>
          </div>

          <Button onClick={startDemo} className="w-full bg-amber-500 hover:bg-amber-600 text-white" size="lg" loading={loading}>
            <ArrowRight className="size-4 mr-2" />
            {t.demo.startBtn}
          </Button>

          <div className="text-center text-sm text-muted">
            {t.demo.orLogin}{" "}
            <Link href="/login" className="text-brand hover:underline font-medium">
              {t.nav.login}
            </Link>{" "}
            /{" "}
            <Link href="/register" className="text-brand hover:underline font-medium">
              {t.nav.register}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DemoPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted">{t.common.loading}</div>}>
      <DemoContent />
    </Suspense>
  );
}