import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/lib/auth-helpers";
import { prisma } from "@/app/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const job = await prisma.job.findFirst({
    where: { id, userId: user.id },
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

// Download result — returns JSON content directly from DB
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const job = await prisma.job.findFirst({
    where: { id, userId: user.id, status: "done" },
  });

  if (!job || !job.resultJson) {
    return NextResponse.json({ error: "Result not available" }, { status: 404 });
  }

  const fileName = job.fileName.replace(/\.[^.]+$/, "") + ".json";

  return new NextResponse(job.resultJson, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
