import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/app/lib/db";
import { calculateCredits, deductCredits, getUserCredits } from "@/app/lib/credits";
import { estimateAudioDuration, runTranscription, runAlignment } from "@/app/lib/worker";
import { createSupabaseAdmin } from "@/app/lib/supabase/admin";

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Mobile transcription endpoint.
 *
 * Differs from /api/transcribe in auth method:
 * - Web: uses cookie-based Supabase session
 * - Mobile: uses Bearer token from anonymous/authenticated Supabase session
 *
 * Flow is identical: receive storagePath metadata → create signed URL → process.
 */
export async function POST(request: NextRequest) {
  // ── Auth: verify Bearer token from mobile app ──
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");

  // Verify the JWT using Supabase
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: { user: supabaseUser }, error: authError } = await supabaseAuth.auth.getUser(token);

  if (authError || !supabaseUser) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  try {
    // ── Parse request body (same format as webapp) ──
    const body = await request.json();
    const {
      storagePath, fileName, fileSize, fileType,
      language = "th", mode = "transcribe", scriptText = "",
    } = body as {
      storagePath: string;
      fileName: string;
      fileSize: number;
      fileType: string;
      language?: string;
      mode?: string;
      scriptText?: string;
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

    // ── Find or create user in database ──
    let user = await prisma.user.findUnique({
      where: { supabaseUserId: supabaseUser.id },
    });

    if (!user) {
      // Auto-create user for anonymous mobile sessions
      const userEmail = supabaseUser.email || `${supabaseUser.id}@anonymous.mobile`;
      const userName = supabaseUser.user_metadata?.full_name || "Mobile User";

      try {
        user = await prisma.user.create({
          data: {
            supabaseUserId: supabaseUser.id,
            email: userEmail,
            name: userName,
            credits: 5000, // Signup bonus
          },
        });

        // Record signup bonus
        await prisma.transaction.create({
          data: {
            userId: user.id,
            type: "signup_bonus",
            credits: 5000,
            description: "🎉 Mobile app — welcome credits!",
          },
        });
      } catch (err: unknown) {
        const prismaErr = err as { code?: string };
        if (prismaErr.code === "P2002") {
          // Email collision — find existing user
          user = await prisma.user.findUnique({ where: { email: userEmail } });
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: { supabaseUserId: supabaseUser.id },
            });
          }
        }
        if (!user) throw err;
      }
    }

    // ── Credits check ──
    const durationSec = estimateAudioDuration(fileSize, fileType || "audio/mp4");
    const creditsNeeded = calculateCredits(durationSec);
    const balance = await getUserCredits(user.id);

    if (balance < creditsNeeded) {
      return NextResponse.json({
        error: "Insufficient credits",
        creditsNeeded,
        balance,
        durationSec: Math.round(durationSec),
      }, { status: 402 });
    }

    // ── Storage: create signed URL ──
    const supabase = createSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    // Move file to user-scoped path
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const userStoragePath = `${user.id}/${timestamp}_${safeName}`;

    const { error: moveError } = await supabase.storage
      .from("audio-uploads")
      .move(storagePath, userStoragePath);

    const finalPath = moveError ? storagePath : userStoragePath;

    // Get signed URL for processing
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("audio-uploads")
      .createSignedUrl(finalPath, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return NextResponse.json({ error: "Failed to create file access URL" }, { status: 500 });
    }

    // ── Create job ──
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
        source: "app",
      },
    });

    // ── Deduct credits ──
    const deducted = await deductCredits(user.id, creditsNeeded, job.id, fileName);
    if (!deducted) {
      await prisma.job.update({ where: { id: job.id }, data: { status: "failed", errorMessage: "Credit deduction failed" } });
      await supabase.storage.from("audio-uploads").remove([finalPath]);
      return NextResponse.json({ error: "Credit deduction failed", creditsNeeded, balance }, { status: 402 });
    }

    // ── Process transcription ──
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

      // Save result.json (fire and forget)
      const outputPath = `${user.id}/${job.id}/result.json`;
      supabase.storage
        .from("subtitle-outputs")
        .upload(outputPath, new Blob([processResult.resultJson], { type: "application/json" }), {
          contentType: "application/json",
          upsert: true,
        })
        .catch(() => {});
    } else {
      // Refund on failure
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

    // Clean up audio
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
    console.error("[mobile/transcribe] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
