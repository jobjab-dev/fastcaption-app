import { NextRequest, NextResponse } from "next/server";
import { CREDIT_PACKAGES, detectCurrency, convertPrice } from "@/app/lib/stripe";

/** Returns pricing for all packages in the user's detected currency */
export async function GET(request: NextRequest) {
  const currency = detectCurrency(request.headers.get("accept-language"));

  const packages = CREDIT_PACKAGES.map((pkg) => {
    const price = convertPrice(pkg.priceThb, currency);
    return {
      id: pkg.id,
      name: pkg.name,
      credits: pkg.credits,
      description: pkg.description,
      popular: pkg.popular,
      currency: price.currency,
      symbol: price.symbol,
      displayPrice: price.displayPrice,
      surchargePercent: price.surchargePercent,
      isTHB: price.isTHB,
    };
  });

  return NextResponse.json({ packages, currency });
}
