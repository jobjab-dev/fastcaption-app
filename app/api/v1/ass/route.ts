import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { generateAss } from "@/app/lib/worker";

/**
 * POST /api/v1/ass
 * 
 * Convert Whisper JSON to ASS subtitle via API key.
 * This is FREE — no credits needed (CPU only, no GPU)
 * 
 * Accepts multipart form-data with:
 * - jsonFile: JSON file to convert
 * - assMode: "pause" | "word" | "smart" (default: "smart")
 * - orientation: "portrait" | "landscape" (default: "portrait")
 * - maxChars: number (default: 24)
 * - language: string (default: "th")
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

    // Update lastUsed
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsed: new Date() },
    });

    // 2. Parse request
    const contentType = request.headers.get("content-type") || "";

    let jsonContent: string;
    let assMode: "pause" | "word" | "smart" = "smart";
    let orientation: "portrait" | "landscape" = "portrait";
    let language = "th";
    let maxChars = 24;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const jsonFile = formData.get("jsonFile") as File | null;

      assMode = (formData.get("assMode") as "pause" | "word" | "smart") || "smart";
      orientation = (formData.get("orientation") as "portrait" | "landscape") || "portrait";
      language = (formData.get("language") as string) || "th";
      const maxCharsStr = formData.get("maxChars") as string;
      if (maxCharsStr) maxChars = parseInt(maxCharsStr, 10);

      if (!jsonFile) {
        return NextResponse.json({ error: "Missing 'jsonFile' in form data" }, { status: 400 });
      }

      const buffer = await jsonFile.arrayBuffer();
      jsonContent = new TextDecoder("utf-8").decode(buffer);

      // Validate JSON
      try {
        const data = JSON.parse(jsonContent);
        if (!data.segments) {
          return NextResponse.json({ error: "Invalid JSON: missing 'segments'" }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "Invalid JSON file" }, { status: 400 });
      }
    } else {
      // JSON body mode
      const body = await request.json();
      if (!body.json) {
        return NextResponse.json({ error: "'json' field required in body" }, { status: 400 });
      }
      jsonContent = typeof body.json === "string" ? body.json : JSON.stringify(body.json);
      assMode = body.assMode || "smart";
      orientation = body.orientation || "portrait";
      language = body.language || "th";
      if (body.maxChars) maxChars = parseInt(body.maxChars, 10);
    }

    // 3. Generate ASS
    const result = await generateAss(jsonContent, {
      mode: assMode,
      orientation,
      language,
      maxChars,
    });

    if (!result.success || !result.content) {
      return NextResponse.json({ error: result.error || "ASS generation failed" }, { status: 500 });
    }

    // Return ASS as text
    return NextResponse.json({
      success: true,
      ass: result.content,
      captionCount: result.captions || 0,
    });

  } catch (error) {
    console.error("[api/v1/ass] Internal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
