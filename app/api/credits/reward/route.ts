import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/lib/auth-helpers";
import { prisma } from "@/app/lib/db";
import { addCredits } from "@/app/lib/credits";

const REWARD_CREDITS = 300;
const MAX_REWARDS_PER_DAY = 5;

/** GET — Check remaining ad rewards for today */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayCount = await prisma.adRewardLog.count({
    where: {
      userId: user.id,
      createdAt: { gte: todayStart },
    },
  });

  return NextResponse.json({
    remaining: Math.max(0, MAX_REWARDS_PER_DAY - todayCount),
    used: todayCount,
    max: MAX_REWARDS_PER_DAY,
    creditsPerReward: REWARD_CREDITS,
  });
}

/** POST — Credit user after watching a rewarded ad */
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check daily limit
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayCount = await prisma.adRewardLog.count({
    where: {
      userId: user.id,
      createdAt: { gte: todayStart },
    },
  });

  if (todayCount >= MAX_REWARDS_PER_DAY) {
    return NextResponse.json(
      {
        error: "Daily ad reward limit reached",
        remaining: 0,
        max: MAX_REWARDS_PER_DAY,
      },
      { status: 429 }
    );
  }

  try {
    // Add credits + log the reward
    const [, log] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { credits: { increment: REWARD_CREDITS } },
      }),
      prisma.adRewardLog.create({
        data: {
          userId: user.id,
          credits: REWARD_CREDITS,
        },
      }),
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: "rewarded_ad",
          credits: REWARD_CREDITS,
          description: `🎬 Rewarded Ad — ${REWARD_CREDITS} credits`,
          gateway: "rewarded_ad",
          source: "app",
        },
      }),
    ]);

    const remaining = MAX_REWARDS_PER_DAY - todayCount - 1;

    return NextResponse.json({
      success: true,
      creditsAdded: REWARD_CREDITS,
      remaining,
    });
  } catch (error) {
    console.error("[ad-reward] Error:", error);
    return NextResponse.json(
      { error: "Failed to process ad reward" },
      { status: 500 }
    );
  }
}
