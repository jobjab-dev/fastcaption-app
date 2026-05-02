"use client";

import { useState, useEffect, useMemo } from "react";
import { useLocale } from "./LocaleProvider";

/** Peek carousel — shows prev/current/next with horizontal slide */
export function OutputCarousel() {
  const { locale } = useLocale();
  const [active, setActive] = useState(0);
  const isTh = locale === "th";
  const L = (th: string, en: string) => isTh ? th : en;

  const slides = useMemo(() => [
    { file: "output.srt", lines: [
      { c: "rgba(255,255,255,0.3)", t: "1" },
      { c: "rgba(249,115,22,0.5)", t: "00:00:01,240 --> 00:00:03,820" },
      { c: "rgba(255,255,255,0.7)", t: L("สวัสดีครับ วันนี้เราจะมาพูดถึง","Hello, today we'll talk about") },
      { c: "rgba(255,255,255,0)", t: "\u00A0" },
      { c: "rgba(255,255,255,0.3)", t: "2" },
      { c: "rgba(249,115,22,0.5)", t: "00:00:03,820 --> 00:00:06,100" },
      { c: "rgba(255,255,255,0.7)", t: L("เทคนิคการตัดต่อวิดีโอสำหรับ TikTok","video editing techniques for TikTok") },
      { c: "rgba(255,255,255,0)", t: "\u00A0" },
      { c: "rgba(255,255,255,0.3)", t: "3" },
      { c: "rgba(249,115,22,0.5)", t: "00:00:06,100 --> 00:00:08,500" },
      { c: "rgba(255,255,255,0.7)", t: L("ที่จะทำให้คอนเทนต์ของคุณดูดีขึ้น","that will make your content shine") },
    ]},
    { file: "output.ass", lines: [
      { c: "rgba(255,255,255,0.2)", t: "[Script Info]" },
      { c: "rgba(255,255,255,0.35)", t: "ScriptType: v4.00+" },
      { c: "rgba(255,255,255,0.35)", t: "PlayResX: 1080" },
      { c: "rgba(255,255,255,0)", t: "\u00A0" },
      { c: "rgba(255,255,255,0.2)", t: "[V4+ Styles]" },
      { c: "rgba(255,255,255,0.35)", t: "Style: Default,Arial,48,..." },
      { c: "rgba(255,255,255,0)", t: "\u00A0" },
      { c: "rgba(255,255,255,0.2)", t: "[Events]" },
      { c: "rgba(255,255,255,0.55)", t: L("Dialogue: 0:00:01.24,...,สวัสดีครับ","Dialogue: 0:00:01.24,...,Hello today") },
      { c: "rgba(255,255,255,0.55)", t: L("Dialogue: 0:00:03.82,...,เทคนิค","Dialogue: 0:00:03.82,...,video editing") },
      { c: "rgba(255,255,255,0.55)", t: L("Dialogue: 0:00:06.10,...,คอนเทนต์","Dialogue: 0:00:06.10,...,your content") },
    ]},
    { file: "output.json", lines: [
      { c: "rgba(255,255,255,0.3)", t: "{" },
      { c: "rgba(255,255,255,0.4)", t: '  "segments": [' },
      { c: "rgba(255,255,255,0.4)", t: "    {" },
      { c: "rgba(249,115,22,0.5)", t: '      "start": 1.24,' },
      { c: "rgba(249,115,22,0.5)", t: '      "end": 3.82,' },
      { c: "rgba(255,255,255,0.7)", t: L('      "text": "สวัสดีครับ..."','      "text": "Hello, today..."') },
      { c: "rgba(255,255,255,0.4)", t: "    }," },
      { c: "rgba(255,255,255,0.4)", t: "    {" },
      { c: "rgba(249,115,22,0.5)", t: '      "start": 3.82,' },
      { c: "rgba(249,115,22,0.5)", t: '      "end": 6.10,' },
      { c: "rgba(255,255,255,0.7)", t: L('      "text": "เทคนิค..."','      "text": "video editing..."') },
    ]},
    { file: "output.txt", lines: [
      { c: "rgba(255,255,255,0.7)", t: L("สวัสดีครับ วันนี้เราจะมาพูดถึง","Hello, today we're going to talk about") },
      { c: "rgba(255,255,255,0.7)", t: L("เทคนิคการตัดต่อวิดีโอสำหรับ TikTok","video editing techniques for TikTok") },
      { c: "rgba(255,255,255,0.7)", t: L("ที่จะทำให้คอนเทนต์ของคุณ","that will make your content shine") },
      { c: "rgba(255,255,255,0.7)", t: L("ดูน่าสนใจและเป็นมืออาชีพมากขึ้น","and look much more professional") },
      { c: "rgba(255,255,255,0.7)", t: L("ไม่ว่าจะเป็นมือใหม่หรือมือโปร","whether you're a beginner or a pro") },
      { c: "rgba(255,255,255,0.7)", t: L("สามารถทำได้ง่ายๆ ตามขั้นตอนนี้","you can follow these simple steps") },
      { c: "rgba(255,255,255,0.7)", t: L("เริ่มจากการอัพโหลดไฟล์เสียง","start by uploading your audio file") },
      { c: "rgba(255,255,255,0.7)", t: L("ระบบจะถอดเสียงให้อัตโนมัติ","the system will transcribe automatically") },
      { c: "rgba(255,255,255,0.7)", t: L("จากนั้นเลือกรูปแบบที่ต้องการ","then choose the format you need") },
      { c: "rgba(255,255,255,0.7)", t: L("ดาวน์โหลดได้ทันที ไม่ต้องรอ","download instantly, no waiting") },
      { c: "rgba(255,255,255,0.7)", t: L("ลองใช้ฟรีวันนี้ได้เลย!","try it free today!") },
    ]},
  ], [isTh]);

  const N = slides.length;
  useEffect(() => {
    const t = setInterval(() => setActive((p) => (p + 1) % N), 4000);
    return () => clearInterval(t);
  }, [N]);

  const idx = (off: number) => ((active + off) % N + N) % N;

  const CARD_H = "310px";

  const Card = ({ i }: { i: number }) => {
    const s = slides[i];
    return (
      <div style={{
        background: "#0d1117",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "12px",
        overflow: "hidden",
        height: CARD_H,
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#f87171" }} />
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fbbf24" }} />
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399" }} />
          <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>{s.file}</span>
        </div>
        <div style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: "0.73rem", lineHeight: 1.7, flex: 1, overflow: "hidden" }}>
          {s.lines.map((l, j) => <div key={j} style={{ color: l.c }}>{l.t}</div>)}
          <div style={{ marginTop: "4px" }}><span className="blink-cursor" style={{ display: "inline-block", width: "7px", height: "13px", background: "var(--accent)", borderRadius: "1px" }} /></div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="peek-carousel">
        {/* Left peek */}
        <div className="peek-side peek-left" onClick={() => setActive(idx(-1))}>
          <Card i={idx(-1)} />
        </div>
        {/* Center */}
        <div className="peek-center">
          <Card i={active} />
        </div>
        {/* Right peek */}
        <div className="peek-side peek-right" onClick={() => setActive(idx(1))}>
          <Card i={idx(1)} />
        </div>
      </div>

      {/* Dots + labels */}
      <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "16px" }}>
        {slides.map((_, i) => (
          <button key={i} onClick={() => setActive(i)} style={{ width: i === active ? "22px" : "6px", height: "6px", borderRadius: "3px", border: "none", background: i === active ? "var(--accent)" : "rgba(255,255,255,0.12)", cursor: "pointer", transition: "all 0.3s", padding: 0 }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "18px", marginTop: "8px" }}>
        {slides.map((s, i) => (
          <button key={i} onClick={() => setActive(i)} style={{ background: "none", border: "none", padding: 0, fontSize: "0.7rem", fontFamily: "monospace", color: i === active ? "var(--accent)" : "rgba(255,255,255,0.18)", cursor: "pointer", fontWeight: i === active ? 600 : 400, transition: "color 0.3s" }}>
            .{s.file.split(".")[1]}
          </button>
        ))}
      </div>
    </div>
  );
}
