import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import os from "os";

// Path to the mp3 tools directory (existing whisper workers)
const MP3_DIR = path.resolve(process.cwd(), "..", "mp3");
const WORKER_SCRIPT = path.join(MP3_DIR, "whisper_worker.py");
const ALIGN_WORKER_SCRIPT = path.join(MP3_DIR, "align_worker.py");
const ASS_WORKER_SCRIPT = path.join(MP3_DIR, "ass_worker.py");
const VENV_PYTHON = path.join(MP3_DIR, "venv", "Scripts", "python.exe");

// Output directory for generated files
const OUTPUT_DIR = path.join(process.cwd(), "uploads", "output");

/** Get the Python executable (prefer venv, fallback to system) */
async function getPython(): Promise<string> {
  try {
    await fs.access(VENV_PYTHON);
    return VENV_PYTHON;
  } catch {
    return "python";
  }
}

/** Get audio duration using ffprobe */
export async function getAudioDuration(filePath: string): Promise<number> {
  const ffprobe = path.join(MP3_DIR, "ffmpeg.exe").replace("ffmpeg.exe", "ffprobe.exe");
  // Try local ffprobe first, then system
  let cmd: string;
  try {
    await fs.access(ffprobe);
    cmd = ffprobe;
  } catch {
    cmd = "ffprobe";
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, [
      "-v", "quiet",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);

    let output = "";
    proc.stdout.on("data", (data) => { output += data.toString(); });
    proc.stderr.on("data", () => {});

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed (exit ${code})`));
        return;
      }
      const duration = parseFloat(output.trim());
      if (isNaN(duration)) {
        reject(new Error("Could not parse duration"));
        return;
      }
      resolve(duration);
    });
  });
}

/** Extract audio from video file to MP3 using ffmpeg */
export async function extractAudioToMp3(inputPath: string, outputMp3Path: string): Promise<void> {
  const ffmpegLocal = path.join(MP3_DIR, "ffmpeg.exe");
  let cmd: string;
  try {
    await fs.access(ffmpegLocal);
    cmd = ffmpegLocal;
  } catch {
    cmd = "ffmpeg";
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, [
      "-i", inputPath,
      "-vn",                    // no video
      "-acodec", "libmp3lame",  // encode to MP3
      "-ab", "128k",            // 128kbps bitrate (good enough for speech)
      "-ar", "16000",           // 16kHz sample rate (whisper prefers this)
      "-ac", "1",               // mono channel
      "-y",                     // overwrite output
      outputMp3Path,
    ]);

    let stderr = "";
    proc.stderr.on("data", (data) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg failed (exit ${code}): ${stderr.slice(-500)}`));
        return;
      }
      resolve();
    });

    // 5 minute timeout for conversion
    setTimeout(() => {
      proc.kill();
      reject(new Error("ffmpeg timeout (5 minutes)"));
    }, 300000);
  });
}

interface TranscriptionOptions {
  language: string;
}

interface TranscriptionResult {
  success: boolean;
  jsonPath?: string;
  error?: string;
  segments?: number;
}

/** Run transcription using the existing whisper_worker.py */
export async function runTranscription(
  inputPath: string,
  outputJsonPath: string,
  options: TranscriptionOptions
): Promise<TranscriptionResult> {
  const python = await getPython();

  await fs.mkdir(path.dirname(outputJsonPath), { recursive: true });

  const workerOptions = JSON.stringify({
    model_size: "large-v3",
    language: options.language,
    device: "cuda",
    compute_type: "float32",
  });

  return new Promise((resolve) => {
    const proc = spawn(python, [WORKER_SCRIPT, inputPath, outputJsonPath, workerOptions], {
      cwd: MP3_DIR,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });

    proc.on("close", async (code) => {
      if (code !== 0) {
        // Try to read error from output
        try {
          const content = await fs.readFile(outputJsonPath, "utf-8");
          const errData = JSON.parse(content);
          if (errData.error) {
            resolve({ success: false, error: errData.error });
            return;
          }
        } catch { /* ignore */ }
        resolve({ success: false, error: stderr || `Worker crashed (exit ${code})` });
        return;
      }

      // Parse result to get segment count
      try {
        const content = await fs.readFile(outputJsonPath, "utf-8");
        const data = JSON.parse(content);
        if (data.error) {
          resolve({ success: false, error: data.error });
          return;
        }
        resolve({
          success: true,
          jsonPath: outputJsonPath,
          segments: data.segments?.length ?? 0,
        });
      } catch (e) {
        resolve({ success: false, error: `Failed to read result: ${e}` });
      }
    });

    // 30 minute timeout (long files need more time)
    setTimeout(() => {
      proc.kill();
      resolve({ success: false, error: "Timeout (30 minutes)" });
    }, 1800000);
  });
}

/** Run forced alignment using align_worker.py */
export async function runAlignment(
  inputPath: string,
  outputJsonPath: string,
  scriptText: string,
  options: TranscriptionOptions
): Promise<TranscriptionResult> {
  const python = await getPython();

  await fs.mkdir(path.dirname(outputJsonPath), { recursive: true });

  // Write script text to temp file
  const tmpDir = os.tmpdir();
  const textFilePath = path.join(tmpDir, `align_script_${Date.now()}.txt`);
  await fs.writeFile(textFilePath, scriptText, "utf-8");

  const workerOptions = JSON.stringify({
    model_size: "large-v3",
    language: options.language,
    device: "cuda",
    compute_type: "float32",
  });

  return new Promise((resolve) => {
    const proc = spawn(
      python,
      [ALIGN_WORKER_SCRIPT, inputPath, outputJsonPath, textFilePath, workerOptions],
      {
        cwd: MP3_DIR,
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      }
    );

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });

    proc.on("close", async (code) => {
      // Clean up temp file
      await fs.unlink(textFilePath).catch(() => {});

      if (code !== 0) {
        try {
          const content = await fs.readFile(outputJsonPath, "utf-8");
          const errData = JSON.parse(content);
          if (errData.error) {
            resolve({ success: false, error: errData.error });
            return;
          }
        } catch { /* ignore */ }
        resolve({ success: false, error: stderr || `Align worker crashed (exit ${code})` });
        return;
      }

      try {
        const content = await fs.readFile(outputJsonPath, "utf-8");
        const data = JSON.parse(content);
        if (data.error) {
          resolve({ success: false, error: data.error });
          return;
        }
        resolve({
          success: true,
          jsonPath: outputJsonPath,
          segments: data.segments?.length ?? 0,
        });
      } catch (e) {
        resolve({ success: false, error: `Failed to read result: ${e}` });
      }
    });

    // 30 minute timeout (long files need more time)
    setTimeout(() => {
      proc.kill();
      resolve({ success: false, error: "Timeout (30 minutes)" });
    }, 1800000);
  });
}

interface AssOptions {
  mode: "pause" | "word" | "smart";
  orientation: "portrait" | "landscape";
  pauseThreshold?: number;
  maxChars?: number;
}

interface AssResult {
  success: boolean;
  assPath?: string;
  captions?: number;
  error?: string;
}

/** Convert JSON to ASS subtitle using ass_worker.py */
export async function runJsonToAss(
  inputJsonPath: string,
  outputAssPath: string,
  options: AssOptions
): Promise<AssResult> {
  const python = await getPython();

  await fs.mkdir(path.dirname(outputAssPath), { recursive: true });

  const workerOptions = JSON.stringify({
    mode: options.mode,
    orientation: options.orientation,
    pause_threshold: options.pauseThreshold ?? 0.3,
    max_chars: options.maxChars ?? 16,
  });

  return new Promise((resolve) => {
    const proc = spawn(
      python,
      [ASS_WORKER_SCRIPT, inputJsonPath, outputAssPath, workerOptions],
      {
        cwd: MP3_DIR,
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      }
    );

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });

    proc.on("close", async (code) => {
      if (code !== 0) {
        resolve({ success: false, error: stderr || `ASS worker crashed (exit ${code})` });
        return;
      }

      // Parse result from stdout
      try {
        const lines = stdout.trim().split("\n");
        const lastLine = lines[lines.length - 1];
        const result = JSON.parse(lastLine);
        resolve({
          success: true,
          assPath: outputAssPath,
          captions: result.captions,
        });
      } catch {
        // Check if file was created
        try {
          await fs.access(outputAssPath);
          resolve({ success: true, assPath: outputAssPath });
        } catch {
          resolve({ success: false, error: "ASS file was not created" });
        }
      }
    });

    // 2 minute timeout (ASS generation is fast, CPU only)
    setTimeout(() => {
      proc.kill();
      resolve({ success: false, error: "Timeout (2 minutes)" });
    }, 120000);
  });
}

/** Ensure output directory exists */
export async function ensureOutputDir(): Promise<string> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  return OUTPUT_DIR;
}

export { OUTPUT_DIR, MP3_DIR };

