"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

type Theme = "light" | "dark" | "system";

const ORDER: Theme[] = ["light", "dark", "system"];

function resolveDark(theme: Theme): boolean {
  if (theme === "light") return false;
  if (theme === "dark") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme) {
  const dark = resolveDark(theme);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.classList.toggle("light", !dark);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const { t } = useLanguage();

  const labels: Record<Theme, string> = {
    light: t.theme.light,
    dark: t.theme.dark,
    system: t.theme.system,
  };

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Theme) || "system";
    setTheme(saved);
    applyTheme(saved);

    // Follow OS system setting changes when in 'system' mode
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = localStorage.getItem("theme") as Theme | null;
      if (!current || current === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
    localStorage.setItem("theme", next);
    applyTheme(next);
  }

  const currentLabel = labels[theme] || theme;

  return (
    <button
      onClick={cycle}
      aria-label={`${t.theme.theme}: ${currentLabel} (${t.theme.clickToChange})`}
      title={`${t.theme.theme}: ${currentLabel} — ${t.theme.clickToChange}`}
      className="flex size-9 items-center justify-center rounded-lg text-muted transition hover:bg-accent hover:text-foreground"
    >
      {theme === "light" && <Sun className="size-5" />}
      {theme === "dark" && <Moon className="size-5" />}
      {theme === "system" && <Monitor className="size-5" />}
    </button>
  );
}
