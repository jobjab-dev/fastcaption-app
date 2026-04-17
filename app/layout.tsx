import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "./components/Navbar";
import { Providers } from "./components/Providers";

export const metadata: Metadata = {
  title: "FastCaption — AI Subtitle Generator",
  description: "แปลงเสียงเป็นข้อความด้วย AI คุณภาพสูงสุด พร้อมสร้างซับไทเทิล .ASS อัตโนมัติ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
