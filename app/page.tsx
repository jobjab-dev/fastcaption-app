"use client";

import Link from "next/link";
import { useLocale } from "./components/LocaleProvider";

export default function HomePage() {
  const { t } = useLocale();

  const features = [
    { icon: "🎤", title: t("home.feat1.title"), desc: t("home.feat1.desc") },
    { icon: "🎬", title: t("home.feat2.title"), desc: t("home.feat2.desc") },
    { icon: "🌐", title: t("home.feat3.title"), desc: t("home.feat3.desc") },
    { icon: "⚡", title: t("home.feat4.title"), desc: t("home.feat4.desc") },
    { icon: "🔗", title: t("home.feat5.title"), desc: t("home.feat5.desc") },
    { icon: "💾", title: t("home.feat6.title"), desc: t("home.feat6.desc") },
  ];

  return (
    <div className="page">
      {/* Hero */}
      <div className="container" style={{ textAlign: "center", paddingTop: "40px", paddingBottom: "80px" }}>
        <div style={{
          display: "inline-block",
          padding: "6px 16px",
          borderRadius: "99px",
          background: "rgba(124, 58, 237, 0.15)",
          border: "1px solid rgba(167, 139, 250, 0.3)",
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
            background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
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
          <Link href="/transcribe" className="btn btn-primary btn-lg">
            {t("home.cta")}
          </Link>
          <Link href="/pricing" className="btn btn-secondary btn-lg">
            {t("home.pricing")}
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container" style={{ paddingBottom: "80px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "20px",
        }}>
          {features.map((f) => (
            <div key={f.title} className="card" style={{ padding: "28px" }}>
              <div style={{ fontSize: "2rem", marginBottom: "12px" }}>{f.icon}</div>
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
          <h2 style={{ fontSize: "1.8rem", marginBottom: "12px" }}>
            {t("home.bonus.title", { credits: "5,000" })}
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "28px" }}>
            {t("home.bonus.desc")}
          </p>
          <Link href="/login" className="btn btn-primary btn-lg">
            {t("home.bonus.cta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
