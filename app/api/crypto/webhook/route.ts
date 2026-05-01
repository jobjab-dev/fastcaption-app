import { NextRequest, NextResponse } from "next/server";
import { verifyNowPaymentsSignature } from "@/app/lib/nowpayments";
import { addCredits } from "@/app/lib/credits";
import { createCommission } from "@/app/lib/affiliate";
import { CREDIT_PACKAGES } from "@/app/lib/stripe";

/**
 * POST /api/crypto/webhook
 * Receives NOWPayments IPN (Instant Payment Notification) callbacks.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signature = request.headers.get("x-nowpayments-sig") || "";

    // Verify signature
    if (!verifyNowPaymentsSignature(body, signature)) {
      console.error("[crypto/webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    console.log(`[crypto/webhook] Status: ${body.payment_status}, Order: ${body.order_id}`);

    // Only process finished payments
    if (body.payment_status === "finished" || body.payment_status === "confirmed") {
      const orderId = body.order_id as string; // format: userId_packageId_timestamp
      const parts = orderId.split("_");
      
      if (parts.length >= 3) {
        const userId = parts[0];
        const packageId = parts[1];
        
        // Find package to get credits
        const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
        if (pkg && userId) {
          const paymentRef = `nowpay_${body.payment_id}`;
          const txDescription = `Purchased ${packageId}: ${pkg.credits.toLocaleString()} credits (via Crypto ${body.pay_currency || "unknown"})`;
          
          const { added } = await addCredits(
            userId,
            pkg.credits,
            "purchase",
            txDescription,
            paymentRef // NOWPayments payment ID as dedup key
          );

          if (!added) {
            console.log(`[crypto/webhook] Duplicate webhook skipped for ${paymentRef}`);
          } else {
            console.log(`[crypto/webhook] ✅ Added ${pkg.credits} credits to user ${userId} via ${body.pay_currency}`);

            // Create affiliate commission if user was referred (20% of credits)
            try {
              const commission = await createCommission(userId, paymentRef, pkg.credits);
              if (commission) {
                console.log(`[affiliate] Commission ${commission.amountThb} credits given to affiliate ${commission.affiliateId}`);
              }
            } catch (e) {
              console.error("[affiliate] Failed to create commission:", e);
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[crypto/webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
