import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation — FastCaption",
  description:
    "Integrate AI transcription and subtitle generation into your apps. RESTful API with word-level timestamps, 15+ languages, and TikTok-style ASS subtitles. Get 5,000 free credits.",
  openGraph: {
    title: "FastCaption API — Developer Documentation",
    description:
      "RESTful API for AI-powered transcription and subtitle generation. Word-level timestamps, multi-language support, TikTok-style ASS subtitles.",
    url: "https://fastcaption.app/api-docs",
  },
};

export default function ApiDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
