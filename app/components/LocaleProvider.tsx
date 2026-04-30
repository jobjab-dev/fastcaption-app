"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { type Locale, translations, tpl } from "@/app/lib/i18n";

interface LocaleContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  isThai: boolean;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
  isThai: false,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Detect locale on mount
    // Priority: saved preference → geo cookie (from IP) → browser language
    const saved = localStorage.getItem("fastcaption-locale");
    if (saved === "th" || saved === "en") {
      setLocaleState(saved);
    } else {
      // Check geo-locale cookie set by middleware (based on IP country)
      const geoCookie = document.cookie
        .split("; ")
        .find((c) => c.startsWith("geo-locale="))
        ?.split("=")[1];
      if (geoCookie === "th" || geoCookie === "en") {
        setLocaleState(geoCookie);
      } else {
        const detected = navigator.language.startsWith("th") ? "th" : "en";
        setLocaleState(detected);
      }
    }
    setMounted(true);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("fastcaption-locale", l);
    // Set cookie for server-side locale detection (Dashboard, etc.)
    document.cookie = `fastcaption-locale=${l};path=/;max-age=31536000;SameSite=Lax`;
    // Update html lang attribute
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const dict = translations[locale];
      const val = dict[key] || translations.en[key] || key;
      return vars ? tpl(val, vars) : val;
    },
    [locale]
  );

  // Update html lang on locale change
  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = locale;
    }
  }, [locale, mounted]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, isThai: locale === "th" }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
