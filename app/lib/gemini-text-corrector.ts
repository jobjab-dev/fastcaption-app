/**
 * gemini-text-corrector.ts
 * Post-process Whisper transcription using Gemini AI to fix misheard words.
 * 
 * STRICT RULES:
 * - Only fix spelling/word errors — never add or remove content
 * - Preserve all timestamps (only text changes)
 * - If AI output is unreliable, discard and keep original
 * 
 * Handles two cases:
 * 1. Word-level tokens (English, etc.) — correct individual words
 * 2. Character-level tokens (Thai, CJK) — correct at segment text level
 */

import { GoogleGenAI } from "@google/genai";

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
  words?: Array<{ word: string; start: number; end: number }>;
}

interface WhisperResult {
  segments: WhisperSegment[];
  language?: string;
  [key: string]: unknown;
}

/** Get Gemini client */
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[text-corrector] GEMINI_API_KEY not set, skipping correction");
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

/** Sleep for N milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call Gemini with retry + model fallback for 429 errors.
 * Parses retryDelay from the error response and waits accordingly.
 * Returns trimmed text or null if all attempts fail.
 */
async function callGeminiWithRetry(
  client: GoogleGenAI,
  prompt: string,
  opts: { plainText?: boolean; jsonResponse?: boolean } = {}
): Promise<string | null> {
  const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
  const MAX_RETRIES = 2;

  for (const model of models) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 0 },
            ...(opts.jsonResponse ? { responseMimeType: "application/json" as const } : {}),
          },
        });

        const text = (response.text || "").trim();
        if (text) return text;
        console.warn(`[text-corrector] Empty response from ${model}`);
        return null;
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        if (status === 429) {
          // Parse retry delay from error message
          const errMsg = String(err);
          const delayMatch = errMsg.match(/retryDelay['":\s]*(\d+)/i) 
            || errMsg.match(/retry in (\d+)/i);
          const waitSec = delayMatch ? Math.min(parseInt(delayMatch[1], 10), 120) : 30;
          
          if (attempt < MAX_RETRIES) {
            console.warn(`[text-corrector] ⚠️ 429 from ${model}, retry ${attempt + 1}/${MAX_RETRIES} in ${waitSec}s...`);
            await sleep(waitSec * 1000);
            continue;
          }
          // Out of retries for this model — try next model
          console.warn(`[text-corrector] ⚠️ 429 from ${model}, exhausted retries. Trying next model...`);
          break;
        }
        // Non-429 error — try next model
        console.warn(`[text-corrector] ⚠️ ${model} error (${status || 'unknown'}):`, (err as Error).message?.substring(0, 100));
        break;
      }
    }
  }

  console.warn("[text-corrector] ❌ All models failed");
  return null;
}

/** Language display names */
const LANG_NAMES: Record<string, string> = {
  th: "Thai", en: "English", zh: "Chinese", ja: "Japanese",
  ko: "Korean", vi: "Vietnamese", id: "Indonesian", ms: "Malay",
  de: "German", fr: "French", es: "Spanish", pt: "Portuguese",
  ru: "Russian", ar: "Arabic", hi: "Hindi",
};

/**
 * Detect if Whisper returned character-level tokens instead of word-level.
 * Thai/CJK Whisper often returns individual characters as "words".
 */
function isCharacterLevel(segments: WhisperSegment[]): boolean {
  let totalWords = 0;
  let totalChars = 0;

  for (const seg of segments) {
    if (!seg.words?.length) continue;
    for (const w of seg.words) {
      totalWords++;
      totalChars += w.word.length;
    }
  }

  if (totalWords === 0) return false;

  const avgWordLen = totalChars / totalWords;
  // If average "word" is less than 2 characters, it's character-level
  const isCharLevel = avgWordLen < 2;

  if (isCharLevel) {
    console.log(`[text-corrector] Detected CHARACTER-level tokens (avg word len: ${avgWordLen.toFixed(1)}). Using segment-level correction.`);
  } else {
    console.log(`[text-corrector] Detected WORD-level tokens (avg word len: ${avgWordLen.toFixed(1)}). Using word-level correction.`);
  }

  return isCharLevel;
}

/**
 * Correct Whisper transcription errors using Gemini AI.
 * Auto-detects character-level vs word-level tokens and uses appropriate strategy.
 * Falls back to original if anything goes wrong.
 */
export async function correctTranscription(
  resultJson: string,
  language: string
): Promise<string> {
  const client = getGeminiClient();
  if (!client) return resultJson;

  try {
    const data: WhisperResult = JSON.parse(resultJson);
    if (!data.segments?.length) return resultJson;

    // Check if words are character-level (Thai/CJK) or word-level (English)
    const hasWords = data.segments.some(s => s.words && s.words.length > 0);

    if (!hasWords || isCharacterLevel(data.segments)) {
      // Character-level or no word data → correct at segment text level
      return await correctSegmentLevel(client, data, language, resultJson);
    } else {
      // Word-level → correct individual words
      return await correctWordLevel(client, data, language, resultJson);
    }
  } catch (error) {
    console.error("[text-corrector] ❌ Error:", error);
    return resultJson; // Always fall back to original
  }
}

// ═══════════════════════════════════════════════════════════════
// SEGMENT-LEVEL CORRECTION (for character-level tokens / Thai)
// ═══════════════════════════════════════════════════════════════

/**
 * Correct at segment text level — used when Whisper returns character-level tokens.
 * Handles very long segments by splitting them into sub-chunks for Gemini.
 * After correcting seg.text, also rebuilds seg.words so the ASS generator picks up corrections.
 */
async function correctSegmentLevel(
  client: GoogleGenAI,
  data: WhisperResult,
  language: string,
  originalJson: string
): Promise<string> {
  const segments = data.segments;
  const langName = LANG_NAMES[language] || language;
  let totalApplied = 0;

  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const seg = segments[segIdx];
    const originalText = seg.text.trim();
    if (!originalText) continue;

    console.log(`[text-corrector] Segment [${segIdx}]: ${originalText.length} chars`);

    const prompt = `You are a ${langName} transcription proofreader. This text is from speech-to-text (Whisper) and may contain misheard words or garbled characters.

Text to proofread:
"${originalText}"

STRICT RULES:
1. Fix ONLY words that are clearly wrong, misheard, or garbled
2. DO NOT change the meaning or add new content  
3. DO NOT remove any spoken words — every word the speaker said must remain
4. The corrected text must have roughly the same length (±30% characters)
5. If characters appear separated by spaces (like "ส ั ต ว ์"), join them into proper words
6. Return ONLY the corrected text, nothing else
7. If no corrections needed, return the original text exactly`;

    const corrected = await callGeminiWithRetry(client, prompt, { plainText: true });

    if (!corrected) {
      // API failed entirely — keep original for this segment
      if (segIdx < segments.length - 1) await sleep(2000);
      continue;
    }

    // Remove quotes if Gemini wrapped the response
    let cleanCorrected = corrected;
    if (cleanCorrected.startsWith('"') && cleanCorrected.endsWith('"')) {
      cleanCorrected = cleanCorrected.slice(1, -1);
    }

    // Safety: reject if length changed dramatically
    const lenRatio = cleanCorrected.length / Math.max(originalText.length, 1);
    if (lenRatio < 0.4 || lenRatio > 2.5) {
      console.warn(`[text-corrector] Segment [${segIdx}]: length ratio ${lenRatio.toFixed(2)} too extreme, keeping original`);
      if (segIdx < segments.length - 1) await sleep(2000);
      continue;
    }

    if (cleanCorrected === originalText) {
      // No changes needed
      if (segIdx < segments.length - 1) await sleep(2000);
      continue;
    }

    console.log(`[text-corrector]   Corrected (${originalText.length} → ${cleanCorrected.length} chars)`);

    segments[segIdx].text = cleanCorrected;

    // CRITICAL: Rebuild seg.words from corrected text.
    // ASS generator uses seg.words (not seg.text) for subtitle generation.
    if (seg.words && seg.words.length > 0) {
      const segStart = seg.start || 0;
      const segEnd = seg.end || 0;
      const correctedClean = cleanCorrected.replace(/\s+/g, "");
      const chars = [...correctedClean]; // handle multi-byte chars
      const charCount = chars.length;
      const durPerChar = charCount > 0 ? (segEnd - segStart) / charCount : 0;

      const newWords: Array<{ word: string; start: number; end: number }> = [];
      for (let ci = 0; ci < charCount; ci++) {
        newWords.push({
          word: chars[ci],
          start: Math.round((segStart + ci * durPerChar) * 1000) / 1000,
          end: Math.round((segStart + (ci + 1) * durPerChar) * 1000) / 1000,
        });
      }
      segments[segIdx].words = newWords;
      console.log(`[text-corrector]   → Rebuilt ${newWords.length} character tokens`);
    }

    console.log(`[text-corrector] ✅ Segment [${segIdx}]: "${originalText.substring(0, 60)}..." → "${cleanCorrected.substring(0, 60)}..."`);
    totalApplied++;

    // Rate limit between segments
    if (segIdx < segments.length - 1) await sleep(2000);
  }

  if (totalApplied === 0) {
    console.log("[text-corrector] No segment corrections needed");
    return originalJson;
  }

  console.log(`[text-corrector] ✅ Applied ${totalApplied} segment corrections`);
  return JSON.stringify(data, null, 2);
}

// ═══════════════════════════════════════════════════════════════
// WORD-LEVEL CORRECTION (for word-level tokens / English etc.)
// ═══════════════════════════════════════════════════════════════

/**
 * Correct individual words — used when Whisper returns proper word-level tokens.
 * Modifies word text while preserving timestamps and word count.
 */
async function correctWordLevel(
  client: GoogleGenAI,
  data: WhisperResult,
  language: string,
  originalJson: string
): Promise<string> {
  // Collect all words with their segment/word indices for mapping back
  const allWords: Array<{ word: string; segIdx: number; wordIdx: number }> = [];

  for (let si = 0; si < data.segments.length; si++) {
    const seg = data.segments[si];
    if (seg.words?.length) {
      for (let wi = 0; wi < seg.words.length; wi++) {
        allWords.push({ word: seg.words[wi].word, segIdx: si, wordIdx: wi });
      }
    }
  }

  if (allWords.length === 0) return originalJson;

  const totalWords = allWords.length;
  const langName = LANG_NAMES[language] || language;

  const corrections = new Map<number, string>(); // index → corrected word

  // Send all words in a single request to minimize API calls
  const wordList = allWords.map((w, i) => `${i}:${w.word}`).join("|");

  const prompt = `You are a ${langName} transcription proofreader. The following words come from speech-to-text (Whisper) and may contain errors.

Words (format index:word, separated by |):
${wordList}

Rules:
1. Fix ONLY words that are clearly wrong (misspelled, misheard by Whisper)
2. DO NOT add new words
3. DO NOT remove any words
4. DO NOT merge or split words — each correction must be exactly ONE word
5. If a word is correct, do not include it in the output
6. Keep the same language — do not translate

Respond with ONLY a JSON object mapping the index to the corrected word.
Example: {"3":"corrected","7":"fixed"}
If no corrections needed, respond: {}`;

  const responseText = await callGeminiWithRetry(client, prompt, { jsonResponse: true });

  if (responseText) {
    try {
      // Parse corrections
      let jsonStr = responseText;
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();

      const braceMatch = jsonStr.match(/(\{[\s\S]*\})/);
      if (braceMatch) jsonStr = braceMatch[1];

      const parsedCorrections: Record<string, string> = JSON.parse(jsonStr);

      for (const [idxStr, correctedWord] of Object.entries(parsedCorrections)) {
        const idx = parseInt(idxStr, 10);
        if (isNaN(idx) || idx < 0 || idx >= totalWords) continue;
        if (typeof correctedWord !== "string" || !correctedWord.trim()) continue;

        // Validate: corrected word should not contain spaces (no word splitting)
        // Exception: Thai/CJK languages that don't use spaces between words
        const nonSpaceLangs = new Set(["th", "zh", "ja", "ko"]);
        if (!nonSpaceLangs.has(language) && correctedWord.trim().includes(" ")) {
          console.warn(`[text-corrector] Skipping word [${idx}]: "${correctedWord}" contains spaces`);
          continue;
        }

        // Validate: correction shouldn't be wildly different in length
        const original = allWords[idx].word;
        const lenRatio = correctedWord.length / Math.max(original.length, 1);
        if (lenRatio > 5) {
          console.warn(`[text-corrector] Skipping word [${idx}]: "${original}" → "${correctedWord}" (${lenRatio.toFixed(1)}x longer)`);
          continue;
        }

        corrections.set(idx, correctedWord.trim());
      }
    } catch (parseError) {
      console.warn("[text-corrector] Failed to parse word corrections:", parseError);
    }
  }

  if (corrections.size === 0) {
    console.log("[text-corrector] No word corrections needed");
    return originalJson;
  }

  // Apply corrections — only change word text, preserve ALL timestamps
  let appliedCount = 0;
  for (const [idx, correctedWord] of Array.from(corrections)) {
    const entry = allWords[idx];
    const seg = data.segments[entry.segIdx];
    if (seg.words && seg.words[entry.wordIdx]) {
      const original = seg.words[entry.wordIdx].word;
      seg.words[entry.wordIdx].word = correctedWord;
      console.log(`[text-corrector] Fixed [${idx}]: "${original}" → "${correctedWord}"`);
      appliedCount++;
    }
  }

  // Rebuild segment-level text from corrected words
  for (const seg of data.segments) {
    if (seg.words?.length) {
      seg.text = seg.words.map(w => w.word).join("");
    }
  }

  // Final validation: word count must be exactly the same
  let finalWordCount = 0;
  for (const seg of data.segments) {
    finalWordCount += seg.words?.length ?? 0;
  }

  if (finalWordCount !== totalWords) {
    console.error(`[text-corrector] ❌ Word count mismatch! Was ${totalWords}, now ${finalWordCount}. Reverting.`);
    return originalJson;
  }

  console.log(`[text-corrector] ✅ Applied ${appliedCount} word corrections (${totalWords} words preserved)`);
  return JSON.stringify(data, null, 2);
}
