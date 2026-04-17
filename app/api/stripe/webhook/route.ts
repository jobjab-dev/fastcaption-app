import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/app/lib/stripe";
import { addCredits } from "@/app/lib/credits";

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

    if (userId && credits > 0) {
      await addCredits(
        userId,
        credits,
        "purchase",
        `Purchased ${packageId}: ${credits.toLocaleString()} credits`,
        session.payment_intent as string
      );
      console.log(`[stripe] Added ${credits} credits to user ${userId}`);
    }
  }

  return NextResponse.json({ received: true });
}
