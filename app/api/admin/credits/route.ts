import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-guard";
import { addCredits } from "@/app/lib/credits";
import { prisma } from "@/app/lib/db";

/**
 * POST /api/admin/credits
 * Add credits to a user. Admin only.
 * Body: { userId: string, credits: number, reason?: string }
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, credits, reason } = body as {
    userId: string;
    credits: number;
    reason?: string;
  };

  if (!userId || !credits || credits <= 0) {
    return NextResponse.json(
      { error: "userId and credits (> 0) are required" },
      { status: 400 }
    );
  }

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, credits: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const description =
    reason?.trim() ||
    `🎁 Admin grant: +${credits.toLocaleString()} credits by ${admin.email}`;

  const result = await addCredits(userId, credits, "admin_grant", description);

  if (!result.added) {
    return NextResponse.json(
      { error: "Failed to add credits" },
      { status: 500 }
    );
  }

  // Fetch updated balance
  const updated = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      previousBalance: user.credits,
      newBalance: updated?.credits ?? user.credits + credits,
      creditsAdded: credits,
    },
  });
}
