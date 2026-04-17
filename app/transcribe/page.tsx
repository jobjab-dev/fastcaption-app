"use client";

import { useState, useRef, useCallback } from "react";

const LANGUAGES = [
  { code: "th", name: "ไทย" },
  { code: "en", name: "English" },
  { code: "zh", name: "中文" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "ms", name: "Bahasa Melay" },
  { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español" },
  { code: "pt", name: "Português" },
  { code: "ru", name: "Русский" },
  { code: "ar", name: "العربية" },
  { code: "hi", name: "हिन्दी" },
  { code: "auto", name: "Auto Detect" },
];

const ASS_MODES = [
  { value: "pause", label: "แบ่งตามจังหวะหยุดพูด", desc: "เหมาะกับซับไทเทิลทั่วไป" },
  { value: "word", label: "ทีละคำ (Word-by-Word)", desc: "เหมาะกับ TikTok / Reels แบบเน้นคำ" },
];

type JobStatus = "idle" | "uploading" | "processing" | "done" | "failed";
type WorkMode = "transcribe" | "align";

interface JobResult {
  jobId: string;
  creditsUsed: number;
  durationSec: number;
  balanceAfter: number;
}

export default function TranscribePage() {
  // Main state
  const [workMode, setWorkMode] = useState<WorkMode>("transcribe");
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("th");
  const [scriptText, setScriptText] = useState("");
  const [status, setStatus] = useState<JobStatus>("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<JobResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ASS options
  const [assMode, setAssMode] = useState<"pause" | "word" | "smart">("pause");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [assGenerating, setAssGenerating] = useState(false);

  // Upload JSON for ASS conversion
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const jsonFileRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const handleSubmit = async () => {
    if (!file) return;
    if (workMode === "align" && !scriptText.trim()) {
      setMessage("❌ กรุณาวางบทพูดก่อน");
      setStatus("failed");
      return;
    }

    setStatus("uploading");
    setMessage("กำลังอัพโหลดไฟล์...");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);
    formData.append("mode", workMode);
    if (workMode === "align") {
      formData.append("scriptText", scriptText);
    }

    try {
      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setStatus("failed");
        if (res.status === 402) {
          setMessage(`❌ Credits ไม่พอ — ต้องใช้ ${data.creditsNeeded?.toLocaleString()} credits (คงเหลือ ${data.balance?.toLocaleString()})`);
        } else {
          setMessage(`❌ ${data.error}`);
        }
        return;
      }

      setStatus("processing");
      const modeLabel = workMode === "align" ? "align" : "transcribe";
      setMessage(`⏳ กำลัง ${modeLabel}... (${data.durationSec} วินาที, ใช้ ${data.creditsUsed} credits)`);

      // Poll for job completion
      const jobId = data.jobId;
      const pollInterval = setInterval(async () => {
        try {
          const jobRes = await fetch(`/api/jobs/${jobId}`);
          const jobData = await jobRes.json();

          if (jobData.status === "done") {
            clearInterval(pollInterval);
            setStatus("done");
            setMessage(`✅ สำเร็จ! ใช้ ${data.creditsUsed} credits (คงเหลือ ${data.balanceAfter})`);
            setResult({ jobId, ...data });
          } else if (jobData.status === "failed") {
            clearInterval(pollInterval);
            setStatus("failed");
            setMessage(`❌ ล้มเหลว: ${jobData.errorMessage || "Unknown error"}\n\n💰 Credits ได้คืนแล้ว`);
          }
        } catch {
          // Ignore polling errors, will retry
        }
      }, 3000);
    } catch (err) {
      setStatus("failed");
      setMessage(`❌ เกิดข้อผิดพลาด: ${err}`);
    }
  };

  const handleDownloadJson = async () => {
    if (!result) return;
    try {
      const res = await fetch(`/api/jobs/${result.jobId}`, { method: "POST" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file?.name.replace(/\.[^.]+$/, ".json") || "result.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage(`❌ ดาวน์โหลดล้มเหลว: ${err}`);
    }
  };

  const handleDownloadAss = async (source: "job" | "upload") => {
    setAssGenerating(true);
    try {
      const formData = new FormData();
      formData.append("assMode", assMode);
      formData.append("orientation", orientation);

      if (source === "job" && result) {
        formData.append("jobId", result.jobId);
      } else if (source === "upload" && jsonFile) {
        formData.append("jsonFile", jsonFile);
      } else {
        setMessage("❌ ไม่มีข้อมูล JSON");
        return;
      }

      const res = await fetch("/api/transcribe/ass", { method: "POST", body: formData });

      if (!res.ok) {
        const err = await res.json();
        setMessage(`❌ สร้าง ASS ล้มเหลว: ${err.error}`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = source === "upload" && jsonFile
        ? jsonFile.name.replace(/\.json$/i, "")
        : file?.name.replace(/\.[^.]+$/, "") || "subtitle";
      a.download = `${baseName}.ass`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage(`❌ เกิดข้อผิดพลาด: ${err}`);
    } finally {
      setAssGenerating(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: "780px" }}>
        <h1 style={{ marginBottom: "8px" }}>🎵 Transcribe</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
          อัพโหลดไฟล์เสียงหรือวิดีโอเพื่อแปลงเป็นข้อความ พร้อมสร้าง ASS Subtitle
        </p>

        {/* Mode Toggle */}
        <div className="mode-toggle" style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          <button
            className={`btn ${workMode === "transcribe" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setWorkMode("transcribe")}
            style={{ flex: 1 }}
          >
            🎤 Transcribe
          </button>
          <button
            className={`btn ${workMode === "align" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setWorkMode("align")}
            style={{ flex: 1 }}
          >
            🔗 Align บทพูด
          </button>
        </div>

        {workMode === "align" && (
          <div className="alert alert-info" style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "8px", background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.3)", fontSize: "0.9rem" }}>
            ✅ <strong>Align mode:</strong> วางบทพูดที่ถูกต้อง + ไฟล์เสียง → ระบบจะจับ timestamp ให้ตรงกับเสียง (ข้อความจะตรงกับ script ไม่มีคำผิด)
          </div>
        )}

        {/* Upload Zone */}
        <div
          className={`upload-zone ${dragOver ? "drag-over" : ""}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileRef}
            type="file"
            accept="audio/*,video/*,.mp3,.wav,.m4a,.flac,.mp4,.mkv,.avi"
            style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file ? (
            <>
              <span className="icon">📁</span>
              <div className="title">{file.name}</div>
              <div className="subtitle">{formatSize(file.size)} — คลิกเพื่อเปลี่ยนไฟล์</div>
            </>
          ) : (
            <>
              <span className="icon">📤</span>
              <div className="title">ลากไฟล์มาวาง หรือคลิกเพื่อเลือก</div>
              <div className="subtitle">รองรับ MP3, WAV, M4A, FLAC, MP4, MKV (สูงสุด 500MB)</div>
            </>
          )}
        </div>

        {/* Script Text (Align mode) */}
        {workMode === "align" && (
          <div style={{ marginTop: "16px" }}>
            <label className="form-label">📝 วางบทพูด (Script)</label>
            <textarea
              className="textarea"
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="วางบทพูดที่นี่... แบ่งบรรทัดตามประโยค/วรรค"
              rows={8}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "0.95rem",
                lineHeight: "1.6",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>
        )}

        {/* Language Select */}
        <div style={{ marginTop: "16px" }}>
          <label className="form-label">🌐 ภาษา</label>
          <select
            className="select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>

        {/* Submit Button */}
        <button
          className="btn btn-primary btn-lg"
          style={{ width: "100%", marginTop: "20px" }}
          onClick={handleSubmit}
          disabled={!file || status === "uploading" || status === "processing"}
        >
          {status === "uploading" && <><span className="spinner" /> กำลังอัพโหลด...</>}
          {status === "processing" && <><span className="spinner" /> กำลัง {workMode === "align" ? "align" : "transcribe"}...</>}
          {(status === "idle" || status === "done" || status === "failed") && (
            workMode === "align" ? "🔗 เริ่ม Align" : "🚀 เริ่ม Transcribe"
          )}
        </button>

        {/* Status Message */}
        {message && (
          <div
            className={`alert ${status === "done" ? "alert-success" : status === "failed" ? "alert-error" : "alert-warning"}`}
            style={{ marginTop: "16px", whiteSpace: "pre-wrap" }}
          >
            {message}
          </div>
        )}

        {/* Download JSON */}
        {status === "done" && result && (
          <button
            className="btn btn-secondary btn-lg"
            style={{ width: "100%", marginTop: "12px" }}
            onClick={handleDownloadJson}
          >
            💾 ดาวน์โหลด JSON
          </button>
        )}

        {/* ─── ASS Subtitle Section ─── */}
        <div style={{
          marginTop: "32px",
          paddingTop: "24px",
          borderTop: "1px solid var(--border)",
        }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>🎬 สร้าง ASS Subtitle</h2>

          {/* ASS Mode */}
          <div style={{ marginBottom: "16px" }}>
            <label className="form-label">โหมดซับไทเทิล</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {ASS_MODES.map((m) => (
                <label
                  key={m.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: `1px solid ${assMode === m.value ? "var(--accent)" : "var(--border)"}`,
                    background: assMode === m.value ? "rgba(99, 102, 241, 0.1)" : "var(--surface)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <input
                    type="radio"
                    name="assMode"
                    value={m.value}
                    checked={assMode === m.value}
                    onChange={() => setAssMode(m.value as "pause" | "word" | "smart")}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <div>
                    <div style={{ fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{m.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Orientation */}
          <div style={{ marginBottom: "16px" }}>
            <label className="form-label">📐 รูปแบบวิดีโอ</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className={`btn ${orientation === "portrait" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setOrientation("portrait")}
                style={{ flex: 1 }}
              >
                📱 แนวตั้ง (Portrait)
              </button>
              <button
                className={`btn ${orientation === "landscape" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setOrientation("landscape")}
                style={{ flex: 1 }}
              >
                🖥️ แนวนอน (Landscape)
              </button>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "6px" }}>
              {orientation === "landscape" ? "แนวนอน — caption ยาวขึ้น 2 เท่า" : "แนวตั้ง — caption สั้นกระชับ"}
            </div>
          </div>

          {/* Generate ASS from Job */}
          {status === "done" && result && (
            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginBottom: "12px" }}
              onClick={() => handleDownloadAss("job")}
              disabled={assGenerating}
            >
              {assGenerating ? <><span className="spinner" /> กำลังสร้าง ASS...</> : "🎬 สร้าง ASS จากผลลัพธ์"}
            </button>
          )}

          {/* Upload JSON for ASS */}
          <div style={{
            padding: "16px",
            borderRadius: "10px",
            border: "1px dashed var(--border)",
            background: "var(--surface)",
          }}>
            <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "10px" }}>
              📁 หรืออัพโหลด JSON จาก disk เพื่อแปลงเป็น ASS (ฟรี ไม่ใช้ credits)
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                className="btn btn-secondary"
                onClick={() => jsonFileRef.current?.click()}
                style={{ flex: "0 0 auto" }}
              >
                เลือกไฟล์ JSON
              </button>
              <input
                ref={jsonFileRef}
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={(e) => setJsonFile(e.target.files?.[0] || null)}
              />
              {jsonFile && (
                <>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {jsonFile.name}
                  </span>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleDownloadAss("upload")}
                    disabled={assGenerating}
                  >
                    {assGenerating ? "กำลังสร้าง..." : "🎬 สร้าง ASS"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
