import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { createSupabaseAdmin } from "@/app/lib/supabase/admin";
import crypto from "crypto";

/**
 * POST /api/v1/upload
 * 
 * Get a presigned URL for uploading audio to Supabase Storage.
 * This allows clients to upload files of any size directly to storage,
 * bypassing Vercel's 4.5MB body limit.
 * 
 * Flow:
 * 1. Client calls POST /api/v1/upload → gets { uploadUrl, storagePath }
 * 2. Client uploads file to uploadUrl via PUT
 * 3. Client calls POST /api/v1/transcribe-url with { storagePath }
 * 
 * Request JSON: { fileName: string }
 * Response: { uploadUrl: string, uploadToken: string, storagePath: string }
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

    // 2. Parse body
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { fileName = "upload.mp3" } = body as { fileName?: string };

    // 3. Create Supabase admin client
    const supabase = createSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    // 4. Generate storage path
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueId = crypto.randomBytes(8).toString("hex");
    const storagePath = `api-uploads/${user.id}/${uniqueId}_${safeName}`;

    // 5. Create signed upload URL (valid for 10 minutes)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("audio-uploads")
      .createSignedUploadUrl(storagePath);

    if (uploadError || !uploadData) {
      console.error("[api/v1/upload] Failed to create upload URL:", uploadError);
      return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
    }

    return NextResponse.json({
      uploadUrl: uploadData.signedUrl,
      uploadToken: uploadData.token,
      storagePath,
      expiresIn: 600,
    });

  } catch (error) {
    console.error("[api/v1/upload] Internal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
