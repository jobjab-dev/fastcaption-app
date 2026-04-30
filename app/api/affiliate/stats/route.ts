import { NextResponse } from "next/server";
import { getAuthUser } from "@/app/lib/auth-helpers";
import { getAffiliateStats } from "@/app/lib/affiliate";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await getAffiliateStats(user.id);
    if (!stats) {
      return NextResponse.json({ active: false });
    }
    return NextResponse.json({ active: true, ...stats });
  } catch (error) {
    console.error("Affiliate stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
