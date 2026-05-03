import { NextRequest, NextResponse } from "next/server";
import { CREDIT_PACKAGES, detectCurrency, convertPrice } from "@/app/lib/stripe";

/** Returns pricing for all packages in the user's detected currency */
export async function GET(request: NextRequest) {
  // Priority: query param → cookie → Accept-Language header
  const localeParam = request.nextUrl.searchParams.get("locale");
  const localeCookie = request.cookies.get("fastcaption-locale")?.value;
  const explicitLocale = localeParam || localeCookie;
  const isThai = explicitLocale
    ? explicitLocale === "th"
    : request.headers.get("accept-language")?.includes("th");

  // Thai locale → show THB (no surcharge), otherwise detect or default USD
  const currency = explicitLocale
    ? (explicitLocale === "th" ? "thb" as const : "usd" as const)
    : detectCurrency(request.headers.get("accept-language"));

  const packages = CREDIT_PACKAGES.map((pkg) => {
    const price = convertPrice(pkg, currency);
    // Crypto always shows in USD — same price as card/USD (with surcharge)
    const usdPrice = convertPrice(pkg, "usd");
    return {
      id: pkg.id,
      name: pkg.name,
      credits: pkg.credits,
      description: isThai ? pkg.descTh : pkg.description,
      popular: pkg.popular,
      currency: price.currency,
      symbol: price.symbol,
      displayPrice: price.displayPrice,
      surchargePercent: price.surchargePercent,
      isTHB: price.isTHB,
      cryptoPriceUsd: usdPrice.displayPrice,
    };
  });

  return NextResponse.json({ packages, currency });
}
