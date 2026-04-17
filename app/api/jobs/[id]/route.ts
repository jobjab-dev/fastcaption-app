import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import fs from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const job = await prisma.job.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    fileName: job.fileName,
    durationSec: job.durationSec,
    creditsUsed: job.creditsUsed,
    language: job.language,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    hasResult: !!job.resultJson,
  });
}

// Download result
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const job = await prisma.job.findFirst({
    where: { id, userId: session.user.id, status: "done" },
  });

  if (!job || !job.resultJson) {
    return NextResponse.json({ error: "Result not available" }, { status: 404 });
  }

  try {
    const content = await fs.readFile(job.resultJson, "utf-8");
    const fileName = path.basename(job.fileName, path.extname(job.fileName)) + ".json";

    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
