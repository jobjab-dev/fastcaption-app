import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/app/lib/db";

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
            return request.headers.get("cookie")
              ?.split("; ")
              .map((c) => {
                const [name, ...rest] = c.split("=");
                return { name, value: rest.join("=") };
              }) ?? [];
          },
          setAll(cookiesToSet) {
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

    // Get the user from THIS supabase client (which has the fresh session)
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    // Create user in DB if first login — using the supabase user directly
    if (supabaseUser) {
      try {
        let dbUser = await prisma.user.findUnique({
          where: { supabaseUserId: supabaseUser.id },
        });

        if (!dbUser && supabaseUser.email) {
          dbUser = await prisma.user.findUnique({
            where: { email: supabaseUser.email },
          });
          if (dbUser) {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { supabaseUserId: supabaseUser.id },
            });
          }
        }

        if (!dbUser) {
          const userEmail = supabaseUser.email || `${supabaseUser.id}@unknown.user`;
          const userName =
            supabaseUser.user_metadata?.full_name ||
            supabaseUser.user_metadata?.name ||
            supabaseUser.email?.split("@")[0] ||
            "User";

          try {
            dbUser = await prisma.user.create({
              data: {
                supabaseUserId: supabaseUser.id,
                email: userEmail,
                name: userName,
                image: supabaseUser.user_metadata?.avatar_url || null,
                credits: 5000,
              },
            });

            // Record signup bonus
            await prisma.transaction.create({
              data: {
                userId: dbUser.id,
                type: "signup_bonus",
                credits: 5000,
                description: "🎉 สมัครใหม่ — รับ credits ฟรี!",
              },
            });

            // Bind referral if ref cookie exists
            const refCookie = request.headers.get("cookie")
              ?.split("; ")
              .find((c) => c.startsWith("ref_code="));
            if (refCookie) {
              const refCode = refCookie.split("=")[1];
              const referrer = await prisma.user.findUnique({
                where: { referralCode: refCode },
              });
              if (referrer && referrer.id !== dbUser.id) {
                await prisma.user.update({
                  where: { id: dbUser.id },
                  data: { referredBy: referrer.id },
                });
                await prisma.affiliateClick.updateMany({
                  where: { code: refCode, convertedUserId: null },
                  data: { convertedUserId: dbUser.id },
                });
                // Clear ref cookie
                response.cookies.set("ref_code", "", { maxAge: 0, path: "/" });
              }
            }
          } catch (err: unknown) {
            const prismaErr = err as { code?: string };
            if (prismaErr.code === "P2002") {
              // Unique constraint — link existing account
              await prisma.user.update({
                where: { email: supabaseUser.email || "" },
                data: { supabaseUserId: supabaseUser.id },
              });
            } else {
              console.error("[auth/callback] User creation error:", err);
            }
          }
        }
      } catch (dbError) {
        console.error("[auth/callback] ensureUserExists error:", dbError);
      }
    }

    return response;
  } catch (err) {
    console.error("[auth/callback] Unexpected error:", err);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }
}
