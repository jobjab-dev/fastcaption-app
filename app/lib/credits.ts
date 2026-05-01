import { prisma } from "./db";

// 1000 credits = 5 minutes = 300 seconds
const CREDITS_PER_300_SEC = 1000;

/** Calculate credits needed for a given audio duration in seconds */
export function calculateCredits(durationSeconds: number): number {
  return Math.ceil(durationSeconds * CREDITS_PER_300_SEC / 300);
}

/** Format credits as readable minutes */
export function creditsToMinutes(credits: number): string {
  const minutes = (credits * 300) / (CREDITS_PER_300_SEC * 60);
  if (minutes < 1) return `${Math.round(minutes * 60)} วินาที`;
  return `${minutes.toFixed(1)} นาที`;
}

/** Check if user has enough credits, returns balance */
export async function getUserCredits(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  return user?.credits ?? 0;
}

/** Deduct credits for a transcription job. Returns true if successful. */
export async function deductCredits(
  userId: string,
  credits: number,
  jobId: string,
  fileName: string
): Promise<boolean> {
  // Use transaction to ensure atomicity
  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user || user.credits < credits) {
        throw new Error("INSUFFICIENT_CREDITS");
      }

      await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: credits } },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: "usage",
          credits: -credits,
          description: `Transcribe: ${fileName} (${credits} credits)`,
        },
      });
    });
    return true;
  } catch {
    return false;
  }
}

/** Add credits to user account (e.g., after purchase).
 *  If stripeId is provided, this is idempotent — duplicate calls with the
 *  same stripeId will be silently skipped (prevents webhook retry exploits). */
export async function addCredits(
  userId: string,
  credits: number,
  type: string,
  description: string,
  stripeId?: string
): Promise<{ added: boolean }> {
  // Idempotency guard: if a payment reference is provided, check for duplicates
  if (stripeId) {
    const existing = await prisma.transaction.findFirst({
      where: { stripeId },
    });
    if (existing) {
      console.log(`[credits] Duplicate payment skipped: ${stripeId}`);
      return { added: false };
    }
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: credits } },
    }),
    prisma.transaction.create({
      data: {
        userId,
        type,
        credits,
        description,
        stripeId,
      },
    }),
  ]);

  return { added: true };
}

/** Give signup bonus (5000 credits) */
export async function giveSignupBonus(userId: string): Promise<void> {
  // Check if already given
  const existing = await prisma.transaction.findFirst({
    where: { userId, type: "signup_bonus" },
  });
  if (existing) return;

  await addCredits(userId, 5000, "signup_bonus", "🎁 Free signup bonus: 5,000 credits");
}
