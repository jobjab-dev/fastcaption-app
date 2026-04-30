import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/lib/auth-helpers";
import { requestPayout } from "@/app/lib/affiliate";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { method, accountInfo } = body;

    if (!method || !accountInfo) {
      return NextResponse.json(
        { error: "method and accountInfo are required" },
        { status: 400 }
      );
    }

    if (!["bank_transfer", "promptpay"].includes(method)) {
      return NextResponse.json(
        { error: "Invalid method. Use 'bank_transfer' or 'promptpay'" },
        { status: 400 }
      );
    }

    const payout = await requestPayout(user.id, method, accountInfo);
    return NextResponse.json({ success: true, payout });
  } catch (error) {
    console.error("Payout request error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payout request failed" },
      { status: 400 }
    );
  }
}
