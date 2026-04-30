import { NextResponse } from "next/server";
import { getAuthUser } from "@/app/lib/auth-helpers";
import { getUserCredits } from "@/app/lib/credits";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const credits = await getUserCredits(user.id);
  return NextResponse.json({ credits });
}
