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

// --- Credit Packages (base price in THB) ---

export const CREDIT_PACKAGES = [
  {
    id: "starter",
    name: "Starter",
    credits: 10000,
    priceThb: 99,
    description: "≈ 50 min",
    descTh: "≈ 50 นาที",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    credits: 50000,
    priceThb: 399,
    description: "≈ 4 hrs",
    descTh: "≈ 4 ชั่วโมง",
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    credits: 200000,
    priceThb: 1299,
    description: "≈ 16 hrs",
    descTh: "≈ 16 ชั่วโมง",
    popular: false,
  },
] as const;

export type CreditPackage = (typeof CREDIT_PACKAGES)[number];

// --- Multi-Currency (+5% surcharge for non-THB) ---

const SURCHARGE = 0.05; // 5%

// Approximate THB → foreign exchange rates (update periodically)
// 1 THB ≈ X foreign currency
const EXCHANGE_RATES: Record<string, { rate: number; symbol: string; decimals: number }> = {
  thb: { rate: 1, symbol: "฿", decimals: 2 },
  usd: { rate: 0.029, symbol: "$", decimals: 2 },
  eur: { rate: 0.026, symbol: "€", decimals: 2 },
  gbp: { rate: 0.023, symbol: "£", decimals: 2 },
  jpy: { rate: 4.3, symbol: "¥", decimals: 0 },
  krw: { rate: 39.5, symbol: "₩", decimals: 0 },
  cny: { rate: 0.21, symbol: "¥", decimals: 2 },
  sgd: { rate: 0.038, symbol: "S$", decimals: 2 },
  myr: { rate: 0.13, symbol: "RM", decimals: 2 },
  idr: { rate: 465, symbol: "Rp", decimals: 0 },
  vnd: { rate: 730, symbol: "₫", decimals: 0 },
  php: { rate: 1.62, symbol: "₱", decimals: 2 },
  inr: { rate: 2.44, symbol: "₹", decimals: 2 },
};

export type SupportedCurrency = keyof typeof EXCHANGE_RATES;

/** Map Accept-Language to currency */
const LANG_TO_CURRENCY: Record<string, SupportedCurrency> = {
  th: "thb", en: "usd", "en-us": "usd", "en-gb": "gbp",
  ja: "jpy", ko: "krw", zh: "cny", "zh-cn": "cny", "zh-tw": "usd",
  vi: "vnd", id: "idr", ms: "myr", hi: "inr",
  de: "eur", fr: "eur", es: "eur", pt: "eur", it: "eur", nl: "eur",
  "fil": "php", tl: "php",
};

/** Detect currency from Accept-Language header */
export function detectCurrency(acceptLanguage: string | null): SupportedCurrency {
  if (!acceptLanguage) return "thb";
  const langs = acceptLanguage.toLowerCase().split(",").map(l => l.split(";")[0].trim());
  for (const lang of langs) {
    if (LANG_TO_CURRENCY[lang]) return LANG_TO_CURRENCY[lang];
    const base = lang.split("-")[0];
    if (LANG_TO_CURRENCY[base]) return LANG_TO_CURRENCY[base];
  }
  return "usd"; // default for unrecognized = USD
}

/** Convert THB price to target currency, +5% surcharge if non-THB */
export function convertPrice(priceThb: number, currency: SupportedCurrency) {
  const info = EXCHANGE_RATES[currency] || EXCHANGE_RATES.thb;
  const isTHB = currency === "thb";
  const surcharge = isTHB ? 1 : (1 + SURCHARGE);
  const rawPrice = priceThb * info.rate * surcharge;

  // Stripe smallest unit: satang for THB, cents for USD/EUR, yen for JPY
  // THB and other 2-decimal currencies → multiply by 100
  // Zero-decimal currencies (JPY, KRW, VND, IDR) → use raw value
  const stripeAmount = info.decimals === 0
    ? Math.ceil(rawPrice)
    : Math.ceil(rawPrice * 100);

  // Display price (human readable)
  // THB: show as integer (฿99 not ฿99.00)
  // Other 2-decimal: show 2 decimals ($2.99)
  // Zero-decimal: show integer (¥430)
  let displayPrice: string;
  if (isTHB) {
    displayPrice = Math.ceil(rawPrice).toLocaleString();
  } else if (info.decimals === 0) {
    displayPrice = Math.ceil(rawPrice).toLocaleString();
  } else {
    displayPrice = rawPrice.toFixed(2);
  }

  return {
    currency,
    stripeAmount,       // for Stripe unit_amount
    displayPrice,       // for UI
    symbol: info.symbol,
    isTHB,
    surchargePercent: isTHB ? 0 : SURCHARGE * 100,
  };
}

/** Get Stripe payment methods based on currency.
 * 
 * Google Pay & Apple Pay are automatically enabled when "card" is included.
 * Stripe shows only methods available in the customer's region.
 */
export function getPaymentMethods(currency: SupportedCurrency): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  switch (currency) {
    case "thb":
      return ["card", "promptpay"];
    case "jpy":
      return ["card", "alipay"];
    case "cny":
      return ["card", "alipay", "wechat_pay"];
    case "eur":
      return ["card", "bancontact", "ideal", "sofort"];
    case "sgd":
    case "myr":
      return ["card", "alipay", "grabpay"];
    default:
      return ["card"];
  }
}

