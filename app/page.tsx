"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useLocale } from "./components/LocaleProvider";

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

/* Peek carousel — shows prev/current/next with horizontal slide */
function OutputCarousel({ locale }: { locale: string }) {
  const [active, setActive] = useState(0);
  const isTh = locale === "th";
  const L = (th: string, en: string) => isTh ? th : en;

  const slides = useMemo(() => [
    { file: "output.srt", lines: [
      { c: "rgba(255,255,255,0.3)", t: "1" },
      { c: "rgba(249,115,22,0.5)", t: "00:00:01,240 --> 00:00:03,820" },
      { c: "rgba(255,255,255,0.7)", t: L("สวัสดีครับ วันนี้เราจะมาพูดถึง","Hello, today we'll talk about") },
      { c: "rgba(255,255,255,0)", t: "\u00A0" },
      { c: "rgba(255,255,255,0.3)", t: "2" },
      { c: "rgba(249,115,22,0.5)", t: "00:00:03,820 --> 00:00:06,100" },
      { c: "rgba(255,255,255,0.7)", t: L("เทคนิคการตัดต่อวิดีโอสำหรับ TikTok","video editing techniques for TikTok") },
      { c: "rgba(255,255,255,0)", t: "\u00A0" },
      { c: "rgba(255,255,255,0.3)", t: "3" },
      { c: "rgba(249,115,22,0.5)", t: "00:00:06,100 --> 00:00:08,500" },
      { c: "rgba(255,255,255,0.7)", t: L("ที่จะทำให้คอนเทนต์ของคุณดูดีขึ้น","that will make your content shine") },
    ]},
    { file: "output.ass", lines: [
      { c: "rgba(255,255,255,0.2)", t: "[Script Info]" },
      { c: "rgba(255,255,255,0.35)", t: "ScriptType: v4.00+" },
      { c: "rgba(255,255,255,0.35)", t: "PlayResX: 1080" },
      { c: "rgba(255,255,255,0)", t: "\u00A0" },
      { c: "rgba(255,255,255,0.2)", t: "[V4+ Styles]" },
      { c: "rgba(255,255,255,0.35)", t: "Style: Default,Arial,48,..." },
      { c: "rgba(255,255,255,0)", t: "\u00A0" },
      { c: "rgba(255,255,255,0.2)", t: "[Events]" },
      { c: "rgba(255,255,255,0.55)", t: L("Dialogue: 0:00:01.24,...,สวัสดีครับ","Dialogue: 0:00:01.24,...,Hello today") },
      { c: "rgba(255,255,255,0.55)", t: L("Dialogue: 0:00:03.82,...,เทคนิค","Dialogue: 0:00:03.82,...,video editing") },
      { c: "rgba(255,255,255,0.55)", t: L("Dialogue: 0:00:06.10,...,คอนเทนต์","Dialogue: 0:00:06.10,...,your content") },
    ]},
    { file: "output.json", lines: [
      { c: "rgba(255,255,255,0.3)", t: "{" },
      { c: "rgba(255,255,255,0.4)", t: '  "segments": [' },
      { c: "rgba(255,255,255,0.4)", t: "    {" },
      { c: "rgba(249,115,22,0.5)", t: '      "start": 1.24,' },
      { c: "rgba(249,115,22,0.5)", t: '      "end": 3.82,' },
      { c: "rgba(255,255,255,0.7)", t: L('      "text": "สวัสดีครับ..."','      "text": "Hello, today..."') },
      { c: "rgba(255,255,255,0.4)", t: "    }," },
      { c: "rgba(255,255,255,0.4)", t: "    {" },
      { c: "rgba(249,115,22,0.5)", t: '      "start": 3.82,' },
      { c: "rgba(249,115,22,0.5)", t: '      "end": 6.10,' },
      { c: "rgba(255,255,255,0.7)", t: L('      "text": "เทคนิค..."','      "text": "video editing..."') },
    ]},
    { file: "output.txt", lines: [
      { c: "rgba(255,255,255,0.7)", t: L("สวัสดีครับ วันนี้เราจะมาพูดถึง","Hello, today we're going to talk about") },
      { c: "rgba(255,255,255,0.7)", t: L("เทคนิคการตัดต่อวิดีโอสำหรับ TikTok","video editing techniques for TikTok") },
      { c: "rgba(255,255,255,0.7)", t: L("ที่จะทำให้คอนเทนต์ของคุณ","that will make your content shine") },
      { c: "rgba(255,255,255,0.7)", t: L("ดูน่าสนใจและเป็นมืออาชีพมากขึ้น","and look much more professional") },
      { c: "rgba(255,255,255,0.7)", t: L("ไม่ว่าจะเป็นมือใหม่หรือมือโปร","whether you're a beginner or a pro") },
      { c: "rgba(255,255,255,0.7)", t: L("สามารถทำได้ง่ายๆ ตามขั้นตอนนี้","you can follow these simple steps") },
      { c: "rgba(255,255,255,0.7)", t: L("เริ่มจากการอัพโหลดไฟล์เสียง","start by uploading your audio file") },
      { c: "rgba(255,255,255,0.7)", t: L("ระบบจะถอดเสียงให้อัตโนมัติ","the system will transcribe automatically") },
      { c: "rgba(255,255,255,0.7)", t: L("จากนั้นเลือกรูปแบบที่ต้องการ","then choose the format you need") },
      { c: "rgba(255,255,255,0.7)", t: L("ดาวน์โหลดได้ทันที ไม่ต้องรอ","download instantly, no waiting") },
      { c: "rgba(255,255,255,0.7)", t: L("ลองใช้ฟรีวันนี้ได้เลย!","try it free today!") },
    ]},
  ], [isTh]);

  const N = slides.length;
  useEffect(() => {
    const t = setInterval(() => setActive((p) => (p + 1) % N), 4000);
    return () => clearInterval(t);
  }, [N]);

  const idx = (off: number) => ((active + off) % N + N) % N;

  const CARD_H = "310px"; // fixed height for all cards

  const Card = ({ i }: { i: number }) => {
    const s = slides[i];
    return (
      <div style={{
        background: "#0d1117",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "12px",
        overflow: "hidden",
        height: CARD_H,
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#f87171" }} />
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fbbf24" }} />
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399" }} />
          <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>{s.file}</span>
        </div>
        <div style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: "0.73rem", lineHeight: 1.7, flex: 1, overflow: "hidden" }}>
          {s.lines.map((l, j) => <div key={j} style={{ color: l.c }}>{l.t}</div>)}
          <div style={{ marginTop: "4px" }}><span className="blink-cursor" style={{ display: "inline-block", width: "7px", height: "13px", background: "var(--accent)", borderRadius: "1px" }} /></div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="peek-carousel">
        {/* Left peek — gradient fades right-to-left */}
        <div
          className="peek-side peek-left"
          onClick={() => setActive(idx(-1))}
        >
          <Card i={idx(-1)} />
        </div>

        {/* Center — full card */}
        <div className="peek-center">
          <Card i={active} />
        </div>

        {/* Right peek — gradient fades left-to-right */}
        <div
          className="peek-side peek-right"
          onClick={() => setActive(idx(1))}
        >
          <Card i={idx(1)} />
        </div>
      </div>

      {/* Dots + labels */}
      <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "16px" }}>
        {slides.map((_, i) => (
          <button key={i} onClick={() => setActive(i)} style={{ width: i === active ? "22px" : "6px", height: "6px", borderRadius: "3px", border: "none", background: i === active ? "var(--accent)" : "rgba(255,255,255,0.12)", cursor: "pointer", transition: "all 0.3s", padding: 0 }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "18px", marginTop: "8px" }}>
        {slides.map((s, i) => (
          <button key={i} onClick={() => setActive(i)} style={{ background: "none", border: "none", padding: 0, fontSize: "0.7rem", fontFamily: "monospace", color: i === active ? "var(--accent)" : "rgba(255,255,255,0.18)", cursor: "pointer", fontWeight: i === active ? 600 : 400, transition: "color 0.3s" }}>
            .{s.file.split(".")[1]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t, locale } = useLocale();

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
      <div className="container" style={{ textAlign: "center", paddingTop: "60px", paddingBottom: "48px", maxWidth: "680px" }}>
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
          margin: "0 auto 36px",
          lineHeight: 1.7,
        }}>
          {t("home.desc")}
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/login" className="btn btn-primary btn-lg">
            {t("home.cta")}
          </Link>
          <Link href="/pricing" className="btn btn-secondary btn-lg">
            {t("home.pricing")}
          </Link>
        </div>
      </div>

      {/* Subtitle Preview Mockup */}
      <div style={{ paddingBottom: "48px", overflow: "hidden" }}>
        <OutputCarousel locale={locale} />
      </div>

      {/* Divider */}
      <div className="container"><div className="divider" /></div>

      {/* Features */}
      <div className="container" style={{ paddingBottom: "60px" }}>
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
            <div key={f.title} className="card fade-in-up" style={{
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
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="container" style={{ paddingBottom: "60px" }}>
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "48px 32px",
          textAlign: "center",
        }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "10px", fontWeight: 700 }}>
            {t("home.bonus.title", { credits: "5,000" })}
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px", fontSize: "0.95rem" }}>
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
