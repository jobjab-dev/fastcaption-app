/**
 * Full parity test: run TypeScript ass-generator and compare with Python output
 * Usage: npx tsx scripts/test_parity.ts
 */
import { generateAssContent, extractWords } from "../app/lib/ass-generator";
import * as fs from "fs";

const JSON_PATH = "d:\\tiktok\\fastcaption\\output\\ElevenLabs_2026-04-27T10_44_55_jobjab2_ivc_sp100_s50_sb75_v3.json";
const PYTHON_WORD_ASS = "d:\\tiktok\\fastcaption\\output\\test_word_gap.ass";

function main() {
  const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));

  // Test word extraction
  const words = extractWords(data, "th");
  console.log(`Extracted ${words.length} words`);
  console.log("First 5:", words.slice(0, 5).map(w => `${w.word}(${w.start.toFixed(2)}-${w.end.toFixed(2)})`));

  // Generate word-by-word ASS
  const { content, captionCount } = generateAssContent(data, {
    mode: "word",
    orientation: "portrait",
    lang: "th",
  });
  console.log(`\nGenerated ${captionCount} captions`);

  // Write TS output
  const tsOutput = "d:\\tiktok\\fastcaption\\output\\test_ts_word.ass";
  fs.writeFileSync(tsOutput, content, "utf-8");
  console.log(`Written to: ${tsOutput}`);

  // Compare with Python output
  if (fs.existsSync(PYTHON_WORD_ASS)) {
    const pyLines = fs.readFileSync(PYTHON_WORD_ASS, "utf-8").split("\n").filter(l => l.startsWith("Dialogue:"));
    const tsLines = content.split("\n").filter(l => l.startsWith("Dialogue:"));

    console.log(`\nPython: ${pyLines.length} captions`);
    console.log(`TypeScript: ${tsLines.length} captions`);

    // Compare first 10
    const maxCompare = Math.min(10, pyLines.length, tsLines.length);
    let diffs = 0;
    for (let i = 0; i < maxCompare; i++) {
      const pyParts = pyLines[i].split(",");
      const tsParts = tsLines[i].split(",");
      const pyText = pyParts.slice(9).join(",").trim();
      const tsText = tsParts.slice(9).join(",").trim();
      const pyTime = `${pyParts[1]}-${pyParts[2]}`;
      const tsTime = `${tsParts[1]}-${tsParts[2]}`;

      if (pyText !== tsText || pyTime !== tsTime) {
        diffs++;
        console.log(`  DIFF [${i}]: PY: ${pyTime} "${pyText}"`);
        console.log(`              TS: ${tsTime} "${tsText}"`);
      }
    }

    // Count total diffs
    for (let i = maxCompare; i < Math.max(pyLines.length, tsLines.length); i++) {
      if (i >= pyLines.length || i >= tsLines.length || pyLines[i] !== tsLines[i]) diffs++;
    }

    console.log(`\nTotal differences: ${diffs}`);
    if (diffs === 0) console.log("✅ PERFECT PARITY!");
    else console.log("⚠️ Some differences found (expected due to Intl.Segmenter vs pythainlp)");
  }

  // Also test pause mode
  const pauseResult = generateAssContent(data, {
    mode: "pause",
    orientation: "portrait",
    pauseThreshold: 0.3,
    maxChars: 16,
    lang: "th",
  });
  console.log(`\nPause mode: ${pauseResult.captionCount} captions`);
}

main();
