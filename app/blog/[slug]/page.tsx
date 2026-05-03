import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  content: React.ReactNode;
}

const posts: Record<string, BlogPost> = {
  "how-to-add-subtitles-without-typing": {
    slug: "how-to-add-subtitles-without-typing",
    title: "How to Add Subtitles to Video Without Typing",
    description:
      "Learn how AI-powered subtitle generators like FastCaption can create accurate captions in seconds — no manual typing required.",
    date: "April 15, 2026",
    readTime: "5 min read",
    content: (
      <>
        <p>
          Adding subtitles to videos used to mean hours of painstaking manual work —
          listening, pausing, typing, adjusting timing, and repeating for every sentence.
          But with modern AI transcription tools, you can generate word-level accurate
          subtitles in under a minute.
        </p>

        <h2>Why Subtitles Matter More Than Ever</h2>
        <p>
          Studies consistently show that captioned videos receive <strong>40% more views</strong> and
          significantly higher engagement. On platforms like TikTok and Instagram, where over
          80% of users browse with sound off, subtitles aren&apos;t optional — they&apos;re essential.
        </p>

        <h2>The Old Way: Manual Subtitling</h2>
        <p>
          Traditional subtitle creation involves transcribing audio by ear, manually setting
          in/out timestamps for each segment, and formatting the subtitle file. For a
          10-minute video, this process can take 1-2 hours — even for experienced editors.
        </p>

        <h2>The AI Way: Automatic Subtitle Generation</h2>
        <p>
          Modern AI tools like FastCaption use advanced speech recognition (WhisperX) to
          transcribe your audio with 95%+ accuracy and word-level timestamps. The process
          takes seconds, not hours:
        </p>
        <ol>
          <li><strong>Upload</strong> your video or audio file</li>
          <li><strong>Select your language</strong> (or use auto-detect)</li>
          <li><strong>Download</strong> your subtitles as SRT, ASS, JSON, or TXT</li>
        </ol>

        <h2>Word-Level Timing: The Game Changer</h2>
        <p>
          Unlike basic transcription tools that only provide sentence-level timing,
          FastCaption uses forced alignment to determine the exact timestamp of every
          single word. This enables the trendy word-by-word highlighting effect you see
          on viral TikToks and Instagram Reels.
        </p>

        <h2>Export Formats Explained</h2>
        <ul>
          <li><strong>SRT</strong> — Universal format, works everywhere (YouTube, Premiere, etc.)</li>
          <li><strong>ASS</strong> — Advanced format with styling effects (TikTok-style highlighting)</li>
          <li><strong>JSON</strong> — Machine-readable format for developers</li>
          <li><strong>TXT</strong> — Plain text transcript without timestamps</li>
        </ul>

        <h2>Getting Started</h2>
        <p>
          Ready to stop typing and start captioning? FastCaption gives every new user
          5,000 free credits (approximately 25 minutes of transcription). No credit card
          required, no subscription to manage. The cheapest subtitle generator available — starting at just ฿99!
        </p>
      </>
    ),
  },
  "best-auto-caption-tools-2026": {
    slug: "best-auto-caption-tools-2026",
    title: "Best Free Auto Caption Tools in 2026",
    description:
      "Compare the top auto caption generators for video creators. Features, pricing, accuracy, and best use cases for each tool.",
    date: "April 10, 2026",
    readTime: "8 min read",
    content: (
      <>
        <p>
          The auto caption market has exploded in recent years. With so many options available,
          it can be hard to choose the right tool. In this guide, we compare the top caption
          generators of 2026 to help you find the perfect fit for your workflow.
        </p>

        <h2>What to Look For in a Caption Tool</h2>
        <ul>
          <li><strong>Accuracy</strong> — The most important factor. Look for 95%+ accuracy.</li>
          <li><strong>Speed</strong> — How fast can it process your files?</li>
          <li><strong>Language support</strong> — Does it support your target languages?</li>
          <li><strong>Export formats</strong> — SRT, ASS, JSON flexibility</li>
          <li><strong>Pricing model</strong> — Subscription vs pay-per-use</li>
        </ul>

        <h2>1. FastCaption</h2>
        <p>
          FastCaption uses WhisperX for industry-leading accuracy with word-level timestamps.
          The standout feature is its TikTok-style ASS export with animated word-by-word
          highlighting. With pay-per-use pricing starting at ฿99 and 5,000 free credits for
          new users, it offers exceptional value.
        </p>
        <p>
          <strong>Best for:</strong> TikTok/Reels creators, video editors needing SRT files,
          multilingual content.
        </p>

        <h2>2. Descript</h2>
        <p>
          Descript offers transcription as part of its all-in-one video editing suite.
          While feature-rich, it requires a monthly subscription ($24-33/month) and the
          transcription accuracy is slightly lower than dedicated tools.
        </p>

        <h2>3. Kapwing</h2>
        <p>
          Kapwing provides basic auto-captioning within its browser-based editor. Good for
          quick edits, but lacks advanced features like word-level timing and ASS export.
        </p>

        <h2>4. YouTube Auto Captions</h2>
        <p>
          YouTube&apos;s free built-in captioning works for basic needs but accuracy is
          inconsistent (~80%) and you can&apos;t export the captions for use on other platforms.
        </p>

        <h2>Final Recommendation</h2>
        <p>
          For most content creators, we recommend starting with FastCaption&apos;s free tier.
          The combination of high accuracy, word-level timing, TikTok-style exports, and
          pay-per-use pricing makes it the most versatile and affordable option in 2026.
        </p>
      </>
    ),
  },
  "tiktok-vs-reels-caption-tips": {
    slug: "tiktok-vs-reels-caption-tips",
    title: "TikTok vs Instagram Reels: Caption Best Practices",
    description:
      "Platform-specific captioning strategies for TikTok and Instagram Reels. Maximize engagement with the right caption style.",
    date: "April 5, 2026",
    readTime: "6 min read",
    content: (
      <>
        <p>
          While TikTok and Instagram Reels may seem similar, each platform has unique
          captioning requirements and best practices. Understanding these differences can
          significantly improve your engagement rates.
        </p>

        <h2>TikTok Caption Best Practices</h2>
        <ul>
          <li><strong>Use word-by-word highlighting</strong> — This is the signature TikTok caption style that viewers expect.</li>
          <li><strong>Keep text centered</strong> — TikTok&apos;s UI has elements at the top and bottom; keep captions in the middle third.</li>
          <li><strong>Large, bold fonts</strong> — Viewers scroll quickly; make your text impossible to miss.</li>
          <li><strong>High contrast</strong> — White text with a shadow/outline for readability on any background.</li>
        </ul>

        <h2>Instagram Reels Caption Best Practices</h2>
        <ul>
          <li><strong>Subtler styling</strong> — Reels viewers tend to prefer slightly more polished, less &quot;raw&quot; captions.</li>
          <li><strong>Position above the description</strong> — Instagram shows usernames and captions at the bottom; keep subtitles higher.</li>
          <li><strong>Consider your brand aesthetic</strong> — Instagram is more brand-conscious; match caption colors to your palette.</li>
        </ul>

        <h2>Universal Tips for Both Platforms</h2>
        <ol>
          <li>Always use portrait (9:16) format subtitles</li>
          <li>Keep sentences short — 5-8 words per line maximum</li>
          <li>Use contrasting colors for readability</li>
          <li>Time your captions precisely to speech (FastCaption does this automatically)</li>
          <li>Test with sound off — if the message is clear, your captions work</li>
        </ol>

        <h2>How FastCaption Handles Both</h2>
        <p>
          FastCaption generates ASS subtitles optimized for both platforms. Choose &quot;Portrait&quot;
          orientation for 9:16 output with word-by-word highlighting that works perfectly on
          TikTok and Reels. The styling is automatically positioned to avoid UI elements.
        </p>
      </>
    ),
  },
};

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = posts[slug];
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `https://fastcaption.app/blog/${slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.date,
    },
  };
}

export function generateStaticParams() {
  return Object.keys(posts).map((slug) => ({ slug }));
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = posts[slug];

  if (!post) notFound();

  return (
    <>
      <section className="tool-hero" style={{ paddingBottom: 20 }}>
        <div className="container">
          <Link
            href="/blog"
            style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 20, display: "inline-block" }}
          >
            ← Back to Blog
          </Link>
          <h1 className="tool-hero-title">{post.title}</h1>
          <div style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginTop: 8 }}>
            {post.date} · {post.readTime}
          </div>
        </div>
      </section>

      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="article-content">{post.content}</div>

          {/* CTA in article */}
          <div style={{ maxWidth: 700, margin: "48px auto 0" }}>
            <div className="cta-banner" style={{ padding: "36px 28px" }}>
              <h2 className="section-title" style={{ fontSize: "1.4rem" }}>
                Try FastCaption <span className="hero-gradient">Free</span>
              </h2>
              <p style={{ fontSize: "0.95rem" }}>
                5,000 free credits. No credit card needed. ถูกที่สุดในไทย — เริ่ม ฿99!
              </p>
              <Link href="/login" className="btn btn-primary btn-lg">🚀 Start Free →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Article JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            author: {
              "@type": "Organization",
              name: "FastCaption",
              url: "https://fastcaption.app",
            },
            publisher: {
              "@type": "Organization",
              name: "FastCaption",
              url: "https://fastcaption.app",
            },
          }),
        }}
      />
    </>
  );
}
