"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, User, Eye, EyeOff, Shield } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/google-button";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const errorParam = searchParams.get("error");
  const { t, language } = useLanguage();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
          ? "Failed to register with Google. Please try again."
          : "Gagal mendaftar dengan akun Google. Silakan coba lagi."
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

    if (password !== confirmPassword) {
      toast.error(t.auth.passwordMismatch);
      return;
    }

    if (password.length < 8) {
      toast.error(t.auth.passwordMinLength);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || (language === "en" ? "Registration failed" : "Registrasi gagal"));
      }

      toast.success(t.auth.registerSuccess);
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
          <CardTitle className="text-2xl">{t.auth.registerTitle}</CardTitle>
          <CardDescription>{t.auth.registerSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <GoogleSignInButton text={t.auth.googleSignUp} />

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
                <Label htmlFor="name">{t.auth.nameLabel}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                  <Input
                    id="name"
                    type="text"
                    placeholder={language === "en" ? "Your Name" : "Nama Anda"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>

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
                    placeholder={language === "en" ? "Min. 8 characters" : "Minimal 8 karakter"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    autoComplete="new-password"
                    minLength={8}
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

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">{t.auth.confirmPasswordLabel}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder={language === "en" ? "Confirm password" : "Ulangi kata sandi"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" loading={loading}>
                <Shield className="size-4 mr-2" /> {t.auth.registerBtn}
              </Button>
            </form>
          </div>

          <div className="mt-6 text-center text-sm text-muted">
            {t.auth.haveAccountText}{" "}
            <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-brand hover:underline font-medium">
              {t.auth.loginLink}
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
              ? "3-day free trial • Subscribe to PRO afterwards for full AI receipt scanning"
              : "Trial 3 hari gratis • Setelahnya langganan PRO untuk akses AI scan struk"}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted">{t.common.loading}</div>}>
      <RegisterForm />
    </Suspense>
  );
}