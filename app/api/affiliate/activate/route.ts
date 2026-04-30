import { NextResponse } from "next/server";
import { getAuthUser } from "@/app/lib/auth-helpers";
import { activateAffiliate } from "@/app/lib/affiliate";

export async function POST() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await activateAffiliate(user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Affiliate activation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Activation failed" },
      { status: 500 }
    );
  }
}
