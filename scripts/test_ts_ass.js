// Quick test: compare Python vs TypeScript ASS output
const fs = require("fs");
const path = require("path");

// Dynamic import for TS module
async function main() {
  // We'll test by running the TS extractWords + buildCaptionsWordByWord directly
  // Load JSON
  const jsonPath = "d:\\tiktok\\fastcaption\\output\\ElevenLabs_2026-04-27T10_44_55_jobjab2_ivc_sp100_s50_sb75_v3.json";
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  // Use Intl.Segmenter to test
  const text = "โพสสอบโมเดลแค่มีคนเดินผ่านหรือจามเบาๆในห้องข้างๆ";
  const segmenter = new Intl.Segmenter("th", { granularity: "word" });
  const words = [...segmenter.segment(text)].map(s => s.segment);
  console.log("Thai segmentation test:", words);
  
  // Test English
  const en = new Intl.Segmenter("en", { granularity: "word" });
  console.log("English:", [...en.segment("Hello world test")].filter(s => s.isWordLike).map(s => s.segment));
  
  // Test the timestamp logic
  function toCsFloor(t) { return Math.floor(t * 100 + 1e-9); }
  function toCsCeil(t) { return Math.ceil(t * 100 - 1e-9); }
  
  console.log("\ntoCsFloor(7.40):", toCsFloor(7.40), "expected: 740");
  console.log("toCsCeil(7.40):", toCsCeil(7.40), "expected: 740");
  console.log("toCsFloor(7.405):", toCsFloor(7.405), "expected: 740");
  console.log("toCsCeil(7.405):", toCsCeil(7.405), "expected: 741");
  
  // Count segments and words in JSON
  const segments = data.segments || [];
  let totalWords = 0;
  for (const seg of segments) {
    totalWords += (seg.words || []).length;
  }
  console.log(`\nJSON: ${segments.length} segments, ${totalWords} chars/words`);
  
  console.log("\n✅ Basic tests passed");
}

main().catch(console.error);
