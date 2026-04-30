"use client";

import { LocaleProvider } from "./LocaleProvider";

// No session provider needed — Supabase Auth uses cookies managed by middleware
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      {children}
    </LocaleProvider>
  );
}
