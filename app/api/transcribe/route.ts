import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/lib/auth-helpers";
import { prisma } from "@/app/lib/db";
import { calculateCredits, deductCredits, getUserCredits } from "@/app/lib/credits";
import { estimateAudioDuration, runTranscription, runAlignment } from "@/app/lib/worker";
import { createSupabaseAdmin } from "@/app/lib/supabase/admin";

// Max file size: 50MB (Vercel payload limit is 4.5MB but we upload to Supabase Storage)
// For larger files, use client-side direct upload to Supabase Storage
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
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
      return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 50MB — ใช้ direct upload สำหรับไฟล์ใหญ่" }, { status: 400 });
    }

    // Estimate audio duration from file size
    const durationSec = estimateAudioDuration(file.size, file.type || "audio/mpeg");

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

    // Upload file to Supabase Storage (using admin client to bypass RLS)
    const supabase = createSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const storagePath = `${user.id}/${timestamp}_${safeName}`;

    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("audio-uploads")
      .upload(storagePath, fileBuffer, {
        contentType: file.type || "audio/mpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("[transcribe] Upload to Supabase Storage failed:", uploadError);
      return NextResponse.json({ error: "File upload failed" }, { status: 500 });
    }

    // Get signed URL for Replicate to access the file
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("audio-uploads")
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("[transcribe] Failed to create signed URL:", signedUrlError);
      return NextResponse.json({ error: "Failed to create file access URL" }, { status: 500 });
    }

    // Create job record
    const job = await prisma.job.create({
      data: {
        userId: user.id,
        fileName: file.name,
        fileSize: file.size,
        durationSec,
        creditsUsed: creditsNeeded,
        language,
        status: "processing",
        storagePath,
      },
    });

    // Deduct credits
    const deducted = await deductCredits(user.id, creditsNeeded, job.id, file.name);
    if (!deducted) {
      await prisma.job.update({ where: { id: job.id }, data: { status: "failed", errorMessage: "Credit deduction failed" } });
      // Clean up uploaded file
      await supabase.storage.from("audio-uploads").remove([storagePath]);
      return NextResponse.json({ error: "Credit deduction failed", creditsNeeded, balance }, { status: 402 });
    }

    // Run transcription (within this request — Vercel Pro allows 60s)
    const audioUrl = signedUrlData.signedUrl;

    const processResult = mode === "align"
      ? await runAlignment(audioUrl, scriptText, { language })
      : await runTranscription(audioUrl, { language });

    if (processResult.success && processResult.resultJson) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "done",
          resultJson: processResult.resultJson,
          completedAt: new Date(),
        },
      });

      // Save result.json to permanent storage (fire and forget)
      if (supabase) {
        const outputPath = `${user.id}/${job.id}/result.json`;
        supabase.storage
          .from("subtitle-outputs")
          .upload(outputPath, new Blob([processResult.resultJson], { type: "application/json" }), {
            contentType: "application/json",
            upsert: true,
          })
          .catch(() => {});
      }
    } else {
      // Refund credits on failure
      const { addCredits } = await import("@/app/lib/credits");
      await addCredits(user.id, creditsNeeded, "refund", `Refund: ${file.name} (failed)`);
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
    await supabase.storage.from("audio-uploads").remove([storagePath]).catch(() => {});

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
