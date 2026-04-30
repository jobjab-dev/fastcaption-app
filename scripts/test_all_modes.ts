/**
 * test_all_modes.ts
 * 
 * Comprehensive test: Transcribe an audio file, then generate ASS in all 3 modes (word, pause, smart).
 * Compare output format against the reference Python-generated ASS.
 * 
 * Usage: npx tsx scripts/test_all_modes.ts
 */

import fs from "fs/promises";
import path from "path";
import { generateAssContent, extractWords } from "../app/lib/ass-generator";

// ─── Test Data ──────────────────────────────────────────────────────────────
// We need a Whisper JSON file to test with. 
// If none exists, we'll transcribe via Replicate first.

const TEST_AUDIO = path.join(process.cwd(), "uploads", "input", "ElevenLabs_2026-04-27T10_44_55_jobjab2_ivc_sp100_s50_sb75_v3.mp3");
const TEST_JSON_PATH = path.join(process.cwd(), "testsd", "test_transcription.json");
const TEST_OUTPUT_DIR = path.join(process.cwd(), "testsd");

async function transcribeWithReplicate(): Promise<Record<string, unknown>> {
  const Replicate = (await import("replicate")).default;
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  console.log("📡 Transcribing via Replicate (incredibly-fast-whisper)...");
  
  const fileBuffer = await fs.readFile(TEST_AUDIO);
  const audioFile = new File([fileBuffer], path.basename(TEST_AUDIO), { type: "audio/mpeg" });

  const output = await replicate.run(
    "vaibhavs10/incredibly-fast-whisper:3ab86df6c8f54c11309d4d1f930ac292bad43ace52d10c80d87eb258b3c9f79c",
    {
      input: {
        audio: audioFile,
        task: "transcribe",
        timestamp: "word",
        batch_size: 24,
        language: "thai",
      },
    }
  ) as Record<string, unknown>;

  // Transform output (same logic as worker.ts)
  const rawChunks = output.chunks as Array<Record<string, unknown>> | undefined;
  if (!rawChunks || !Array.isArray(rawChunks)) {
    throw new Error("No chunks in Replicate output");
  }

  const allWords: Array<{ word: string; start: number; end: number }> = [];
  for (const chunk of rawChunks) {
    const ts = chunk.timestamp as [number, number] | undefined;
    if (!ts || !Array.isArray(ts)) continue;
    const start = Number(ts[0]) || 0;
    const end = Number(ts[1]) || start;
    const text = String(chunk.text || "").trim();
    if (!text) continue;
    allWords.push({ word: text, start, end });
  }

  const PAUSE_THRESHOLD = 1.0;
  const segments: Array<{
    start: number; end: number; text: string;
    words: Array<{ start: number; end: number; word: string }>;
  }> = [];

  let currentWords = [allWords[0]];
  for (let i = 1; i < allWords.length; i++) {
    const prev = allWords[i - 1];
    const curr = allWords[i];
    const gap = curr.start - prev.end;
    if (gap > PAUSE_THRESHOLD) {
      segments.push({
        start: currentWords[0].start,
        end: currentWords[currentWords.length - 1].end,
        text: currentWords.map(w => w.word).join(" "),
        words: currentWords,
      });
      currentWords = [curr];
    } else {
      currentWords.push(curr);
    }
  }
  if (currentWords.length > 0) {
    segments.push({
      start: currentWords[0].start,
      end: currentWords[currentWords.length - 1].end,
      text: currentWords.map(w => w.word).join(" "),
      words: currentWords,
    });
  }

  const result = { segments, language: "th" };
  return result;
}

async function main() {
  console.log("🧪 FastCaption ASS Generator — Full Mode Test");
  console.log("━".repeat(60));

  // Step 1: Get or create transcription JSON
  let data: Record<string, unknown>;
  
  try {
    const existing = await fs.readFile(TEST_JSON_PATH, "utf-8");
    data = JSON.parse(existing);
    console.log(`✅ Loaded existing transcription: ${TEST_JSON_PATH}`);
  } catch {
    // Need to transcribe
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error("❌ REPLICATE_API_TOKEN not set and no existing JSON found.");
      console.error("   Set the env var or create testsd/test_transcription.json manually.");
      process.exit(1);
    }

    try {
      await fs.access(TEST_AUDIO);
    } catch {
      console.error(`❌ Test audio file not found: ${TEST_AUDIO}`);
      process.exit(1);
    }

    data = await transcribeWithReplicate();
    await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
    await fs.writeFile(TEST_JSON_PATH, JSON.stringify(data, null, 2), "utf-8");
    console.log(`✅ Transcription saved: ${TEST_JSON_PATH}`);
  }

  // Step 1.5: Show word count
  const words = extractWords(data as any);
  console.log(`\n📊 Extracted ${words.length} words from transcription`);
  if (words.length > 0) {
    console.log(`   First 5 words: ${words.slice(0, 5).map(w => `"${w.word}" [${w.start.toFixed(2)}-${w.end.toFixed(2)}]`).join(", ")}`);
    console.log(`   Last 5 words:  ${words.slice(-5).map(w => `"${w.word}" [${w.start.toFixed(2)}-${w.end.toFixed(2)}]`).join(", ")}`);
  }

  // Step 2: Generate ASS in all 3 modes
  const modes = ["word", "pause", "smart"] as const;
  const orientations = ["portrait", "landscape"] as const;
  
  console.log("\n" + "━".repeat(60));
  console.log("📝 Generating ASS files...\n");

  for (const mode of modes) {
    for (const orientation of orientations) {
      const tag = `${mode}_${orientation}`;
      const outputPath = path.join(TEST_OUTPUT_DIR, `test_ts_${tag}.ass`);

      try {
        const { content, captionCount } = generateAssContent(data as any, {
          mode,
          orientation,
          lang: "th",
        });

        await fs.writeFile(outputPath, content, "utf-8");
        
        // Parse some stats
        const lines = content.split("\n").filter(l => l.startsWith("Dialogue:"));
        const firstLine = lines[0] || "";
        const lastLine = lines[lines.length - 1] || "";
        
        // Check format compliance
        const hasScriptInfo = content.includes("[Script Info]");
        const hasStyles = content.includes("[V4+ Styles]");
        const hasEvents = content.includes("[Events]");
        const hasPlayRes = content.includes("PlayResX:");
        const hasBOM = content.charCodeAt(0) === 0xFEFF;
        
        const resMatch = content.match(/PlayResX:\s*(\d+)[\s\S]*?PlayResY:\s*(\d+)/);
        const resX = resMatch ? resMatch[1] : "?";
        const resY = resMatch ? resMatch[2] : "?";

        console.log(`  ✅ ${tag}`);
        console.log(`     Captions: ${captionCount} | Lines: ${lines.length}`);
        console.log(`     Resolution: ${resX}x${resY}`);
        console.log(`     Format: BOM=${hasBOM ? "✓" : "✗"} ScriptInfo=${hasScriptInfo ? "✓" : "✗"} Styles=${hasStyles ? "✓" : "✗"} Events=${hasEvents ? "✓" : "✗"}`);
        console.log(`     First: ${firstLine.substring(0, 80)}...`);
        console.log(`     Last:  ${lastLine.substring(0, 80)}...`);
        console.log(`     Saved: ${outputPath}`);
        console.log();
      } catch (err) {
        console.error(`  ❌ ${tag}: ${err}`);
      }
    }
  }

  // Step 3: Also generate Python ASS for comparison (if python available)
  console.log("━".repeat(60));
  console.log("🐍 Generating Python ASS for comparison...\n");

  const pythonScript = path.join(process.cwd(), "scripts", "gen_ass.py");
  try {
    await fs.access(pythonScript);
    
    const { spawn } = await import("child_process");
    
    for (const mode of ["pause", "word", "smart"]) {
      const pyOutPath = path.join(TEST_OUTPUT_DIR, `test_python_${mode}_portrait.ass`);
      
      await new Promise<void>((resolve, reject) => {
        // gen_ass.py uses positional args: json output mode orientation [threshold] [max_chars]
        const proc = spawn("python", [
          pythonScript,
          TEST_JSON_PATH,
          pyOutPath,
          mode,
          "portrait",
        ]);
        
        let stderr = "";
        proc.stderr.on("data", (d) => { stderr += d.toString(); });
        proc.on("error", () => {
          console.log(`  ⚠️ Python not available for ${mode} mode — skipping`);
          resolve();
        });
        proc.on("close", (code) => {
          if (code === 0) {
            console.log(`  ✅ Python ${mode}: ${pyOutPath}`);
          } else {
            console.log(`  ⚠️ Python ${mode} failed (exit ${code}): ${stderr.slice(-200)}`);
          }
          resolve();
        });
      });
    }
  } catch {
    console.log("  ⚠️ Python script not found or not accessible — skipping comparison");
  }

  // Step 4: Compare TS vs Python output line counts
  console.log("\n" + "━".repeat(60));
  console.log("📊 Comparison Summary\n");

  for (const mode of modes) {
    const tsPath = path.join(TEST_OUTPUT_DIR, `test_ts_${mode}_portrait.ass`);
    const pyPath = path.join(TEST_OUTPUT_DIR, `test_python_${mode}_portrait.ass`);

    let tsLines = 0, pyLines = 0;
    try {
      const tsContent = await fs.readFile(tsPath, "utf-8");
      tsLines = tsContent.split("\n").filter(l => l.startsWith("Dialogue:")).length;
    } catch { /* no TS file */ }
    
    try {
      const pyContent = await fs.readFile(pyPath, "utf-8");
      pyLines = pyContent.split("\n").filter(l => l.startsWith("Dialogue:")).length;
    } catch { /* no Python file */ }

    const match = tsLines > 0 && pyLines > 0 ? 
      (Math.abs(tsLines - pyLines) <= 2 ? "✅ MATCH" : `⚠️ DIFF (TS:${tsLines} vs PY:${pyLines})`) :
      (pyLines === 0 ? "ℹ️ PY N/A" : "❌ TS FAILED");
    
    console.log(`  ${mode.padEnd(8)} — TS: ${String(tsLines).padStart(4)} captions | PY: ${String(pyLines).padStart(4)} captions | ${match}`);
  }

  console.log("\n" + "━".repeat(60));
  console.log("🏁 Test complete! Review the ASS files in testsd/ folder.");
}

main().catch(console.error);
