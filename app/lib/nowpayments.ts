// NOWPayments — Crypto Payment Gateway
// Supports: BTC, ETH, USDT, USDC, SOL, MATIC, etc.

import crypto from "crypto";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

function getApiKey(): string {
  const key = process.env.NOWPAYMENTS_API_KEY;
  if (!key) throw new Error("NOWPAYMENTS_API_KEY is not set");
  return key;
}

/** Supported crypto coins — grouped by category */
export const SUPPORTED_COINS = [
  // ── Stablecoins (cheapest fees) ──
  { id: "usdttrc20", name: "USDT", icon: "💵", network: "TRC-20", group: "stablecoin" },
  { id: "usdterc20", name: "USDT", icon: "💵", network: "ERC-20", group: "stablecoin" },
  { id: "usdtmatic", name: "USDT", icon: "💵", network: "Polygon", group: "stablecoin" },
  { id: "usdtarb", name: "USDT", icon: "💵", network: "Arbitrum", group: "stablecoin" },
  { id: "usdtop", name: "USDT", icon: "💵", network: "Optimism", group: "stablecoin" },
  { id: "usdtbsc", name: "USDT", icon: "💵", network: "BSC", group: "stablecoin" },
  { id: "usdc", name: "USDC", icon: "🔵", network: "ERC-20", group: "stablecoin" },
  { id: "usdcmatic", name: "USDC", icon: "🔵", network: "Polygon", group: "stablecoin" },
  { id: "usdcarb", name: "USDC", icon: "🔵", network: "Arbitrum", group: "stablecoin" },
  { id: "usdcbase", name: "USDC", icon: "🔵", network: "Base", group: "stablecoin" },
  { id: "usdcop", name: "USDC", icon: "🔵", network: "Optimism", group: "stablecoin" },
  { id: "usdcbsc", name: "USDC", icon: "🔵", network: "BSC", group: "stablecoin" },
  { id: "usdtsol", name: "USDT", icon: "💵", network: "SOL", group: "stablecoin" },
  { id: "usdcsol", name: "USDC", icon: "🔵", network: "SOL", group: "stablecoin" },
  { id: "dai", name: "DAI", icon: "📀", network: "ERC-20", group: "stablecoin" },

  // ── Major Coins ──
  { id: "btc", name: "Bitcoin", icon: "₿", network: "BTC", group: "major" },
  { id: "eth", name: "Ethereum", icon: "Ξ", network: "ETH", group: "major" },
  { id: "bnbbsc", name: "BNB", icon: "💛", network: "BSC", group: "major" },
  { id: "sol", name: "Solana", icon: "◎", network: "SOL", group: "major" },
  { id: "trx", name: "TRON", icon: "⚡", network: "TRX", group: "major" },
  { id: "doge", name: "DOGE", icon: "🐕", network: "DOGE", group: "major" },
] as const;

export type SupportedCoin = (typeof SUPPORTED_COINS)[number]["id"];

/** Create a payment invoice via NOWPayments */
export async function createCryptoInvoice(params: {
  priceAmount: number; // in USD
  payCurrency: SupportedCoin;
  orderId: string;
  orderDescription: string;
  successUrl: string;
  cancelUrl: string;
  ipnCallbackUrl: string;
}) {
  const res = await fetch(`${NOWPAYMENTS_API}/invoice`, {
    method: "POST",
    headers: {
      "x-api-key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      price_amount: params.priceAmount,
      price_currency: "usd",
      pay_currency: params.payCurrency,
      order_id: params.orderId,
      order_description: params.orderDescription,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      ipn_callback_url: params.ipnCallbackUrl,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`NOWPayments API error: ${res.status} — ${error}`);
  }

  const data = await res.json();

  return {
    invoiceId: data.id as string,
    invoiceUrl: data.invoice_url as string,
    orderId: data.order_id as string,
  };
}

/** Verify NOWPayments IPN webhook signature */
export function verifyNowPaymentsSignature(
  body: Record<string, unknown>,
  signature: string
): boolean {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) return false;

  // Sort keys alphabetically and create JSON string
  const sorted = Object.keys(body)
    .sort()
    .reduce((acc: Record<string, unknown>, key) => {
      acc[key] = body[key];
      return acc;
    }, {});

  const hmac = crypto
    .createHmac("sha512", secret)
    .update(JSON.stringify(sorted))
    .digest("hex");

  return hmac === signature;
}
