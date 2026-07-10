/**
 * ass-generator.ts
 * TypeScript port of split_ass.py
 * Whisper JSON (word timestamps) → caption boxes → CapCut-friendly .ASS
 * 
 * Replaces Python + pythainlp with native Intl.Segmenter for all languages.
 * Pause mode now uses Gemini AI to ensure proper sentence boundaries.
 */

import { aiResegment } from "./gemini-segmenter";

// ============ Types ============

interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

interface WhisperSegment {
  start: number;
  end: number;
  text?: string;
  words?: WhisperWord[];
}

interface WhisperData {
  segments: WhisperSegment[];
}

interface ExtractedWord {
  word: string;
  start: number;
  end: number;
}

type Caption = [number, number, string]; // [start_sec, end_sec, text]
type CaptionCS = [number, number, string]; // [start_cs, end_cs, text]

export interface AssGeneratorOptions {
  mode: "word" | "pause" | "smart";
  orientation?: "portrait" | "landscape";
  pauseThreshold?: number;
  maxChars?: number;
  minChars?: number;
  idealChars?: number;
  targetMaxSec?: number;
  minSec?: number;
  styleName?: string;
  lang?: string;
  // Font style options
  fontName?: string;         // e.g. "Arial", "Kanit"
  fontSize?: number;         // e.g. 64
  primaryColor?: string;     // ASS color e.g. "&H00FFFFFF" (white)
  outlineColor?: string;     // ASS color e.g. "&H00111111"
  backColor?: string;        // ASS color e.g. "&H90000000"
  outlineWidth?: number;     // 0-5, default 3
  shadowDepth?: number;      // 0-4, default 0
  bold?: boolean;
  italic?: boolean;
  alignment?: number;        // ASS alignment 1-9, default 2 (bottom-center)
  marginV?: number;          // vertical margin, default 120
}

// ============ Constants ============

const PUNCT_BREAK = new Set([".", ",", "?", "!", ";", ":"]);
const NOISE_CHARS = new Set(["'", "'", '"', "\u201C", "\u201D", "\u2018", "\u2019"]);

// ============ Utility Functions ============

function isThaiChar(c: string): boolean {
  return c >= "\u0E00" && c <= "\u0E7F";
}

function isJapaneseChar(c: string): boolean {
  const cp = c.codePointAt(0)!;
  return (cp >= 0x3040 && cp <= 0x309F) || // Hiragana
         (cp >= 0x30A0 && cp <= 0x30FF) || // Katakana
         (cp >= 0x4E00 && cp <= 0x9FFF);   // CJK
}

function isChineseChar(c: string): boolean {
  const cp = c.codePointAt(0)!;
  return (cp >= 0x4E00 && cp <= 0x9FFF) ||
         (cp >= 0x3400 && cp <= 0x4DBF);
}

/** Detect best locale for Intl.Segmenter from text content */
function detectScriptLocale(text: string): string {
  let thai = 0, ja = 0, zh = 0, total = 0;
  for (const c of text) {
    if (c.trim()) {
      total++;
      if (isThaiChar(c)) thai++;
      else if (isJapaneseChar(c)) ja++;
      else if (isChineseChar(c)) zh++;
    }
  }
  if (total === 0) return "en";
  if (thai / total > 0.3) return "th";
  if (ja / total > 0.3) return "ja";
  if (zh / total > 0.3) return "zh";
  return "en";
}

/** Check if text uses a non-space-delimited script */
function isNonSpaceScript(text: string): boolean {
  return [...text].some(c => isThaiChar(c) || isJapaneseChar(c) || isChineseChar(c));
}

/**
 * Pre-split text by script boundaries so mixed scripts like "รบกวนNoiseลอง"
 * become ["รบกวน", "Noise", "ลอง"] before segmenter processing.
 * This prevents Intl.Segmenter(th) from treating the whole thing as one word.
 */
function splitByScript(text: string): string[] {
  // Split into chunks of: Thai | CJK | Latin/digits | other
  const chunks = text.match(
    /[\u0E00-\u0E7F]+|[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF]+|[a-zA-Z0-9]+|[^a-zA-Z0-9\u0E00-\u0E7F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF]+/g
  );
  return chunks || [text];
}

/** Segment text into words using Intl.Segmenter (replaces pythainlp) */
function segmentWords(text: string, lang?: string): string[] {
  // Pre-split by script boundaries to handle mixed Thai+English
  const scriptChunks = splitByScript(text);
  const allWords: string[] = [];

  for (const chunk of scriptChunks) {
    const locale = lang || detectScriptLocale(chunk);
    try {
      const segmenter = new Intl.Segmenter(locale, { granularity: "word" });
      const segments = [...segmenter.segment(chunk)].map(s => s.segment);
      allWords.push(...segments);
    } catch {
      // Fallback: split by spaces or return as-is
      if (chunk.includes(" ")) {
        allWords.push(...chunk.split(/\s+/));
      } else {
        allWords.push(chunk);
      }
    }
  }

  return allWords;
}

/** Join words smartly — no space for Thai/CJK, space for other languages */
function smartJoinWords(words: string[]): string {
  if (!words.length) return "";

  const result: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i].trim();
    if (!word) continue;

    const isCurrNonSpace = isNonSpaceScript(word);

    if (result.length === 0) {
      result.push(word);
    } else {
      const prev = result[result.length - 1];
      const isPrevNonSpace = isNonSpaceScript(prev);

      if (isCurrNonSpace && isPrevNonSpace) {
        result.push(word); // no space
      } else {
        result.push(" " + word); // add space
      }
    }
  }
  return result.join("");
}

/** Normalize whitespace and collapse spaces before punctuation */
function normSpace(s: string): string {
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/\s+([.,?!;:])/g, "$1");
  return s;
}

// ============ ASS Timing ============

function toCsFloor(t: number): number {
  if (t < 0) t = 0;
  return Math.floor(t * 100 + 1e-9);
}

function toCsCeil(t: number): number {
  if (t < 0) t = 0;
  return Math.ceil(t * 100 - 1e-9);
}

function assTimestamp(cs: number): string {
  if (cs < 0) cs = 0;
  const h = Math.floor(cs / 360000);
  cs %= 360000;
  const m = Math.floor(cs / 6000);
  cs %= 6000;
  const s = Math.floor(cs / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
}

/** Convert captions from seconds to centiseconds, preserving gaps */
function capsToCsNoDrop(caps: Caption[]): CaptionCS[] {
  const out: CaptionCS[] = [];
  let prevEnd = -1;
  let prevEndSec = -1;

  for (const [st, en, text] of caps) {
    let stCs = toCsFloor(st);
    let enCs = toCsCeil(en);

    if (enCs <= stCs) enCs = stCs + 1;

    if (prevEnd >= 0) {
      const originalGap = st - prevEndSec;
      if (originalGap >= 0.05) {
        // Ensure minimum 3cs gap so editors show the break.
        // Don't inflate beyond that — floor/ceil of raw times already preserves the real gap.
        const minSt = prevEnd + 3;
        if (stCs < minSt) {
          stCs = minSt;
          if (enCs <= stCs) enCs = stCs + 1;
        }
      } else {
        if (stCs <= prevEnd) {
          stCs = prevEnd + 1;
          if (enCs <= stCs) enCs = stCs + 1;
        }
      }
    }

    out.push([stCs, enCs, text]);
    prevEnd = enCs;
    prevEndSec = en;
  }
  return out;
}

function escapeAssText(s: string): string {
  s = s.replace(/,/g, "").replace(/，/g, "");
  s = s.replace(/["""\u201C\u201D'''\u2018\u2019]/g, "");
  s = s.replace(/\{/g, "\\{").replace(/\}/g, "\\}");
  s = s.replace(/ {2,}/g, " ");
  return s.trim();
}

// ============ Core: Extract Words ============

export function extractWords(data: WhisperData, lang?: string): ExtractedWord[] {
  const result: ExtractedWord[] = [];

  for (const seg of data.segments || []) {
    let wordsData = seg.words || [];
    if (!wordsData.length) {
      const text = (seg.text || "").trim();
      if (text) {
        result.push({ word: text, start: seg.start || 0, end: seg.end || 0 });
      }
      continue;
    }

    // Step 0: Detect if tokens are character-level (Thai/CJK Whisper)
    const segStart = seg.start || 0;
    let segEnd = seg.end || 0;
    const totalTokens = wordsData.length;
    let totalTokenChars = 0;
    for (const w of wordsData) totalTokenChars += (w.word || "").length;
    const avgTokenLen = totalTokens > 0 ? totalTokenChars / totalTokens : 0;
    const isCharLevel = avgTokenLen < 2;

    // Step 0b: Detect severely compressed timestamps (>30% zero-dur)
    const zeroCount = wordsData.filter(w => (w.end || 0) - (w.start || 0) <= 0.001).length;
    const isCompressed = totalTokens > 0 && zeroCount / totalTokens > 0.30;

    // ──── FAST PATH: Word-level tokens with good timestamps ────
    // When tokens are proper words/phrases (not char-level) and timestamps
    // are not compressed, use them directly. No post-processing needed.
    if (!isCharLevel && !isCompressed) {
      for (const w of wordsData) {
        const word = (w.word || "").trim();
        if (word) {
          result.push({ word, start: w.start || 0, end: w.end || 0 });
        }
      }
      continue;
    }

    if (isCompressed) {
      if (segEnd <= segStart + 0.01) {
        if (zeroCount === totalTokens) continue;
        const segIdx = data.segments.indexOf(seg);
        if (segIdx >= 0 && segIdx + 1 < data.segments.length) {
          segEnd = data.segments[segIdx + 1].start || segEnd;
        }
        if (segEnd <= segStart + 0.01) segEnd = segStart + totalTokens * 0.08;
      }

      const durPerChar = (segEnd - segStart) / totalTokens;
      wordsData = wordsData.map((w, ci) => ({
        word: w.word || "",
        start: Math.round((segStart + ci * durPerChar) * 1000) / 1000,
        end: Math.round((segStart + (ci + 1) * durPerChar) * 1000) / 1000,
      }));
    }

    // ──── CHARACTER-LEVEL PATH ────
    // When tokens are character-level (Thai/CJK), use seg.text as the
    // authoritative text source. seg.text may have been AI-corrected and
    // contains proper words, while concatenating character tokens often
    // produces garbled text that Intl.Segmenter cannot handle correctly.
    if (isCharLevel && seg.text && seg.text.trim()) {
      // Strip spaces between Thai/CJK chars (char-level artifacts),
      // but KEEP spaces between Latin words (e.g. "Unrivaled Bound States")
      const segTextClean = seg.text.trim().replace(/\s+/g, (match, offset, str) => {
        const before = str[offset - 1];
        const after = str[offset + match.length];
        if (!before || !after) return "";
        // Keep space if both neighbors are Latin/digit characters
        const isBeforeLatin = /[a-zA-Z0-9]/.test(before);
        const isAfterLatin = /[a-zA-Z0-9]/.test(after);
        if (isBeforeLatin && isAfterLatin) return " ";
        return "";
      });
      const segTextChars = [...segTextClean];
      const segTextCharCount = segTextChars.length;

      if (segTextCharCount === 0) continue;

      // Build per-character timestamp arrays from word tokens
      const charStarts: number[] = [];
      const charEnds: number[] = [];
      for (const w of wordsData) {
        const chars = w.word || "";
        const st = w.start || 0;
        const en = w.end || 0;
        for (const _c of chars) {
          charStarts.push(st);
          charEnds.push(en);
        }
      }

      // Use Intl.Segmenter on the CORRECT seg.text (not the garbled char concatenation)
      let segmentedWords = segmentWords(segTextClean, lang);

      // Split words containing sentence-ending punctuation
      const splitWords: string[] = [];
      for (const word of segmentedWords) {
        const parts = word.split(/([?!]+)/);
        for (const p of parts) {
          const sub = p.split(/(\.{2,}|…)/);
          for (const s of sub) {
            if (s) splitWords.push(s);
          }
        }
      }
      segmentedWords = splitWords;

      // Map timestamps proportionally from char tokens to seg.text chars
      // Use proportional mapping: char position in seg.text → position in char timestamps
      const tokenCharCount = charStarts.length;
      const INTERNAL_GAP_THRESHOLD = 0.15;
      const MAX_CHAR_DUR = 0.25;
      let textPos = 0;

      for (const word of segmentedWords) {
        const wordLen = word.length;
        const wordEndPos = textPos + wordLen;

        if (word.trim() && textPos < segTextCharCount && wordEndPos <= segTextCharCount) {
          // Map text position to char-token position proportionally
          const mappedStartIdx = Math.min(
            Math.floor((textPos / segTextCharCount) * tokenCharCount),
            tokenCharCount - 1
          );
          const mappedEndIdx = Math.min(
            Math.floor(((wordEndPos - 1) / segTextCharCount) * tokenCharCount),
            tokenCharCount - 1
          );

          let wordStart = charStarts[mappedStartIdx];
          const wordEnd = charEnds[mappedEndIdx];

          // Internal gap detection
          if (mappedEndIdx - mappedStartIdx >= 1) {
            for (let ci = mappedStartIdx; ci < mappedEndIdx; ci++) {
              const gap = charStarts[ci + 1] - charEnds[ci];
              if (gap > INTERNAL_GAP_THRESHOLD) {
                wordStart = charStarts[ci + 1];
                break;
              }
            }
          }

          // Absorbed pause detection
          if (mappedEndIdx - mappedStartIdx >= 1) {
            const firstDur = charEnds[mappedStartIdx] - charStarts[mappedStartIdx];
            if (firstDur > MAX_CHAR_DUR) {
              const remainingDurs = [];
              for (let j = mappedStartIdx + 1; j <= mappedEndIdx; j++) {
                const d = charEnds[j] - charStarts[j];
                if (d > 0) remainingDurs.push(d);
              }
              const avgDur = remainingDurs.length > 0
                ? remainingDurs.reduce((a, b) => a + b, 0) / remainingDurs.length
                : 0.08;
              const newStart = charEnds[mappedStartIdx] - Math.min(avgDur, MAX_CHAR_DUR);
              if (newStart > wordStart) {
                wordStart = Math.round(newStart * 1000) / 1000;
              }
            }
          } else if (wordLen === 1) {
            const dur = wordEnd - wordStart;
            if (dur > MAX_CHAR_DUR) {
              wordStart = Math.round((wordEnd - MAX_CHAR_DUR) * 1000) / 1000;
            }
          }

          result.push({ word: word.trim(), start: wordStart, end: wordEnd });
        }
        textPos = wordEndPos;
      }
      continue; // Skip the word-level path below
    }

    // ──── WORD-LEVEL PATH ────
    // When tokens are proper words (English, etc.), use them directly.

    // Step 1: Build per-character timestamp arrays
    const charStarts: number[] = [];
    const charEnds: number[] = [];
    let textFromJson = "";

    for (let wi = 0; wi < wordsData.length; wi++) {
      const chars = wordsData[wi].word || "";
      const st = wordsData[wi].start || 0;
      const en = wordsData[wi].end || 0;

      // Insert space between consecutive Latin words (e.g. "Cohelent" + "Logical")
      if (wi > 0 && chars.length > 0 && textFromJson.length > 0) {
        const prevChar = textFromJson[textFromJson.length - 1];
        const currChar = chars[0];
        if (/[a-zA-Z0-9]/.test(prevChar) && /[a-zA-Z0-9]/.test(currChar)) {
          textFromJson += " ";
          // Space inherits timing from the gap between prev and current word
          charStarts.push(st);
          charEnds.push(st);
        }
      }

      for (const _c of chars) {
        charStarts.push(st);
        charEnds.push(en);
      }
      textFromJson += chars;
    }

    if (!textFromJson.trim()) continue;

    // Step 2: Use Intl.Segmenter for word boundaries (replaces pythainlp)
    let segmentedWords = segmentWords(textFromJson, lang);

    // Step 2b: Split words containing sentence-ending punctuation
    const splitWords: string[] = [];
    for (const word of segmentedWords) {
      const parts = word.split(/([?!]+)/);
      for (const p of parts) {
        const sub = p.split(/(\.{2,}|…)/);
        for (const s of sub) {
          if (s) splitWords.push(s);
        }
      }
    }
    segmentedWords = splitWords;

    // Step 3: Slice timestamp arrays by word boundaries
    const INTERNAL_GAP_THRESHOLD = 0.15;
    const MAX_CHAR_DUR = 0.25;
    let pos = 0;

    for (const word of segmentedWords) {
      const wordLen = word.length;
      const endPos = pos + wordLen;

      if (word.trim() && pos < charStarts.length && endPos <= charStarts.length) {
        let wordStart = charStarts[pos];
        const wordEnd = charEnds[endPos - 1];

        // Internal gap detection
        if (wordLen >= 2) {
          for (let ci = pos; ci < endPos - 1; ci++) {
            const gap = charStarts[ci + 1] - charEnds[ci];
            if (gap > INTERNAL_GAP_THRESHOLD) {
              wordStart = charStarts[ci + 1];
              break;
            }
          }
        }

        // Absorbed pause detection
        if (wordLen >= 2) {
          const firstDur = charEnds[pos] - charStarts[pos];
          if (firstDur > MAX_CHAR_DUR) {
            const remainingDurs = [];
            for (let j = 1; j < wordLen; j++) {
              const d = charEnds[pos + j] - charStarts[pos + j];
              if (d > 0) remainingDurs.push(d);
            }
            const avgDur = remainingDurs.length > 0
              ? remainingDurs.reduce((a, b) => a + b, 0) / remainingDurs.length
              : 0.08;
            const newStart = charEnds[pos] - Math.min(avgDur, MAX_CHAR_DUR);
            if (newStart > wordStart) {
              wordStart = Math.round(newStart * 1000) / 1000;
            }
          }
        } else if (wordLen === 1) {
          const dur = wordEnd - wordStart;
          if (dur > MAX_CHAR_DUR) {
            wordStart = Math.round((wordEnd - MAX_CHAR_DUR) * 1000) / 1000;
          }
        }

        result.push({ word: word.trim(), start: wordStart, end: wordEnd });
      }
      pos = endPos;
    }
  }

  // Post-process: filter noise chars
  return result.filter(w => ![...w.word].every(c => NOISE_CHARS.has(c)));
}

// ============ Caption Builders ============

export function buildCaptionsWordByWord(words: ExtractedWord[]): Caption[] {
  const caps: Caption[] = [];
  for (const w of words) {
    const text = w.word.trim();
    if (!text) continue;
    let en = w.end;
    if (en - w.start < 0.01) en = w.start + 0.05;
    caps.push([w.start, en, text]);
  }
  return caps;
}

/**
 * Post-process: merge orphan captions (very short lines like "repeat." or "forever.")
 * back into the previous caption line, if combined length fits within limit.
 */
function mergeOrphanCaptions(caps: Caption[], maxChars: number): Caption[] {
  if (caps.length <= 1) return caps;
  const merged: Caption[] = [];
  for (const cap of caps) {
    const text = cap[2].trim();
    const wordCount = text.split(/\s+/).length;
    // Orphan = 1-2 words AND short text
    if (merged.length > 0 && wordCount <= 2 && text.length <= 12) {
      const prev = merged[merged.length - 1];
      const combinedText = prev[2] + " " + text;
      // Merge if combined length is reasonable (up to 1.3x maxChars)
      if (combinedText.length <= maxChars * 1.3) {
        merged[merged.length - 1] = [prev[0], cap[1], combinedText];
        continue;
      }
    }
    merged.push([...cap] as Caption);
  }
  return merged;
}

export function buildCaptionsByPause(
  words: ExtractedWord[],
  pauseThreshold = 0.3,
  maxChars = 32
): Caption[] {
  const caps: Caption[] = [];
  if (!words.length) return caps;

  let currIndices: number[] = [];

  function flush() {
    if (!currIndices.length) return;
    const firstIdx = currIndices[0];
    const lastIdx = currIndices[currIndices.length - 1];
    let currStart = words[firstIdx].start;
    let currEnd = words[lastIdx].end;
    const wordList = currIndices.map(i => words[i].word);
    const text = normSpace(smartJoinWords(wordList));
    if (text) {
      if (currEnd - currStart < 0.01) currEnd = currStart + 0.01;
      caps.push([currStart, currEnd, text]);
    }
    currIndices = [];
  }

  for (let i = 0; i < words.length; i++) {
    // Check if adding this word would exceed maxChars
    const testIndices = [...currIndices, i];
    const testWords = testIndices.map(idx => words[idx].word);
    const testLen = normSpace(smartJoinWords(testWords)).length;

    if (currIndices.length > 0 && testLen > maxChars) {
      // Flush current buffer BEFORE adding this word
      flush();
    }

    currIndices.push(i);

    // Check for pause, sentence end, or last word
    let hasPause = false;
    if (i + 1 < words.length) {
      const gap = words[i + 1].start - words[i].end;
      if (gap >= pauseThreshold) hasPause = true;
    }

    let endsSentence = false;
    const wordText = words[i].word.trim();
    if (/[?!]/.test(wordText)) endsSentence = true;
    else if (wordText.includes("..") || wordText.includes("…")) endsSentence = true;

    const isLast = i + 1 >= words.length;

    if (hasPause || endsSentence || isLast) {
      flush();
    }
  }

  // Post-process: merge orphan captions (≤ 1 word) back into previous line
  const merged = mergeOrphanCaptions(caps, maxChars);

  // Post-process: clamp end to not exceed next caption's start (prevent overlap)
  for (let i = 0; i < merged.length - 1; i++) {
    if (merged[i][1] > merged[i + 1][0]) {
      merged[i][1] = merged[i + 1][0];
    }
  }

  return merged;
}

/**
 * AI-enhanced version of buildCaptionsByPause.
 * Sends words to Gemini to get proper sentence boundaries,
 * then post-processes to enforce maxChars limit.
 * Falls back to pause-based logic if AI is unavailable.
 */
export async function buildCaptionsByPauseAI(
  words: ExtractedWord[],
  pauseThreshold = 0.3,
  maxChars = 32
): Promise<Caption[]> {
  // Try AI re-segmentation first
  const aiGroups = await aiResegment(words, maxChars);

  if (aiGroups && aiGroups.length > 0) {
    // Build captions from AI groups, splitting oversized ones
    const caps: Caption[] = [];
    for (const group of aiGroups) {
      if (!group.length) continue;
      const validIndices = group.filter(i => i >= 0 && i < words.length);
      if (!validIndices.length) continue;

      // Check if this group exceeds maxChars
      const wordList = validIndices.map(i => words[i].word);
      const fullText = normSpace(smartJoinWords(wordList));

      if (fullText.length <= maxChars || validIndices.length <= 1) {
        // Fits within limit — use as-is
        const firstIdx = validIndices[0];
        const lastIdx = validIndices[validIndices.length - 1];
        let currStart = words[firstIdx].start;
        let currEnd = words[lastIdx].end;
        if (currEnd - currStart < 0.01) currEnd = currStart + 0.01;
        if (fullText) caps.push([currStart, currEnd, fullText]);
      } else {
        // Too long — split into sub-groups that fit maxChars
        const subGroups = splitGroupByMaxChars(words, validIndices, maxChars);
        for (const sub of subGroups) {
          if (!sub.length) continue;
          const subWords = sub.map(i => words[i].word);
          const subText = normSpace(smartJoinWords(subWords));
          if (subText) {
            let st = words[sub[0]].start;
            let en = words[sub[sub.length - 1]].end;
            if (en - st < 0.01) en = st + 0.01;
            caps.push([st, en, subText]);
          }
        }
      }
    }

    if (caps.length > 0) {
      // Validate: count total text characters in AI captions vs original words
      const totalWordChars = words.reduce((sum, w) => sum + w.word.trim().length, 0);
      const totalCaptionChars = caps.reduce((sum, c) => sum + c[2].replace(/\s/g, "").length, 0);
      const charCoverage = totalCaptionChars / Math.max(totalWordChars, 1);

      if (charCoverage < 0.8) {
        // AI captions lost too many characters — fall back
        console.warn(`[ass] ⚠️ AI caption char coverage too low: ${totalCaptionChars}/${totalWordChars} (${(charCoverage * 100).toFixed(1)}%). Falling back.`);
      } else {
        console.log(`[ass] AI segmentation: ${caps.length} captions (char coverage: ${(charCoverage * 100).toFixed(1)}%)`);
        const aiMerged = mergeOrphanCaptions(caps, maxChars);
        // Clamp end to not exceed next caption's start (prevent overlap)
        for (let i = 0; i < aiMerged.length - 1; i++) {
          if (aiMerged[i][1] > aiMerged[i + 1][0]) {
            aiMerged[i][1] = aiMerged[i + 1][0];
          }
        }
        return aiMerged;
      }
    }
  }

  // Fallback to original pause-based logic
  console.log("[ass] Falling back to pause-based segmentation");
  return buildCaptionsByPause(words, pauseThreshold, maxChars);
}

/** Split a group of word indices into sub-groups that fit within maxChars */
function splitGroupByMaxChars(
  words: ExtractedWord[],
  indices: number[],
  maxChars: number
): number[][] {
  const result: number[][] = [];
  let current: number[] = [];
  let currentLen = 0;

  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i];
    const wordLen = words[idx].word.length;

    if (current.length > 0 && currentLen + wordLen > maxChars) {
      // Would exceed — try to find a better split point
      // Look back for a connector word (ที่, และ, แต่, เพราะ, ของ, กับ, หรือ, ใน)
      const connectors = new Set(["ที่", "และ", "แต่", "เพราะ", "ของ", "กับ", "หรือ", "ใน", "จะ", "ก็", "คือ", "ว่า"]);
      let splitAt = -1;

      // Search from the end of current group for a connector
      for (let j = current.length - 1; j >= Math.floor(current.length * 0.3); j--) {
        if (connectors.has(words[current[j]].word)) {
          // Split BEFORE this connector (connector goes to next group)
          splitAt = j;
          break;
        }
      }

      if (splitAt > 0) {
        // Split at connector: current[0..splitAt-1] goes to result
        result.push(current.slice(0, splitAt));
        // Remaining + current word start new group
        current = [...current.slice(splitAt), idx];
        currentLen = current.reduce((sum, ci) => sum + words[ci].word.length, 0);
      } else {
        // No good connector found — flush current as-is
        result.push([...current]);
        current = [idx];
        currentLen = wordLen;
      }
    } else {
      current.push(idx);
      currentLen += wordLen;
    }
  }

  if (current.length > 0) {
    result.push(current);
  }

  return result;
}

export function buildCaptionsSmart(
  words: ExtractedWord[],
  opts: { maxChars?: number; idealChars?: number; minChars?: number; targetMaxSec?: number; minSec?: number; lang?: string } = {}
): Caption[] {
  const MAX = opts.maxChars ?? 24;
  const IDEAL = opts.idealChars ?? Math.max(8, Math.floor(MAX * 0.67));
  const MIN = opts.minChars ?? Math.max(4, Math.floor(MAX * 0.33));
  const TARGET_MAX = opts.targetMaxSec ?? 2.5;
  const MIN_SEC = opts.minSec ?? 0.20;

  const caps: Caption[] = [];
  if (!words.length) return caps;

  let currIndices: number[] = [];

  function flush() {
    if (!currIndices.length) return;
    const firstIdx = currIndices[0];
    const lastIdx = currIndices[currIndices.length - 1];
    const currStart = words[firstIdx].start;
    let currEnd = words[lastIdx].end;
    const wordList = currIndices.map(i => words[i].word);
    const text = normSpace(smartJoinWords(wordList));
    if (text) {
      if (currEnd - currStart < 0.01) currEnd = currStart + 0.01;
      caps.push([currStart, currEnd, text]);
    }
    currIndices = [];
  }

  function shouldBreak(currText: string, currStart: number, currEnd: number, nextWord: string | null, nextWordStart: number | null): boolean {
    const text = normSpace(currText);
    const dur = currEnd - currStart;
    const textLen = text.length;

    if (textLen >= MAX) return true;
    if (dur >= TARGET_MAX && textLen >= MIN) return true;

    if (nextWordStart !== null) {
      const pause = nextWordStart - currEnd;
      if (pause > 0.3 && textLen >= MIN && dur >= MIN_SEC) return true;
      if (pause > 0.15 && textLen >= IDEAL * 0.6) return true;
    }

    if (text && PUNCT_BREAK.has(text[text.length - 1])) {
      if (dur >= MIN_SEC && textLen >= MIN * 0.5) return true;
    }

    if (!nextWord) return false;

    const prospective = isNonSpaceScript(text) && isNonSpaceScript(nextWord)
      ? normSpace(text + nextWord)
      : normSpace(text + " " + nextWord);

    if (prospective.length > MAX && dur >= MIN_SEC) return true;

    if (textLen >= IDEAL * 1.2 && dur >= MIN_SEC) return true;

    if (textLen >= IDEAL * 0.6) {
      if (isNonSpaceScript(text)) {
        const segs = segmentWords(text, opts.lang);
        if (segs.filter(s => s.trim()).length >= 3) return true;
      } else if (text && text[text.length - 1] === " ") {
        return true;
      }
    }

    return false;
  }

  for (let i = 0; i < words.length; i++) {
    currIndices.push(i);

    const nextWord = i + 1 < words.length ? words[i + 1].word : null;
    const nextWordStart = i + 1 < words.length ? words[i + 1].start : null;

    const currWordList = currIndices.map(idx => words[idx].word);
    const currText = smartJoinWords(currWordList);
    const currStart = words[currIndices[0]].start;
    const currEnd = words[currIndices[currIndices.length - 1]].end;

    if (shouldBreak(currText, currStart, currEnd, nextWord, nextWordStart)) {
      flush();
    }
  }
  flush();

  return caps;
}

// ============ ASS Output ============

export async function generateAssContent(
  data: WhisperData,
  options: AssGeneratorOptions
): Promise<{ content: string; captionCount: number }> {
  const {
    mode,
    orientation = "portrait",
    pauseThreshold = 0.3,
    maxChars = 16,
    styleName = "Default",
    lang,
    // Font style with defaults matching original hardcoded values
    fontName = "Arial",
    fontSize = 64,
    primaryColor = "&H00FFFFFF",
    outlineColor = "&H00111111",
    backColor = "&H90000000",
    outlineWidth = 3,
    shadowDepth = 0,
    bold = false,
    italic = false,
    alignment = 2,
    marginV = 120,
  } = options;

  // Extract words from JSON
  const words = extractWords(data, lang);
  if (!words.length) {
    throw new Error("JSON contains no word timestamps");
  }

  // Build captions based on mode
  let caps: Caption[];
  switch (mode) {
    case "word":
      caps = buildCaptionsWordByWord(words);
      break;
    case "pause":
      // Try AI-enhanced pause first (Gemini), auto-fallback to regular pause
      caps = await buildCaptionsByPauseAI(words, pauseThreshold, maxChars);
      break;
    case "smart":
      caps = buildCaptionsSmart(words, {
        maxChars,
        minChars: options.minChars,
        idealChars: options.idealChars,
        targetMaxSec: options.targetMaxSec,
        minSec: options.minSec,
        lang,
      });
      break;
    default:
      caps = buildCaptionsByPause(words, pauseThreshold, maxChars);
  }

  // Convert to centiseconds
  const capsCs = capsToCsNoDrop(caps);

  // Resolution based on orientation
  const [resX, resY] = orientation === "portrait" ? [1080, 1920] : [1920, 1080];

  // Build ASS style line from options
  const boldFlag = bold ? -1 : 0;
  const italicFlag = italic ? -1 : 0;

  // Build ASS content
  let content = `\ufeff[Script Info]
ScriptType: v4.00+
PlayResX: ${resX}
PlayResY: ${resY}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ${styleName},${fontName},${fontSize},${primaryColor},&H000000FF,${outlineColor},${backColor},${boldFlag},${italicFlag},0,0,100,100,0,0,1,${outlineWidth},${shadowDepth},${alignment},80,80,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  // Calculate max chars per visual line based on resolution and font size
  // Portrait 1080p at font 64 ≈ 16 Thai chars per line
  const maxCharsPerLine = Math.max(Math.floor((resX - 160) / (fontSize * 0.85)), 10);

  for (let i = 0; i < capsCs.length; i++) {
    const [stCs, enCs, rawText] = capsCs[i];
    const layer = (i + 1) % 10;
    let text = escapeAssText(rawText);

    // Insert \N line breaks if text exceeds one visual line
    if (text.length > maxCharsPerLine) {
      const words = segmentWords(text, lang);
      const lines: string[] = [];
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine
          ? (isNonSpaceScript(currentLine) && isNonSpaceScript(word) ? currentLine + word : currentLine + " " + word)
          : word;

        if (currentLine && testLine.length > maxCharsPerLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      text = lines.join("\\N");
    }

    content += `Dialogue: ${layer},${assTimestamp(stCs)},${assTimestamp(enCs)},${styleName},,0,0,0,,${text}\n`;
  }

  return { content, captionCount: capsCs.length };
}
