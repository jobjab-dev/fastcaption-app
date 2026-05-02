import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/lib/auth-helpers";
import { CREDIT_PACKAGES } from "@/app/lib/stripe";
import { createOmiseCharge, OmiseSourceType } from "@/app/lib/omise";

/**
 * POST /api/omise/checkout
 * Creates an Omise charge for Thai payment methods (PromptPay, TrueMoney, etc.)
 * All prices are in THB (converted to satang for Omise API).
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

    // Validate payment method
    const validMethods: OmiseSourceType[] = [
      "promptpay", "truemoney_jumpapp", "rabbit_linepay",
      "mobile_banking_scb", "mobile_banking_kbank", "mobile_banking_bbl",
      "mobile_banking_bay", "mobile_banking_ktb",
    ];
    if (!validMethods.includes(paymentMethod as OmiseSourceType)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    // Convert THB to satang (1 THB = 100 satang)
    const amountSatang = pkg.priceThb * 100;

    const origin = request.headers.get("origin") || "https://fastcaption.app";

    const result = await createOmiseCharge({
      amount: amountSatang,
      sourceType: paymentMethod as OmiseSourceType,
      description: `FastCaption ${pkg.name} — ${pkg.credits.toLocaleString()} credits`,
      returnUri: `${origin}/dashboard?payment=success&credits=${pkg.credits}`,
      metadata: {
        userId: user.id,
        packageId: pkg.id,
        credits: String(pkg.credits),
      },
    });

    // For redirect-based payments, return the authorize URI
    if (result.authorizeUri) {
      return NextResponse.json({ authorizeUri: result.authorizeUri });
    }

    // For offline payments (PromptPay QR), return charge details
    // The frontend should show the QR code or redirect
    return NextResponse.json({
      chargeId: result.chargeId,
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
