import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/lib/auth-helpers";
import { CREDIT_PACKAGES } from "@/app/lib/stripe";
import { createOmiseCharge, type OmiseSourceType } from "@/app/lib/omise";

/**
 * POST /api/omise/checkout
 * Creates an Omise charge for Thai payment methods.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { packageId, paymentMethod } = await request.json();

    // Find package
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    }

    // Omise uses satang (1 THB = 100 satang)
    const amountSatang = pkg.priceThb * 100;
    const origin = request.headers.get("origin") || "http://localhost:3000";

    const result = await createOmiseCharge({
      amount: amountSatang,
      sourceType: paymentMethod as OmiseSourceType,
      description: `FastCaption ${pkg.name} — ${pkg.credits.toLocaleString()} credits`,
      returnUri: `${origin}/dashboard?payment=success&credits=${pkg.credits}`,
      metadata: {
        userId: user.id,
        credits: String(pkg.credits),
        packageId: pkg.id,
        priceThb: String(pkg.priceThb),
      },
    });

    // Return authorize URI for redirect/app_redirect flows
    // Or QR code data for offline flows (PromptPay)
    return NextResponse.json({
      chargeId: result.chargeId,
      authorizeUri: result.authorizeUri,
      status: result.status,
      source: result.source,
    });
  } catch (error) {
    console.error("[omise/checkout] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
