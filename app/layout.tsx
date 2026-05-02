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
    "subtitle generator",
    "AI subtitles",
    "ASS subtitles",
    "TikTok subtitles",
    "audio transcription",
    "speech to text",
    "video captions",
    "auto subtitle",
    "SRT generator",
    "FastCaption",
    // Thai keywords
    "สร้างซับไตเติ้ล",
    "ทำซับ AI",
    "ซับไตเติ้ล TikTok",
    "ถอดเสียง AI",
    "แปลงเสียงเป็นข้อความ",
    "ซับไตเติ้ลอัตโนมัติ",
    "แคปชั่นวิดีโอ",
    "ซับ ASS",
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

  return (
    <html lang="en">
      <head>
        {/* JSON-LD structured data for Google rich snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
