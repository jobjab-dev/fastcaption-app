import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/lib/auth-helpers";
import { prisma } from "@/app/lib/db";
import { createSupabaseAdmin } from "@/app/lib/supabase/admin";
import { generateAssContent } from "@/app/lib/ass-generator";

/**
 * GET /api/jobs/[id]/download?type=json|srt|txt|ass&mode=pause&orientation=portrait
 * 
 * Downloads output files for a completed job.
 * Files are lazily generated and cached in Supabase Storage.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: jobId } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "json";
  const mode = (searchParams.get("mode") || "pause") as "word" | "pause" | "smart";
  const orientation = (searchParams.get("orientation") || "portrait") as "portrait" | "landscape";

  // Get job
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.userId !== user.id) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.status !== "done" || !job.resultJson) {
    return NextResponse.json({ error: "Job not completed" }, { status: 400 });
  }

  const resultData = typeof job.resultJson === "string"
    ? JSON.parse(job.resultJson)
    : job.resultJson;

  const baseName = job.fileName?.replace(/\.[^.]+$/, "") || "result";
  const supabase = createSupabaseAdmin();

  // Try to serve from Storage cache first
  const storagePath = `${user.id}/${jobId}`;

  if (type === "json") {
    const content = JSON.stringify(resultData, null, 2);
    return new Response(content, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.json"`,
      },
    });
  }

  if (type === "srt") {
    const segments = resultData.segments || [];
    const fmt = (s: number) => {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = Math.floor(s % 60);
      const ms = Math.round((s % 1) * 1000);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
    };
    const srt = segments.map((seg: { start: number; end: number; text: string }, i: number) =>
      `${i + 1}\n${fmt(seg.start)} --> ${fmt(seg.end)}\n${seg.text}\n`
    ).join("\n");
    return new Response(srt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.srt"`,
      },
    });
  }

  if (type === "txt") {
    const segments = resultData.segments || [];
    const txt = segments.map((seg: { text: string }) => seg.text).join("\n");
    return new Response(txt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.txt"`,
      },
    });
  }

  if (type === "ass") {
    // Check if cached in Storage
    const assFileName = `${baseName}_${mode}_${orientation}.ass`;
    const assStoragePath = `${storagePath}/${assFileName}`;

    if (supabase) {
      // Try to download from cache
      const { data: cachedFile } = await supabase.storage
        .from("subtitle-outputs")
        .download(assStoragePath);

      if (cachedFile) {
        const content = await cachedFile.text();
        return new Response(content, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Content-Disposition": `attachment; filename="${assFileName}"`,
          },
        });
      }
    }

    // Generate ASS
    const lang = job.language || "th";
    const { content } = generateAssContent(resultData, { mode, orientation, lang });

    // Cache in Storage (fire and forget)
    if (supabase) {
      supabase.storage
        .from("subtitle-outputs")
        .upload(assStoragePath, new Blob([content], { type: "text/plain" }), {
          contentType: "text/plain; charset=utf-8",
          upsert: true,
        })
        .catch(() => {}); // Don't block response
    }

    return new Response(content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${assFileName}"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
