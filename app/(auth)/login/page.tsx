"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/google-button";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const errorParam = searchParams.get("error");
  const { t, language } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (errorParam === "google_not_configured") {
      toast.error(
        language === "en"
          ? "Google Client ID is not configured in .env"
          : "Google Client ID belum dikonfigurasi di file .env"
      );
    } else if (errorParam === "oauth_failed") {
      toast.error(
        language === "en"
          ? "Failed to sign in with Google. Please try again."
          : "Gagal masuk dengan akun Google. Silakan coba lagi."
      );
    } else if (errorParam === "invalid_oauth_state") {
      toast.error(
        language === "en"
          ? "Google authentication session expired. Please retry."
          : "Sesi autentikasi Google kedaluwarsa. Silakan ulangi."
      );
    }
  }, [errorParam, language]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || (language === "en" ? "Login failed" : "Login gagal"));
      }

      toast.success(t.auth.welcomeBack);
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
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
            <User className="size-6" />
          </div>
          <CardTitle className="text-2xl">{t.auth.loginTitle}</CardTitle>
          <CardDescription>{t.auth.loginSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <GoogleSignInButton text={t.auth.googleSignIn} />

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-line" />
              </div>
              <span className="relative bg-card px-2 text-xs uppercase tracking-wider text-muted">
                {t.auth.orWithEmail}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t.auth.emailLabel}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">{t.auth.passwordLabel}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" loading={loading}>
                {t.auth.loginBtn}
              </Button>
            </form>
          </div>

          <div className="mt-6 text-center text-sm text-muted">
            {t.auth.noAccountText}{" "}
            <Link href={`/register?redirect=${encodeURIComponent(redirect)}`} className="text-brand hover:underline font-medium">
              {t.auth.registerLink}
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link href="/demo" className="text-sm text-brand hover:underline">
              {t.auth.tryDemoLink}
            </Link>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <p className="text-xs text-center text-muted">
            {language === "en"
              ? "Free 3-day trial • Subscribe to PRO afterwards for full AI access"
              : "Demo gratis 3 hari • Setelahnya langganan PRO untuk akses AI"}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted">{t.common.loading}</div>}>
      <LoginForm />
    </Suspense>
  );
}