import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getUserCredits } from "@/app/lib/credits";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const credits = await getUserCredits(session.user.id);
  return NextResponse.json({ credits });
}
