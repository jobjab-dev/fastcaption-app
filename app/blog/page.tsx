import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog — FastCaption | AI Subtitle & Caption Tips",
  description: "Learn about AI subtitles, video captioning tips, and best practices for TikTok, YouTube, and Instagram. Expert guides from the FastCaption team.",
  alternates: { canonical: "https://fastcaption.app/blog" },
};

const posts = [
  {
    slug: "how-to-add-subtitles-without-typing",
    title: "How to Add Subtitles to Video Without Typing",
    excerpt: "Learn how AI-powered subtitle generators like FastCaption can create accurate captions in seconds — no manual typing required.",
    date: "April 15, 2026",
    readTime: "5 min read",
    icon: "🎤",
    tag: "Tutorial",
  },
  {
    slug: "best-auto-caption-tools-2026",
    title: "Best Free Auto Caption Tools in 2026",
    excerpt: "Compare the top auto caption generators for video creators. Features, pricing, accuracy, and best use cases for each tool.",
    date: "April 10, 2026",
    readTime: "8 min read",
    icon: "🏆",
    tag: "Comparison",
  },
  {
    slug: "tiktok-vs-reels-caption-tips",
    title: "TikTok vs Instagram Reels: Caption Best Practices",
    excerpt: "Platform-specific captioning strategies for TikTok and Instagram Reels. Maximize engagement with the right caption style.",
    date: "April 5, 2026",
    readTime: "6 min read",
    icon: "📱",
    tag: "Strategy",
  },
];

export default function BlogPage() {
  return (
    <>
      <section className="tool-hero">
        <div className="container">
          <h1 className="tool-hero-title">FastCaption Blog</h1>
          <p className="section-subtitle" style={{ margin: "0 auto", textAlign: "center" }}>
            Tips, guides, and insights for video creators.
          </p>
        </div>
      </section>

      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="blog-grid">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="blog-card">
                <div className="blog-card-img">{post.icon}</div>
                <div className="blog-card-body">
                  <div className="blog-card-tag">{post.tag}</div>
                  <h2 className="blog-card-title">{post.title}</h2>
                  <p className="blog-card-excerpt">{post.excerpt}</p>
                  <div className="blog-card-meta">{post.date} · {post.readTime}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" style={{ paddingBottom: 88 }}>
        <div className="container">
          <div className="cta-banner">
            <h2 className="section-title">
              Try FastCaption <span className="hero-gradient">Free</span>
            </h2>
            <p>5,000 free credits. No credit card needed. ถูกที่สุดในไทย!</p>
            <Link href="/login" className="btn btn-primary btn-xl">🚀 Start Free →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
