import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/app/lib/stripe";
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
    const credits = parseInt(session.metadata?.credits || "0");
    const packageId = session.metadata?.packageId || "unknown";
    const priceThb = parseFloat(session.metadata?.priceThb || "0");

    if (userId && credits > 0) {
      const txDescription = `Purchased ${packageId}: ${credits.toLocaleString()} credits`;
      await addCredits(
        userId,
        credits,
        "purchase",
        txDescription,
        session.payment_intent as string
      );
      console.log(`[stripe] Added ${credits} credits to user ${userId}`);

      // Create affiliate commission if user was referred (20% of purchased credits)
      if (credits > 0) {
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

