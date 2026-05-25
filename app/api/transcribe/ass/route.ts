import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/lib/auth-helpers";
import { prisma } from "@/app/lib/db";
import { generateAss } from "@/app/lib/worker";

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
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let jsonContent: string;
    let assMode: "pause" | "word" | "smart" = "pause";
    let orientation: "portrait" | "landscape" = "portrait";
    let language = "th";
    let maxChars: number | undefined;
    let fileName = "subtitle";

    // Font style options
    let fontName: string | undefined;
    let fontSize: number | undefined;
    let primaryColor: string | undefined;
    let outlineColor: string | undefined;
    let backColor: string | undefined;
    let outlineWidth: number | undefined;
    let shadowDepth: number | undefined;
    let bold: boolean | undefined;
    let italic: boolean | undefined;
    let alignment: number | undefined;
    let marginV: number | undefined;

    /** Helper to extract font params from a key-value source */
    const extractFontParams = (get: (k: string) => string | null) => {
      if (get("fontName")) fontName = get("fontName")!;
      if (get("fontSize")) fontSize = parseInt(get("fontSize")!, 10);
      if (get("primaryColor")) primaryColor = get("primaryColor")!;
      if (get("outlineColor")) outlineColor = get("outlineColor")!;
      if (get("backColor")) backColor = get("backColor")!;
      if (get("outlineWidth")) outlineWidth = parseInt(get("outlineWidth")!, 10);
      if (get("shadowDepth")) shadowDepth = parseInt(get("shadowDepth")!, 10);
      if (get("bold")) bold = get("bold") === "true" || get("bold") === "1";
      if (get("italic")) italic = get("italic") === "true" || get("italic") === "1";
      if (get("alignment")) alignment = parseInt(get("alignment")!, 10);
      if (get("marginV")) marginV = parseInt(get("marginV")!, 10);
    };

    if (contentType.includes("multipart/form-data")) {
      // Mode 2: Uploaded JSON file
      const formData = await request.formData();
      const jsonFile = formData.get("jsonFile") as File | null;
      assMode = (formData.get("assMode") as "pause" | "word" | "smart") || "pause";
      orientation = (formData.get("orientation") as "portrait" | "landscape") || "portrait";
      language = (formData.get("language") as string) || "th";
      const maxCharsStr = formData.get("maxChars") as string;
      if (maxCharsStr) maxChars = parseInt(maxCharsStr, 10);
      extractFontParams((k) => formData.get(k) as string | null);

      if (!jsonFile) {
        // Try jobId mode from form data
        const jobId = formData.get("jobId") as string;
        if (!jobId) {
          return NextResponse.json({ error: "No JSON file or jobId provided" }, { status: 400 });
        }

        const job = await prisma.job.findFirst({
          where: { id: jobId, userId: user.id, status: "done" },
        });
        if (!job?.resultJson) {
          return NextResponse.json({ error: "Job result not available" }, { status: 404 });
        }
        jsonContent = job.resultJson;
        fileName = job.fileName.replace(/\.[^.]+$/, "");
      } else {
        // Read uploaded JSON
        const buffer = await jsonFile.arrayBuffer();
        jsonContent = new TextDecoder("utf-8").decode(buffer);
        fileName = jsonFile.name.replace(/\.json$/i, "");

        // Validate JSON
        try {
          const data = JSON.parse(jsonContent);
          if (!data.segments) {
            return NextResponse.json({ error: "Invalid JSON: missing 'segments'" }, { status: 400 });
          }
        } catch {
          return NextResponse.json({ error: "Invalid JSON file" }, { status: 400 });
        }
      }
    } else {
      // JSON body mode
      const body = await request.json();
      const { jobId } = body;
      assMode = body.assMode || "pause";
      orientation = body.orientation || "portrait";
      language = body.language || "th";
      if (body.maxChars) maxChars = parseInt(body.maxChars, 10);
      extractFontParams((k) => body[k] ?? null);

      if (!jobId) {
        return NextResponse.json({ error: "jobId required" }, { status: 400 });
      }

      const job = await prisma.job.findFirst({
        where: { id: jobId, userId: user.id, status: "done" },
      });
      if (!job?.resultJson) {
        return NextResponse.json({ error: "Job result not available" }, { status: 404 });
      }
      jsonContent = job.resultJson;
      fileName = job.fileName.replace(/\.[^.]+$/, "");
    }

    // Generate ASS — pure in-memory, no filesystem (AI-enhanced for pause mode)
    const result = await generateAss(jsonContent, {
      mode: assMode,
      orientation,
      language,
      maxChars,
      fontName,
      fontSize,
      primaryColor,
      outlineColor,
      backColor,
      outlineWidth,
      shadowDepth,
      bold,
      italic,
      alignment,
      marginV,
    });

    if (!result.success || !result.content) {
      return NextResponse.json({ error: result.error || "ASS generation failed" }, { status: 500 });
    }

    return new NextResponse(result.content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="subtitle.ass"; filename*=UTF-8''${encodeURIComponent(fileName)}.ass`,
      },
    });
  } catch (error) {
    console.error("ASS generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
