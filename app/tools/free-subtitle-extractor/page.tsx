"use client";

import { useState } from "react";
import Link from "next/link";

export default function FreeSubtitleExtractorPage() {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleFile = (file: File) => {
    setFileName(file.name);
    setTimeout(() => setShowResult(true), 2000);
  };

  return (
    <>
      <section className="tool-hero">
        <div className="container">
          <div className="section-label">🆓 Free Tool</div>
          <h1 className="tool-hero-title">
            Free <span className="hero-gradient">Subtitle Extractor</span>
          </h1>
          <p className="section-subtitle" style={{ margin: "0 auto 32px", textAlign: "center" }}>
            Try AI transcription for free. Upload a short clip and preview the subtitle output.
            Full transcription available with a free FastCaption account.
          </p>
        </div>
      </section>

      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="mini-tool-box">
            {!fileName ? (
              <label
                className={`mini-tool-upload${dragOver ? " drag-over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const files = e.dataTransfer.files;
                  if (files.length > 0) handleFile(files[0]);
                }}
              >
                <input
                  type="file"
                  accept="audio/*,video/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) handleFile(files[0]);
                  }}
                />
                <div style={{ fontSize: "3rem", marginBottom: 12 }}>📁</div>
                <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: 4 }}>
                  Drop your video or audio file here
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Or click to browse · MP4, MOV, MP3, WAV · Max 50MB for free preview
                </div>
              </label>
            ) : !showResult ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{
                  width: 48, height: 48, border: "3px solid rgba(249,115,22,0.3)",
                  borderTopColor: "var(--accent-light)", borderRadius: "50%",
                  animation: "spin 0.7s linear infinite", margin: "0 auto 20px",
                }} />
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Processing: {fileName}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  AI is transcribing your file...
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)",
                }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>✅ Preview Ready</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{fileName}</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 8, borderLeft: "3px solid var(--accent-light)" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--accent-light)", fontWeight: 600, fontFamily: "monospace", minWidth: 72 }}>00:00.20</span>
                    <span style={{ fontSize: "0.88rem" }}>This is a preview of AI <span style={{ background: "rgba(249,115,22,0.18)", padding: "1px 5px", borderRadius: 3, color: "var(--accent-light)" }}>transcription</span></span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 8, borderLeft: "3px solid var(--accent)" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--accent-light)", fontWeight: 600, fontFamily: "monospace", minWidth: 72 }}>00:02.50</span>
                    <span style={{ fontSize: "0.88rem" }}>With <span style={{ background: "rgba(249,115,22,0.18)", padding: "1px 5px", borderRadius: 3, color: "var(--accent-light)" }}>word-level</span> timestamps and accuracy</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 8, borderLeft: "3px solid var(--success)" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--accent-light)", fontWeight: 600, fontFamily: "monospace", minWidth: 72 }}>00:04.80</span>
                    <span style={{ fontSize: "0.88rem" }}>Sign up free to get the <span style={{ background: "rgba(249,115,22,0.18)", padding: "1px 5px", borderRadius: 3, color: "var(--accent-light)" }}>full</span> transcription</span>
                  </div>
                </div>

                <div style={{
                  background: "rgba(249,115,22,0.08)", border: "1px solid rgba(251,146,60,0.2)",
                  borderRadius: "var(--radius-lg)", padding: "20px", textAlign: "center",
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>🔒 Sign up to unlock full transcription</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16 }}>
                    Get 5,000 free credits (≈25 minutes) — no credit card required
                  </div>
                  <Link href="/login" className="btn btn-primary btn-lg">
                    🚀 Get Full Transcription Free →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div style={{ maxWidth: 600, margin: "48px auto 0", textAlign: "center" }}>
            <h2 className="section-title" style={{ fontSize: "1.6rem" }}>
              How This Free Subtitle Tool Works
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.75, marginTop: 12 }}>
              Our free subtitle extractor uses the same WhisperX AI engine that powers FastCaption.
              Upload a short clip to preview how accurate and fast our transcription is. For full-length
              videos and all export formats (SRT, ASS, JSON, TXT), create a free account and get
              5,000 credits to start. <strong>ถูกที่สุดในตลาด — เริ่มต้น ฿49!</strong>
            </p>
          </div>
        </div>
      </section>

      <section className="landing-section" style={{ paddingBottom: 88 }}>
        <div className="container">
          <div className="cta-banner">
            <h2 className="section-title">
              Want the <span className="hero-gradient">Full Experience</span>?
            </h2>
            <p>Unlimited uploads, all export formats, 15+ languages. Free 5,000 credits!</p>
            <Link href="/login" className="btn btn-primary btn-xl">🚀 Start Free — 5,000 Credits →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
