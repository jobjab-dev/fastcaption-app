import { NextRequest, NextResponse } from "next/server";
import { trackClick } from "@/app/lib/affiliate";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!code || !code.startsWith("FC-")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Track the click
  const result = await trackClick(
    code,
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    request.headers.get("user-agent")
  );

  // Set cookie and redirect to login
  const loginUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(loginUrl);

  if (result) {
    response.cookies.set("ref_code", code, {
      maxAge: result.cookieDurationDays * 24 * 60 * 60, // 30 days
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }

  return response;
}
