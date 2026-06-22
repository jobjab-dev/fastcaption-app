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
  timestampMode?: "chunk" | "word";  // chunk = averaged (default), word = character-level from Whisper
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

    const tsMode = options.timestampMode || "chunk";
    const input: Record<string, unknown> = {
      audio: audioUrl,
      task: "transcribe",
      timestamp: tsMode,
      batch_size: batchSize,
      language,
    };

    console.log(`[replicate-fallback] Running with timestamp=${tsMode}, batch_size=${batchSize}, language=${language}`);

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

  // Step 1: Get transcription with word timestamps from Whisper
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

    // Detect if language needs character-level alignment (no word boundaries)
    const charLevelLangs = ["th", "thai", "zh", "chinese", "ja", "japanese", "ko", "korean", "lo", "my", "km"];
    const lang = (options.language || "").toLowerCase();
    const useCharLevel = charLevelLangs.some(l => lang.startsWith(l));

    if (useCharLevel) {
      // ── Thai/CJK: Distribute script tokens across Whisper timestamps ──
      // Script uses spaces to separate phrases (e.g. "ไอแซก นิวตัน คงจะฉีกตำราตัวเองทิ้ง")
      // Each space-separated token is a complete phrase — never cut mid-token.
      // Distribute tokens proportionally across Whisper segments' time ranges.
      console.log(`[align] Using token-based proportional overlay for language: ${lang}`);

      const audioEnd = segments[segments.length - 1].end;
      const audioStart = segments[0].start;

      // Split script into space-separated tokens (complete phrases)
      const scriptTokens = scriptText.split(/\s+/).filter(t => t.trim());
      if (scriptTokens.length === 0) {
        console.warn("[align] No script tokens, returning raw transcription");
        return result;
      }

      // Build Whisper segment list
      const whisperSegs: Array<{ start: number; end: number; charCount: number }> = [];
      for (const seg of segments) {
        const text = (seg.text || "").trim();
        const chars = [...text].filter(c => c.trim()).length;
        if (chars > 0 && seg.end > seg.start) {
          whisperSegs.push({ start: seg.start, end: seg.end, charCount: chars });
        }
      }

      if (whisperSegs.length === 0) {
        console.warn("[align] No valid Whisper segments, returning raw transcription");
        return result;
      }

      const totalWhisperChars = whisperSegs.reduce((sum, s) => sum + s.charCount, 0);
      const totalScriptChars = scriptTokens.reduce((sum, t) => sum + t.length, 0);

      console.log(`[align] Whisper segs: ${whisperSegs.length}, Whisper chars: ${totalWhisperChars}, Script tokens: ${scriptTokens.length}, Script chars: ${totalScriptChars}`);

      // Distribute script tokens across Whisper segments proportionally
      const alignedSegments: Array<{
        start: number; end: number; text: string;
        words: Array<{ word: string; start: number; end: number }>;
      }> = [];

      let tokenIdx = 0;
      let charBudgetCarry = 0; // carry fractional chars between segments

      for (let si = 0; si < whisperSegs.length; si++) {
        const wseg = whisperSegs[si];
        const isLast = si === whisperSegs.length - 1;

        // How many script chars should this Whisper segment cover?
        const exactChars = (wseg.charCount / totalWhisperChars) * totalScriptChars + charBudgetCarry;

        // Collect tokens until we reach the char budget
        const segTokens: string[] = [];
        let segChars = 0;

        while (tokenIdx < scriptTokens.length) {
          const token = scriptTokens[tokenIdx];

          if (isLast) {
            // Last Whisper segment takes ALL remaining tokens
            segTokens.push(token);
            segChars += token.length;
            tokenIdx++;
            continue;
          }

          // Would adding this token exceed our budget?
          if (segChars + token.length > exactChars && segTokens.length > 0) {
            break; // stop, this token goes to next segment
          }

          segTokens.push(token);
          segChars += token.length;
          tokenIdx++;
        }

        charBudgetCarry = exactChars - segChars;

        if (segTokens.length === 0) continue;

        // Each token becomes a "word" with proportional timestamp within this segment
        const segDur = wseg.end - wseg.start;
        const totalTokenChars = segTokens.reduce((s, t) => s + t.length, 0);
        const words: Array<{ word: string; start: number; end: number }> = [];
        let timeOffset = wseg.start;

        for (const token of segTokens) {
          const tokenDur = totalTokenChars > 0 ? (token.length / totalTokenChars) * segDur : segDur / segTokens.length;
          words.push({
            word: token,
            start: Math.round(timeOffset * 1000) / 1000,
            end: Math.round((timeOffset + tokenDur) * 1000) / 1000,
          });
          timeOffset += tokenDur;
        }

        alignedSegments.push({
          start: Math.round(wseg.start * 1000) / 1000,
          end: Math.round(wseg.end * 1000) / 1000,
          text: segTokens.join(" "),
          words,
        });
      }

      console.log(`[align] ✅ Token-aligned: ${alignedSegments.length} segments, audio: ${audioStart.toFixed(2)}s - ${audioEnd.toFixed(2)}s`);

      const alignedOutput: Record<string, unknown> = {
        segments: alignedSegments,
        language: lang,
        original_script: scriptText,
        alignment_model: result.modelUsed,
      };

      return {
        ...result,
        resultJson: JSON.stringify(alignedOutput, null, 2),
        segments: alignedSegments.length,
      };
    }

    // ── Word-level alignment (English and other space-delimited languages) ──
    // Extract all Whisper words with their REAL timestamps
    const whisperWords: Array<{ word: string; start: number; end: number }> = [];
    for (const seg of segments) {
      if (seg.words && seg.words.length > 0) {
        for (const w of seg.words) {
          whisperWords.push({ word: w.word, start: w.start, end: w.end });
        }
      }
    }

    if (whisperWords.length === 0) {
      console.warn("[align] No words from Whisper, returning raw transcription");
      return result;
    }

    console.log(`[align] Whisper words: ${whisperWords.length}, Script words: ${scriptText.split(/\s+/).filter(w => w).length}`);

    // Step 3: Simple word-to-word matching — use Whisper timestamps directly
    const scriptWords = scriptText.split(/\s+/).filter(w => w);
    const alignedSegments = alignWordToWord(scriptWords, whisperWords);

    console.log(`[align] ✅ Aligned: ${alignedSegments.length} segments (word-level, Whisper timestamps)`);

    const alignedOutput: Record<string, unknown> = {
      segments: alignedSegments,
      language: data.language || options.language,
      original_script: scriptText,
      alignment_model: result.modelUsed,
    };

    return {
      ...result,
      resultJson: JSON.stringify(alignedOutput, null, 2),
      segments: alignedSegments.length,
    };
  } catch (error) {
    console.error("[align] Alignment failed, returning raw transcription:", error);
    try {
      const data = JSON.parse(result.resultJson);
      data.original_script = scriptText;
      return { ...result, resultJson: JSON.stringify(data, null, 2) };
    } catch { /* ignore */ }
    return result;
  }
}

/**
 * Simple word-to-word alignment: match script words to Whisper words
 * and use Whisper's REAL timestamps. No LCS, no interpolation, no guessing.
 *
 * Algorithm: greedy two-pointer matching on cleaned words.
 * - If script word matches Whisper word → use Whisper timestamp
 * - If not matched → interpolate between nearest matched neighbors
 */
function alignWordToWord(
  scriptWords: string[],
  whisperWords: Array<{ word: string; start: number; end: number }>
): Array<{ start: number; end: number; text: string; words: Array<{ word: string; start: number; end: number }> }> {

  const clean = (w: string) => w.replace(/[^a-zA-Z0-9\u0E00-\u0E7F]/g, '').toLowerCase();

  // Pre-process: split script words on em-dash/long dash into sub-words
  // e.g. "universes—like" → [{text: "universes—like", sub: ["universes", "like"], origIdx: 140}]
  interface ScriptEntry { text: string; subs: string[]; origIdx: number }
  const scriptEntries: ScriptEntry[] = [];
  for (let i = 0; i < scriptWords.length; i++) {
    const w = scriptWords[i];
    // Split on em-dash (—), en-dash (–), and double-hyphen (--)
    const parts = w.split(/\u2014|\u2013|--/).filter(p => p.trim());
    if (parts.length > 1) {
      scriptEntries.push({ text: w, subs: parts.map(p => clean(p)), origIdx: i });
    } else {
      scriptEntries.push({ text: w, subs: [clean(w)], origIdx: i });
    }
  }

  // Flatten: each sub-word gets its own slot for matching
  interface FlatEntry { origIdx: number; subIdx: number; cleanWord: string }
  const flatScript: FlatEntry[] = [];
  for (const entry of scriptEntries) {
    for (let si = 0; si < entry.subs.length; si++) {
      if (entry.subs[si]) {
        flatScript.push({ origIdx: entry.origIdx, subIdx: si, cleanWord: entry.subs[si] });
      }
    }
  }

  // Greedy match on flat list
  const flatMatched: Array<{ flatIdx: number; whisperIdx: number }> = [];
  let wi = 0;
  for (let fi = 0; fi < flatScript.length && wi < whisperWords.length; fi++) {
    const sw = flatScript[fi].cleanWord;
    if (!sw) continue;

    // Look ahead up to 5 Whisper words for a match
    let found = false;
    for (let look = 0; look < 5 && wi + look < whisperWords.length; look++) {
      const ww = clean(whisperWords[wi + look].word);
      if (sw === ww) {
        flatMatched.push({ flatIdx: fi, whisperIdx: wi + look });
        wi = wi + look + 1;
        found = true;
        break;
      }
    }
    if (!found) {
      // Also try: does the next flat script word match current whisper word?
      // If so, skip this script word (Whisper didn't catch it) but don't advance wi
    }
  }

  console.log(`[align-word] Flat matched ${flatMatched.length}/${flatScript.length} sub-words to Whisper`);

  // Map flat matches back to original script word indices
  // For compound words (em-dash), use first sub-word's start and last sub-word's end
  const origTimestamps: Array<{ start: number; end: number } | null> = new Array(scriptWords.length).fill(null);
  for (const fm of flatMatched) {
    const origIdx = flatScript[fm.flatIdx].origIdx;
    const ww = whisperWords[fm.whisperIdx];
    const existing = origTimestamps[origIdx];
    if (!existing) {
      origTimestamps[origIdx] = { start: ww.start, end: ww.end };
    } else {
      // Expand range (for compound words like "universes—like")
      origTimestamps[origIdx] = {
        start: Math.min(existing.start, ww.start),
        end: Math.max(existing.end, ww.end),
      };
    }
  }

  // Use origTimestamps (already built from flatMatched above) as the base
  const timestamps = origTimestamps;

  // Interpolate unmatched words between matched neighbors
  for (let i = 0; i < scriptWords.length; i++) {
    if (timestamps[i]) continue;

    // Find previous and next matched
    let prevIdx = -1, nextIdx = -1;
    for (let p = i - 1; p >= 0; p--) { if (timestamps[p]) { prevIdx = p; break; } }
    for (let n = i + 1; n < scriptWords.length; n++) { if (timestamps[n]) { nextIdx = n; break; } }

    if (prevIdx >= 0 && nextIdx >= 0) {
      // Interpolate between prev and next
      const prevEnd = timestamps[prevIdx]!.end;
      const nextStart = timestamps[nextIdx]!.start;
      const gapCount = nextIdx - prevIdx - 1;
      const pos = i - prevIdx;
      const step = (nextStart - prevEnd) / (gapCount + 1);
      timestamps[i] = {
        start: Math.round((prevEnd + (pos - 1) * step) * 1000) / 1000,
        end: Math.round((prevEnd + pos * step) * 1000) / 1000,
      };
    } else if (prevIdx >= 0) {
      // After last match — extend slightly
      const prevEnd = timestamps[prevIdx]!.end;
      const pos = i - prevIdx;
      timestamps[i] = { start: prevEnd + (pos - 1) * 0.3, end: prevEnd + pos * 0.3 };
    } else if (nextIdx >= 0) {
      // Before first match
      const nextStart = timestamps[nextIdx]!.start;
      const pos = nextIdx - i;
      timestamps[i] = { start: Math.max(0, nextStart - pos * 0.3), end: Math.max(0, nextStart - (pos - 1) * 0.3) };
    } else {
      // No matches at all — shouldn't happen
      timestamps[i] = { start: i * 0.3, end: (i + 1) * 0.3 };
    }
  }

  // Build output: 1 segment per script word (same format as before)
  const segments: Array<{
    start: number; end: number; text: string;
    words: Array<{ word: string; start: number; end: number }>;
  }> = [];

  for (let i = 0; i < scriptWords.length; i++) {
    const ts = timestamps[i]!;
    segments.push({
      start: ts.start,
      end: ts.end,
      text: scriptWords[i],
      words: [{ word: scriptWords[i], start: ts.start, end: ts.end }],
    });
  }

  return segments;
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

/**
 * Reassign timestamps to respect chunk boundaries from Whisper.
 * After LCS alignment, timestamps are interpolated across chunk gaps,
 * destroying real speech pauses. This function re-assigns each char to its
 * original Whisper chunk and distributes timestamps proportionally within
 * each chunk, preserving the real gaps between chunks.
 *
 * Handles edge cases: zero-duration chunks, compressed chunks (too many
 * chars in too little time), and backward timestamps.
 */
function reassignByChunkBoundaries(
  timestamps: Array<[number, number]>,
  chunks: Array<{ start: number; end: number }>
): { adjustedTimestamps: Array<[number, number]>; chunkAssignments: number[] } {
  const n = timestamps.length;
  if (n === 0 || chunks.length === 0) {
    return { adjustedTimestamps: [...timestamps], chunkAssignments: new Array(n).fill(0) };
  }

  // ── Pre-process: fix bad chunks (zero-duration, backward, compressed) ──
  const fixedChunks = chunks.map((c, i) => ({ start: c.start, end: c.end }));

  // Fix backward chunks (start > previous end)
  for (let i = 1; i < fixedChunks.length; i++) {
    if (fixedChunks[i].start < fixedChunks[i - 1].end - 0.01) {
      fixedChunks[i].start = fixedChunks[i - 1].end;
    }
  }

  // Calculate average speech rate from good chunks (chars/sec)
  // We'll use this to estimate duration for bad chunks
  let goodTotalDur = 0;
  let goodTotalChars = 0;
  for (const chunk of fixedChunks) {
    const dur = chunk.end - chunk.start;
    if (dur > 0.1) {
      goodTotalDur += dur;
      goodTotalChars += 1; // will be weighted by actual char count later
    }
  }

  const chunkAssignments = new Array(n).fill(0);

  // Step 1: Assign each char to its chunk based on timestamp midpoint
  for (let i = 0; i < n; i++) {
    const mid = (timestamps[i][0] + timestamps[i][1]) / 2;
    let bestChunk = 0;
    let bestDist = Infinity;
    for (let c = 0; c < fixedChunks.length; c++) {
      if (mid >= fixedChunks[c].start && mid <= fixedChunks[c].end) {
        bestChunk = c;
        bestDist = 0;
        break;
      }
      const dist = Math.min(
        Math.abs(mid - fixedChunks[c].start),
        Math.abs(mid - fixedChunks[c].end)
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestChunk = c;
      }
    }
    chunkAssignments[i] = bestChunk;
  }

  // Step 2: Ensure monotonically non-decreasing chunk assignments
  for (let i = 1; i < n; i++) {
    if (chunkAssignments[i] < chunkAssignments[i - 1]) {
      chunkAssignments[i] = chunkAssignments[i - 1];
    }
  }

  // Step 3: Calculate avg chars/sec from good groups (for estimating bad ones)
  const groupInfo: Array<{ start: number; end: number; size: number; chunkIdx: number }> = [];
  let gs = 0;
  while (gs < n) {
    const chunk = chunkAssignments[gs];
    let ge = gs + 1;
    while (ge < n && chunkAssignments[ge] === chunk) ge++;
    const seg = fixedChunks[chunk];
    if (seg) {
      groupInfo.push({ start: seg.start, end: seg.end, size: ge - gs, chunkIdx: chunk });
    }
    gs = ge;
  }

  let avgCharDur = 0.065; // default ~15 chars/sec
  {
    let goodChars = 0;
    let goodDur = 0;
    for (const g of groupInfo) {
      const dur = g.end - g.start;
      const charsPerSec = g.size > 0 && dur > 0 ? g.size / dur : 0;
      if (dur > 0.05 && charsPerSec < 30 && charsPerSec > 2) {
        goodChars += g.size;
        goodDur += dur;
      }
    }
    if (goodChars > 0 && goodDur > 0) {
      avgCharDur = goodDur / goodChars;
    }
  }

  // Step 4: Redistribute timestamps — handle bad chunks
  const adjustedTimestamps: Array<[number, number]> = new Array(n)
    .fill(null)
    .map(() => [-1, -1] as [number, number]);

  let groupStart = 0;
  let lastEnd = 0; // track last assigned end time for monotonic guarantee

  while (groupStart < n) {
    const chunk = chunkAssignments[groupStart];
    let groupEnd = groupStart + 1;
    while (groupEnd < n && chunkAssignments[groupEnd] === chunk) groupEnd++;

    const groupSize = groupEnd - groupStart;
    const seg = fixedChunks[chunk];

    if (seg) {
      let segStart = Math.max(seg.start, lastEnd); // ensure no backward
      let segEnd = seg.end;
      let segDur = segEnd - segStart;

      // Check if chunk is bad: zero-duration or compressed
      const isBad = segDur <= 0 || (groupSize > 3 && groupSize / segDur > 30);

      if (isBad) {
        // Estimate proper duration from speech rate
        const estimatedDur = groupSize * avgCharDur;
        segStart = lastEnd; // start right after previous group
        segEnd = segStart + estimatedDur;
        segDur = estimatedDur;
      }

      const charDur = segDur / groupSize;
      for (let g = 0; g < groupSize; g++) {
        adjustedTimestamps[groupStart + g] = [
          Math.round((segStart + g * charDur) * 1000) / 1000,
          Math.round((segStart + (g + 1) * charDur) * 1000) / 1000,
        ];
      }
      lastEnd = Math.round((segStart + groupSize * charDur) * 1000) / 1000;
    }
    groupStart = groupEnd;
  }

  // Step 5: Ensure monotonic timestamps (safety net)
  for (let i = 1; i < n; i++) {
    if (adjustedTimestamps[i][0] < adjustedTimestamps[i - 1][1]) {
      adjustedTimestamps[i] = [
        adjustedTimestamps[i - 1][1],
        Math.max(adjustedTimestamps[i][1], adjustedTimestamps[i - 1][1] + 0.001),
      ];
    }
  }

  return { adjustedTimestamps, chunkAssignments };
}

/** Build aligned output as segments split by chunk boundaries.
 *  Each Whisper chunk becomes a separate segment, preserving real speech gaps.
 *  Words are grouped by whitespace boundaries (not per-character).
 */
function buildAlignedOutput(
  scriptText: string,
  scriptTimestamps: Array<[number, number]>,
  chunkAssignments: number[],
  language: string
): Record<string, unknown> {
  const segments: Array<{
    start: number; end: number; text: string;
    words: Array<{ word: string; start: number; end: number }>;
  }> = [];

  let cleanIdx = 0;
  let currentChunk = -1;
  let currentWords: Array<{ word: string; start: number; end: number }> = [];
  let currentText = '';

  // Word accumulator — collects characters into a single word
  let wordChars = '';
  let wordStart = -1;
  let wordEnd = -1;

  function flushWord() {
    if (wordChars && wordStart >= 0) {
      currentWords.push({
        word: wordChars,
        start: Math.round(wordStart * 1000) / 1000,
        end: Math.round(wordEnd * 1000) / 1000,
      });
      wordChars = '';
      wordStart = -1;
      wordEnd = -1;
    }
  }

  function flushSegment() {
    // DON'T flush pending word — it may span a chunk boundary
    // (e.g. "s" from "space" at end of chunk, "pace" at start of next)
    if (currentWords.length > 0) {
      // Remove pending wordChars from the text before saving
      const textToSave = wordChars
        ? currentText.slice(0, currentText.length - wordChars.length).trim()
        : currentText.trim();
      segments.push({
        start: currentWords[0].start,
        end: currentWords[currentWords.length - 1].end,
        text: textToSave,
        words: [...currentWords],
      });
    }
    currentWords = [];
    currentText = wordChars; // carry over pending chars to new segment
  }

  for (const ch of scriptText) {
    if (ch.trim() && cleanIdx < scriptTimestamps.length) {
      const chunk = chunkAssignments[cleanIdx];

      // If chunk changed, flush segment (but keep pending word for new segment)
      if (chunk !== currentChunk && currentWords.length > 0) {
        flushSegment();
      }
      currentChunk = chunk;

      // Accumulate character into current word
      if (wordStart < 0) {
        wordStart = scriptTimestamps[cleanIdx][0];
      }
      wordEnd = scriptTimestamps[cleanIdx][1];
      wordChars += ch;
      currentText += ch;
      cleanIdx++;
    } else if (!ch.trim()) {
      // Whitespace = word boundary → flush accumulated word
      flushWord();
      if (currentWords.length > 0) {
        currentText += ch;
      }
    }
  }

  // Flush final word + segment
  flushWord();
  flushSegment();

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
    // Font style options (passed through to generateAssContent)
    fontName?: string;
    fontSize?: number;
    primaryColor?: string;
    outlineColor?: string;
    backColor?: string;
    outlineWidth?: number;
    shadowDepth?: number;
    bold?: boolean;
    italic?: boolean;
    alignment?: number;
    marginV?: number;
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
      fontName: options.fontName,
      fontSize: options.fontSize,
      primaryColor: options.primaryColor,
      outlineColor: options.outlineColor,
      backColor: options.backColor,
      outlineWidth: options.outlineWidth,
      shadowDepth: options.shadowDepth,
      bold: options.bold,
      italic: options.italic,
      alignment: options.alignment,
      marginV: options.marginV,
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
