import type { Metadata } from "next";
import Link from "next/link";
import { FAQAccordion, FAQSchema } from "../../components/FAQAccordion";

export const metadata: Metadata = {
  title: "YouTube Subtitle Generator — AI-Powered SRT Files | FastCaption",
  description: "Generate accurate YouTube subtitles with AI. Get SRT files in seconds, support 15+ languages. Boost SEO, accessibility, and watch time. Free to start.",
  keywords: ["youtube subtitle generator", "youtube srt generator", "youtube auto subtitle", "generate youtube captions", "ซับยูทูป", "ซับไตเติ้ล youtube"],
  alternates: { canonical: "https://fastcaption.app/tools/youtube-subtitle-generator" },
};

const faq = [
  { q: "How do I add subtitles to YouTube videos?", a: "Upload your video or audio to FastCaption to generate an SRT file. Then go to YouTube Studio → Subtitles → Add Language → Upload File → SRT. Your subtitles will appear on the video within minutes." },
  { q: "Do YouTube subtitles help with SEO?", a: "Yes! YouTube indexes subtitle text, making your video discoverable through search queries that match your spoken content. Adding accurate subtitles can significantly increase organic views." },
  { q: "Can I generate subtitles in multiple languages?", a: "FastCaption supports 15+ languages. You can transcribe your video in its original language, then create additional subtitle tracks for other languages." },
  { q: "How much does it cost?", a: "Free to start with 5,000 credits (≈25 minutes). Additional credits from ฿49 — the cheapest YouTube subtitle generator available. No monthly subscription." },
  { q: "ทำซับ YouTube ยังไง?", a: "อัปโหลดวิดีโอหรือไฟล์เสียงใน FastCaption สร้างไฟล์ SRT แล้วนำไปอัปโหลดใน YouTube Studio → Subtitles → Upload File ซับจะแสดงบนวิดีโอทันที" },
];

export default function YouTubeSubtitlePage() {
  return (
    <>
      <FAQSchema items={faq} />
      <section className="tool-hero">
        <div className="container">
          <div className="section-label">▶️ YouTubers</div>
          <h1 className="tool-hero-title">YouTube <span className="hero-gradient">Subtitle Generator</span></h1>
          <p className="section-subtitle" style={{ margin: "0 auto 32px", textAlign: "center" }}>
            Generate accurate SRT subtitle files for YouTube in seconds. Boost SEO, accessibility, and viewer retention with AI. <strong>Free 5,000 credits — ถูกที่สุด!</strong>
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/transcribe" className="btn btn-primary btn-xl">🚀 Generate YouTube Subtitles Free</Link>
          </div>
        </div>
      </section>

      <section className="landing-section" style={{ background: "var(--bg-alt)" }}>
        <div className="container">
          <div className="section-header"><h2 className="section-title">Why You Need YouTube Subtitles</h2></div>
          <div className="features-grid">
            <div className="feature-card"><span className="feature-icon">🔍</span><h3 className="feature-title">YouTube SEO Boost</h3><p className="feature-desc">YouTube indexes subtitle text. Accurate captions make your videos discoverable for relevant search queries.</p></div>
            <div className="feature-card"><span className="feature-icon">📈</span><h3 className="feature-title">Higher Retention</h3><p className="feature-desc">Viewers watching with subtitles stay 12% longer on average. More watch time = better algorithm ranking.</p></div>
            <div className="feature-card"><span className="feature-icon">🌐</span><h3 className="feature-title">Global Reach</h3><p className="feature-desc">SRT files in multiple languages let your content reach viewers worldwide without dubbing.</p></div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <div className="section-header"><h2 className="section-title">How to Add Subtitles to YouTube</h2></div>
          <div className="steps-grid">
            <div className="step-card"><div className="step-num">1</div><div className="step-icon">📤</div><h3 className="step-title">Upload to FastCaption</h3><p className="step-desc">Upload your YouTube video or export its audio. We handle files up to 2GB.</p></div>
            <div className="step-card"><div className="step-num">2</div><div className="step-icon">📥</div><h3 className="step-title">Download SRT File</h3><p className="step-desc">AI generates perfectly timed subtitles. Download the SRT file in one click.</p></div>
            <div className="step-card"><div className="step-num">3</div><div className="step-icon">▶️</div><h3 className="step-title">Upload to YouTube Studio</h3><p className="step-desc">Go to YouTube Studio → Subtitles → Upload File. Your captions go live instantly.</p></div>
          </div>
        </div>
      </section>

      <section className="landing-section" style={{ background: "var(--bg-alt)" }}>
        <div className="container">
          <div className="section-header"><h2 className="section-title">YouTube Subtitle FAQ</h2></div>
          <FAQAccordion items={faq} />
        </div>
      </section>

      <section className="landing-section" style={{ paddingBottom: 88 }}>
        <div className="container">
          <div className="cta-banner">
            <h2 className="section-title">Grow Your YouTube Channel with <span className="hero-gradient">AI Subtitles</span></h2>
            <p>5,000 free credits. Generate SRT files in seconds. ถูกที่สุด!</p>
            <Link href="/login" className="btn btn-primary btn-xl">🚀 Start Free Now →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
