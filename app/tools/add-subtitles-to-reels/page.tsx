import type { Metadata } from "next";
import Link from "next/link";
import { FAQAccordion, FAQSchema } from "../../components/FAQAccordion";

export const metadata: Metadata = {
  title: "Add Subtitles to Instagram Reels — AI Subtitle Generator | FastCaption",
  description: "Add professional subtitles to Instagram Reels automatically. AI-powered caption generator with word-level accuracy. Export SRT & ASS files. Free to start.",
  keywords: ["add subtitles to reels", "instagram reel subtitle generator", "instagram caption generator", "reels auto caption", "ซับ instagram reels"],
  alternates: { canonical: "https://fastcaption.app/tools/add-subtitles-to-reels" },
};

const faq = [
  { q: "How do I add subtitles to Instagram Reels?", a: "Upload your Reel video to FastCaption, let AI transcribe it, then download the ASS or SRT subtitle file. Import it into your video editor (CapCut, Premiere Pro, etc.), burn the subtitles in, and upload to Instagram." },
  { q: "Does Instagram support subtitle files?", a: "Instagram doesn't support uploading separate subtitle files. You need to burn the subtitles into the video itself. FastCaption's ASS export with styled word-by-word effects makes your Reels look professional when burned in." },
  { q: "Do subtitles really improve Reels engagement?", a: "Yes! Studies show that Reels with captions get up to 40% more watch time and significantly higher engagement. Most users browse Instagram with sound off." },
  { q: "How much does it cost?", a: "Free 5,000 credits to start (≈25 min). Additional credits from ฿49 — cheapest in the market. No subscription." },
  { q: "ใส่ซับ Instagram Reels ยังไง?", a: "อัปโหลดวิดีโอ Reels ใน FastCaption ดาวน์โหลดไฟล์ ASS หรือ SRT ใส่ใน CapCut หรือ Premiere Pro แล้วอัปโหลดขึ้น Instagram ได้เลย" },
];

export default function AddSubtitlesToReelsPage() {
  return (
    <>
      <FAQSchema items={faq} />
      <section className="tool-hero">
        <div className="container">
          <div className="section-label">📸 Instagram Creators</div>
          <h1 className="tool-hero-title">Add Subtitles to <span className="hero-gradient">Instagram Reels</span></h1>
          <p className="section-subtitle" style={{ margin: "0 auto 32px", textAlign: "center" }}>
            Boost engagement by adding AI-generated subtitles to your Reels. Professional word-by-word captions in seconds. <strong>Free to start!</strong>
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/transcribe" className="btn btn-primary btn-xl">🚀 Add Subtitles to Reels Free</Link>
          </div>
        </div>
      </section>

      <section className="landing-section" style={{ background: "var(--bg-alt)" }}>
        <div className="container">
          <div className="section-header"><h2 className="section-title">Why Add Subtitles to Your Reels</h2></div>
          <div className="features-grid">
            <div className="feature-card"><span className="feature-icon">📊</span><h3 className="feature-title">40% More Engagement</h3><p className="feature-desc">Captioned Reels keep viewers watching longer and drive more likes, comments, and shares.</p></div>
            <div className="feature-card"><span className="feature-icon">🌍</span><h3 className="feature-title">Reach Global Audiences</h3><p className="feature-desc">Subtitles make your content accessible in any language, expanding your potential audience worldwide.</p></div>
            <div className="feature-card"><span className="feature-icon">♿</span><h3 className="feature-title">Accessibility</h3><p className="feature-desc">Make your content inclusive for deaf and hard-of-hearing viewers. Instagram rewards accessible content.</p></div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <div className="section-header"><h2 className="section-title">How to Add Subtitles to Reels</h2></div>
          <div className="steps-grid">
            <div className="step-card"><div className="step-num">1</div><div className="step-icon">📤</div><h3 className="step-title">Upload Your Reel</h3><p className="step-desc">Upload your Instagram Reel video (MP4, MOV). Supports up to 2GB files.</p></div>
            <div className="step-card"><div className="step-num">2</div><div className="step-icon">✨</div><h3 className="step-title">AI Creates Subtitles</h3><p className="step-desc">WhisperX transcribes with perfect accuracy. Download portrait ASS or SRT subtitles.</p></div>
            <div className="step-card"><div className="step-num">3</div><div className="step-icon">🎬</div><h3 className="step-title">Burn In &amp; Upload</h3><p className="step-desc">Import subtitles into CapCut or Premiere, burn them in, and post your captioned Reel.</p></div>
          </div>
        </div>
      </section>

      <section className="landing-section" style={{ background: "var(--bg-alt)" }}>
        <div className="container">
          <div className="section-header"><h2 className="section-title">Instagram Reels Subtitle FAQ</h2></div>
          <FAQAccordion items={faq} />
        </div>
      </section>

      <section className="landing-section" style={{ paddingBottom: 88 }}>
        <div className="container">
          <div className="cta-banner">
            <h2 className="section-title">Make Your Reels <span className="hero-gradient">Stand Out</span></h2>
            <p>5,000 free credits. No credit card required. ถูกที่สุด!</p>
            <Link href="/login" className="btn btn-primary btn-xl">🚀 Start Free Now →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
