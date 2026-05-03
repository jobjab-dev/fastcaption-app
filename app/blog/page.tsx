import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Blog — FastCaption | AI Subtitle & Caption Tips",
  description: "Learn about AI subtitles, video captioning tips, and best practices for TikTok, YouTube, and Instagram. Expert guides from the FastCaption team.",
  alternates: { canonical: "https://fastcaption.app/blog" },
};

const posts = [
  {
    slug: "how-to-add-subtitles-without-typing",
    title: "How to Add Subtitles to Video Without Typing",
    titleTh: "วิธีใส่ซับไตเติ้ลวิดีโอโดยไม่ต้องพิมพ์",
    excerpt: "Learn how AI-powered subtitle generators like FastCaption can create accurate captions in seconds — no manual typing required.",
    excerptTh: "เรียนรู้วิธีสร้างซับไตเติ้ลด้วย AI อย่าง FastCaption ที่ถอดเสียงแม่นยำภายในวินาที — ไม่ต้องพิมพ์เอง",
    date: "April 15, 2026",
    readTime: "5 min read",
    readTimeTh: "อ่าน 5 นาที",
    icon: "🎤",
    tag: "Tutorial",
    tagTh: "สอนใช้งาน",
  },
  {
    slug: "best-auto-caption-tools-2026",
    title: "Best Free Auto Caption Tools in 2026",
    titleTh: "เครื่องมือสร้างซับอัตโนมัติที่ดีที่สุดในปี 2026",
    excerpt: "Compare the top auto caption generators for video creators. Features, pricing, accuracy, and best use cases for each tool.",
    excerptTh: "เปรียบเทียบเครื่องมือสร้างซับอัตโนมัติยอดนิยม ฟีเจอร์ ราคา ความแม่นยำ และจุดเด่นของแต่ละตัว",
    date: "April 10, 2026",
    readTime: "8 min read",
    readTimeTh: "อ่าน 8 นาที",
    icon: "🏆",
    tag: "Comparison",
    tagTh: "เปรียบเทียบ",
  },
  {
    slug: "tiktok-vs-reels-caption-tips",
    title: "TikTok vs Instagram Reels: Caption Best Practices",
    titleTh: "TikTok vs Reels: เทคนิคใส่ซับที่ดีที่สุด",
    excerpt: "Platform-specific captioning strategies for TikTok and Instagram Reels. Maximize engagement with the right caption style.",
    excerptTh: "กลยุทธ์การใส่ซับเฉพาะแพลตฟอร์ม TikTok และ Instagram Reels เพิ่ม engagement ด้วยสไตล์ซับที่ถูกต้อง",
    date: "April 5, 2026",
    readTime: "6 min read",
    readTimeTh: "อ่าน 6 นาที",
    icon: "📱",
    tag: "Strategy",
    tagTh: "กลยุทธ์",
  },
];

export default async function BlogPage() {
  const cookieStore = await cookies();
  const isThai = cookieStore.get("fastcaption-locale")?.value === "th";

  return (
    <>
      <section className="tool-hero">
        <div className="container">
          <h1 className="tool-hero-title">
            {isThai ? "บล็อก FastCaption" : "FastCaption Blog"}
          </h1>
          <p className="section-subtitle" style={{ margin: "0 auto", textAlign: "center" }}>
            {isThai
              ? "เคล็ดลับ คู่มือ และข้อมูลเชิงลึกสำหรับนักสร้างวิดีโอ"
              : "Tips, guides, and insights for video creators."}
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
                  <div className="blog-card-tag">{isThai ? post.tagTh : post.tag}</div>
                  <h2 className="blog-card-title">{isThai ? post.titleTh : post.title}</h2>
                  <p className="blog-card-excerpt">{isThai ? post.excerptTh : post.excerpt}</p>
                  <div className="blog-card-meta">
                    {post.date} · {isThai ? post.readTimeTh : post.readTime}
                  </div>
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
              {isThai ? (
                <>ลองใช้ FastCaption <span className="hero-gradient">ฟรี</span></>
              ) : (
                <>Try FastCaption <span className="hero-gradient">Free</span></>
              )}
            </h2>
            <p>
              {isThai
                ? "5,000 เครดิตฟรี ไม่ต้องผูกบัตร เริ่มต้น ฿99!"
                : "5,000 free credits. No credit card needed. Starting from $2.99!"}
            </p>
            <Link href="/login" className="btn btn-primary btn-xl">
              {isThai ? "🚀 เริ่มใช้ฟรี →" : "🚀 Start Free →"}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
