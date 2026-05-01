import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "./components/Navbar";
import { Providers } from "./components/Providers";

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
    "FastCaption",
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
  other: {
    "google-site-verification": "",
    "msapplication-TileColor": "#0a0a0a",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Explicit favicon link for maximum Google Search compatibility */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Mobile browser theme color */}
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        {/* Windows tile */}
        <meta name="msapplication-TileImage" content="/android-chrome-192x192.png" />
      </head>
      <body>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
