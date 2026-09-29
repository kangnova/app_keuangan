"use client";

import { useLanguage } from "@/lib/i18n";
import { Languages } from "lucide-react";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();

  const toggle = () => {
    setLanguage(language === "en" ? "id" : "en");
  };

  return (
    <button
      onClick={toggle}
      aria-label={`${t.lang.language}: ${language === "en" ? "English" : "Bahasa Indonesia"} (${t.lang.switchTo})`}
      title={`${t.lang.language}: ${language === "en" ? "English (EN)" : "Bahasa Indonesia (ID)"} — ${t.lang.switchTo}`}
      className={`group relative flex h-9 items-center gap-1.5 rounded-lg border border-line bg-card/60 px-2.5 text-xs font-semibold text-muted backdrop-blur transition hover:border-brand/40 hover:bg-accent hover:text-foreground active:scale-95 ${className}`}
    >
      <Languages className="size-4 text-brand transition group-hover:rotate-12" />
      <span className="flex items-center gap-1">
        <span className={language === "en" ? "text-brand font-bold" : "text-muted opacity-70"}>EN</span>
        <span className="text-[10px] text-line opacity-80">/</span>
        <span className={language === "id" ? "text-brand font-bold" : "text-muted opacity-70"}>ID</span>
      </span>
    </button>
  );
}
