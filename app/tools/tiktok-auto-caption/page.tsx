import type { Metadata } from "next";
import Link from "next/link";
import { FAQAccordion, FAQSchema } from "../../components/FAQAccordion";

export const metadata: Metadata = {
  title: "TikTok Auto Caption Generator — Add Subtitles to TikTok Videos | FastCaption",
  description:
    "Generate TikTok-style auto captions with word-by-word highlighting. Upload your video, get perfectly timed ASS subtitles in seconds. Free to start — 5,000 credits, no credit card.",
  keywords: [
    "tiktok auto caption", "tiktok subtitle generator", "tiktok caption generator",
    "auto caption tiktok", "add subtitles to tiktok", "tiktok word by word caption",
    "ทำซับ tiktok", "ซับไตเติ้ล tiktok ฟรี", "แคปชั่น tiktok อัตโนมัติ",
  ],
  alternates: { canonical: "https://fastcaption.app/tools/tiktok-auto-caption" },
};

const faq = [
  { q: "How do I add auto captions to TikTok videos?", a: "Upload your TikTok video to FastCaption, select your language, and click Transcribe. In seconds, you'll get an ASS subtitle file with word-by-word highlighting — the same trendy style you see on viral TikToks. Download and import it into CapCut, Premiere Pro, or any editor." },
  { q: "Does FastCaption create the word-by-word TikTok caption style?", a: "Yes! FastCaption generates ASS subtitle files with animated word-by-word highlighting, matching the popular TikTok caption aesthetic. You can choose between portrait (9:16) and landscape (16:9) orientations." },
  { q: "Can I use FastCaption captions directly in TikTok?", a: "FastCaption exports ASS files that you can import into video editors like CapCut, Premiere Pro, or DaVinci Resolve. After burning the subtitles into your video, upload to TikTok with perfectly styled captions." },
  { q: "Is it better than TikTok's built-in auto captions?", a: "FastCaption offers significantly better accuracy (95%+ vs ~80%), supports more languages, and gives you full control over styling. TikTok's built-in captions are basic and can't be exported." },
  { q: "How much does it cost?", a: "New users get 5,000 free credits (≈25 minutes). After that, credits start at just ฿49 for 5,000 more. No subscription required — pay only for what you use. The cheapest subtitle generator available." },
  { q: "ทำซับ TikTok ด้วย FastCaption ยังไง?", a: "อัปโหลดวิดีโอ TikTok เลือกภาษา แล้วกด Transcribe ภายในไม่กี่วินาทีจะได้ไฟล์ ASS แบบ word-by-word highlighting นำไปใส่ CapCut หรือ Premiere Pro แล้วอัปโหลด TikTok ได้เลย" },
  { q: "FastCaption ดีกว่าซับในตัวของ TikTok ยังไง?", a: "แม่นยำกว่ามาก (95%+ เทียบกับ ~80%) รองรับ 15+ ภาษา มีสไตล์ word-by-word ที่สวยกว่า และ export ไฟล์ได้ ซับในตัว TikTok ไม่สามารถ export ได้" },
];

export default function TikTokAutoCaptionPage() {
  return (
    <>
      <FAQSchema items={faq} />

      <section className="tool-hero">
        <div className="container">
          <div className="section-label">📱 TikTok Creators</div>
          <h1 className="tool-hero-title">
            TikTok <span className="hero-gradient">Auto Caption</span> Generator
          </h1>
          <p className="section-subtitle" style={{ margin: "0 auto 32px", textAlign: "center" }}>
            Generate viral-ready TikTok captions with word-by-word highlighting in seconds.
            Powered by AI — no manual typing needed. <strong>Free to start, ถูกที่สุด!</strong>
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/transcribe" className="btn btn-primary btn-xl">
              🚀 Generate TikTok Captions Free
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-section" style={{ background: "var(--bg-alt)" }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Why TikTok Captions Matter</h2>
            <p className="section-subtitle">
              Videos with captions get <strong>40% more watch time</strong> and significantly higher engagement.
              Most viewers watch TikTok with sound off — captions ensure your message gets through.
            </p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <span className="feature-icon">📈</span>
              <h3 className="feature-title">+40% Watch Time</h3>
              <p className="feature-desc">Captioned videos keep viewers watching longer, boosting your algorithm ranking and reach.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🔇</span>
              <h3 className="feature-title">Sound-Off Viewers</h3>
              <p className="feature-desc">Over 80% of TikTok users scroll with sound off. Captions make your content accessible to everyone.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">✨</span>
              <h3 className="feature-title">Viral Word-by-Word Style</h3>
              <p className="feature-desc">The iconic word highlight effect used by top creators. FastCaption generates this style automatically.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How to Add Auto Captions to TikTok</h2>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-num">1</div>
              <div className="step-icon">📤</div>
              <h3 className="step-title">Upload Your TikTok Video</h3>
              <p className="step-desc">Drag &amp; drop your video file. Supports all common formats including MP4 and MOV.</p>
            </div>
            <div className="step-card">
              <div className="step-num">2</div>
              <div className="step-icon">🤖</div>
              <h3 className="step-title">AI Generates Captions</h3>
              <p className="step-desc">WhisperX transcribes with word-level timing. Choose &quot;ASS Portrait&quot; for the TikTok style.</p>
            </div>
            <div className="step-card">
              <div className="step-num">3</div>
              <div className="step-icon">🎬</div>
              <h3 className="step-title">Import &amp; Post</h3>
              <p className="step-desc">Download the ASS file, import into CapCut or your editor, and post your captioned TikTok.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" style={{ background: "var(--bg-alt)" }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">FastCaption vs TikTok Built-in Captions</h2>
          </div>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <table className="compare-table">
              <thead>
                <tr><th>Feature</th><th>FastCaption</th><th>TikTok Built-in</th></tr>
              </thead>
              <tbody>
                <tr><td>Accuracy</td><td className="yes">95%+</td><td className="no">~80%</td></tr>
                <tr><td>Word-by-word highlighting</td><td className="yes">✓ Customizable</td><td className="no">✗ Basic only</td></tr>
                <tr><td>Multi-language</td><td className="yes">15+ languages</td><td className="no">Limited</td></tr>
                <tr><td>Export subtitle file</td><td className="yes">✓ SRT, ASS, JSON</td><td className="no">✗ No export</td></tr>
                <tr><td>Use in other editors</td><td className="yes">✓ Any editor</td><td className="no">✗ TikTok only</td></tr>
                <tr><td>Price</td><td className="yes">Free + from ฿49</td><td className="no">Free (limited)</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">TikTok Caption FAQ</h2>
          </div>
          <FAQAccordion items={faq} />
        </div>
      </section>

      <section className="landing-section" style={{ background: "var(--bg-alt)", paddingBottom: 88 }}>
        <div className="container">
          <div className="cta-banner">
            <h2 className="section-title">
              Start Creating <span className="hero-gradient">Viral TikTok Captions</span>
            </h2>
            <p>5,000 free credits. No credit card. No subscription. ถูกที่สุด!</p>
            <Link href="/login" className="btn btn-primary btn-xl">🚀 Get Started Free →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
