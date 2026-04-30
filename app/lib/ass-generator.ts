/**
 * ass-generator.ts
 * TypeScript port of split_ass.py
 * Whisper JSON (word timestamps) → caption boxes → CapCut-friendly .ASS
 * 
 * Replaces Python + pythainlp with native Intl.Segmenter for all languages.
 */

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
        const minSt = prevEnd + Math.max(3, toCsFloor(originalGap));
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

    // Step 0: Detect severely compressed timestamps (>30% zero-dur)
    const segStart = seg.start || 0;
    let segEnd = seg.end || 0;
    const zeroCount = wordsData.filter(w => (w.end || 0) - (w.start || 0) <= 0.001).length;
    const totalChars = wordsData.length;

    if (totalChars > 0 && zeroCount / totalChars > 0.30) {
      if (segEnd <= segStart + 0.01) {
        if (zeroCount === totalChars) continue;
        const segIdx = data.segments.indexOf(seg);
        if (segIdx >= 0 && segIdx + 1 < data.segments.length) {
          segEnd = data.segments[segIdx + 1].start || segEnd;
        }
        if (segEnd <= segStart + 0.01) segEnd = segStart + totalChars * 0.08;
      }

      const durPerChar = (segEnd - segStart) / totalChars;
      wordsData = wordsData.map((w, ci) => ({
        word: w.word || "",
        start: Math.round((segStart + ci * durPerChar) * 1000) / 1000,
        end: Math.round((segStart + (ci + 1) * durPerChar) * 1000) / 1000,
      }));
    }

    // Step 1: Build per-character timestamp arrays
    const charStarts: number[] = [];
    const charEnds: number[] = [];
    let textFromJson = "";

    for (const w of wordsData) {
      const chars = w.word || "";
      const st = w.start || 0;
      const en = w.end || 0;
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
  const filtered = result.filter(w => ![...w.word].every(c => NOISE_CHARS.has(c)));

  // Post-process: fix unreasonable durations
  const MAX_DURATION_PER_CHAR = 1.5;
  for (let i = 0; i < filtered.length; i++) {
    const w = filtered[i];
    const duration = w.end - w.start;
    const wordLen = Math.max(w.word.length, 1);
    const maxDur = wordLen * MAX_DURATION_PER_CHAR;

    if (duration > maxDur) {
      let reasonableEnd = w.start + wordLen * 0.15;
      if (i + 1 < filtered.length && filtered[i + 1].start > w.start) {
        const nextStart = filtered[i + 1].start;
        if (nextStart - w.start <= maxDur) reasonableEnd = nextStart;
      }
      filtered[i].end = reasonableEnd;
    }
  }

  // Post-process: fix compressed timestamp zones
  const MIN_DUR_PER_CHAR = 0.03;
  const MIN_ZONE_SIZE = 3;
  const compressed = filtered.map(w => {
    const wordLen = Math.max(w.word.length, 1);
    const dur = w.end - w.start;
    return dur <= 0.001 || (dur < wordLen * MIN_DUR_PER_CHAR && wordLen >= 2);
  });

  let idx = 0;
  while (idx < filtered.length) {
    if (compressed[idx]) {
      let zoneStart = idx;
      while (idx < filtered.length && compressed[idx]) idx++;
      let zoneEnd = idx - 1;

      if (zoneEnd - zoneStart + 1 >= MIN_ZONE_SIZE) {
        const zoneTime = filtered[zoneStart].start;
        while (zoneStart > 0) {
          const prev = filtered[zoneStart - 1];
          if (Math.abs(prev.end - zoneTime) < 0.01) zoneStart--;
          else break;
        }

        const tBefore = zoneStart > 0 ? filtered[zoneStart - 1].end : 0;
        let tAfter: number | null = null;
        for (let k = zoneEnd + 1; k < filtered.length; k++) {
          if (filtered[k].end - filtered[k].start > 0.01) {
            tAfter = filtered[k].start;
            break;
          }
        }

        if (tAfter !== null && tAfter > tBefore) {
          let totalCharsInZone = 0;
          for (let j = zoneStart; j <= zoneEnd; j++) totalCharsInZone += filtered[j].word.length;
          const durPerChar = (tAfter - tBefore) / Math.max(totalCharsInZone, 1);
          let charPos = 0;
          for (let j = zoneStart; j <= zoneEnd; j++) {
            const wc = filtered[j].word.length;
            filtered[j].start = Math.round((tBefore + charPos * durPerChar) * 1000) / 1000;
            filtered[j].end = Math.round((tBefore + (charPos + wc) * durPerChar) * 1000) / 1000;
            charPos += wc;
          }
        }
      }
    } else {
      idx++;
    }
  }

  return filtered;
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
    currIndices.push(i);

    const wordList = currIndices.map(idx => words[idx].word);
    const textLen = normSpace(smartJoinWords(wordList)).length;

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

    if (hasPause || endsSentence || isLast || textLen >= maxChars) {
      flush();
    }
  }

  return caps;
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

export function generateAssContent(
  data: WhisperData,
  options: AssGeneratorOptions
): { content: string; captionCount: number } {
  const {
    mode,
    orientation = "portrait",
    pauseThreshold = 0.3,
    maxChars = 16,
    styleName = "Default",
    lang,
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
      caps = buildCaptionsByPause(words, pauseThreshold, maxChars);
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

  // Build ASS content
  let content = `\ufeff[Script Info]
ScriptType: v4.00+
PlayResX: ${resX}
PlayResY: ${resY}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ${styleName},Arial,64,&H00FFFFFF,&H000000FF,&H00111111,&H90000000,0,0,0,0,100,100,0,0,1,3,0,2,80,80,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  for (let i = 0; i < capsCs.length; i++) {
    const [stCs, enCs, text] = capsCs[i];
    const layer = (i + 1) % 10;
    content += `Dialogue: ${layer},${assTimestamp(stCs)},${assTimestamp(enCs)},${styleName},,0,0,0,,${escapeAssText(text)}\n`;
  }

  return { content, captionCount: capsCs.length };
}
