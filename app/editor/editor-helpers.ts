// Editor helper: transcribe, types, utils
import { createSupabaseBrowserClient } from "@/app/lib/supabase/client";

export interface Cap { id: number; start: number; end: number; text: string; }
export interface FontStyle { fontName: string; fontSize: number; color: string; outline: string; outlineW: number; shadow: number; bold: boolean; italic: boolean; }

export const FONTS = ["Arial","Impact","Kanit","Sarabun","Prompt","Noto Sans Thai","Roboto","Helvetica","Verdana","Tahoma"];
export const LANGS = [{c:"th",n:"ไทย"},{c:"en",n:"English"},{c:"zh",n:"中文"},{c:"ja",n:"日本語"},{c:"ko",n:"한국어"},{c:"auto",n:"Auto"}];

export const fmt = (s: number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}.${String(Math.floor((s%1)*100)).padStart(2,"0")}`;
export const hex2ass = (h: string) => `&H00${h.slice(5,7)}${h.slice(3,5)}${h.slice(1,3)}`.toUpperCase();

export const DEFAULT_FONT: FontStyle = { fontName:"Arial", fontSize:64, color:"#FFFFFF", outline:"#111111", outlineW:3, shadow:0, bold:false, italic:false };

/** Upload file to Supabase → call /api/transcribe → poll → return parsed captions.
 *  Pass an already-converted audio file (mp3) if the source was video. */
export async function transcribeVideo(
  uploadFile: File,
  language: string,
  onStatus: (msg: string) => void,
): Promise<Cap[]> {

  onStatus("Uploading...");
  const supabase = createSupabaseBrowserClient();
  const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `uploads/${Date.now()}_${safeName}`;
  const { error: upErr } = await supabase.storage.from("audio-uploads").upload(storagePath, uploadFile, { contentType: uploadFile.type || "audio/mpeg", upsert: false });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

  onStatus("Processing...");
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storagePath, fileName: uploadFile.name, fileSize: uploadFile.size, fileType: uploadFile.type || "audio/mpeg", language, mode: "transcribe" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

  onStatus("Transcribing...");
  const jobId = data.jobId;

  // Poll
  for (let i = 0; i < 200; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const jr = await fetch(`/api/jobs/${jobId}`);
    const jd = await jr.json();
    if (jd.status === "done") {
      // Fetch full result
      const full = await fetch(`/api/jobs/${jobId}`, { method: "POST" });
      const result = await full.json();
      if (!result.segments?.length) throw new Error("No segments");
      return result.segments.map((s: { start: number; end: number; text: string }, i: number) => ({
        id: i, start: s.start, end: s.end, text: (s.text || "").trim(),
      }));
    }
    if (jd.status === "failed") throw new Error(jd.errorMessage || "Transcription failed");
    onStatus(`Transcribing... (${Math.round((i+1)*3)}s)`);
  }
  throw new Error("Timeout");
}

/** Export ASS with font params */
export async function exportAssFile(
  jsonFile: File, assMode: string, orient: string, lang: string, maxCh: number, font: FontStyle,
) {
  const fd = new FormData();
  fd.append("jsonFile", jsonFile); fd.append("assMode", assMode); fd.append("orientation", orient);
  fd.append("language", lang); fd.append("maxChars", String(maxCh));
  fd.append("fontName", font.fontName); fd.append("fontSize", String(font.fontSize));
  fd.append("primaryColor", hex2ass(font.color)); fd.append("outlineColor", hex2ass(font.outline));
  fd.append("outlineWidth", String(font.outlineW)); fd.append("shadowDepth", String(font.shadow));
  fd.append("bold", font.bold ? "true" : "false"); fd.append("italic", font.italic ? "true" : "false");
  const res = await fetch("/api/transcribe/ass", { method: "POST", body: fd });
  if (!res.ok) throw new Error("ASS generation failed");
  return res.blob();
}
