import { NextResponse } from "next/server";

/**
 * POST /api/auth/sync
 * Called by the client-side callback to ensure the user exists in our DB.
 */
export async function POST() {
  try {
    const { ensureUserExists } = await import("@/app/lib/auth-helpers");
    await ensureUserExists();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/auth/sync] Error:", error);
    return NextResponse.json({ ok: false, error: "sync_failed" }, { status: 500 });
  }
}
