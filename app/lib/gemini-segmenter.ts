/**
 * gemini-segmenter.ts
 * Uses Gemini to re-segment subtitle text into proper sentences/phrases.
 * 
 * Strategy: Send the full concatenated text and word boundaries,
 * ask Gemini to return SPLIT POINTS (which word indices to split after).
 * This produces a very compact response that won't get truncated.
 */

import { GoogleGenAI } from "@google/genai";

interface WordEntry {
  word: string;
  start: number;
  end: number;
}

/** Get Gemini client */
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[gemini-segmenter] GEMINI_API_KEY not set, skipping AI segmentation");
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Use Gemini to re-segment words into proper sentence/phrase groups.
 * Returns an array of arrays, where each inner array contains word indices
 * that belong to the same caption group.
 * 
 * Falls back to null if Gemini is unavailable or fails.
 */
export async function aiResegment(
  words: WordEntry[],
  maxChars: number
): Promise<number[][] | null> {
  const client = getGeminiClient();
  if (!client) return null;

  if (words.length === 0) return null;

  // Build compact representation: "word1|word2|word3|..."
  // This is much more token-efficient than numbered indices
  const wordTexts = words.map(w => w.word);
  const wordList = wordTexts.map((w, i) => `${i}:${w}`).join("|");

  // Calculate a few example char counts to help the AI understand scale
  const exampleGroups: string[] = [];
  let tempChars = 0;
  let tempWords: string[] = [];
  for (let i = 0; i < Math.min(20, words.length); i++) {
    tempChars += words[i].word.length;
    tempWords.push(words[i].word);
    if (tempChars >= maxChars * 0.7) {
      exampleGroups.push(`"${tempWords.join("")}" = ${tempChars} ตัวอักษร`);
      tempChars = 0;
      tempWords = [];
    }
  }

  const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการตัดประโยคซับไทเทิล

ข้อมูล: คำที่มีหมายเลขกำกับ คั่นด้วย |
${wordList}

กฎสำคัญ:
1. แต่ละกลุ่มต้องมีไม่เกิน ${maxChars} ตัวอักษร (นับรวมทุกตัวอักษรในคำ) — ถ้าเกินต้องแบ่งย่อย
2. แต่ละกลุ่มต้องเป็นวลีที่สมบูรณ์ อ่านแล้วเข้าใจ ห้ามตัดกลางคำหรือกลางวลี
3. ถ้าประโยคยาวเกิน ${maxChars} ตัว ให้แบ่งที่คำเชื่อม เช่น "ที่" "และ" "แต่" "เพราะ" "ของ"
4. กลุ่มสุดท้ายจบที่คำสุดท้ายโดยอัตโนมัติ ไม่ต้องใส่ index

ตัวอย่างขนาด: ${exampleGroups.join(", ")}

ตอบเป็น JSON array ของตัวเลข (index คำสุดท้ายของแต่ละกลุ่ม ยกเว้นกลุ่มสุดท้าย)
ตัวอย่าง: ถ้ามี 10 คำ แบ่ง 3 กลุ่ม [0-3], [4-6], [7-9] → ตอบ [3,6]
ตอบแค่ JSON array`;

  try {
    // Try models in order
    const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
    let response = null;
    let lastError: unknown = null;

    for (const model of models) {
      try {
        console.log(`[gemini-segmenter] Trying model: ${model}`);
        response = await client.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            // Minimize thinking for 2.5 models to leave more output tokens
            thinkingConfig: { thinkingBudget: 0 },
          },
        });
        console.log(`[gemini-segmenter] ✅ Got response from ${model}`);
        break;
      } catch (err) {
        lastError = err;
        console.warn(`[gemini-segmenter] ⚠️ ${model} failed, trying next...`);
      }
    }

    if (!response) {
      throw lastError || new Error("All models failed");
    }

    const text = response.text?.trim();
    if (!text) {
      console.warn("[gemini-segmenter] Empty response from Gemini");
      return null;
    }

    console.log(`[gemini-segmenter] Raw response: ${text.substring(0, 300)}`);

    // Parse split points
    let jsonStr = text;

    // Handle markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Extract array
    const bracketMatch = jsonStr.match(/(\[[\s\S]*\])/);
    if (bracketMatch) {
      jsonStr = bracketMatch[1];
    }

    // Clean up
    jsonStr = jsonStr
      .replace(/,\s*]/g, "]")
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");

    let parsed: unknown = JSON.parse(jsonStr);

    // Handle nested arrays: [[3,6]] → [3,6] or [[0,1,2],[3,4,5]] → flatten to split points
    if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
      // Gemini returned groups directly instead of split points — convert to split points
      const nestedGroups = parsed as number[][];
      const extractedSplits: number[] = [];
      for (let g = 0; g < nestedGroups.length - 1; g++) {
        const group = nestedGroups[g];
        if (Array.isArray(group) && group.length > 0) {
          const lastInGroup = group[group.length - 1];
          if (typeof lastInGroup === "number") {
            extractedSplits.push(lastInGroup);
          }
        }
      }
      parsed = extractedSplits;
      console.log(`[gemini-segmenter] Converted nested array to split points: ${JSON.stringify(parsed)}`);
    }

    const splitPoints = parsed as number[];

    // Validate split points
    if (!Array.isArray(splitPoints)) {
      console.warn("[gemini-segmenter] Response is not an array");
      return null;
    }

    // Filter valid split points and sort
    const validSplits = splitPoints
      .filter(idx => typeof idx === "number" && !isNaN(idx) && idx >= 0 && idx < words.length - 1)
      .sort((a, b) => a - b);

    // Remove duplicates
    const uniqueSplits = [...new Set(validSplits)];

    // Sanity check: if no valid splits, fall back
    if (uniqueSplits.length === 0 && words.length > 1) {
      console.warn("[gemini-segmenter] No valid split points extracted, falling back");
      return null;
    }

    // Convert split points to groups — ensure contiguous coverage of ALL words
    const groups: number[][] = [];
    let startIdx = 0;

    for (const splitAfter of uniqueSplits) {
      // Ensure we don't skip any words (splitAfter must be >= startIdx)
      if (splitAfter < startIdx) {
        console.warn(`[gemini-segmenter] Skipping out-of-order split point ${splitAfter} (startIdx=${startIdx})`);
        continue;
      }
      const group: number[] = [];
      for (let i = startIdx; i <= splitAfter; i++) {
        group.push(i);
      }
      if (group.length > 0) {
        groups.push(group);
      }
      startIdx = splitAfter + 1;
    }

    // Add remaining words as last group
    if (startIdx < words.length) {
      const lastGroup: number[] = [];
      for (let i = startIdx; i < words.length; i++) {
        lastGroup.push(i);
      }
      if (lastGroup.length > 0) {
        groups.push(lastGroup);
      }
    }

    // ── CRITICAL VALIDATION: Ensure ALL words are covered ──
    const coveredIndices = new Set<number>();
    for (const group of groups) {
      for (const idx of group) {
        coveredIndices.add(idx);
      }
    }
    const totalCovered = coveredIndices.size;
    const coverageRatio = totalCovered / words.length;

    if (coverageRatio < 0.95) {
      // AI response lost more than 5% of words — unreliable, fall back
      console.warn(`[gemini-segmenter] ⚠️ Coverage too low: ${totalCovered}/${words.length} words (${(coverageRatio * 100).toFixed(1)}%). Falling back to non-AI segmentation.`);
      return null;
    }

    if (totalCovered < words.length) {
      // Some words missing — patch them in by finding gaps
      console.warn(`[gemini-segmenter] ⚠️ Missing ${words.length - totalCovered} words, patching gaps...`);
      for (let i = 0; i < words.length; i++) {
        if (!coveredIndices.has(i)) {
          // Find the nearest group to append to
          let bestGroup = groups.length - 1;
          for (let g = 0; g < groups.length; g++) {
            const lastInGroup = groups[g][groups[g].length - 1];
            if (lastInGroup >= i - 1) {
              bestGroup = g;
              break;
            }
          }
          groups[bestGroup].push(i);
          groups[bestGroup].sort((a, b) => a - b);
          coveredIndices.add(i);
        }
      }
    }

    console.log(`[gemini-segmenter] ✅ AI re-segmented ${words.length} words into ${groups.length} groups (${uniqueSplits.length} split points, coverage: ${totalCovered}/${words.length})`);
    return groups;
  } catch (error) {
    console.error("[gemini-segmenter] ❌ Gemini API error:", error);
    return null;
  }
}
