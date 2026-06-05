import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { calculateCredits, deductCredits, getUserCredits } from "@/app/lib/credits";
import { estimateAudioDuration, runTranscription, runAlignment } from "@/app/lib/worker";
import { createSupabaseAdmin } from "@/app/lib/supabase/admin";

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

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

    // 2. Parse FormData
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const audioFile = formData.get("audio") as File | null;
    const mode = (formData.get("mode") as string) || "transcribe";
    const scriptText = (formData.get("scriptText") as string) || "";
    const language = (formData.get("language") as string) || "th";
    const timestampMode = (formData.get("timestampMode") as "chunk" | "word") || "chunk";

    // ASS subtitle options (optional — client configurable)
    const assMaxChars = parseInt((formData.get("assMaxChars") as string) || "24", 10);
    const assMode = (formData.get("assMode") as string) || "smart";
    const assOrientation = (formData.get("assOrientation") as string) || "portrait";

    if (!audioFile) {
      return NextResponse.json({ error: "Missing 'audio' file in form data" }, { status: 400 });
    }

    if (mode === "align" && !scriptText.trim()) {
      return NextResponse.json({ error: "scriptText is required for align mode" }, { status: 400 });
    }

    const fileSize = audioFile.size;
    const fileType = audioFile.type || "audio/mpeg";
    const fileName = audioFile.name || "api_upload.mp3";

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 50MB limit" }, { status: 400 });
    }

    // 3. Estimate duration & Check Credits
    const durationSec = estimateAudioDuration(fileSize, fileType);
    const creditsNeeded = calculateCredits(durationSec);
    const balance = await getUserCredits(user.id);

    if (balance < creditsNeeded) {
      return NextResponse.json({
        error: "Insufficient credits",
        creditsNeeded,
        balance,
      }, { status: 402 });
    }

    // 4. Upload file to Supabase Storage
    const supabase = createSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const storagePath = `api/${user.id}/${timestamp}_${safeName}`;

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("audio-uploads")
      .upload(storagePath, buffer, {
        contentType: fileType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[api/v1/transcribe] Upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload audio file" }, { status: 500 });
    }

    // Get signed URL for Replicate
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("audio-uploads")
      .createSignedUrl(storagePath, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return NextResponse.json({ error: "Failed to create file access URL" }, { status: 500 });
    }

    // 5. Create Job Record
    const job = await prisma.job.create({
      data: {
        userId: user.id,
        fileName,
        fileSize,
        durationSec,
        creditsUsed: creditsNeeded,
        language,
        status: "processing",
        storagePath,
        source: "api",
      },
    });

    // 6. Deduct Credits
    const deducted = await deductCredits(user.id, creditsNeeded, job.id, fileName);
    if (!deducted) {
      await prisma.job.update({ where: { id: job.id }, data: { status: "failed", errorMessage: "Credit deduction failed" } });
      await supabase.storage.from("audio-uploads").remove([storagePath]);
      return NextResponse.json({ error: "Credit deduction failed", creditsNeeded, balance }, { status: 402 });
    }

    // 7. Run Process
    const audioUrl = signedUrlData.signedUrl;
    const processResult = mode === "align"
      ? await runAlignment(audioUrl, scriptText, { language, timestampMode })
      : await runTranscription(audioUrl, { language, timestampMode });

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

      // Cleanup audio
      await supabase.storage.from("audio-uploads").remove([storagePath]).catch(() => {});

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

      // Cleanup audio
      await supabase.storage.from("audio-uploads").remove([storagePath]).catch(() => {});

      return NextResponse.json({ 
        error: processResult.error || "Transcription failed",
        jobId: job.id,
      }, { status: 500 });
    }

  } catch (error) {
    console.error("[api/v1/transcribe] Internal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
