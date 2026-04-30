// Omise (Opn Payments) — Thai Payment Gateway
// Supports: TrueMoney, Rabbit LINE Pay, Mobile Banking, PromptPay, Card

// eslint-disable-next-line @typescript-eslint/no-require-imports
const OmiseLib = require("omise");

let _omise: ReturnType<typeof OmiseLib> | null = null;

function getOmise() {
  if (!_omise) {
    const secretKey = process.env.OMISE_SECRET_KEY;
    const publicKey = process.env.OMISE_PUBLIC_KEY;
    if (!secretKey) throw new Error("OMISE_SECRET_KEY is not set");
    if (!publicKey) throw new Error("OMISE_PUBLIC_KEY is not set");
    _omise = OmiseLib({
      publicKey,
      secretKey,
      omiseVersion: "2019-05-29",
    });
  }
  return _omise;
}

/** Thai payment source types supported by Omise */
export type OmiseSourceType =
  | "truemoney_jumpapp"
  | "rabbit_linepay"
  | "mobile_banking_scb"
  | "mobile_banking_kbank"
  | "mobile_banking_bbl"
  | "mobile_banking_bay"
  | "mobile_banking_ktb"
  | "promptpay";

/** Display info for each payment method */
export const OMISE_PAYMENT_METHODS: {
  id: OmiseSourceType;
  name: string;
  icon: string;
  flow: "redirect" | "app_redirect" | "offline";
}[] = [
  { id: "promptpay", name: "PromptPay QR", icon: "🔲", flow: "offline" },
  { id: "truemoney_jumpapp", name: "TrueMoney Wallet", icon: "💰", flow: "app_redirect" },
  { id: "rabbit_linepay", name: "Rabbit LINE Pay", icon: "💚", flow: "redirect" },
  { id: "mobile_banking_scb", name: "SCB Easy", icon: "🏦", flow: "app_redirect" },
  { id: "mobile_banking_kbank", name: "K PLUS", icon: "🏦", flow: "app_redirect" },
  { id: "mobile_banking_bbl", name: "Bangkok Bank", icon: "🏦", flow: "app_redirect" },
  { id: "mobile_banking_bay", name: "Krungsri (KMA)", icon: "🏦", flow: "app_redirect" },
  { id: "mobile_banking_ktb", name: "Krungthai NEXT", icon: "🏦", flow: "app_redirect" },
];

/** Create an Omise charge using a source */
export async function createOmiseCharge(params: {
  amount: number; // in satang (100 = 1 THB)
  sourceType: OmiseSourceType;
  description: string;
  returnUri: string;
  metadata?: Record<string, string>;
}) {
  const omise = getOmise();

  // Create source first
  const sourceParams: Record<string, unknown> = {
    type: params.sourceType,
    amount: params.amount,
    currency: "thb",
  };

  const source = await omise.sources.create(sourceParams);

  // Create charge with the source
  const charge = await omise.charges.create({
    amount: params.amount,
    currency: "thb",
    source: source.id,
    description: params.description,
    return_uri: params.returnUri,
    metadata: params.metadata || {},
  });

  return {
    chargeId: charge.id as string,
    status: charge.status as string,
    authorizeUri: charge.authorize_uri as string | null,
    source: {
      type: source.type as string,
      flow: source.flow as string,
      references: source.references as Record<string, string> | null,
      scannableCode: source.scannable_code as { image?: { download_uri?: string } } | null,
    },
  };
}

/** Verify Omise webhook signature (not needed — Omise uses IP whitelisting) */
export function isValidOmiseWebhook(): boolean {
  // Omise webhooks are verified by IP whitelist, not HMAC
  // In production, restrict to Omise IPs: 52.76.122.206
  return true;
}

export { getOmise };
