import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { runJsonToAss, ensureOutputDir } from "@/app/lib/worker";
import fs from "fs/promises";
import path from "path";

/**
 * POST /api/transcribe/ass
 * 
 * Convert JSON to ASS subtitle. Two modes:
 * 1. From existing job: send { jobId, assMode, orientation }
 * 2. From uploaded JSON: send multipart with "jsonFile" + options
 * 
 * This is FREE — no credits needed (CPU only, no GPU)
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let jsonPath: string;
    let assMode: "pause" | "word" | "smart" = "pause";
    let orientation: "portrait" | "landscape" = "portrait";
    let fileName = "subtitle";
    let shouldCleanup = false;

    if (contentType.includes("multipart/form-data")) {
      // Mode 2: Uploaded JSON file
      const formData = await request.formData();
      const jsonFile = formData.get("jsonFile") as File | null;
      assMode = (formData.get("assMode") as "pause" | "word" | "smart") || "pause";
      orientation = (formData.get("orientation") as "portrait" | "landscape") || "portrait";

      if (!jsonFile) {
        // Try jobId mode from form data
        const jobId = formData.get("jobId") as string;
        if (!jobId) {
          return NextResponse.json({ error: "No JSON file or jobId provided" }, { status: 400 });
        }

        // Fetch job
        const job = await prisma.job.findFirst({
          where: { id: jobId, userId: session.user.id, status: "done" },
        });
        if (!job?.resultJson) {
          return NextResponse.json({ error: "Job result not available" }, { status: 404 });
        }
        jsonPath = job.resultJson;
        fileName = path.basename(job.fileName, path.extname(job.fileName));
      } else {
        // Save uploaded JSON to temp location
        const outputDir = await ensureOutputDir();
        const tmpJsonPath = path.join(outputDir, `upload_${Date.now()}.json`);
        const buffer = Buffer.from(await jsonFile.arrayBuffer());
        await fs.writeFile(tmpJsonPath, buffer);
        jsonPath = tmpJsonPath;
        fileName = path.basename(jsonFile.name, ".json");
        shouldCleanup = true;

        // Validate JSON
        try {
          const data = JSON.parse(buffer.toString("utf-8"));
          if (!data.segments) {
            await fs.unlink(tmpJsonPath).catch(() => {});
            return NextResponse.json({ error: "Invalid JSON: missing 'segments'" }, { status: 400 });
          }
        } catch {
          await fs.unlink(tmpJsonPath).catch(() => {});
          return NextResponse.json({ error: "Invalid JSON file" }, { status: 400 });
        }
      }
    } else {
      // JSON body mode
      const body = await request.json();
      const { jobId } = body;
      assMode = body.assMode || "pause";
      orientation = body.orientation || "portrait";

      if (!jobId) {
        return NextResponse.json({ error: "jobId required" }, { status: 400 });
      }

      const job = await prisma.job.findFirst({
        where: { id: jobId, userId: session.user.id, status: "done" },
      });
      if (!job?.resultJson) {
        return NextResponse.json({ error: "Job result not available" }, { status: 404 });
      }
      jsonPath = job.resultJson;
      fileName = path.basename(job.fileName, path.extname(job.fileName));
    }

    // Generate ASS
    const outputDir = await ensureOutputDir();
    const outputAssPath = path.join(outputDir, `${fileName}_${Date.now()}.ass`);

    const result = await runJsonToAss(jsonPath, outputAssPath, {
      mode: assMode,
      orientation,
    });

    // Cleanup uploaded JSON
    if (shouldCleanup) {
      await fs.unlink(jsonPath).catch(() => {});
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error || "ASS generation failed" }, { status: 500 });
    }

    // Read and return the ASS file
    const assContent = await fs.readFile(outputAssPath, "utf-8");

    // Clean up ASS file after reading
    await fs.unlink(outputAssPath).catch(() => {});

    return new NextResponse(assContent, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}.ass"`,
      },
    });
  } catch (error) {
    console.error("ASS generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
