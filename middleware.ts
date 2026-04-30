import { type NextRequest } from "next/server";
import { updateSession } from "@/app/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  // ── Geo-based locale detection (Vercel provides x-vercel-ip-country) ──
  const country = request.headers.get("x-vercel-ip-country");
  const hasLocalePref = request.cookies.has("fastcaption-locale");

  // Only set geo-locale cookie if user hasn't manually chosen a language
  if (!hasLocalePref && country) {
    const geoLocale = country === "TH" ? "th" : "en";
    response.cookies.set("geo-locale", geoLocale, {
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day — re-check daily
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     * - API webhooks (no auth needed)
     */
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/webhooks|api/stripe/webhook|api/omise/webhook|api/crypto/webhook).*)",
  ],
};
