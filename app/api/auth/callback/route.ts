import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      console.error("[auth/callback] Supabase client is null — env vars not configured");
      return NextResponse.redirect(`${origin}/login?error=config_error`);
    }
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession error:", error.message, error);
    }
    if (!error) {
      // Import here to avoid circular dependency
      const { ensureUserExists } = await import("@/app/lib/auth-helpers");
      await ensureUserExists();
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  } else {
    console.error("[auth/callback] No code in URL params");
  }

  // Auth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
