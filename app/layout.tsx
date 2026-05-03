import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "./components/Navbar";
import { Providers } from "./components/Providers";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "FastCaption — AI Subtitle Generator | Try Free",
  description:
    "Convert audio & video to high-quality transcripts and TikTok-style .ASS subtitles with AI. Sign up free — get 5,000 credits instantly, no credit card required.",
  metadataBase: new URL("https://fastcaption.app"),
  keywords: [
    // Brand
    "FastCaption",
    // English
    "subtitle generator",
    "AI subtitles",
    "ASS subtitle generator",
    "SRT generator",
    "TikTok subtitles",
    "audio transcription",
    "speech to text",
    "video captions",
    "auto subtitle",
    "AI transcription",
    "word-level subtitles",
    "video subtitle maker",
    "audio to text converter",
    "free subtitle generator",
    "subtitle editor online",
    "WhisperX transcription",
    // Thai — ไทย
    "สร้างซับไตเติ้ล",
    "ซับไตเติ้ล ฟรี",
    "ทำซับ AI",
    "ซับไตเติ้ล TikTok",
    "ถอดเสียง AI",
    "แปลงเสียงเป็นข้อความ",
    "ซับไตเติ้ลอัตโนมัติ",
    "แคปชั่นวิดีโอ",
    "ซับ ASS",
    "ทำซับไตเติ้ลฟรี",
    "ถอดเสียงภาษาไทย",
    // Chinese — 中文
    "AI字幕生成器",
    "自动字幕",
    "语音转文字",
    "视频字幕制作",
    "TikTok字幕",
    "音频转录",
    "免费字幕生成",
    // Japanese — 日本語
    "AI字幕生成",
    "自動字幕",
    "音声テキスト変換",
    "動画字幕作成",
    "TikTok字幕メーカー",
    "文字起こしAI",
    // Korean — 한국어
    "AI 자막 생성기",
    "자동 자막",
    "음성을 텍스트로",
    "동영상 자막 만들기",
    "TikTok 자막",
    "음성 변환",
    // Vietnamese — Tiếng Việt
    "tạo phụ đề AI",
    "phụ đề tự động",
    "chuyển giọng nói thành văn bản",
    "phụ đề TikTok",
    "phụ đề video",
    // Indonesian — Bahasa Indonesia
    "pembuat subtitle AI",
    "subtitle otomatis",
    "konversi suara ke teks",
    "subtitle TikTok",
    // Spanish — Español
    "generador de subtítulos AI",
    "subtítulos automáticos",
    "transcripción de audio",
    "subtítulos TikTok",
    // Portuguese — Português
    "gerador de legendas AI",
    "legendas automáticas",
    "transcrição de áudio",
    "legendas TikTok",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    title: "FastCaption — AI Subtitle Generator | Try Free",
    description:
      "Convert audio to subtitles with AI in seconds. Get 5,000 free credits on signup — no credit card required.",
    siteName: "FastCaption",
    url: "https://fastcaption.app",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FastCaption — AI Subtitle Generator",
        type: "image/png",
      },
    ],
    locale: "en_US",
    alternateLocale: ["th_TH"],
  },
  twitter: {
    card: "summary_large_image",
    title: "FastCaption — AI Subtitle Generator | Try Free",
    description:
      "Convert audio to subtitles with AI in seconds. Get 5,000 free credits on signup!",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FastCaption — AI Subtitle Generator",
      },
    ],
    creator: "@fastcaption",
  },
  alternates: {
    canonical: "https://fastcaption.app",
  },
  other: {
    "google-site-verification": "google156f2901e46f7a4e",
    "msapplication-TileColor": "#0a0a0a",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // JSON-LD structured data for rich Google search results
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "FastCaption",
        url: "https://fastcaption.app",
        description:
          "AI-powered subtitle generator. Convert audio & video to SRT, ASS, and TXT subtitles instantly.",
        inLanguage: ["en", "th"],
      },
      {
        "@type": "SoftwareApplication",
        name: "FastCaption",
        url: "https://fastcaption.app",
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        description:
          "AI subtitle generator for TikTok, YouTube, and social media. Supports SRT, ASS, JSON, and TXT formats with word-level timing.",
        offers: {
          "@type": "AggregateOffer",
          lowPrice: "0",
          highPrice: "1299",
          priceCurrency: "THB",
          offerCount: 3,
        },
        featureList: [
          "AI speech-to-text transcription",
          "TikTok-style ASS subtitles",
          "SRT and TXT export",
          "Multi-language support",
          "Word-level timestamp accuracy",
        ],
      },
      {
        "@type": "Organization",
        name: "FastCaption",
        url: "https://fastcaption.app",
        logo: "https://fastcaption.app/android-chrome-512x512.png",
      },
    ],
  };

  // FAQ JSON-LD for Google AI Overview & Rich Results
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      // English FAQs
      {
        "@type": "Question",
        name: "What is FastCaption?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "FastCaption is an AI-powered subtitle and caption generator. Upload any audio or video file and get accurate transcriptions with word-level timestamps in seconds. Export as SRT, ASS (TikTok-style), JSON, or plain text. Start free with 5,000 credits — no credit card required.",
        },
      },
      {
        "@type": "Question",
        name: "Is FastCaption free to use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! Every new account gets 5,000 free credits (approximately 25 minutes of transcription). No credit card required. After that, credit packs start at just ฿99 (about $1.40 USD) — the cheapest subtitle generator available. No monthly subscription needed.",
        },
      },
      {
        "@type": "Question",
        name: "How accurate is FastCaption's AI transcription?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "FastCaption uses WhisperX, one of the most advanced speech recognition engines, with word-level forced alignment. Expect 95%+ accuracy for clear audio in supported languages. This is significantly more accurate than YouTube auto-captions (~80%) or TikTok's built-in captions.",
        },
      },
      {
        "@type": "Question",
        name: "What languages does FastCaption support?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "FastCaption supports 15+ languages including English, Thai (ไทย), Japanese (日本語), Korean (한국어), Chinese (中文), Spanish, French, German, Portuguese, Italian, Dutch, Russian, Arabic, Hindi, Vietnamese, and Indonesian. Language auto-detection is also available.",
        },
      },
      {
        "@type": "Question",
        name: "What subtitle formats can I export?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "FastCaption supports multiple export formats: SRT (universal format for YouTube, Premiere Pro, etc.), ASS (with TikTok-style word-by-word highlighting in portrait and landscape), JSON (with detailed word-level timestamps for developers), and plain TXT transcripts.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use FastCaption for TikTok subtitles?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Absolutely! FastCaption generates ASS subtitle files with trendy word-by-word highlighting effects, the same style used by top TikTok creators. Choose portrait (9:16) orientation, download the ASS file, and import into CapCut, Premiere Pro, or any video editor.",
        },
      },
      {
        "@type": "Question",
        name: "How does the credit system work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Credits are consumed based on actual audio duration, calculated per second. 1,000 credits ≈ 5 minutes of transcription. Credits never expire and there are no monthly fees. New users get 5,000 free credits. Additional packs start at ฿99 for 5,000 credits.",
        },
      },
      {
        "@type": "Question",
        name: "What is Align Mode?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Align Mode lets you provide your own script/transcript, and FastCaption's AI matches it to the audio with precise timestamps — without re-transcribing or changing any words. Perfect when you already have a script and need accurate timing for subtitles.",
        },
      },
      {
        "@type": "Question",
        name: "How long does transcription take?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "FastCaption processes a 10-minute video in about 30 seconds. Most files under 5 minutes are done in 10-15 seconds. This is approximately 10x faster than Premiere Pro's built-in captions and infinitely faster than manual typing.",
        },
      },
      {
        "@type": "Question",
        name: "What's the difference between ASS and SRT subtitles?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "SRT is a universal subtitle format supported everywhere (YouTube, Premiere Pro, etc.) with basic timing. ASS is an advanced format that supports styling, colors, and animations — FastCaption uses it for the trendy TikTok-style word-by-word highlighting effect. Use SRT for YouTube, ASS for TikTok/Reels.",
        },
      },
      {
        "@type": "Question",
        name: "Is FastCaption cheaper than other subtitle tools?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! FastCaption is the most affordable AI subtitle generator available. With pay-per-use pricing starting at ฿99 (~$1.40 USD) for 5,000 credits (≈25 minutes), it's significantly cheaper than Descript ($24/mo), Kapwing ($24/mo), or Rev ($1.50/min). Plus, you get 5,000 free credits to start.",
        },
      },
      {
        "@type": "Question",
        name: "Can I generate subtitles for YouTube videos?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! Upload your YouTube video or its audio to FastCaption, generate an SRT file, then upload it to YouTube Studio → Subtitles → Upload File. YouTube indexes subtitle text for SEO, so adding accurate subtitles helps your videos rank higher in search.",
        },
      },
      {
        "@type": "Question",
        name: "Do credits expire?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No, credits never expire. Buy once and use whenever you need. There are no monthly subscriptions or hidden fees. Your credits stay in your account until you use them.",
        },
      },
      {
        "@type": "Question",
        name: "What file formats can I upload?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "FastCaption accepts all common audio and video formats including MP4, MOV, MP3, WAV, M4A, AAC, FLAC, OGG, WEBM, and more. Maximum file size is 2GB.",
        },
      },
      // Thai FAQs — สำคัญมากสำหรับ Google Thailand
      {
        "@type": "Question",
        name: "FastCaption ใช้ฟรีได้ไหม?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "ได้ครับ! สมัครใหม่ได้ 5,000 เครดิตฟรี (ประมาณ 25 นาทีของการถอดเสียง) ไม่ต้องผูกบัตรเครดิต หลังจากนั้นซื้อเครดิตเพิ่มเริ่มต้นแค่ ฿99 — ถูกที่สุดในตลาด ไม่มีค่ารายเดือน",
        },
      },
      {
        "@type": "Question",
        name: "ราคา FastCaption เท่าไหร่?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "FastCaption ใช้ระบบเติมเครดิต ไม่มีค่ารายเดือน ราคาเริ่มต้น ฿99 สำหรับ 5,000 เครดิต (≈25 นาที), ฿199 สำหรับ 25,000 เครดิต (≈125 นาที), และ ฿699 สำหรับ 100,000 เครดิต (≈500 นาที) เครดิตไม่มีวันหมดอายุ",
        },
      },
      {
        "@type": "Question",
        name: "FastCaption รองรับภาษาไทยไหม?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "รองรับครับ! FastCaption ใช้ WhisperX AI ที่ถอดเสียงภาษาไทยได้แม่นยำ 95%+ รองรับทั้งภาษาไทย, อังกฤษ, จีน, ญี่ปุ่น, เกาหลี, และอีกกว่า 15 ภาษา มีระบบตรวจจับภาษาอัตโนมัติด้วย",
        },
      },
      {
        "@type": "Question",
        name: "ทำซับไตเติ้ล TikTok ด้วย FastCaption ได้ไหม?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "ได้ครับ! FastCaption สร้างไฟล์ ASS แบบ word-by-word highlighting สไตล์ TikTok ได้ทั้งแนวตั้ง (9:16) และแนวนอน (16:9) แค่อัปโหลดวิดีโอ แล้วดาวน์โหลดไฟล์ ASS ไปใส่ใน CapCut หรือ Premiere Pro",
        },
      },
      {
        "@type": "Question",
        name: "FastCaption ต่างจาก CapCut ยังไง?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "CapCut เป็นตัวตัดต่อวิดีโอที่มีฟีเจอร์ซับไตเติ้ลพื้นฐาน ส่วน FastCaption เชี่ยวชาญด้านการถอดเสียงและสร้างซับไตเติ้ล AI โดยเฉพาะ ด้วยความแม่นยำ 95%+, รองรับ 15+ ภาษา, มี Align Mode, และ export ได้ 4 ฟอร์แมต (SRT, ASS, JSON, TXT) ซับที่สร้างสามารถนำไปใช้ใน CapCut ได้เลย",
        },
      },
      {
        "@type": "Question",
        name: "Align Mode คืออะไร?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Align Mode คือโหมดที่คุณใส่บทพูด (script) ของตัวเอง แล้วให้ AI จับเวลาให้ตรงกับเสียงโดยไม่เปลี่ยนคำ เหมาะสำหรับคนที่มีสคริปต์อยู่แล้ว ต้องการแค่ timing ที่แม่นยำ",
        },
      },
      {
        "@type": "Question",
        name: "เครดิต FastCaption หมดอายุไหม?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "ไม่หมดอายุครับ! ซื้อเครดิตแล้วใช้เมื่อไหร่ก็ได้ ไม่มีค่ารายเดือน ไม่มีค่าธรรมเนียมแอบแฝง เครดิตจะอยู่ในบัญชีจนกว่าจะใช้หมด",
        },
      },
      {
        "@type": "Question",
        name: "ซับไตเติ้ล ASS คืออะไร?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "ASS (Advanced SubStation Alpha) เป็นฟอร์แมตซับไตเติ้ลขั้นสูง ที่รองรับการจัดสไตล์ สี และ animation ได้ FastCaption ใช้ฟอร์แมตนี้สร้างเอฟเฟกต์ word-by-word highlighting สไตล์ TikTok ที่กำลังฮิต ส่วน SRT เป็นฟอร์แมตพื้นฐานใช้ได้ทุกที่ (YouTube, Premiere Pro เป็นต้น)",
        },
      },
      {
        "@type": "Question",
        name: "FastCaption รองรับไฟล์อะไรบ้าง?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "รองรับไฟล์เสียงและวิดีโอทุกฟอร์แมตยอดนิยม ได้แก่ MP4, MOV, MP3, WAV, M4A, AAC, FLAC, OGG, WEBM และอื่นๆ ขนาดไฟล์สูงสุด 2GB",
        },
      },
      {
        "@type": "Question",
        name: "ใช้เวลาถอดเสียงนานแค่ไหน?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "วิดีโอ 10 นาทีใช้เวลาประมาณ 30 วินาที ไฟล์ที่สั้นกว่า 5 นาทีจะเสร็จใน 10-15 วินาที เร็วกว่า Premiere Pro ประมาณ 10 เท่า และเร็วกว่าพิมพ์เองหลายร้อยเท่า",
        },
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        {/* JSON-LD structured data for Google rich snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* FAQ JSON-LD for Google AI Overview */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        {/* Explicit favicon link for maximum Google Search compatibility */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Mobile browser theme color */}
        <meta name="theme-color" content="#0b0e17" />
        {/* Windows tile */}
        <meta name="msapplication-TileImage" content="/android-chrome-192x192.png" />
      </head>
      <body>
        <Providers>
          <Navbar />
          {children}
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
