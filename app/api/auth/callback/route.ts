import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  try {
    if (code) {
      const supabase = await createSupabaseServerClient();
      if (!supabase) {
        console.error("[auth/callback] Supabase client is null — env vars not configured");
        return NextResponse.redirect(`${origin}/login?error=config_error`);
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("[auth/callback] exchangeCodeForSession error:", error.message, error);
        return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
      }
      // Create user in DB if first login
      try {
        const { ensureUserExists } = await import("@/app/lib/auth-helpers");
        await ensureUserExists();
      } catch (dbError) {
        console.error("[auth/callback] ensureUserExists error:", dbError);
        // Still redirect — user is authenticated even if DB record fails
      }
      return NextResponse.redirect(`${origin}${redirectTo}`);
    } else {
      console.error("[auth/callback] No code in URL params");
    }
  } catch (err) {
    console.error("[auth/callback] Unexpected error:", err);
  }

  // Auth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
