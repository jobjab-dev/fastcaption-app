import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { calculateCredits, deductCredits, getUserCredits } from "@/app/lib/credits";
import { estimateAudioDuration, runTranscription, runAlignment } from "@/app/lib/worker";
import { createSupabaseAdmin } from "@/app/lib/supabase/admin";

export const maxDuration = 900; // 15 minutes

/**
 * POST /api/v1/transcribe-url
 * 
 * Transcribe audio from a Supabase storage path or a public URL.
 * Use this for files > 4.5MB that can't be uploaded directly to Vercel.
 * 
 * Accepts JSON body:
 * - storagePath: string — path in Supabase "audio-uploads" bucket (from /api/v1/upload)
 * - audioUrl: string — OR a public URL to audio file (alternative to storagePath)
 * - fileName: string (optional)
 * - language: string (optional, default "th")
 * - mode: "transcribe" | "align" (optional, default "transcribe")
 * - scriptText: string (required for align mode)
 * - timestampMode: "chunk" | "word" (optional, default "chunk")
 * - durationHint: number (optional, seconds — used for credit estimation)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate API Key
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
    }

    const apiKeyStr = authHeader.split(" ")[1];
    const apiKey = await prisma.apiKey.findUnique({
      where: { key: apiKeyStr },
      include: { user: true },
    });

    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
    }

    const user = apiKey.user;

    // Update lastUsed
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsed: new Date() },
    });

    // 2. Parse JSON body
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      storagePath,
      audioUrl: rawAudioUrl,
      fileName = "api_upload.mp3",
      language = "th",
      mode = "transcribe",
      scriptText = "",
      timestampMode = "chunk",
      durationHint,
    } = body as {
      storagePath?: string;
      audioUrl?: string;
      fileName?: string;
      language?: string;
      mode?: string;
      scriptText?: string;
      timestampMode?: "chunk" | "word";
      durationHint?: number;
    };

    if (!storagePath && !rawAudioUrl) {
      return NextResponse.json({ error: "Either 'storagePath' or 'audioUrl' is required" }, { status: 400 });
    }

    if (mode === "align" && !scriptText.trim()) {
      return NextResponse.json({ error: "scriptText is required for align mode" }, { status: 400 });
    }

    // 3. Resolve audio URL
    let audioUrl = rawAudioUrl || "";

    if (storagePath) {
      // Create signed download URL from Supabase Storage (file must exist)
      const supabase = createSupabaseAdmin();
      if (!supabase) {
        return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
      }

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("audio-uploads")
        .createSignedUrl(storagePath, 3600); // 1 hour

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error("[api/v1/transcribe-url] Failed to create signed URL:", signedUrlError);
        return NextResponse.json({ error: "Failed to access uploaded file. Did you upload it first?" }, { status: 400 });
      }

      audioUrl = signedUrlData.signedUrl;
    }

    // 4. Estimate duration & Check Credits
    let durationSec = durationHint || 0;
    if (!durationSec) {
      try {
        const headResp = await fetch(audioUrl, { method: "HEAD" });
        const contentLength = parseInt(headResp.headers.get("content-length") || "0");
        const contentType = headResp.headers.get("content-type") || "audio/mpeg";
        if (contentLength > 0) {
          durationSec = estimateAudioDuration(contentLength, contentType);
        }
      } catch {
        durationSec = 300;
      }
    }

    if (durationSec < 10) durationSec = 60;

    const creditsNeeded = calculateCredits(durationSec);
    const balance = await getUserCredits(user.id);

    if (balance < creditsNeeded) {
      return NextResponse.json({
        error: "Insufficient credits",
        creditsNeeded,
        balance,
      }, { status: 402 });
    }

    // 5. Create Job Record
    const job = await prisma.job.create({
      data: {
        userId: user.id,
        fileName,
        fileSize: 0,
        durationSec,
        creditsUsed: creditsNeeded,
        language,
        status: "processing",
        source: "api",
      },
    });

    // 6. Deduct Credits
    const deducted = await deductCredits(user.id, creditsNeeded, job.id, fileName);
    if (!deducted) {
      await prisma.job.update({ where: { id: job.id }, data: { status: "failed", errorMessage: "Credit deduction failed" } });
      return NextResponse.json({ error: "Credit deduction failed", creditsNeeded, balance }, { status: 402 });
    }

    // 7. Run Process
    const processResult = mode === "align"
      ? await runAlignment(audioUrl, scriptText, { language, timestampMode, durationHint: durationSec, abortSignal: request.signal })
      : await runTranscription(audioUrl, { language, timestampMode, durationHint: durationSec, abortSignal: request.signal });

    // 8. Handle Result
    if (processResult.success && processResult.resultJson) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "done",
          resultJson: processResult.resultJson,
          completedAt: new Date(),
        },
      });

      // Clean up uploaded file (fire and forget)
      if (storagePath) {
        const supabase = createSupabaseAdmin();
        supabase?.storage.from("audio-uploads").remove([storagePath]).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        jobId: job.id,
        creditsUsed: creditsNeeded,
        balanceAfter: balance - creditsNeeded,
        result: JSON.parse(processResult.resultJson),
      });
    } else {
      // Refund on failure
      const { addCredits } = await import("@/app/lib/credits");
      await addCredits(user.id, creditsNeeded, "refund", `Refund API: ${fileName} (failed)`);

      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "failed",
          errorMessage: processResult.error || "Unknown error",
          completedAt: new Date(),
        },
      });

      return NextResponse.json({ 
        error: processResult.error || "Transcription failed",
        jobId: job.id,
      }, { status: 500 });
    }

  } catch (error) {
    console.error("[api/v1/transcribe-url] Internal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
