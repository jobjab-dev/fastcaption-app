"use client";

import { useState, useRef, useCallback } from "react";
import { needsConversion, convertToMp3, formatFileSize, type ConvertProgress } from "@/app/lib/ffmpeg-convert";
import { useLocale } from "@/app/components/LocaleProvider";

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

// ASS_MODES labels are set dynamically via i18n in the component

type JobStatus = "idle" | "uploading" | "processing" | "done" | "failed";
type WorkMode = "transcribe" | "align";

interface JobResult {
  jobId: string;
  creditsUsed: number;
  durationSec: number;
  balanceAfter: number;
}

export default function TranscribePage() {
  const { t } = useLocale();

  const ASS_MODES = [
    { value: "pause", label: t("tx.assPause"), desc: t("tx.assPauseDesc") },
    { value: "word", label: t("tx.assWord"), desc: t("tx.assWordDesc") },
  ];
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

  // Conversion state
  const [convertProgress, setConvertProgress] = useState<ConvertProgress | null>(null);

  // Upload JSON for ASS conversion
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const jsonFileRef = useRef<HTMLInputElement>(null);

  // Allowed audio/video extensions
  const ALLOWED_EXTS = new Set([
    ".mp3", ".wav", ".m4a", ".flac", ".ogg", ".wma", ".aac",
    ".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv", ".wmv", ".m4v", ".ts",
  ]);

  const validateFile = (f: File): boolean => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) {
      setMessage(t("tx.unsupported", { ext }));
      setStatus("failed");
      return false;
    }
    return true;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) {
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      const allowed = new Set([
        ".mp3", ".wav", ".m4a", ".flac", ".ogg", ".wma", ".aac",
        ".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv", ".wmv", ".m4v", ".ts",
      ]);
      if (!allowed.has(ext)) {
        setMessage(t("tx.unsupported", { ext }));
        setStatus("failed");
        return;
      }
      setFile(f);
      setMessage("");
      setStatus("idle");
    }
  }, []);

  const handleSubmit = async () => {
    if (!file) return;
    if (workMode === "align" && !scriptText.trim()) {
      setMessage("❌ กรุณาวางบทพูดก่อน");
      setStatus("failed");
      return;
    }

    setStatus("uploading");
    setResult(null);
    setConvertProgress(null);

    // Convert video → mp3 if needed (client-side)
    let uploadFile = file;
    if (needsConversion(file)) {
      setMessage(`🎬 กำลังแปลงวิดีโอเป็น MP3... (${formatFileSize(file.size)})`);
      try {
        uploadFile = await convertToMp3(file, (p) => {
          setConvertProgress(p);
          setMessage(`🎬 ${p.message}`);
        });
      } catch {
        setStatus("failed");
        setMessage(t("tx.convertFailed"));
        return;
      }
    }

    setMessage(t("tx.uploading"));
    setConvertProgress(null);

    const formData = new FormData();
    formData.append("file", uploadFile);
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
          setMessage(t("tx.creditsLow", { needed: data.creditsNeeded?.toLocaleString() || "?", balance: data.balance?.toLocaleString() || "?" }));
        } else {
          setMessage(t("tx.errorGeneral", { error: data.error }));
        }
        return;
      }

      setStatus("processing");
      const modeLabel = workMode === "align" ? "align" : "transcribe";
      setMessage(t("tx.processingStatus", { mode: modeLabel, dur: data.durationSec, cred: data.creditsUsed }));

      // Poll for job completion
      const jobId = data.jobId;
      const pollInterval = setInterval(async () => {
        try {
          const jobRes = await fetch(`/api/jobs/${jobId}`);
          const jobData = await jobRes.json();

          if (jobData.status === "done") {
            clearInterval(pollInterval);
            setStatus("done");
            setMessage(t("tx.success", { cred: data.creditsUsed, bal: data.balanceAfter }));
            setResult({ jobId, ...data });
          } else if (jobData.status === "failed") {
            clearInterval(pollInterval);
            setStatus("failed");
            setMessage(t("tx.jobFailed", { err: jobData.errorMessage || "Unknown error" }));
          }
        } catch {
          // Ignore polling errors, will retry
        }
      }, 3000);
    } catch (err) {
      setStatus("failed");
      setMessage(t("tx.errorGeneral", { error: err }));
    }
  };

  // ─── Download helpers ────────────────────────────────────────

  /** Fetch the raw JSON from the completed job */
  const fetchJobJson = async (): Promise<{ segments: Array<{ start: number; end: number; text: string }>; [k: string]: unknown } | null> => {
    if (!result) return null;
    const res = await fetch(`/api/jobs/${result.jobId}`, { method: "POST" });
    if (!res.ok) throw new Error("Download failed");
    return res.json();
  };

  const triggerDownload = (content: string, filename: string, mime = "text/plain") => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const baseName = () =>
    file?.name.replace(/\.[^.]+$/, "") || "result";

  // JSON
  const handleDownloadJson = async () => {
    try {
      const data = await fetchJobJson();
      if (!data) return;
      triggerDownload(JSON.stringify(data, null, 2), `${baseName()}.json`, "application/json");
    } catch (err) {
      setMessage(t("tx.errorDownload", { err }));
    }
  };

  // SRT
  const handleDownloadSrt = async () => {
    try {
      const data = await fetchJobJson();
      if (!data?.segments) { setMessage(t("tx.noSegments")); return; }
      const srt = data.segments.map((seg, i) => {
        const fmt = (s: number) => {
          const h = Math.floor(s / 3600);
          const m = Math.floor((s % 3600) / 60);
          const sec = Math.floor(s % 60);
          const ms = Math.round((s % 1) * 1000);
          return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
        };
        return `${i + 1}\n${fmt(seg.start)} --> ${fmt(seg.end)}\n${seg.text}\n`;
      }).join("\n");
      triggerDownload(srt, `${baseName()}.srt`);
    } catch (err) {
      setMessage(t("tx.errorDownload", { err }));
    }
  };

  // TXT (plain text)
  const handleDownloadTxt = async () => {
    try {
      const data = await fetchJobJson();
      if (!data?.segments) { setMessage(t("tx.noSegments")); return; }
      const txt = data.segments.map(seg => seg.text).join("\n");
      triggerDownload(txt, `${baseName()}.txt`);
    } catch (err) {
      setMessage(t("tx.errorDownload", { err }));
    }
  };

  // ASS subtitle (server-side generation)
  const handleDownloadAss = async (source: "job" | "upload") => {
    setAssGenerating(true);
    try {
      const formData = new FormData();
      formData.append("assMode", assMode);
      formData.append("orientation", orientation);
      formData.append("language", language);

      if (source === "job" && result) {
        formData.append("jobId", result.jobId);
      } else if (source === "upload" && jsonFile) {
        formData.append("jsonFile", jsonFile);
      } else {
        setMessage(t("tx.unsupported", { ext: "none" }));
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
      const name = source === "upload" && jsonFile
        ? jsonFile.name.replace(/\.json$/i, "")
        : baseName();
      a.download = `${name}.ass`;
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
        <h1 style={{ marginBottom: "8px" }}>{t("tx.title")}</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
          {t("tx.desc")}
        </p>

        {/* Mode Toggle */}
        <div className="mode-toggle" style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          <button
            className={`btn ${workMode === "transcribe" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setWorkMode("transcribe")}
            style={{ flex: 1 }}
          >
            {t("tx.modeTranscribe")}
          </button>
          <button
            className={`btn ${workMode === "align" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setWorkMode("align")}
            style={{ flex: 1 }}
          >
            {t("tx.modeAlign")}
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
            accept="audio/*,video/*,.mp3,.wav,.m4a,.flac,.ogg,.wma,.aac,.mp4,.mkv,.avi,.mov,.webm,.flv,.wmv,.m4v,.ts"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && validateFile(f)) {
                setFile(f);
                setMessage("");
                setStatus("idle");
              }
              // Reset input so same file can be re-selected
              e.target.value = "";
            }}
          />
          {file ? (
            <>
              <span className="icon">📁</span>
              <div className="title">{file.name}</div>
              <div className="subtitle">{formatSize(file.size)} — {t("tx.changeFile")}</div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); setMessage(""); setStatus("idle"); }}
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  fontSize: "1rem",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.3)"; e.currentTarget.style.color = "#f87171"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                title="ยกเลิกไฟล์"
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <span className="icon">📤</span>
              <div className="title">{t("tx.dropzone")}</div>
              <div className="subtitle">{t("tx.dropzoneHint")}</div>
            </>
          )}
        </div>

        {/* Script Text (Align mode) */}
        {workMode === "align" && (
          <div style={{ marginTop: "16px" }}>
            <label className="form-label">{t("tx.scriptLabel")}</label>
            <textarea
              className="textarea"
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder={t("tx.scriptPlaceholder")}
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
          <label className="form-label">{t("tx.language")}</label>
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
          {status === "uploading" && <><span className="spinner" /> {t("tx.uploading")}</>}
          {status === "processing" && <><span className="spinner" /> {t("tx.processing", { sec: "", credits: "" })}</>}
          {(status === "idle" || status === "done" || status === "failed") && (
            workMode === "align" ? t("tx.submitAlign") : t("tx.submit")
          )}
        </button>

        {/* Conversion Progress Bar */}
        {convertProgress && convertProgress.stage !== "done" && (
          <div style={{
            marginTop: "16px",
            padding: "16px 20px",
            borderRadius: "10px",
            background: "rgba(99, 102, 241, 0.1)",
            border: "1px solid rgba(99, 102, 241, 0.25)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.88rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>🎬 แปลงวิดีโอ → MP3</span>
              <span style={{ color: "var(--accent-light)", fontWeight: 600 }}>{convertProgress.progress}%</span>
            </div>
            <div style={{
              width: "100%",
              height: "6px",
              borderRadius: "3px",
              background: "rgba(255,255,255,0.1)",
              overflow: "hidden",
            }}>
              <div style={{
                width: `${convertProgress.progress}%`,
                height: "100%",
                borderRadius: "3px",
                background: "linear-gradient(90deg, var(--accent), var(--accent-light))",
                transition: "width 0.3s ease",
              }} />
            </div>
          </div>
        )}

        {/* Status Message */}
        {message && (
          <div
            className={`alert ${status === "done" ? "alert-success" : status === "failed" ? "alert-error" : "alert-warning"}`}
            style={{ marginTop: "16px", whiteSpace: "pre-wrap" }}
          >
            {message}
          </div>
        )}

        {/* ─── Download Results (JSON, SRT, TXT) ─── */}
        {status === "done" && result && (
          <div style={{
            marginTop: "16px",
            padding: "20px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08))",
            border: "1px solid rgba(99, 102, 241, 0.2)",
          }}>
            <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "12px", color: "var(--text-primary)" }}>
              📥 ดาวน์โหลดผลลัพธ์
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "8px",
            }}>
              <button className="btn btn-secondary" onClick={handleDownloadJson}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 8px", gap: "4px" }}>
                <span style={{ fontSize: "1.3rem" }}>📋</span>
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>JSON</span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>ข้อมูลดิบ + timestamps</span>
              </button>
              <button className="btn btn-secondary" onClick={handleDownloadSrt}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 8px", gap: "4px" }}>
                <span style={{ fontSize: "1.3rem" }}>🎬</span>
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>SRT</span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>ซับไทเทิลมาตรฐาน</span>
              </button>
              <button className="btn btn-secondary" onClick={handleDownloadTxt}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 8px", gap: "4px" }}>
                <span style={{ fontSize: "1.3rem" }}>📝</span>
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>TXT</span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>ข้อความล้วน</span>
              </button>
            </div>
          </div>
        )}

        {/* ─── ASS Subtitle Section ─── */}
        <div style={{
          marginTop: "32px",
          paddingTop: "24px",
          borderTop: "1px solid var(--border)",
        }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>✨ สร้าง ASS Subtitle</h2>

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

          {/* JSON Source: auto from job OR upload */}
          {!(status === "done" && result) && (
            <div style={{
              position: "relative",
              padding: "16px",
              borderRadius: "10px",
              border: `1px dashed ${jsonFile ? "var(--accent)" : "var(--border)"}`,
              background: jsonFile ? "rgba(99, 102, 241, 0.05)" : "var(--surface)",
              marginBottom: "12px",
              transition: "all 0.2s",
            }}>
              <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "10px" }}>
                📁 อัพโหลด JSON เพื่อแปลงเป็น ASS (ฟรี ไม่ใช้ credits)
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => jsonFileRef.current?.click()}
                  style={{ flex: "0 0 auto" }}
                >
                  {jsonFile ? "เปลี่ยนไฟล์" : "เลือกไฟล์ JSON"}
                </button>
                <input
                  ref={jsonFileRef}
                  type="file"
                  accept=".json"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const ext = f.name.split(".").pop()?.toLowerCase();
                      if (ext !== "json") {
                        setMessage("❌ เลือกได้เฉพาะไฟล์ .json เท่านั้น");
                        setStatus("failed");
                      } else {
                        setJsonFile(f);
                        setMessage("");
                      }
                    }
                    e.target.value = "";
                  }}
                />
                {jsonFile && (
                  <span style={{ fontSize: "0.85rem", color: "var(--text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {jsonFile.name}
                  </span>
                )}
              </div>
              {/* Cancel button */}
              {jsonFile && (
                <button
                  onClick={() => setJsonFile(null)}
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "50%",
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.3)"; e.currentTarget.style.color = "#f87171"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                  title="ยกเลิกไฟล์"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* ASS Generate Button — auto source detection */}
          {((status === "done" && result) || jsonFile) && (
            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: "8px" }}
              onClick={() => handleDownloadAss(status === "done" && result ? "job" : "upload")}
              disabled={assGenerating}
            >
              {assGenerating
                ? <><span className="spinner" /> กำลังสร้าง ASS...</>
                : `✨ สร้าง ASS Subtitle${status === "done" && result ? "" : ` — ${jsonFile?.name || ""}`}`
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
