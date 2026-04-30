import { NextResponse } from "next/server";
import { ensureUserExists } from "@/app/lib/auth-helpers";

/**
 * POST /api/auth/ensure-user
 * Called client-side after phone OTP verification to create the DB user record.
 * OAuth flows handle this in the /api/auth/callback route instead.
 */
export async function POST() {
  try {
    const user = await ensureUserExists();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ ok: true, userId: user.id });
  } catch (err) {
    console.error("[ensure-user] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
