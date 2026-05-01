import { prisma } from "@/app/lib/db";
import { getSupabaseUser } from "@/app/lib/supabase/server";

/**
 * Get the authenticated app user from the database.
 * Returns the Prisma User object or null if not authenticated.
 */
export async function getAuthUser() {
  const supabaseUser = await getSupabaseUser();
  if (!supabaseUser) return null;

  // Primary lookup by Supabase Auth ID
  let user = await prisma.user.findUnique({
    where: { supabaseUserId: supabaseUser.id },
  });

  // Fallback: user may have switched login method (Google → Email or vice versa)
  // with the same email but a different Supabase identity
  if (!user && supabaseUser.email) {
    user = await prisma.user.findUnique({
      where: { email: supabaseUser.email },
    });
    // Link this identity to the existing account
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { supabaseUserId: supabaseUser.id },
      });
    }
  }

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

  // Try to create new user — if email already exists (e.g. user signed up
  // with Google first, now using email magic link), link to existing account.
  const userEmail = supabaseUser.email || `${supabaseUser.id}@unknown.user`;
  const userName =
    supabaseUser.user_metadata?.full_name ||
    supabaseUser.user_metadata?.name ||
    supabaseUser.email?.split("@")[0] ||
    "User";

  try {
    user = await prisma.user.create({
      data: {
        supabaseUserId: supabaseUser.id,
        email: userEmail,
        name: userName,
        image: supabaseUser.user_metadata?.avatar_url || null,
        credits: 5000,
      },
    });
  } catch (err: unknown) {
    // P2002 = Unique constraint violation (email already exists)
    const prismaErr = err as { code?: string };
    if (prismaErr.code === "P2002") {
      // Link existing account to this Supabase identity
      user = await prisma.user.update({
        where: { email: userEmail },
        data: { supabaseUserId: supabaseUser.id },
      });
      return user; // Existing user — skip signup bonus & referral
    }
    throw err; // Re-throw unexpected errors
  }

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
        // Clear the cookie so it doesn't re-trigger on future logins
        cookieStore.delete("ref_code");
      }
    }
  } catch {
    // Cookie access may fail in some contexts — non-critical
  }

  return user;
}
