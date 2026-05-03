"use client";

import Link from "next/link";
import { useLocale } from "./components/LocaleProvider";
import { OutputCarousel } from "./components/OutputCarousel";
import { FAQAccordion } from "./components/FAQAccordion";

/* Minimal SVG icons */
const icons = {
  mic: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  ),
  film: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
      <line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/>
      <line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>
    </svg>
  ),
  globe: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  zap: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  link: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  download: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
};

const FAQ_COUNT = 12;

export default function HomePage() {
  const { t } = useLocale();

  // Build FAQ items dynamically from i18n
  const faqItems = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    q: t(`faq.${i + 1}.q`),
    a: t(`faq.${i + 1}.a`),
  }));

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
      <section className="container" style={{ textAlign: "center", paddingTop: "60px", paddingBottom: "48px", maxWidth: "680px" }}>
        <p style={{
          fontSize: "0.75rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "2px",
          color: "var(--accent)",
          marginBottom: "16px",
        }}>
          {t("home.badge")}
        </p>

        <h1 style={{
          fontSize: "clamp(2rem, 4.5vw, 3.2rem)",
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: "-0.5px",
          marginBottom: "20px",
          color: "var(--text-primary)",
        }}>
          {t("home.title1")}{" "}
          <span style={{ color: "var(--accent)" }}>
            {t("home.title2")}
          </span>
        </h1>

        <p style={{
          fontSize: "1rem",
          color: "var(--text-secondary)",
          maxWidth: "480px",
          margin: "0 auto 24px",
          lineHeight: 1.7,
        }}>
          {t("home.desc")}
        </p>

        {/* Trust badges */}
        <div style={{
          display: "flex",
          gap: "16px",
          justifyContent: "center",
          flexWrap: "wrap",
          marginBottom: "28px",
          fontSize: "0.82rem",
          color: "var(--text-muted)",
        }}>
          <span>✓ <strong style={{ color: "var(--success)" }}>{t("home.trust.free")}</strong></span>
          <span>✓ {t("home.trust.noCard")}</span>
          <span>✓ <strong style={{ color: "var(--accent-light)" }}>{t("home.trust.cheap")}</strong></span>
          <span>✓ {t("home.trust.noSub")}</span>
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/login" className="btn btn-primary btn-lg">
            {t("home.cta")}
          </Link>
          <Link href="/pricing" className="btn btn-secondary btn-lg">
            {t("home.pricing")}
          </Link>
        </div>
      </section>

      {/* Subtitle Preview Mockup */}
      <section style={{ paddingBottom: "48px", overflow: "hidden" }} aria-label="Output format preview">
        <OutputCarousel />
      </section>

      {/* Divider */}
      <div className="container"><div className="divider" /></div>

      {/* Features */}
      <section className="container" style={{ paddingBottom: "60px" }} aria-label="Features">
        <p style={{
          textAlign: "center",
          fontSize: "0.75rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "2px",
          color: "var(--text-muted)",
          marginBottom: "32px",
        }}>
          Features
        </p>
        <div className="features-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
        }}>
          {features.map((f) => (
            <article key={f.title} className="card fade-in-up" style={{
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}>
              <div style={{ color: "var(--accent)", lineHeight: 0 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: 0 }}>{f.title}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="container"><div className="divider" /></div>

      {/* FAQ Section */}
      <section className="container" style={{ paddingBottom: "60px" }} aria-label="FAQ" id="faq">
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <p style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "2px",
            color: "var(--text-muted)",
            marginBottom: "12px",
          }}>
            {t("home.faq.label")}
          </p>
          <h2 style={{
            fontFamily: "var(--font-heading, inherit)",
            fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
            fontWeight: 800,
            letterSpacing: "-0.5px",
            marginBottom: "8px",
          }}>
            {t("home.faq.title")}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            {t("home.faq.subtitle")}
          </p>
        </div>
        <FAQAccordion items={faqItems} />
      </section>

      {/* CTA */}
      <section className="container" style={{ paddingBottom: "60px" }} aria-label="Call to action">
        <div className="cta-banner">
          <h2 className="section-title">
            {t("home.bonus.title", { credits: "5,000" })}
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "12px", fontSize: "0.95rem" }}>
            {t("home.bonus.desc")}
          </p>
          <p style={{ color: "var(--text-muted)", marginBottom: "24px", fontSize: "0.88rem" }}>
            {t("home.bonus.extra")}
          </p>
          <Link href="/login" className="btn btn-primary btn-lg">
            {t("home.bonus.cta")}
          </Link>
        </div>
      </section>
    </div>
  );
}
