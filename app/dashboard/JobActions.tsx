"use client";

import { useState, useRef, useEffect } from "react";

interface JobActionsProps {
  jobId: string;
  fileName: string;
  status: string;
}

type DownloadType = "json" | "srt" | "txt" | "ass-pause-portrait" | "ass-pause-landscape" | "ass-word-portrait" | "ass-word-landscape";

const MENU_ITEMS: { key: DownloadType; icon: string; label: string; group: string }[] = [
  { key: "json", icon: "📄", label: "JSON (word timestamps)", group: "ไฟล์ข้อความ" },
  { key: "srt", icon: "📝", label: "SRT (SubRip)", group: "ไฟล์ข้อความ" },
  { key: "txt", icon: "📃", label: "TXT (Plain Text)", group: "ไฟล์ข้อความ" },
  { key: "ass-pause-portrait", icon: "📱", label: "ASS แนวตั้ง (Pause)", group: "ซับไทเทิล ASS" },
  { key: "ass-pause-landscape", icon: "🖥️", label: "ASS แนวนอน (Pause)", group: "ซับไทเทิล ASS" },
  { key: "ass-word-portrait", icon: "📱", label: "ASS แนวตั้ง (ทีละคำ)", group: "ซับไทเทิล ASS" },
  { key: "ass-word-landscape", icon: "🖥️", label: "ASS แนวนอน (ทีละคำ)", group: "ซับไทเทิล ASS" },
];

export default function JobActions({ jobId, fileName, status }: JobActionsProps) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (status !== "done") return null;

  const baseName = fileName.replace(/\.[^.]+$/, "");

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = async (type: DownloadType) => {
    setDownloading(type);
    try {
      if (type === "json") {
        const res = await fetch(`/api/jobs/${jobId}`, { method: "POST" });
        if (!res.ok) throw new Error("Download failed");
        downloadBlob(await res.blob(), `${baseName}.json`);

      } else if (type === "srt" || type === "txt") {
        // Download JSON first, then convert client-side
        const res = await fetch(`/api/jobs/${jobId}`, { method: "POST" });
        if (!res.ok) throw new Error("Download failed");
        const data = await res.json();
        
        if (type === "srt") {
          const srt = jsonToSrt(data.segments || []);
          downloadBlob(new Blob([srt], { type: "text/plain" }), `${baseName}.srt`);
        } else {
          const txt = (data.segments || []).map((s: { text: string }) => s.text).join("\n");
          downloadBlob(new Blob([txt], { type: "text/plain" }), `${baseName}.txt`);
        }

      } else if (type.startsWith("ass-")) {
        // Parse: ass-{mode}-{orientation}
        const parts = type.split("-");
        const assMode = parts[1] as "pause" | "word";
        const orientation = parts[2] as "portrait" | "landscape";

        const formData = new FormData();
        formData.append("jobId", jobId);
        formData.append("assMode", assMode);
        formData.append("orientation", orientation);

        const res = await fetch("/api/transcribe/ass", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed");
        }
        const suffix = orientation === "landscape" ? "_landscape" : "";
        downloadBlob(await res.blob(), `${baseName}${suffix}.ass`);
      }

      setOpen(false);
    } catch (err) {
      alert(`ดาวน์โหลดล้มเหลว: ${err}`);
    } finally {
      setDownloading(null);
    }
  };

  // Group menu items
  const groups = MENU_ITEMS.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof MENU_ITEMS>);

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Download options"
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          background: open ? "var(--surface-2)" : "transparent",
          color: "var(--text-primary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.1rem",
          transition: "all 0.15s",
          flexShrink: 0,
        }}
      >
        ⋮
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "6px",
            width: "260px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            zIndex: 50,
            overflow: "hidden",
            animation: "fadeIn 0.15s ease",
          }}
        >
          {Object.entries(groups).map(([groupName, items], gi) => (
            <div key={groupName}>
              {gi > 0 && (
                <div style={{ height: "1px", background: "var(--border)", margin: "0" }} />
              )}
              <div
                style={{
                  padding: "8px 14px 4px",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {groupName}
              </div>
              {items.map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleDownload(item.key)}
                  disabled={downloading !== null}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    cursor: downloading ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    textAlign: "left",
                    transition: "background 0.1s",
                    opacity: downloading === item.key ? 0.5 : 1,
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: "1rem", width: "20px", textAlign: "center" }}>
                    {downloading === item.key ? "⏳" : item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Convert WhisperX segments to SRT format */
function jsonToSrt(segments: { start: number; end: number; text: string }[]): string {
  return segments
    .map((seg, i) => {
      const start = formatSrtTime(seg.start);
      const end = formatSrtTime(seg.end);
      return `${i + 1}\n${start} --> ${end}\n${seg.text.trim()}\n`;
    })
    .join("\n");
}

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

function pad(n: number, len = 2): string {
  return n.toString().padStart(len, "0");
}
