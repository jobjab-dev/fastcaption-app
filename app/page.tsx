"use client";

import Link from "next/link";
import { useLocale } from "./components/LocaleProvider";

/* Inline SVG icons — consistent & professional (no emoji) */
const icons = {
  mic: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  ),
  film: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
      <line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/>
      <line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>
    </svg>
  ),
  globe: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  zap: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  link: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  download: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
};

export default function HomePage() {
  const { t } = useLocale();

  const features = [
    { icon: icons.mic, title: t("home.feat1.title"), desc: t("home.feat1.desc") },
    { icon: icons.film, title: t("home.feat2.title"), desc: t("home.feat2.desc") },
    { icon: icons.globe, title: t("home.feat3.title"), desc: t("home.feat3.desc") },
    { icon: icons.zap, title: t("home.feat4.title"), desc: t("home.feat4.desc") },
    { icon: icons.link, title: t("home.feat5.title"), desc: t("home.feat5.desc") },
    { icon: icons.download, title: t("home.feat6.title"), desc: t("home.feat6.desc") },
  ];

  return (
    <div className="page">
      {/* Hero */}
      <div className="container" style={{ textAlign: "center", paddingTop: "40px", paddingBottom: "80px" }}>
        {/* Logo */}
        <img
          src="/android-chrome-192x192.png"
          alt="FastCaption"
          width={64}
          height={64}
          style={{ display: "block", margin: "0 auto 20px", borderRadius: "16px" }}
        />

        <div style={{
          display: "inline-block",
          padding: "6px 16px",
          borderRadius: "99px",
          background: "rgba(249, 115, 22, 0.15)",
          border: "1px solid rgba(249, 115, 22, 0.3)",
          fontSize: "0.85rem",
          color: "var(--accent-light)",
          fontWeight: 600,
          marginBottom: "24px",
          letterSpacing: "0.3px",
        }}>
          {t("home.badge")}
        </div>

        <h1 style={{
          fontSize: "clamp(2.2rem, 5vw, 3.8rem)",
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: "-1px",
          marginBottom: "20px",
          background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          {t("home.title1")}<br />
          <span style={{
            background: "linear-gradient(135deg, #f97316, #1e3a5f)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            {t("home.title2")}
          </span>
        </h1>

        <p style={{
          fontSize: "1.15rem",
          color: "var(--text-secondary)",
          maxWidth: "560px",
          margin: "0 auto 40px",
          lineHeight: 1.7,
        }}>
          {t("home.desc")}
        </p>

        <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/login" className="btn btn-primary btn-lg" style={{ fontSize: "1.05rem", padding: "14px 32px" }}>
            {t("home.cta")}
          </Link>
          <Link href="/pricing" className="btn btn-secondary btn-lg">
            {t("home.pricing")}
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container" style={{ paddingBottom: "80px" }}>
        <div className="features-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
        }}>
          {features.map((f) => (
            <div key={f.title} className="card" style={{ padding: "28px" }}>
              <div style={{
                width: "48px", height: "48px", borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(167,139,250,0.15), rgba(96,165,250,0.15))",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: "14px", color: "var(--accent-light)",
              }}>
                {f.icon}
              </div>
              <h3 style={{ marginBottom: "8px" }}>{f.title}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Banner */}
      <div className="container" style={{ paddingBottom: "60px" }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(59,130,246,0.2))",
          border: "1px solid rgba(167,139,250,0.2)",
          borderRadius: "20px",
          padding: "48px 32px",
          textAlign: "center",
        }}>
          <img
            src="/android-chrome-192x192.png"
            alt=""
            width={48}
            height={48}
            style={{ borderRadius: "12px", marginBottom: "16px" }}
          />
          <h2 style={{ fontSize: "1.8rem", marginBottom: "12px" }}>
            {t("home.bonus.title", { credits: "5,000" })}
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "28px" }}>
            {t("home.bonus.desc")}
          </p>
          <Link href="/login" className="btn btn-primary btn-lg" style={{ fontSize: "1.05rem", padding: "14px 32px" }}>
            {t("home.bonus.cta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
