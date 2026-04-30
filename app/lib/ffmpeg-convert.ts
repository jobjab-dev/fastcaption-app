/**
 * ffmpeg-convert.ts
 * Client-side video/audio → MP3 conversion using ffmpeg.wasm
 * 
 * Loads ffmpeg from CDN (unpkg) to avoid bloating the bundle.
 * Converts to 128kbps mono MP3 — optimal for Whisper transcription.
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

// Singleton ffmpeg instance
let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoaded = false;

// Audio file extensions that don't need conversion
const AUDIO_EXTENSIONS = new Set([
  ".mp3", ".wav", ".m4a", ".flac", ".ogg", ".wma", ".aac",
]);

// Video file extensions that need conversion to mp3
const VIDEO_EXTENSIONS = new Set([
  ".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv", ".wmv", ".m4v", ".ts",
]);

/**
 * Check if a file needs conversion (is it a video file?)
 */
export function needsConversion(file: File): boolean {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return VIDEO_EXTENSIONS.has(ext);
}

/**
 * Get a human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Load ffmpeg.wasm from CDN
 */
async function loadFFmpeg(
  onLog?: (msg: string) => void
): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegLoaded) return ffmpegInstance;

  const ffmpeg = new FFmpeg();

  ffmpeg.on("log", ({ message }) => {
    onLog?.(message);
  });

  // Load from unpkg CDN — avoids bundling the 30MB wasm file
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";

  await ffmpeg.load({
    coreURL: `${baseURL}/ffmpeg-core.js`,
    wasmURL: `${baseURL}/ffmpeg-core.wasm`,
  });

  ffmpegInstance = ffmpeg;
  ffmpegLoaded = true;
  return ffmpeg;
}

export interface ConvertProgress {
  stage: "loading" | "converting" | "done" | "error";
  progress: number; // 0-100
  message: string;
  outputSize?: number;
}

/**
 * Convert a video/audio file to MP3 (128kbps mono)
 * 
 * @param file - Input file (video or audio)
 * @param onProgress - Progress callback
 * @returns Converted MP3 File, or the original file if no conversion needed
 */
export async function convertToMp3(
  file: File,
  onProgress?: (p: ConvertProgress) => void,
): Promise<File> {
  // If already audio, skip conversion
  if (!needsConversion(file)) {
    onProgress?.({
      stage: "done",
      progress: 100,
      message: "ไฟล์เสียง — ไม่ต้องแปลง",
    });
    return file;
  }

  try {
    // Stage 1: Load ffmpeg
    onProgress?.({
      stage: "loading",
      progress: 10,
      message: "กำลังโหลดตัวแปลงไฟล์...",
    });

    const ffmpeg = await loadFFmpeg();

    // Stage 2: Write input file
    onProgress?.({
      stage: "converting",
      progress: 20,
      message: `กำลังอ่านไฟล์ ${formatFileSize(file.size)}...`,
    });

    const inputName = "input" + getExtension(file.name);
    const outputName = "output.mp3";

    await ffmpeg.writeFile(inputName, await fetchFile(file));

    // Stage 3: Convert
    // Track progress via ffmpeg time output
    let lastProgress = 20;
    ffmpeg.on("progress", ({ progress }) => {
      const pct = Math.min(95, 20 + Math.round(progress * 75));
      if (pct > lastProgress) {
        lastProgress = pct;
        onProgress?.({
          stage: "converting",
          progress: pct,
          message: `กำลังแปลงเป็น MP3... ${pct}%`,
        });
      }
    });

    onProgress?.({
      stage: "converting",
      progress: 25,
      message: "กำลังแปลงเป็น MP3...",
    });

    // Convert: extract audio as 128kbps mono mp3
    await ffmpeg.exec([
      "-i", inputName,
      "-vn",              // no video
      "-ac", "1",         // mono
      "-ab", "128k",      // 128kbps
      "-ar", "16000",     // 16kHz (Whisper native sample rate)
      "-f", "mp3",
      outputName,
    ]);

    // Stage 4: Read output
    const outputData = await ffmpeg.readFile(outputName);
    // @ts-expect-error -- ffmpeg.wasm FileData is Uint8Array at runtime, TS strict mode has ArrayBufferLike mismatch
    const outputBlob = new Blob([outputData], { type: "audio/mpeg" });
    const outputFile = new File(
      [outputBlob],
      file.name.replace(/\.[^.]+$/, ".mp3"),
      { type: "audio/mpeg" },
    );

    // Cleanup
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    onProgress?.({
      stage: "done",
      progress: 100,
      message: `แปลงสำเร็จ! ${formatFileSize(file.size)} → ${formatFileSize(outputFile.size)}`,
      outputSize: outputFile.size,
    });

    return outputFile;
  } catch (error) {
    onProgress?.({
      stage: "error",
      progress: 0,
      message: `แปลงไฟล์ไม่สำเร็จ: ${error}`,
    });
    throw error;
  }
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.substring(dot).toLowerCase() : "";
}
