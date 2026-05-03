import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/lib/auth-helpers";
import { CREDIT_PACKAGES } from "@/app/lib/stripe";
import { createCryptoInvoice, type SupportedCoin } from "@/app/lib/nowpayments";

/**
 * POST /api/crypto/checkout
 * Creates a NOWPayments invoice for crypto payments.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { packageId, coin } = await request.json();

    // Find package
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    }

    // Use fixed USD price for crypto
    const priceUsd = pkg.priceUsd;

    const origin = request.headers.get("origin") || "https://fastcaption.app";

    const result = await createCryptoInvoice({
      priceAmount: priceUsd,
      payCurrency: coin as SupportedCoin,
      orderId: `${user.id}::${pkg.id}::${Date.now()}`,
      orderDescription: `FastCaption ${pkg.name} — ${pkg.credits.toLocaleString()} credits`,
      successUrl: `${origin}/dashboard?payment=success&credits=${pkg.credits}`,
      cancelUrl: `${origin}/pricing?payment=cancelled`,
      ipnCallbackUrl: `${origin}/api/crypto/webhook`,
    });

    return NextResponse.json({
      invoiceUrl: result.invoiceUrl,
      invoiceId: result.invoiceId,
    });
  } catch (error) {
    console.error("[crypto/checkout] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
