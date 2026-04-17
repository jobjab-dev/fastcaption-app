import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { calculateCredits, deductCredits, getUserCredits } from "@/app/lib/credits";
import { getAudioDuration, runTranscription, runAlignment, ensureOutputDir } from "@/app/lib/worker";
import fs from "fs/promises";
import path from "path";

// Max file size: 2GB (video files can be large)
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const language = (formData.get("language") as string) || "th";
    const mode = (formData.get("mode") as string) || "transcribe";
    const scriptText = (formData.get("scriptText") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (mode === "align" && !scriptText.trim()) {
      return NextResponse.json({ error: "Script text is required for align mode" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 2GB" }, { status: 400 });
    }

    // Save uploaded file
    const outputDir = await ensureOutputDir();
    const uploadDir = path.join(process.cwd(), "uploads", "input");
    await fs.mkdir(uploadDir, { recursive: true });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const inputPath = path.join(uploadDir, `${timestamp}_${safeName}`);
    await fs.writeFile(inputPath, fileBuffer);

    // If it's a video file, extract audio to MP3 first (saves disk & processing time)
    const videoExts = [".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv", ".wmv", ".m4v", ".ts"];
    const ext = path.extname(safeName).toLowerCase();
    let audioPath = inputPath;

    console.log(`[transcribe] File: ${file.name} (${(file.size / 1024 / 1024).toFixed(0)}MB), ext: ${ext}, isVideo: ${videoExts.includes(ext)}`);

    if (videoExts.includes(ext)) {
      const mp3Path = inputPath.replace(/\.[^.]+$/, ".mp3");
      try {
        console.log(`[transcribe] Converting video to MP3...`);
        const { extractAudioToMp3 } = await import("@/app/lib/worker");
        await extractAudioToMp3(inputPath, mp3Path);
        // Delete original video to free disk space
        await fs.unlink(inputPath).catch(() => {});
        audioPath = mp3Path;
        const mp3Size = (await fs.stat(mp3Path)).size;
        console.log(`[transcribe] ✅ Converted video to MP3: ${(file.size / 1024 / 1024).toFixed(0)}MB → ${(mp3Size / 1024 / 1024).toFixed(0)}MB`);
      } catch (e) {
        console.error(`[transcribe] ❌ FFmpeg conversion failed:`, e);
        await fs.unlink(inputPath).catch(() => {});
        return NextResponse.json({ error: "ไม่สามารถแปลงวิดีโอเป็นเสียงได้ ลองอัปโหลดไฟล์ MP3 แทน" }, { status: 400 });
      }
    }

    // Get audio duration
    let durationSec: number;
    try {
      durationSec = await getAudioDuration(audioPath);
    } catch {
      await fs.unlink(audioPath).catch(() => {});
      return NextResponse.json({ error: "Cannot read audio duration. Is this a valid audio/video file?" }, { status: 400 });
    }

    // Calculate credits needed
    const creditsNeeded = calculateCredits(durationSec);

    // Check balance
    const balance = await getUserCredits(session.user.id);
    if (balance < creditsNeeded) {
      await fs.unlink(audioPath).catch(() => {});
      return NextResponse.json({
        error: "Insufficient credits",
        creditsNeeded,
        balance,
        durationSec: Math.round(durationSec),
      }, { status: 402 });
    }

    // Create job record
    const job = await prisma.job.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        fileSize: file.size,
        durationSec,
        creditsUsed: creditsNeeded,
        language,
        status: "processing",
      },
    });

    // Deduct credits
    const deducted = await deductCredits(session.user.id, creditsNeeded, job.id, file.name);
    if (!deducted) {
      await prisma.job.update({ where: { id: job.id }, data: { status: "failed", errorMessage: "Credit deduction failed" } });
      await fs.unlink(inputPath).catch(() => {});
      return NextResponse.json({ error: "Credit deduction failed" }, { status: 402 });
    }

    // Run transcription async (don't await — return job ID immediately)
    const outputJsonPath = path.join(outputDir, `${job.id}.json`);

    // Fire and forget: process in background
    const processPromise = mode === "align"
      ? runAlignment(audioPath, outputJsonPath, scriptText, { language })
      : runTranscription(audioPath, outputJsonPath, { language });

    processPromise.then(async (result) => {
      if (result.success) {
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: "done",
            resultJson: outputJsonPath,
            completedAt: new Date(),
          },
        });
      } else {
        // Refund credits on failure
        const { addCredits } = await import("@/app/lib/credits");
        await addCredits(session.user.id, creditsNeeded, "usage", `Refund: ${file.name} (failed)`);
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: "failed",
            errorMessage: result.error || "Unknown error",
            completedAt: new Date(),
          },
        });
      }
      // Clean up audio file
      await fs.unlink(audioPath).catch(() => {});
    });

    return NextResponse.json({
      jobId: job.id,
      creditsUsed: creditsNeeded,
      durationSec: Math.round(durationSec),
      balanceAfter: balance - creditsNeeded,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
