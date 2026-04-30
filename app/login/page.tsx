"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/app/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useLocale } from "@/app/components/LocaleProvider";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const supabase = createSupabaseBrowserClient();
  const { t } = useLocale();

  // Email form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace("/dashboard");
      } else {
        setChecking(false);
      }
    });
  }, [router, supabase.auth]);

  if (checking) {
    return (
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 60px)" }}>
        <span className="spinner spinner-lg" />
      </div>
    );
  }

  // ── Google OAuth ──
  const handleGoogle = async () => {
    setError(null);
    setLoading("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    }
  };

  // ── Email Magic Link ──
  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return;
    if (!fullName.trim()) {
      setError(t("login.nameRequired"));
      return;
    }
    setLoading("email");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName.trim(),
        },
      },
    });
    if (error) {
      setError(error.message);
    } else {
      setEmailSent(true);
    }
    setLoading(null);
  };

  return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 60px)" }}>
      <div className="card" style={{ width: "100%", maxWidth: "420px", padding: "40px", textAlign: "center" }}>
        {/* Header */}
        <img
          src="/android-chrome-192x192.png"
          alt="FastCaption"
          width={56}
          height={56}
          style={{ marginBottom: "8px", borderRadius: "14px" }}
        />
        <h1 style={{ fontSize: "1.8rem", marginBottom: "8px" }}>{t("login.title")}</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "32px", fontSize: "0.95rem" }}>
          {t("login.desc")}
        </p>

        {/* ── Google Button ── */}
        <button
          id="login-google"
          className="btn btn-primary btn-lg"
          style={{ width: "100%", gap: "10px", marginBottom: "20px" }}
          onClick={handleGoogle}
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

        {/* ── Divider ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          margin: "0 0 20px 0", color: "var(--text-muted)", fontSize: "0.8rem",
        }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          {t("login.or")}
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        {/* ── Email Form ── */}
        {emailSent ? (
          <div className="alert alert-success" style={{ textAlign: "left" }}>
            ✉️ {t("login.emailSentDesc")}
          </div>
        ) : (
          <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              id="input-name"
              type="text"
              className="input"
              placeholder={t("login.namePlaceholder")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading !== null}
              autoComplete="name"
            />
            <input
              id="input-email"
              type="email"
              className="input"
              placeholder={t("login.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading !== null}
              required
              autoComplete="email"
            />
            <button
              id="login-email-submit"
              type="submit"
              className="btn btn-secondary btn-lg"
              style={{ width: "100%" }}
              disabled={loading !== null || !email.trim()}
            >
              {loading === "email" ? (
                <><span className="spinner" /> {t("login.loading")}</>
              ) : (
                <>✉️ {t("login.emailSubmit")}</>
              )}
            </button>
          </form>
        )}

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ marginTop: "14px", textAlign: "left", fontSize: "0.88rem" }}>
            {error}
          </div>
        )}

        {/* Footer */}
        <p style={{ marginTop: "24px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          {t("login.terms")}<br />
          <strong style={{ color: "var(--accent-light)" }}>{t("login.bonus", { credits: "5,000 credits" })}</strong>
        </p>
      </div>
    </div>
  );
}
