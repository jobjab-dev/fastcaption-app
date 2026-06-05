import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { calculateCredits, deductCredits, getUserCredits } from "@/app/lib/credits";
import { estimateAudioDuration, runTranscription, runAlignment } from "@/app/lib/worker";
import { createSupabaseAdmin } from "@/app/lib/supabase/admin";

/**
 * POST /api/v1/transcribe-url
 * 
 * Alternative to /api/v1/transcribe for large files (>4.5MB).
 * Instead of uploading the audio file directly, the client provides a
 * publicly accessible URL to the audio file.
 * 
 * This bypasses Vercel's 4.5MB body size limit.
 * 
 * Accepts JSON body:
 * - audioUrl: string (required) — public URL to audio file
 * - fileName: string (optional) — original file name
 * - language: string (optional, default "th")
 * - mode: "transcribe" | "align" (optional, default "transcribe")
 * - scriptText: string (required for align mode)
 * - timestampMode: "chunk" | "word" (optional, default "chunk")
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
      audioUrl,
      fileName = "api_upload.mp3",
      language = "th",
      mode = "transcribe",
      scriptText = "",
      timestampMode = "chunk",
      durationHint,
    } = body as {
      audioUrl: string;
      fileName?: string;
      language?: string;
      mode?: string;
      scriptText?: string;
      timestampMode?: "chunk" | "word";
      durationHint?: number;
    };

    if (!audioUrl) {
      return NextResponse.json({ error: "Missing 'audioUrl' in request body" }, { status: 400 });
    }

    if (mode === "align" && !scriptText.trim()) {
      return NextResponse.json({ error: "scriptText is required for align mode" }, { status: 400 });
    }

    // 3. Estimate duration & Check Credits
    // If client provides durationHint (seconds), use it; otherwise estimate from a HEAD request
    let durationSec = durationHint || 0;
    if (!durationSec) {
      // Try HEAD request to get Content-Length for estimation
      try {
        const headResp = await fetch(audioUrl, { method: "HEAD" });
        const contentLength = parseInt(headResp.headers.get("content-length") || "0");
        const contentType = headResp.headers.get("content-type") || "audio/mpeg";
        if (contentLength > 0) {
          durationSec = estimateAudioDuration(contentLength, contentType);
        }
      } catch {
        // If HEAD fails, estimate 5 minutes as default
        durationSec = 300;
      }
    }

    // Minimum 10 seconds to prevent abuse
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

    // 4. Create Job Record
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

    // 5. Deduct Credits
    const deducted = await deductCredits(user.id, creditsNeeded, job.id, fileName);
    if (!deducted) {
      await prisma.job.update({ where: { id: job.id }, data: { status: "failed", errorMessage: "Credit deduction failed" } });
      return NextResponse.json({ error: "Credit deduction failed", creditsNeeded, balance }, { status: 402 });
    }

    // 6. Run Process — use the audioUrl directly
    const processResult = mode === "align"
      ? await runAlignment(audioUrl, scriptText, { language, timestampMode })
      : await runTranscription(audioUrl, { language, timestampMode });

    // 7. Handle Result
    if (processResult.success && processResult.resultJson) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "done",
          resultJson: processResult.resultJson,
          completedAt: new Date(),
        },
      });

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
