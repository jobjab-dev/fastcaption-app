import type { Metadata } from "next";
import Link from "next/link";
import { FAQAccordion, FAQSchema } from "../../components/FAQAccordion";

export const metadata: Metadata = {
  title: "Premiere Pro Caption Alternative — Faster AI Subtitles | FastCaption",
  description: "FastCaption is the faster, more accurate alternative to Premiere Pro's built-in captions. Generate subtitles 10x faster with AI. Export SRT & ASS files. Free to start.",
  keywords: ["premiere pro caption alternative", "premiere pro subtitle alternative", "auto caption premiere pro", "faster subtitles premiere pro", "ซับ premiere pro"],
  alternates: { canonical: "https://fastcaption.app/tools/premiere-pro-caption-alternative" },
};

const faq = [
  { q: "Why should I use FastCaption instead of Premiere Pro's built-in captions?", a: "Premiere Pro's caption workflow is slow — transcribe, fix errors, style. FastCaption does it all in seconds with 95%+ accuracy and produces ready-to-use SRT and ASS files." },
  { q: "Can I import FastCaption subtitles into Premiere Pro?", a: "Yes! FastCaption exports standard SRT files that can be directly imported into Premiere Pro via File → Import." },
  { q: "How much faster is FastCaption?", a: "FastCaption processes a 10-minute video in ~30 seconds. Premiere Pro takes 2-5 minutes plus manual corrections. ~10x faster end-to-end." },
  { q: "How much does it cost?", a: "Pay-per-use from ฿49 (≈$1.40) — vs Adobe's $22.99/mo subscription. Plus 5,000 free credits to start. The cheapest option available." },
];

export default function PremiereProAlternativePage() {
  return (
    <>
      <FAQSchema items={faq} />
      <section className="tool-hero">
        <div className="container">
          <div className="section-label">🎞️ Video Editors</div>
          <h1 className="tool-hero-title">The Faster <span className="hero-gradient">Premiere Pro Caption</span> Alternative</h1>
          <p className="section-subtitle" style={{ margin: "0 auto 32px", textAlign: "center" }}>
            Stop wasting time with slow built-in captions. FastCaption generates accurate subtitles 10x faster with AI. <strong>Free to start, ถูกกว่า Adobe!</strong>
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/transcribe" className="btn btn-primary btn-xl">🚀 Try FastCaption Free</Link>
          </div>
        </div>
      </section>

      <section className="landing-section" style={{ background: "var(--bg-alt)" }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">FastCaption vs Premiere Pro Captions</h2>
            <p className="section-subtitle">Side-by-side comparison of captioning workflows.</p>
          </div>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <table className="compare-table">
              <thead><tr><th>Feature</th><th>FastCaption</th><th>Premiere Pro</th></tr></thead>
              <tbody>
                <tr><td>Speed (10 min video)</td><td className="yes">~30 seconds</td><td className="no">2-5 minutes + edits</td></tr>
                <tr><td>Accuracy</td><td className="yes">95%+ (WhisperX)</td><td className="no">~85%</td></tr>
                <tr><td>Word-level timing</td><td className="yes">✓ Automatic</td><td className="no">✗ Manual adjustment</td></tr>
                <tr><td>TikTok-style ASS export</td><td className="yes">✓ Built-in</td><td className="no">✗ Not available</td></tr>
                <tr><td>Languages</td><td className="yes">15+</td><td className="no">13</td></tr>
                <tr><td>Cost</td><td className="yes">Pay-per-use (from ฿49)</td><td className="no">$22.99/mo subscription</td></tr>
                <tr><td>Align mode</td><td className="yes">✓</td><td className="no">✗</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <div className="section-header"><h2 className="section-title">Simple Workflow for Premiere Pro Users</h2></div>
          <div className="steps-grid">
            <div className="step-card"><div className="step-num">1</div><div className="step-icon">📤</div><h3 className="step-title">Upload Your Timeline Export</h3><p className="step-desc">Export your sequence audio as MP3/WAV, or upload the full video file directly.</p></div>
            <div className="step-card"><div className="step-num">2</div><div className="step-icon">⚡</div><h3 className="step-title">Instant AI Transcription</h3><p className="step-desc">FastCaption generates word-level timestamps in seconds. Review and download.</p></div>
            <div className="step-card"><div className="step-num">3</div><div className="step-icon">🎬</div><h3 className="step-title">Import SRT into Premiere</h3><p className="step-desc">Import the SRT file into Premiere Pro. Captions are perfectly timed — zero manual adjustment.</p></div>
          </div>
        </div>
      </section>

      <section className="landing-section" style={{ background: "var(--bg-alt)" }}>
        <div className="container">
          <div className="section-header"><h2 className="section-title">Frequently Asked Questions</h2></div>
          <FAQAccordion items={faq} />
        </div>
      </section>

      <section className="landing-section" style={{ paddingBottom: 88 }}>
        <div className="container">
          <div className="cta-banner">
            <h2 className="section-title">Subtitle <span className="hero-gradient">10x Faster</span> Than Premiere Pro</h2>
            <p>Free to start. No subscription. Import SRT directly. ถูกกว่า Adobe!</p>
            <Link href="/login" className="btn btn-primary btn-xl">🚀 Start Free Now →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
