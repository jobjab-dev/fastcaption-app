import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// --- Credit Packages (fixed prices in THB and USD) ---

export const CREDIT_PACKAGES = [
  {
    id: "starter",
    name: "Starter",
    credits: 10000,
    priceThb: 99,
    priceUsd: 2.99,
    description: "≈ 50 min",
    descTh: "≈ 50 นาที",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    credits: 50000,
    priceThb: 399,
    priceUsd: 9.99,
    description: "≈ 4 hrs",
    descTh: "≈ 4 ชั่วโมง",
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    credits: 200000,
    priceThb: 1299,
    priceUsd: 29.99,
    description: "≈ 16 hrs",
    descTh: "≈ 16 ชั่วโมง",
    popular: false,
  },
] as const;

export type CreditPackage = (typeof CREDIT_PACKAGES)[number];

// --- Pricing: THB for Thai users, USD for everyone else ---
// Stripe handles currency conversion on the user's bank side.

export type SupportedCurrency = "thb" | "usd";

/** Detect currency from locale: Thai → THB, everyone else → USD */
export function detectCurrency(acceptLanguage: string | null): SupportedCurrency {
  if (!acceptLanguage) return "thb";
  const langs = acceptLanguage.toLowerCase().split(",").map(l => l.split(";")[0].trim());
  for (const lang of langs) {
    if (lang === "th" || lang.startsWith("th-")) return "thb";
  }
  return "usd";
}

/** Get the fixed price for a package in the given currency */
export function convertPrice(pkg: CreditPackage, currency: SupportedCurrency) {
  const isTHB = currency === "thb";

  if (isTHB) {
    return {
      currency: "thb" as const,
      stripeAmount: pkg.priceThb * 100, // satang
      displayPrice: pkg.priceThb.toLocaleString(),
      symbol: "฿",
      isTHB: true,
      surchargePercent: 0,
    };
  }

  // USD — fixed price, no conversion
  return {
    currency: "usd" as const,
    stripeAmount: Math.round(pkg.priceUsd * 100), // cents
    displayPrice: pkg.priceUsd.toFixed(2),
    symbol: "$",
    isTHB: false,
    surchargePercent: 0,
  };
}

/** Get Stripe payment methods based on currency.
 * 
 * Google Pay & Apple Pay are automatically enabled when "card" is included.
 * Stripe shows only methods available in the customer's region.
 */
export function getPaymentMethods(currency: SupportedCurrency): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  if (currency === "thb") {
    return ["card", "promptpay"];
  }
  return ["card"];
}


