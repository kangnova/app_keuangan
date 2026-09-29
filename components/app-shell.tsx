"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-hooks";
import { Home, ArrowLeftRight, Scale, ScanLine, BarChart3, Wallet } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Home; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] font-medium transition ${
        active ? "text-brand" : "text-muted hover:text-foreground"
      }`}
    >
      <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // Admin routes: full desktop view without mobile bottom nav
  if (pathname.startsWith("/admin")) {
    return <div className="min-h-dvh w-full bg-background">{children}</div>;
  }

  // Public pages (unauthenticated): landing, login, register, demo
  if (!loading && !user) {
    return <div className="min-h-dvh w-full bg-background">{children}</div>;
  }

  const navLeft = [
    { href: "/", label: t.nav.home, icon: Home },
    { href: "/transactions", label: t.nav.transactions, icon: ArrowLeftRight },
    { href: "/debts", label: t.nav.debts, icon: Scale },
  ];
  const navRight = [
    { href: "/reports", label: t.nav.reports, icon: BarChart3 },
    { href: "/accounts", label: t.nav.accounts, icon: Wallet },
  ];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex-1 px-4 pb-28 pt-5">{children}</main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-1.5">
          {navLeft.map((n) => (
            <NavItem key={n.href} {...n} active={isActive(n.href)} />
          ))}
          <div className="flex justify-center">
            <Link
              href="/scan"
              aria-label={t.nav.scan}
              className={`-mt-6 flex size-14 flex-col items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30 transition active:scale-95 ${
                isActive("/scan") ? "ring-4 ring-brand/30" : ""
              }`}
            >
              <ScanLine className="size-6" />
              <span className="text-[9px] font-semibold">{t.nav.scan}</span>
            </Link>
          </div>
          {navRight.map((n) => (
            <NavItem key={n.href} {...n} active={isActive(n.href)} />
          ))}
        </div>
      </nav>
    </div>
  );
}
