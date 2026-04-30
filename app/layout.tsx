import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "./components/Navbar";
import { Providers } from "./components/Providers";

export const metadata: Metadata = {
  title: "FastCaption — AI Subtitle Generator | Try Free",
  description:
    "Convert audio & video to high-quality transcripts and TikTok-style .ASS subtitles with AI. Sign up free — get 5,000 credits instantly, no credit card required.",
  metadataBase: new URL("https://fastcaption.app"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
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
        url: "/fastcaption_logo.jpeg",
        width: 1200,
        height: 1200,
        alt: "FastCaption Logo",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "FastCaption — AI Subtitle Generator | Try Free",
    description:
      "Convert audio to subtitles with AI in seconds. Get 5,000 free credits on signup!",
    images: ["/fastcaption_logo.jpeg"],
  },
  other: {
    "google-site-verification": "",
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
