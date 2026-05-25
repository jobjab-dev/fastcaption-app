import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/lib/auth-helpers";
import { prisma } from "@/app/lib/db";
import { calculateCredits, deductCredits, getUserCredits } from "@/app/lib/credits";
import { estimateAudioDuration, runTranscription, runAlignment } from "@/app/lib/worker";
import { createSupabaseAdmin } from "@/app/lib/supabase/admin";

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Client uploads file directly to Supabase Storage, then sends metadata here
    const body = await request.json();
    const { storagePath, fileName, fileSize, fileType, language = "th", mode = "transcribe", scriptText = "", timestampMode = "chunk" } = body as {
      storagePath: string;
      fileName: string;
      fileSize: number;
      fileType: string;
      language?: string;
      mode?: string;
      scriptText?: string;
      timestampMode?: "chunk" | "word";
    };

    if (!storagePath || !fileName || !fileSize) {
      return NextResponse.json({ error: "Missing required fields: storagePath, fileName, fileSize" }, { status: 400 });
    }

    if (mode === "align" && !scriptText.trim()) {
      return NextResponse.json({ error: "Script text is required for align mode" }, { status: 400 });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 50MB" }, { status: 400 });
    }

    // Estimate audio duration from file size
    const durationSec = estimateAudioDuration(fileSize, fileType || "audio/mpeg");

    // Calculate credits needed
    const creditsNeeded = calculateCredits(durationSec);

    // Check balance
    const balance = await getUserCredits(user.id);
    if (balance < creditsNeeded) {
      return NextResponse.json({
        error: "Insufficient credits",
        creditsNeeded,
        balance,
        durationSec: Math.round(durationSec),
      }, { status: 402 });
    }

    // Get Supabase admin client to create signed URL
    const supabase = createSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    // Move file from client-uploaded path to user-scoped path
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const userStoragePath = `${user.id}/${timestamp}_${safeName}`;

    const { error: moveError } = await supabase.storage
      .from("audio-uploads")
      .move(storagePath, userStoragePath);

    if (moveError) {
      console.error("[transcribe] Failed to move file:", moveError);
      // Try to use the original path if move fails (e.g., RLS issue)
      // Fall through — we'll use whichever path works for the signed URL
    }

    const finalPath = moveError ? storagePath : userStoragePath;

    // Get signed URL for Replicate to access the file
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("audio-uploads")
      .createSignedUrl(finalPath, 3600); // 1 hour expiry

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("[transcribe] Failed to create signed URL:", signedUrlError);
      return NextResponse.json({ error: "Failed to create file access URL" }, { status: 500 });
    }

    // Create job record
    const job = await prisma.job.create({
      data: {
        userId: user.id,
        fileName,
        fileSize,
        durationSec,
        creditsUsed: creditsNeeded,
        language,
        status: "processing",
        storagePath: finalPath,
        source: "web",
      },
    });

    // Deduct credits
    const deducted = await deductCredits(user.id, creditsNeeded, job.id, fileName);
    if (!deducted) {
      await prisma.job.update({ where: { id: job.id }, data: { status: "failed", errorMessage: "Credit deduction failed" } });
      await supabase.storage.from("audio-uploads").remove([finalPath]);
      return NextResponse.json({ error: "Credit deduction failed", creditsNeeded, balance }, { status: 402 });
    }

    // Run transcription (within this request — Vercel Pro allows 60s)
    const audioUrl = signedUrlData.signedUrl;

    const processResult = mode === "align"
      ? await runAlignment(audioUrl, scriptText, { language, timestampMode })
      : await runTranscription(audioUrl, { language, timestampMode });

    if (processResult.success && processResult.resultJson) {
      const finalResultJson = processResult.resultJson;

      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "done",
          resultJson: finalResultJson,
          completedAt: new Date(),
        },
      });

      // Save result.json to permanent storage (fire and forget)
      if (supabase) {
        const outputPath = `${user.id}/${job.id}/result.json`;
        supabase.storage
          .from("subtitle-outputs")
          .upload(outputPath, new Blob([finalResultJson], { type: "application/json" }), {
            contentType: "application/json",
            upsert: true,
          })
          .catch(() => {});
      }
    } else {
      // Refund credits on failure
      const { addCredits } = await import("@/app/lib/credits");
      await addCredits(user.id, creditsNeeded, "refund", `Refund: ${fileName} (failed)`);
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "failed",
          errorMessage: processResult.error || "Unknown error",
          completedAt: new Date(),
        },
      });
    }

    // Clean up uploaded audio from storage
    await supabase.storage.from("audio-uploads").remove([finalPath]).catch(() => {});

    return NextResponse.json({
      jobId: job.id,
      status: processResult.success ? "done" : "failed",
      creditsUsed: creditsNeeded,
      durationSec: Math.round(durationSec),
      balanceAfter: balance - creditsNeeded,
      error: processResult.success ? undefined : processResult.error,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

