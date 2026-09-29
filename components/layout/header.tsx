"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut, Shield, Sparkles, CreditCard, Settings } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-hooks";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";

export function Header() {
  const { user, subscription, loading, refresh } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isDemoAccount = Boolean(user && (user.isDemo || user.email.startsWith("demo_") || subscription?.status === "demo"));

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        toast.success(t.nav.logout + " " + t.common.success.toLowerCase());
        setUserMenuOpen(false);
        await refresh();
        router.push("/");
      } else {
        toast.error(t.common.error);
      }
    } catch {
      toast.error(t.common.error);
    }
  }

  if (loading) {
    return (
      <header className="sticky top-0 z-40 w-full border-b border-line bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
          <div className="flex h-8 w-24 animate-pulse items-center justify-center rounded bg-muted" />
          <div className="flex h-8 w-32 animate-pulse items-center justify-center rounded bg-muted" />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-line bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand">
          <span className="text-xl">💰</span>
          <span className="hidden sm:block">Duitku</span>
        </Link>

        {!user && (
          <nav className="hidden md:flex md:items-center md:gap-1">
            <Link
              href="/demo"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/10 transition"
            >
              <Sparkles className="inline size-3.5 mr-1" /> {t.nav.demo}
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground hover:bg-accent transition"
            >
              {t.nav.login}
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand/90 transition"
            >
              <Shield className="inline size-3.5 mr-1" /> {t.nav.register}
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          {user ? (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <User className="size-4" />
                <span className="hidden sm:block">{isDemoAccount ? t.nav.demoUser : (user.name || user.email.split("@")[0])}</span>
                {isDemoAccount && (
                  <span className="hidden sm:inline-flex rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    DEMO
                  </span>
                )}
                <ChevronDown className="size-3.5" />
              </Button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-xl bg-popover border border-line shadow-lg p-1 animate-in fade-in-0 zoom-in-95">
                    <div className="px-3 py-2 border-b border-line">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{isDemoAccount ? t.nav.demoUser : (user.name || "User")}</p>
                        {isDemoAccount && (
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            DEMO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted truncate">
                        {isDemoAccount ? t.nav.guestAccount : user.email}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {subscription?.status === "pro" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <Shield className="size-2.5" /> PRO
                          </span>
                        )}
                        {subscription?.status === "trial" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            <Sparkles className="size-2.5" /> {t.nav.trialDaysLeft.replace("{days}", String(subscription.daysLeft))}
                          </span>
                        )}
                        {subscription?.status === "demo" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <Sparkles className="size-2.5" /> {t.nav.demoDaysLeft.replace("{days}", String(subscription.daysLeft))}
                          </span>
                        )}
                        {subscription?.status === "expired" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                            <CreditCard className="size-2.5" /> {t.nav.expired}
                          </span>
                        )}
                      </div>
                    </div>
                    {user.role === "ADMIN" && (
                      <>
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 rounded-lg"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Shield className="size-4" /> {t.nav.adminPanel}
                        </Link>
                        <Link
                          href="/settings"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-accent rounded-lg"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="size-4" /> {t.nav.aiSettings}
                        </Link>
                      </>
                    )}
                    {subscription?.status === "expired" && (
                      <Link
                        href="/subscribe"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-brand hover:bg-brand/10 rounded-lg"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <CreditCard className="size-4" /> {t.nav.upgradePro}
                      </Link>
                    )}
                    <hr className="my-1 border-line" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg"
                    >
                      <LogOut className="size-4" /> {t.nav.logout}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link href="/demo" className="hidden sm:block">
                <Button variant="outline" size="sm">
                  <Sparkles className="size-3.5 mr-1.5" /> {t.nav.demoFree}
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" size="sm">{t.nav.login}</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  <Shield className="size-3.5 mr-1.5" /> {t.nav.register}
                </Button>
              </Link>
            </>
          )}

          {!user && (
            <button
              className="md:hidden p-2 rounded-lg text-muted hover:bg-accent"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          )}
        </div>
      </div>

      {mobileMenuOpen && !user && (
        <div className="md:hidden border-t border-line bg-background p-4 animate-in slide-in-from-top-2">
          <nav className="flex flex-col gap-2">
            <Link href="/demo" className="rounded-lg px-3 py-2 text-sm font-medium text-brand" onClick={() => setMobileMenuOpen(false)}>{t.nav.demoFree}</Link>
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>{t.nav.login}</Link>
            <Link href="/register" className="rounded-lg px-3 py-2 text-sm font-medium text-brand" onClick={() => setMobileMenuOpen(false)}>{t.nav.register}</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}