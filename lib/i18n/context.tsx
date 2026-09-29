"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import type { Language, Translations } from "./types";
import { en } from "./dictionaries/en";
import { id } from "./dictionaries/id";

const dictionaries: Record<Language, Translations> = { en, id };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  formatCurrency: (amount: number) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = "duitku_lang";

export function LanguageProvider({
  children,
  defaultLanguage = "en",
}: {
  children: React.ReactNode;
  defaultLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved && (saved === "en" || saved === "id")) {
        setLanguageState(saved);
        document.documentElement.lang = saved;
      } else {
        setLanguageState("en");
        document.documentElement.lang = "en";
      }
    } catch {
      // Ignore localStorage errors
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      // Ignore
    }
  };

  const t = useMemo(() => dictionaries[language] ?? dictionaries.en, [language]);

  const formatCurrency = (amount: number) => {
    // Format according to IDR currency with clean commas or dots
    const formatter = new Intl.NumberFormat(language === "id" ? "id-ID" : "en-US", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    });
    return formatter.format(amount).replace(/\s/g, " ");
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      formatCurrency,
    }),
    [language, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback to English if used outside LanguageProvider
    return {
      language: "en" as Language,
      setLanguage: () => {},
      t: en,
      formatCurrency: (amt: number) => `Rp ${amt.toLocaleString("en-US")}`,
    };
  }
  return context;
}
