import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  if (!code) {
    console.error("[auth/callback] No code in URL params");
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Build the redirect response FIRST so we can attach cookies to it
  const redirectUrl = new URL(redirectTo, origin);
  const response = NextResponse.redirect(redirectUrl);

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Read cookies from the incoming request
            return request.headers.get("cookie")
              ?.split("; ")
              .map((c) => {
                const [name, ...rest] = c.split("=");
                return { name, value: rest.join("=") };
              }) ?? [];
          },
          setAll(cookiesToSet) {
            // Attach cookies to the RESPONSE so the browser receives them
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession error:", error.message);
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

    return response;
  } catch (err) {
    console.error("[auth/callback] Unexpected error:", err);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }
}
