import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "./components/Navbar";
import { Providers } from "./components/Providers";

export const metadata: Metadata = {
  title: "FastCaption — AI Subtitle Generator",
  description: "Convert audio to high-quality transcripts and auto-generate TikTok-style .ASS subtitles with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
