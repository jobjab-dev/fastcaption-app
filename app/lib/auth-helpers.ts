import { prisma } from "@/app/lib/db";
import { getSupabaseUser } from "@/app/lib/supabase/server";

/**
 * Get the authenticated app user from the database.
 * Returns the Prisma User object or null if not authenticated.
 */
export async function getAuthUser() {
  const supabaseUser = await getSupabaseUser();
  if (!supabaseUser) return null;

  const user = await prisma.user.findUnique({
    where: { supabaseUserId: supabaseUser.id },
  });

  return user;
}

/**
 * Ensure a Prisma User record exists for the current Supabase Auth user.
 * Called after OAuth callback — creates the user record if first login.
 * Also handles referral binding from cookies.
 */
export async function ensureUserExists() {
  const supabaseUser = await getSupabaseUser();
  if (!supabaseUser) return null;

  // Check if user already exists
  let user = await prisma.user.findUnique({
    where: { supabaseUserId: supabaseUser.id },
  });

  if (user) return user;

  // Create new user
  user = await prisma.user.create({
    data: {
      supabaseUserId: supabaseUser.id,
      email: supabaseUser.email || "",
      name:
        supabaseUser.user_metadata?.full_name ||
        supabaseUser.user_metadata?.name ||
        supabaseUser.email?.split("@")[0] ||
        "User",
      image: supabaseUser.user_metadata?.avatar_url || null,
      credits: 5000,
    },
  });

  // Record signup bonus transaction
  await prisma.transaction.create({
    data: {
      userId: user.id,
      type: "signup_bonus",
      credits: 5000,
      description: "🎉 สมัครใหม่ — รับ credits ฟรี!",
    },
  });

  // Bind referral if ref cookie exists
  // (handled in the ref API route which sets a cookie)
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const refCode = cookieStore.get("ref_code")?.value;
    if (refCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: refCode },
      });
      if (referrer && referrer.id !== user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { referredBy: referrer.id },
        });
        // Track conversion
        await prisma.affiliateClick.updateMany({
          where: { code: refCode, convertedUserId: null },
          data: { convertedUserId: user.id },
        });
      }
    }
  } catch {
    // Cookie access may fail in some contexts — non-critical
  }

  return user;
}
