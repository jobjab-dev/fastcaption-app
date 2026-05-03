import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/lib/auth-helpers";
import {
  getStripe,
  CREDIT_PACKAGES,
  detectCurrency,
  convertPrice,
  getPaymentMethods,
} from "@/app/lib/stripe";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { packageId, currency: requestedCurrency } = await request.json();

    // Find package
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    }

    // Determine currency
    const currency = requestedCurrency || detectCurrency(request.headers.get("accept-language"));
    const price = convertPrice(pkg, currency);
    const paymentMethods = getPaymentMethods(currency);

    // Create Stripe Checkout Session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: paymentMethods,
      mode: "payment",
      customer_email: user.email || undefined,
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: `FastCaption ${pkg.name} — ${pkg.credits.toLocaleString()} credits`,
              description: pkg.description,
            },
            unit_amount: price.stripeAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        credits: String(pkg.credits),
        packageId: pkg.id,
        priceThb: String(pkg.priceThb),
      },
      success_url: `${request.headers.get("origin") || "https://fastcaption.app"}/dashboard?payment=success&credits=${pkg.credits}`,
      cancel_url: `${request.headers.get("origin") || "https://fastcaption.app"}/pricing?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe/checkout] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
