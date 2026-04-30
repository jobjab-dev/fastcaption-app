import { prisma } from "./db";
import crypto from "crypto";

const COMMISSION_RATE = 0.20; // 20%
const MIN_PAYOUT_THB = 500;
const COOKIE_DURATION_DAYS = 30;

/** Generate a unique referral code like "FC-a1b2c3" */
function generateCode(): string {
  const hex = crypto.randomBytes(4).toString("hex"); // 8 chars
  return `FC-${hex}`;
}

/** Activate affiliate status for a user and create a referral code */
export async function activateAffiliate(userId: string) {
  // Check if already activated
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { affiliateStatus: true, referralCode: true },
  });

  if (!user) throw new Error("User not found");
  if (user.affiliateStatus === "active" && user.referralCode) {
    return { code: user.referralCode, status: "already_active" };
  }

  // Generate unique code (retry if collision)
  let code = generateCode();
  let attempts = 0;
  while (attempts < 5) {
    const exists = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!exists) break;
    code = generateCode();
    attempts++;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      affiliateStatus: "active",
      referralCode: code,
    },
    select: { referralCode: true },
  });

  return { code: updated.referralCode, status: "activated" };
}

/** Track a referral link click */
export async function trackClick(
  code: string,
  ip?: string | null,
  userAgent?: string | null
) {
  // Verify the code exists
  const affiliate = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true, affiliateStatus: true },
  });

  if (!affiliate || affiliate.affiliateStatus !== "active") {
    return null;
  }

  await prisma.affiliateClick.create({
    data: {
      code,
      ip: ip || null,
      userAgent: userAgent || null,
    },
  });

  return { affiliateId: affiliate.id, cookieDurationDays: COOKIE_DURATION_DAYS };
}

/** Bind a referrer to a new user during signup */
export async function bindReferral(newUserId: string, referralCode: string) {
  // Find the affiliate
  const affiliate = await prisma.user.findUnique({
    where: { referralCode: referralCode },
    select: { id: true, affiliateStatus: true },
  });

  if (!affiliate || affiliate.affiliateStatus !== "active") return false;

  // Prevent self-referral
  if (affiliate.id === newUserId) return false;

  // Bind
  await prisma.user.update({
    where: { id: newUserId },
    data: { referredBy: affiliate.id },
  });

  // Update click conversion
  await prisma.affiliateClick.updateMany({
    where: { code: referralCode, convertedUserId: null },
    data: { convertedUserId: newUserId },
  });

  return true;
}

/** Create a commission for the affiliate when a referred user purchases credits */
export async function createCommission(
  referredUserId: string,
  transactionId: string,
  purchaseAmountThb: number
) {
  // Find the affiliate who referred this user
  const user = await prisma.user.findUnique({
    where: { id: referredUserId },
    select: { referredBy: true },
  });

  if (!user?.referredBy) return null;

  // Verify the affiliate is still active
  const affiliate = await prisma.user.findUnique({
    where: { id: user.referredBy },
    select: { id: true, affiliateStatus: true },
  });

  if (!affiliate || affiliate.affiliateStatus !== "active") return null;

  const commissionAmount = Math.round(purchaseAmountThb * COMMISSION_RATE * 100) / 100;

  const commission = await prisma.commission.create({
    data: {
      affiliateId: affiliate.id,
      referredUserId,
      transactionId,
      amountThb: commissionAmount,
      status: "pending",
    },
  });

  return commission;
}

/** Get affiliate statistics for dashboard */
export async function getAffiliateStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      referralCode: true,
      affiliateStatus: true,
    },
  });

  if (!user || user.affiliateStatus !== "active" || !user.referralCode) {
    return null;
  }

  const [
    totalClicks,
    totalReferrals,
    commissions,
    pendingCommission,
    paidCommission,
    recentCommissions,
    payoutRequests,
  ] = await Promise.all([
    // Total clicks
    prisma.affiliateClick.count({
      where: { code: user.referralCode },
    }),
    // Total converted referrals
    prisma.user.count({
      where: { referredBy: userId },
    }),
    // All commissions
    prisma.commission.aggregate({
      where: { affiliateId: userId },
      _sum: { amountThb: true },
      _count: true,
    }),
    // Pending commission balance
    prisma.commission.aggregate({
      where: { affiliateId: userId, status: "pending" },
      _sum: { amountThb: true },
    }),
    // Paid commission total
    prisma.commission.aggregate({
      where: { affiliateId: userId, status: "paid" },
      _sum: { amountThb: true },
    }),
    // Recent commissions
    prisma.commission.findMany({
      where: { affiliateId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        amountThb: true,
        status: true,
        createdAt: true,
        referredUserId: true,
      },
    }),
    // Payout requests
    prisma.payoutRequest.findMany({
      where: { affiliateId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    referralCode: user.referralCode,
    totalClicks,
    totalReferrals,
    totalCommissions: commissions._count,
    totalEarned: commissions._sum.amountThb || 0,
    pendingBalance: pendingCommission._sum.amountThb || 0,
    paidBalance: paidCommission._sum.amountThb || 0,
    recentCommissions,
    payoutRequests,
    canRequestPayout: (pendingCommission._sum.amountThb || 0) >= MIN_PAYOUT_THB,
    minPayoutThb: MIN_PAYOUT_THB,
  };
}

/** Request a payout */
export async function requestPayout(
  userId: string,
  method: "bank_transfer" | "promptpay",
  accountInfo: string
) {
  const stats = await getAffiliateStats(userId);
  if (!stats) throw new Error("Not an affiliate");
  if (stats.pendingBalance < MIN_PAYOUT_THB) {
    throw new Error(`Minimum payout is ฿${MIN_PAYOUT_THB}. Current balance: ฿${stats.pendingBalance}`);
  }

  // Check no pending payout request
  const pendingPayout = await prisma.payoutRequest.findFirst({
    where: { affiliateId: userId, status: "pending" },
  });
  if (pendingPayout) {
    throw new Error("You already have a pending payout request");
  }

  const payout = await prisma.payoutRequest.create({
    data: {
      affiliateId: userId,
      amountThb: stats.pendingBalance,
      method,
      accountInfo,
    },
  });

  return payout;
}
