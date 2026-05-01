import { NextRequest, NextResponse } from "next/server";
import { addCredits } from "@/app/lib/credits";
import { createCommission } from "@/app/lib/affiliate";
import { getOmise } from "@/app/lib/omise";
import { CREDIT_PACKAGES } from "@/app/lib/stripe";

/**
 * POST /api/omise/webhook
 * Receives Omise webhook events (charge.complete, charge.create, etc.)
 * 
 * Security: We do NOT trust the webhook payload for credit amounts.
 * Instead, we verify the charge directly with Omise API and lookup
 * credits from our CREDIT_PACKAGES constant using the packageId metadata.
 */
export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    
    console.log(`[omise/webhook] Event: ${event.key}`, event.data?.id);

    // Only process successful charges
    if (event.key === "charge.complete" && event.data?.status === "successful") {
      const chargeId = event.data?.id;
      if (!chargeId || typeof chargeId !== "string" || !chargeId.startsWith("chrg_")) {
        console.error("[omise/webhook] Invalid charge ID:", chargeId);
        return NextResponse.json({ error: "Invalid charge" }, { status: 400 });
      }

      // ── CRITICAL: Verify charge directly with Omise API ──
      // Do NOT trust webhook payload — an attacker could forge it.
      const omise = getOmise();
      let verifiedCharge;
      try {
        verifiedCharge = await omise.charges.retrieve(chargeId);
      } catch (e) {
        console.error("[omise/webhook] Failed to verify charge with Omise API:", e);
        return NextResponse.json({ error: "Charge verification failed" }, { status: 400 });
      }

      // Confirm the charge is actually successful
      if (verifiedCharge.status !== "successful") {
        console.log(`[omise/webhook] Charge ${chargeId} status is ${verifiedCharge.status}, skipping`);
        return NextResponse.json({ received: true });
      }

      const metadata = verifiedCharge.metadata || {};
      const userId = metadata.userId;
      const packageId = metadata.packageId || "unknown";

      // ── CRITICAL: Lookup credits from our server-side package list ──
      // Do NOT use metadata.credits — attacker could set any value.
      const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
      if (!pkg) {
        console.error(`[omise/webhook] Unknown packageId: ${packageId}`);
        return NextResponse.json({ error: "Unknown package" }, { status: 400 });
      }

      // Verify the amount matches what we expect (in satang)
      const expectedAmount = pkg.priceThb * 100; // THB to satang
      if (verifiedCharge.amount !== expectedAmount) {
        console.error(`[omise/webhook] Amount mismatch: charge=${verifiedCharge.amount} expected=${expectedAmount}`);
        return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
      }

      const credits = pkg.credits;

      if (userId && credits > 0) {
        const txDescription = `Purchased ${packageId}: ${credits.toLocaleString()} credits (via Omise ${verifiedCharge.source?.type || "unknown"})`;
        
        const { added } = await addCredits(
          userId,
          credits,
          "purchase",
          txDescription,
          chargeId // Omise charge ID as reference (dedup key)
        );

        if (!added) {
          console.log(`[omise/webhook] Duplicate webhook skipped for ${chargeId}`);
        } else {
          console.log(`[omise/webhook] ✅ Added ${credits} credits to user ${userId} via ${verifiedCharge.source?.type}`);

          // Create affiliate commission if user was referred (20% of credits)
          try {
            const commission = await createCommission(userId, chargeId, credits);
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
