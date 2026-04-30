"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/app/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useLocale } from "@/app/components/LocaleProvider";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const supabase = createSupabaseBrowserClient();
  const { t } = useLocale();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace("/dashboard");
      } else {
        setChecking(false);
      }
    });
  }, [router, supabase.auth]);

  // Show nothing while checking session or redirecting
  if (checking) {
    return (
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 60px)" }}>
        <span className="spinner" />
      </div>
    );
  }

  const handleSignIn = async (provider: "google" | "github") => {
    setLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) {
      console.error("Login error:", error);
      setLoading(null);
    }
  };

  return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 60px)" }}>
      <div className="card" style={{ width: "100%", maxWidth: "420px", padding: "40px", textAlign: "center" }}>
        <div style={{ marginBottom: "8px", fontSize: "2.5rem" }}>⚡</div>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "8px" }}>{t("login.title")}</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "32px", fontSize: "0.95rem" }}>
          {t("login.desc")}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            className="btn btn-primary btn-lg"
            style={{ width: "100%", gap: "10px" }}
            onClick={() => handleSignIn("google")}
            disabled={loading !== null}
          >
            {loading === "google" ? (
              <><span className="spinner" /> {t("login.loading")}</>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {t("login.google")}
              </>
            )}
          </button>

          <button
            className="btn btn-secondary btn-lg"
            style={{ width: "100%", gap: "10px" }}
            onClick={() => handleSignIn("github")}
            disabled={loading !== null}
          >
            {loading === "github" ? (
              <><span className="spinner" /> {t("login.loading")}</>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
                {t("login.github")}
              </>
            )}
          </button>
        </div>

        <p style={{ marginTop: "24px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          {t("login.terms")}<br />
          <strong style={{ color: "var(--accent-light)" }}>{t("login.bonus", { credits: "5,000 credits" })}</strong>
        </p>
      </div>
    </div>
  );
}
