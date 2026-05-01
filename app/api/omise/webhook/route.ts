import { NextRequest, NextResponse } from "next/server";
import { addCredits } from "@/app/lib/credits";
import { createCommission } from "@/app/lib/affiliate";

/**
 * POST /api/omise/webhook
 * Receives Omise webhook events (charge.complete, charge.create, etc.)
 * 
 * Omise verifies webhooks via IP whitelist, not HMAC signature.
 * In production, restrict to Omise IPs in your firewall/proxy.
 */
export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    
    console.log(`[omise/webhook] Event: ${event.key}`, event.data?.id);

    // Only process successful charges
    if (event.key === "charge.complete" && event.data?.status === "successful") {
      const charge = event.data;
      const metadata = charge.metadata || {};
      
      const userId = metadata.userId;
      const credits = parseInt(metadata.credits || "0");
      const packageId = metadata.packageId || "unknown";
      const priceThb = parseFloat(metadata.priceThb || "0");

      if (userId && credits > 0) {
        const txDescription = `Purchased ${packageId}: ${credits.toLocaleString()} credits (via Omise ${charge.source?.type || "unknown"})`;
        
        await addCredits(
          userId,
          credits,
          "purchase",
          txDescription,
          charge.id // Omise charge ID as reference
        );

        console.log(`[omise/webhook] ✅ Added ${credits} credits to user ${userId} via ${charge.source?.type}`);

        // Create affiliate commission if user was referred (20% of credits)
        if (credits > 0) {
          try {
            const commission = await createCommission(userId, charge.id, credits);
            if (commission) {
              console.log(`[affiliate] Commission ${commission.amountThb} credits given`);
            }
          } catch (e) {
            console.error("[affiliate] Failed to create commission:", e);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[omise/webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
