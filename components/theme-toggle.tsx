"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

const ORDER: Theme[] = ["light", "dark", "system"];
const LABELS: Record<Theme, string> = {
  light: "Terang",
  dark: "Gelap",
  system: "Otomatis",
};

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

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Theme) || "system";
    setTheme(saved);
    applyTheme(saved);

    // Saat mode "Otomatis", ikuti perubahan setting sistem (gelap/terang OS)
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

  return (
    <button
      onClick={cycle}
      aria-label={`Tema: ${LABELS[theme]} (klik untuk ganti)`}
      title={`Tema: ${LABELS[theme]} — klik untuk ganti`}
      className="flex size-9 items-center justify-center rounded-lg text-muted transition hover:bg-accent hover:text-foreground"
    >
      {theme === "light" && <Sun className="size-5" />}
      {theme === "dark" && <Moon className="size-5" />}
      {theme === "system" && <Monitor className="size-5" />}
    </button>
  );
}
