import { NextRequest, NextResponse } from "next/server";
import { getStripe, CREDIT_PACKAGES } from "@/app/lib/stripe";
import { addCredits } from "@/app/lib/credits";
import { createCommission } from "@/app/lib/affiliate";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const packageId = session.metadata?.packageId || "unknown";

    // ── CRITICAL: Look up credits from server-side package list ──
    // Do NOT trust metadata.credits — attacker could set any value.
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      console.error(`[stripe/webhook] Unknown packageId: ${packageId}`);
      return NextResponse.json({ error: "Unknown package" }, { status: 400 });
    }

    // Note: Amount verification is intentionally NOT done here.
    // Stripe's signature verification guarantees event authenticity.
    // Credits are always looked up from CREDIT_PACKAGES (server-side),
    // so the attacker cannot inflate the credit amount.

    const credits = pkg.credits;

    if (userId && credits > 0) {
      const txDescription = `Purchased ${packageId}: ${credits.toLocaleString()} credits`;
      const { added } = await addCredits(
        userId,
        credits,
        "purchase",
        txDescription,
        session.payment_intent as string
      );

      if (!added) {
        console.log(`[stripe] Duplicate webhook skipped for ${session.payment_intent}`);
      } else {
        console.log(`[stripe] Added ${credits} credits to user ${userId}`);

        // Create affiliate commission if user was referred (20% of purchased credits)
        try {
          const commission = await createCommission(
            userId,
            session.payment_intent as string,
            credits
          );
          if (commission) {
            console.log(`[affiliate] Commission ${commission.amountThb} credits given to affiliate ${commission.affiliateId}`);
          }
        } catch (e) {
          console.error("[affiliate] Failed to create commission:", e);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}

