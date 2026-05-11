import Replicate from "replicate";
import { generateAssContent } from "./ass-generator";

// Primary: Custom FastCaption Whisper model (faster-whisper large-v3, character-level timestamps)
// Deploy with: cd replicate-model && cog push r8.im/jobjab-dev/fastcaption-whisper
// After push, update the version hash below
const WHISPER_MODEL = "jobjab-dev/fastcaption-whisper:dd7e665d23983d66b57494fcd2b6cdee751cbe45152c88a1e97cd785422bd8f3" as const;

// Fallback: Public model — incredibly-fast-whisper (word-level timestamps, not character-level)
// Works reliably, supports timestamp="word" for word-level timestamps
// Latest version: 3ab86df6 (2024-02-16)
const WHISPER_FALLBACK = "vaibhavs10/incredibly-fast-whisper:3ab86df6c8f54c11309d4d1f930ac292bad43ace52d10c80d87eb258b3c9f79c" as const;

/** Get Replicate client */
function getReplicate(): Replicate {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN is not set");
  }
  return new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
}

/** Estimate audio duration from file size (serverless fallback, no ffprobe) */
export function estimateAudioDuration(fileSize: number, mimeType: string): number {
  // Rough bitrate estimates for common audio formats
  const bitrateMap: Record<string, number> = {
    "audio/mpeg": 128 * 1024 / 8,     // 128kbps MP3 ≈ 16KB/s
    "audio/mp4": 128 * 1024 / 8,      // M4A similar
    "audio/wav": 176400,               // 44.1kHz 16bit mono ≈ 176KB/s
    "audio/flac": 44100,               // FLAC ~44KB/s typical
    "audio/ogg": 128 * 1024 / 8,
    "audio/webm": 128 * 1024 / 8,
  };
  // For video files, estimate audio component as ~10% of file
  const videoTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"];
  const isVideo = videoTypes.some(t => mimeType.startsWith(t.split("/")[0]));
  const effectiveSize = isVideo ? fileSize * 0.1 : fileSize;
  const bytesPerSec = bitrateMap[mimeType] || 16 * 1024;
  return Math.max(effectiveSize / bytesPerSec, 1);
}

interface TranscriptionOptions {
  language: string;
}

interface TranscriptionResult {
  success: boolean;
  resultJson?: string;        // JSON string of result (stored in DB)
  error?: string;
  segments?: number;
  replicateRunTime?: number;
  modelUsed?: string;
  durationFromModel?: number; // Audio duration reported by model
}

/** Check if an error is a retryable model error (disabled, setup failed, etc.) */
function isModelDisabledError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("version disabled") ||
      msg.includes("fails to complete setup") ||
      msg.includes("version not found") ||
      msg.includes("status 422")
    );
  }
  return false;
}

/** Check if error is a rate limit (429) and extract retry delay */
function getRateLimitDelay(error: unknown): number | null {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("429") || msg.toLowerCase().includes("too many requests") || msg.toLowerCase().includes("rate limit")) {
      const match = msg.match(/retry_after["\s:]+(\d+)/i) || msg.match(/resets in ~(\d+)s/i);
      const delay = match ? parseInt(match[1], 10) : 8;
      return Math.max(delay, 3);
    }
  }
  return null;
}

/** Sleep for N milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Run transcription with a URL input (Supabase Storage signed URL or data URI).
 *  Returns JSON result as a string for storage in DB.
 */
export async function runTranscription(
  audioUrl: string,
  options: TranscriptionOptions
): Promise<TranscriptionResult> {
  console.log(`[replicate] Using model: ${WHISPER_FALLBACK}`);

  const MAX_RETRIES = 3;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await runWithFallbackModel(audioUrl, options);
      return result;
    } catch (fallbackError) {
      lastError = fallbackError;
      const retryDelay = getRateLimitDelay(fallbackError);
      if (retryDelay && attempt < MAX_RETRIES) {
        console.warn(`[replicate] ⚠️ Rate limited (429), waiting ${retryDelay}s before retry ${attempt + 1}/${MAX_RETRIES}...`);
        await sleep(retryDelay * 1000);
      } else if (attempt >= MAX_RETRIES) {
        console.error(`[replicate] ❌ Failed after ${MAX_RETRIES} attempts:`, fallbackError);
      } else {
        console.error("[replicate] ❌ Model failed (non-retryable):", fallbackError);
        break;
      }
    }
  }

  return {
    success: false,
    error: `Transcription failed: ${lastError instanceof Error ? lastError.message : "Unknown error"}`,
  };
}

/** Run transcription using public incredibly-fast-whisper model (word-level timestamps) */
async function runWithFallbackModel(
  audioUrl: string,
  options: TranscriptionOptions
): Promise<TranscriptionResult> {
  const replicate = getReplicate();

  console.log(`[replicate-fallback] Starting with incredibly-fast-whisper, lang: ${options.language}`);

  const langMap: Record<string, string> = {
    "th": "thai", "en": "english", "zh": "chinese", "ja": "japanese",
    "ko": "korean", "vi": "vietnamese", "id": "indonesian", "ms": "malay",
    "de": "german", "fr": "french", "es": "spanish", "pt": "portuguese",
    "ru": "russian", "ar": "arabic", "hi": "hindi", "auto": "None",
  };
  const language = langMap[options.language] || "None";

  // Try with descending batch sizes — higher is faster & cheaper (less GPU time), lower avoids OOM
  const batchSizes = [64, 24, 8];

  for (const batchSize of batchSizes) {
    const startTime = Date.now();

    const input: Record<string, unknown> = {
      audio: audioUrl,
      task: "transcribe",
      timestamp: "chunk",
      batch_size: batchSize,
      language,
    };

    console.log(`[replicate-fallback] Running with timestamp=chunk, batch_size=${batchSize}, language=${language}`);

    let lastStatus = "";
    let lastLogLength = 0;

    try {
      const output = await replicate.run(
        WHISPER_FALLBACK,
        {
          input,
          wait: { mode: "poll" as const, interval: 2000 },
        },
        (prediction) => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          if (prediction.status !== lastStatus) {
            lastStatus = prediction.status;
            const gpuTime = prediction.metrics?.predict_time ? ` (GPU: ${prediction.metrics.predict_time.toFixed(1)}s)` : "";
            console.log(`[replicate-fallback] ⏱ ${elapsed}s — Status: ${prediction.status}${gpuTime}`);
          }
          if (prediction.logs && prediction.logs.length > lastLogLength) {
            const newLogs = prediction.logs.slice(lastLogLength).trim();
            if (newLogs) {
              const lines = newLogs.split("\n").slice(-2);
              for (const line of lines) {
                if (line.trim()) {
                  console.log(`[replicate-fallback] 📋 ${line.trim()}`);
                }
              }
            }
            lastLogLength = prediction.logs.length;
          }
        }
      ) as Record<string, unknown>;

      const runTime = (Date.now() - startTime) / 1000;
      console.log(`[replicate-fallback] ✅ Completed in ${runTime.toFixed(1)}s (batch_size=${batchSize})`);
      console.log(`[replicate-fallback] Raw output type: ${typeof output}, keys: ${Object.keys(output)}`);

      // Transform output to our internal format
      const result = transformFallbackModelOutput(output);
      const resultJson = JSON.stringify(result, null, 2);

      return {
        success: true,
        resultJson,
        segments: result.segments?.length ?? 0,
        replicateRunTime: runTime,
        modelUsed: "incredibly-fast-whisper (fallback)",
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isOOM = errMsg.includes("CUDA out of memory") || errMsg.includes("OOM");

      if (isOOM && batchSize !== batchSizes[batchSizes.length - 1]) {
        console.warn(`[replicate-fallback] ⚠️ OOM with batch_size=${batchSize}, retrying with smaller batch...`);
        continue;
      }
      // Not OOM or last attempt — throw
      throw err;
    }
  }

  // Should never reach here, but just in case
  return { success: false, error: "All batch sizes exhausted" };
}

/** Run forced alignment — transcribe first, then align script text to transcription timestamps. */
export async function runAlignment(
  audioUrl: string,
  scriptText: string,
  options: TranscriptionOptions
): Promise<TranscriptionResult> {
  console.log(`[align] Starting forced alignment (script: ${scriptText.length} chars)`);

  // Step 1: Get transcription with word timestamps
  const result = await runTranscription(audioUrl, options);
  if (!result.success || !result.resultJson) return result;

  if (!scriptText.trim()) {
    console.log("[align] No script text provided, returning raw transcription");
    return result;
  }

  try {
    const data = JSON.parse(result.resultJson);
    const segments = data.segments as Array<{
      start: number; end: number; text: string;
      words?: Array<{ word: string; start: number; end: number }>;
    }>;

    if (!segments || segments.length === 0) {
      console.warn("[align] No segments from transcription, skipping alignment");
      return result;
    }

    // Step 2: Build character-level timeline from transcription words
    const charTimeline = buildCharTimeline(segments);
    console.log(`[align] Character timeline: ${charTimeline.length} chars from transcription`);

    if (charTimeline.length === 0) {
      console.warn("[align] Empty char timeline, returning raw transcription");
      return result;
    }

    // Step 3: Clean script (remove whitespace for matching)
    const scriptClean = scriptText.split("").filter(ch => ch.trim()).join("");
    console.log(`[align] Script clean: ${scriptClean.length} chars (from ${scriptText.length})`);

    // Step 4: Align script to transcription using LCS
    const scriptTimestamps = alignScriptToTimeline(scriptClean, charTimeline);

    // Step 5: Build aligned output
    const alignedOutput = buildAlignedOutput(scriptText, scriptTimestamps, data.language || options.language) as {
      segments: Array<{ words?: unknown[] }>;
      [key: string]: unknown;
    };

    const totalWords = alignedOutput.segments.reduce((sum: number, s: { words?: unknown[] }) => sum + (s.words?.length || 0), 0);
    console.log(`[align] ✅ Aligned: ${alignedOutput.segments.length} segments, ${totalWords} chars with timestamps`);

    alignedOutput.original_script = scriptText;
    alignedOutput.alignment_model = result.modelUsed;

    return {
      ...result,
      resultJson: JSON.stringify(alignedOutput, null, 2),
      segments: alignedOutput.segments.length,
    };
  } catch (error) {
    console.error("[align] Alignment failed, returning raw transcription:", error);
    // Fallback: return raw transcription with script attached
    try {
      const data = JSON.parse(result.resultJson);
      data.original_script = scriptText;
      return { ...result, resultJson: JSON.stringify(data, null, 2) };
    } catch { /* ignore */ }
    return result;
  }
}

// ─── Alignment Helpers (ported from align_worker.py) ──────────────────────

interface CharEntry {
  char: string;
  start: number;
  end: number;
}

/** Build per-character timeline from transcription segments */
function buildCharTimeline(segments: Array<{
  start: number; end: number; text: string;
  words?: Array<{ word: string; start: number; end: number }>;
}>): CharEntry[] {
  const timeline: CharEntry[] = [];

  for (const seg of segments) {
    if (seg.words && seg.words.length > 0) {
      for (const w of seg.words) {
        const chars = w.word || "";
        const charDur = chars.length > 0 ? (w.end - w.start) / chars.length : 0;
        for (let i = 0; i < chars.length; i++) {
          const ch = chars[i];
          if (ch.trim()) {
            timeline.push({
              char: ch.toLowerCase(),
              start: w.start + i * charDur,
              end: w.start + (i + 1) * charDur,
            });
          }
        }
      }
    } else {
      const text = (seg.text || "").trim();
      if (text) {
        const dur = seg.end - seg.start;
        const charDur = dur / text.length;
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          if (ch.trim()) {
            timeline.push({
              char: ch.toLowerCase(),
              start: seg.start + i * charDur,
              end: seg.start + (i + 1) * charDur,
            });
          }
        }
      }
    }
  }

  return timeline;
}

/** Align script characters to transcribed character timeline using LCS matching */
function alignScriptToTimeline(
  scriptClean: string,
  timeline: CharEntry[]
): Array<[number, number]> {
  const transChars = timeline.map(e => e.char.toLowerCase());
  const scriptChars = scriptClean.toLowerCase().split("");

  const n = scriptChars.length;
  const m = transChars.length;

  // Build LCS matrix
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (scriptChars[i - 1] === transChars[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find matching pairs
  const matches: Array<[number, number]> = []; // [scriptIdx, timelineIdx]
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (scriptChars[i - 1] === transChars[j - 1]) {
      matches.push([i - 1, j - 1]);
      i--; j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  matches.reverse();

  // Assign timestamps
  const timestamps: Array<[number, number]> = new Array(n).fill(null).map(() => [-1, -1]);

  for (const [si, ti] of matches) {
    timestamps[si] = [timeline[ti].start, timeline[ti].end];
  }

  // Interpolate unmatched characters
  let lastKnownIdx = -1;
  let lastKnownTime = timeline.length > 0 ? timeline[0].start : 0;

  for (let idx = 0; idx < n; idx++) {
    if (timestamps[idx][0] >= 0) {
      // Fill gap between lastKnownIdx and idx
      if (lastKnownIdx >= 0 && idx - lastKnownIdx > 1) {
        const gapCount = idx - lastKnownIdx - 1;
        const tStart = timestamps[lastKnownIdx][1];
        const tEnd = timestamps[idx][0];
        const step = (tEnd - tStart) / (gapCount + 1);
        for (let g = 1; g <= gapCount; g++) {
          timestamps[lastKnownIdx + g] = [
            tStart + (g - 1) * step,
            tStart + g * step,
          ];
        }
      }
      lastKnownIdx = idx;
      lastKnownTime = timestamps[idx][1];
    }
  }

  // Fill trailing unmatched
  if (lastKnownIdx >= 0 && lastKnownIdx < n - 1) {
    const remaining = n - lastKnownIdx - 1;
    const tEnd = timeline.length > 0 ? timeline[timeline.length - 1].end : lastKnownTime + remaining * 0.1;
    const step = (tEnd - lastKnownTime) / remaining;
    for (let g = 1; g <= remaining; g++) {
      timestamps[lastKnownIdx + g] = [
        lastKnownTime + (g - 1) * step,
        lastKnownTime + g * step,
      ];
    }
  }

  // Fill leading unmatched
  if (timestamps[0][0] < 0) {
    let firstKnown = -1;
    for (let idx = 0; idx < n; idx++) {
      if (timestamps[idx][0] >= 0) { firstKnown = idx; break; }
    }
    if (firstKnown > 0) {
      const tStart = timeline.length > 0 ? timeline[0].start : 0;
      const tEnd = timestamps[firstKnown][0];
      const step = (tEnd - tStart) / firstKnown;
      for (let g = 0; g < firstKnown; g++) {
        timestamps[g] = [tStart + g * step, tStart + (g + 1) * step];
      }
    } else {
      // No matches at all — evenly distribute
      const totalDur = timeline.length > 0 ? timeline[timeline.length - 1].end - timeline[0].start : n * 0.1;
      const tStart = timeline.length > 0 ? timeline[0].start : 0;
      const step = totalDur / n;
      for (let g = 0; g < n; g++) {
        timestamps[g] = [tStart + g * step, tStart + (g + 1) * step];
      }
    }
  }

  return timestamps;
}

/** Build aligned output as segments with per-character "words" */
function buildAlignedOutput(
  scriptText: string,
  scriptTimestamps: Array<[number, number]>,
  language: string
): Record<string, unknown> {
  const segments: Array<{
    start: number; end: number; text: string;
    words: Array<{ word: string; start: number; end: number }>;
  }> = [];

  let cleanIdx = 0;
  const lines = scriptText.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const words: Array<{ word: string; start: number; end: number }> = [];
    for (const ch of trimmed) {
      if (ch.trim() && cleanIdx < scriptTimestamps.length) {
        words.push({
          word: ch,
          start: Math.round(scriptTimestamps[cleanIdx][0] * 1000) / 1000,
          end: Math.round(scriptTimestamps[cleanIdx][1] * 1000) / 1000,
        });
        cleanIdx++;
      } else if (!ch.trim()) {
        // Skip whitespace (not in clean index)
      }
    }

    if (words.length > 0) {
      segments.push({
        start: words[0].start,
        end: words[words.length - 1].end,
        text: trimmed,
        words,
      });
    }
  }

  return { segments, language };
}

/** Transform custom model output to our internal format */
function transformCustomModelOutput(output: Record<string, unknown>): {
  segments: Array<{
    start: number; end: number; text: string;
    words?: Array<{ start: number; end: number; word: string }>;
  }>;
  language?: string;
} {
  const rawSegments = output.segments as Array<Record<string, unknown>> | undefined;

  if (rawSegments && Array.isArray(rawSegments) && rawSegments.length > 0) {
    const segments = rawSegments.map((seg) => {
      const start = Number(seg.start) || 0;
      const end = Number(seg.end) || 0;
      const text = String(seg.text || "").trim();

      let words: Array<{ start: number; end: number; word: string }> | undefined;
      const rawWords = seg.words as Array<Record<string, unknown>> | undefined;
      if (rawWords && Array.isArray(rawWords)) {
        words = rawWords.map((w) => ({
          word: String(w.word || w.text || ""),
          start: Number(w.start) || 0,
          end: Number(w.end) || 0,
        }));
      }

      return { start, end, text, words };
    });

    const totalWords = segments.reduce((sum, s) => sum + (s.words?.length || 0), 0);
    console.log(`[transform] ${rawSegments.length} segments, ${totalWords} words (custom model)`);

    return {
      segments,
      language: output.detected_language ? String(output.detected_language) : undefined,
    };
  }

  console.warn(`[transform] No segments found in custom model output. Keys: ${Object.keys(output)}`);
  return { segments: [], language: undefined };
}

/** Transform incredibly-fast-whisper chunk output to our internal format.
 *  Chunk mode returns sentence-level chunks (not character-level tokens).
 *  Each chunk becomes a segment with per-character words for timestamp mapping.
 */
function transformFallbackModelOutput(output: Record<string, unknown>): {
  segments: Array<{
    start: number; end: number; text: string;
    words?: Array<{ start: number; end: number; word: string }>;
  }>;
  language?: string;
} {
  const rawChunks = output.chunks as Array<Record<string, unknown>> | undefined;

  if (!rawChunks || !Array.isArray(rawChunks) || rawChunks.length === 0) {
    console.warn(`[transform-fallback] No chunks found. Keys: ${Object.keys(output)}`);
    const rawSegments = output.segments as Array<Record<string, unknown>> | undefined;
    if (rawSegments && Array.isArray(rawSegments) && rawSegments.length > 0) {
      return transformCustomModelOutput(output);
    }
    return { segments: [], language: undefined };
  }

  const segments: Array<{
    start: number; end: number; text: string;
    words: Array<{ start: number; end: number; word: string }>;
  }> = [];

  for (const chunk of rawChunks) {
    const ts = chunk.timestamp as [number, number | null] | undefined;
    if (!ts || !Array.isArray(ts)) continue;
    const start = Number(ts[0]) || 0;
    const end = ts[1] != null ? Number(ts[1]) : start;
    const text = String(chunk.text || "").trim();
    if (!text) continue;

    // Generate word tokens with proportional timestamps.
    // Split by spaces first to preserve English word boundaries.
    // Latin/ASCII tokens stay as whole words; Thai/CJK tokens get split per-character.
    const spacedTokens = text.split(/(\s+)/).filter(t => t.trim().length > 0);

    // Calculate total character count for proportional timing
    const totalChars = spacedTokens.reduce((sum, t) => sum + [...t].length, 0);
    const duration = end - start;
    const durPerChar = totalChars > 0 ? duration / totalChars : 0;

    const words: Array<{ word: string; start: number; end: number }> = [];
    let charOffset = 0;

    for (const token of spacedTokens) {
      const isLatin = /^[a-zA-Z0-9\s\-'.,!?:;"()]+$/.test(token);

      if (isLatin) {
        // Keep as one word token (e.g. "Topological")
        const tokenChars = [...token].length;
        words.push({
          word: token,
          start: Math.round((start + charOffset * durPerChar) * 1000) / 1000,
          end: Math.round((start + (charOffset + tokenChars) * durPerChar) * 1000) / 1000,
        });
        charOffset += tokenChars;
      } else {
        // Thai/CJK: split into per-character tokens
        const chars = [...token];
        for (let ci = 0; ci < chars.length; ci++) {
          words.push({
            word: chars[ci],
            start: Math.round((start + (charOffset + ci) * durPerChar) * 1000) / 1000,
            end: Math.round((start + (charOffset + ci + 1) * durPerChar) * 1000) / 1000,
          });
        }
        charOffset += chars.length;
      }
    }

    segments.push({ start, end, text, words });
  }

  const totalChars = segments.reduce((sum, s) => sum + s.words.length, 0);
  console.log(`[transform-fallback] ${segments.length} segments, ${totalChars} chars (chunk mode)`);

  return {
    segments,
    language: output.detected_language ? String(output.detected_language) : undefined,
  };
}

/** Generate ASS content from JSON data string — pure in-memory, no filesystem */
export async function generateAss(
  jsonContent: string,
  options: {
    mode: "pause" | "word" | "smart";
    orientation: "portrait" | "landscape";
    pauseThreshold?: number;
    maxChars?: number;
    language?: string;
  }
): Promise<{ success: boolean; content?: string; captions?: number; error?: string }> {
  try {
    // generateAssContent imported at top of file
    const data = JSON.parse(jsonContent);

    const mode = options.mode === "word" ? "word" : options.mode === "smart" ? "smart" : "pause";
    const maxChars = options.maxChars || (options.orientation === "portrait" ? 16 : 32);
    const pauseThreshold = options.pauseThreshold || 0.3;

    console.log(`[ass] Generating ASS (TypeScript): mode=${mode}, orientation=${options.orientation}, threshold=${pauseThreshold}, maxChars=${maxChars}`);

    const { content, captionCount } = await generateAssContent(data, {
      mode,
      orientation: options.orientation,
      pauseThreshold,
      maxChars,
    });

    console.log(`[ass] ✅ Generated ${captionCount} captions`);

    return { success: true, content, captions: captionCount };
  } catch (error) {
    console.error("[ass] Generation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "ASS generation failed",
    };
  }
}
