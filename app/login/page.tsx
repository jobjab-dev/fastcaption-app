"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/app/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useLocale } from "@/app/components/LocaleProvider";

type AuthTab = "email" | "phone";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const supabase = createSupabaseBrowserClient();
  const { t } = useLocale();

  // Email state
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // Phone state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState<AuthTab>("email");

  // Error/success
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // ── OAuth Sign In ──
  const handleOAuth = async (provider: "google" | "facebook") => {
    clearMessages();
    setLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
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
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email.trim()) return;
    setLoading("email");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
    } else {
      setEmailSent(true);
      setSuccess(t("login.emailSent"));
    }
    setLoading(null);
  };

  // ── Phone OTP ──
  const handlePhoneSend = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    const cleaned = phone.trim().replace(/[^+\d]/g, "");
    if (!cleaned || cleaned.length < 8) {
      setError(t("login.phoneInvalid"));
      return;
    }
    setLoading("phone-send");
    const { error } = await supabase.auth.signInWithOtp({
      phone: cleaned,
    });
    if (error) {
      setError(error.message);
    } else {
      setOtpSent(true);
      setSuccess(t("login.otpSent"));
      // Focus first OTP input
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
    setLoading(null);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    // Auto-focus next
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split("");
      setOtp(newOtp);
      otpRefs.current[5]?.focus();
    }
  };

  const handlePhoneVerify = async () => {
    clearMessages();
    const code = otp.join("");
    if (code.length !== 6) {
      setError(t("login.otpInvalid"));
      return;
    }
    setLoading("phone-verify");
    const cleaned = phone.trim().replace(/[^+\d]/g, "");
    const { error } = await supabase.auth.verifyOtp({
      phone: cleaned,
      token: code,
      type: "sms",
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    } else {
      // Ensure user record exists
      try {
        await fetch("/api/auth/ensure-user", { method: "POST" });
      } catch {}
      router.replace("/dashboard");
    }
  };

  return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 60px)" }}>
      <div className="card" style={{ width: "100%", maxWidth: "440px", padding: "36px 32px", textAlign: "center" }}>
        {/* Header */}
        <div style={{ marginBottom: "6px", fontSize: "2.5rem" }}>⚡</div>
        <h1 style={{ fontSize: "1.7rem", marginBottom: "6px" }}>{t("login.title")}</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "28px", fontSize: "0.92rem" }}>
          {t("login.desc")}
        </p>

        {/* ── OAuth Buttons ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          {/* Google */}
          <button
            id="login-google"
            className="btn btn-primary btn-lg"
            style={{ width: "100%", gap: "10px" }}
            onClick={() => handleOAuth("google")}
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

          {/* Facebook */}
          <button
            id="login-facebook"
            className="btn btn-secondary btn-lg"
            style={{ width: "100%", gap: "10px", background: "#1877F2", borderColor: "#1877F2", color: "#fff" }}
            onClick={() => handleOAuth("facebook")}
            disabled={loading !== null}
          >
            {loading === "facebook" ? (
              <><span className="spinner" /> {t("login.loading")}</>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                {t("login.facebook")}
              </>
            )}
          </button>
        </div>

        {/* ── Divider ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          margin: "0 0 24px 0", color: "var(--text-muted)", fontSize: "0.8rem",
        }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          {t("login.or")}
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        {/* ── Tabs: Email / Phone ── */}
        <div style={{
          display: "flex", gap: "4px", marginBottom: "20px",
          background: "var(--surface-2)", borderRadius: "var(--radius)", padding: "3px",
        }}>
          <button
            id="tab-email"
            onClick={() => { setActiveTab("email"); clearMessages(); }}
            style={{
              flex: 1, padding: "8px 0", borderRadius: "calc(var(--radius) - 2px)",
              border: "none", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
              background: activeTab === "email" ? "var(--surface)" : "transparent",
              color: activeTab === "email" ? "var(--text-primary)" : "var(--text-muted)",
              transition: "all 0.2s",
              boxShadow: activeTab === "email" ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
            }}
          >
            ✉️ {t("login.tabEmail")}
          </button>
          <button
            id="tab-phone"
            onClick={() => { setActiveTab("phone"); clearMessages(); }}
            style={{
              flex: 1, padding: "8px 0", borderRadius: "calc(var(--radius) - 2px)",
              border: "none", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
              background: activeTab === "phone" ? "var(--surface)" : "transparent",
              color: activeTab === "phone" ? "var(--text-primary)" : "var(--text-muted)",
              transition: "all 0.2s",
              boxShadow: activeTab === "phone" ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
            }}
          >
            📱 {t("login.tabPhone")}
          </button>
        </div>

        {/* ── Email Tab ── */}
        {activeTab === "email" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            {emailSent ? (
              <div className="alert alert-success" style={{ textAlign: "left" }}>
                ✉️ {t("login.emailSentDesc")}
              </div>
            ) : (
              <form onSubmit={handleEmailLogin}>
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
                  style={{ marginBottom: "12px" }}
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
                    <>{t("login.emailSubmit")}</>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── Phone Tab ── */}
        {activeTab === "phone" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            {!otpSent ? (
              <form onSubmit={handlePhoneSend}>
                <div style={{ position: "relative", marginBottom: "12px" }}>
                  <input
                    id="input-phone"
                    type="tel"
                    className="input"
                    placeholder={t("login.phonePlaceholder")}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading !== null}
                    required
                    autoComplete="tel"
                  />
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "12px", textAlign: "left" }}>
                  {t("login.phoneHint")}
                </p>
                <button
                  id="login-phone-submit"
                  type="submit"
                  className="btn btn-secondary btn-lg"
                  style={{ width: "100%" }}
                  disabled={loading !== null || !phone.trim()}
                >
                  {loading === "phone-send" ? (
                    <><span className="spinner" /> {t("login.loading")}</>
                  ) : (
                    <>{t("login.phoneSendOtp")}</>
                  )}
                </button>
              </form>
            ) : (
              <div>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
                  {t("login.otpDesc")} <strong>{phone}</strong>
                </p>
                {/* OTP Input */}
                <div
                  style={{
                    display: "flex", gap: "8px", justifyContent: "center", marginBottom: "16px",
                  }}
                  onPaste={handleOtpPaste}
                >
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className="input"
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      disabled={loading !== null}
                      style={{
                        width: "44px", height: "52px", textAlign: "center",
                        fontSize: "1.3rem", fontWeight: 700, padding: "0",
                        letterSpacing: "0",
                      }}
                    />
                  ))}
                </div>
                <button
                  id="login-phone-verify"
                  className="btn btn-primary btn-lg"
                  style={{ width: "100%", marginBottom: "12px" }}
                  onClick={handlePhoneVerify}
                  disabled={loading !== null || otp.join("").length !== 6}
                >
                  {loading === "phone-verify" ? (
                    <><span className="spinner" /> {t("login.loading")}</>
                  ) : (
                    <>{t("login.phoneVerify")}</>
                  )}
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ width: "100%", fontSize: "0.85rem" }}
                  onClick={() => { setOtpSent(false); setOtp(["", "", "", "", "", ""]); clearMessages(); }}
                  disabled={loading !== null}
                >
                  {t("login.phoneChangeNumber")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Error/Success Messages ── */}
        {error && (
          <div className="alert alert-error" style={{ marginTop: "16px", textAlign: "left", fontSize: "0.88rem" }}>
            {error}
          </div>
        )}
        {success && !error && (
          <div className="alert alert-success" style={{ marginTop: "16px", textAlign: "left", fontSize: "0.88rem" }}>
            {success}
          </div>
        )}

        {/* ── Footer ── */}
        <p style={{ marginTop: "24px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
          {t("login.terms")}<br />
          <strong style={{ color: "var(--accent-light)" }}>{t("login.bonus", { credits: "5,000 credits" })}</strong>
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
