import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/lib/auth-helpers";
import { prisma } from "@/app/lib/db";
import crypto from "crypto";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        key: true,
        createdAt: true,
        lastUsed: true,
      },
    });

    // Mask keys for display: keep first 4 and last 4, e.g., fc-XXXX...XXXX
    const maskedKeys = apiKeys.map(k => ({
      ...k,
      key: k.key.length > 12 ? `${k.key.substring(0, 6)}...${k.key.substring(k.key.length - 4)}` : "fc-hidden",
      fullKey: null, // Full key is only returned on creation
    }));

    return NextResponse.json({ apiKeys: maskedKeys });
  } catch (error) {
    console.error("[api-keys] GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name = "Default Key" } = await request.json().catch(() => ({}));
    
    // Check limit (e.g. max 5 keys per user)
    const count = await prisma.apiKey.count({ where: { userId: user.id } });
    if (count >= 5) {
      return NextResponse.json({ error: "You can only have up to 5 API keys." }, { status: 400 });
    }

    // Generate a secure key: fc- (fastcaption) + 32 random hex chars
    const randomBytes = crypto.randomBytes(16).toString("hex");
    const newKeyString = `fc-${randomBytes}`;

    const newKey = await prisma.apiKey.create({
      data: {
        key: newKeyString,
        name: name.trim().substring(0, 50) || "Default Key",
        userId: user.id,
      },
    });

    return NextResponse.json({ 
      apiKey: {
        id: newKey.id,
        name: newKey.name,
        key: newKey.key, // Only returned fully once on creation!
        createdAt: newKey.createdAt,
        lastUsed: newKey.lastUsed,
      } 
    });
  } catch (error) {
    console.error("[api-keys] POST Error:", error);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await request.json().catch(() => ({}));
    if (!id) {
      return NextResponse.json({ error: "Missing key ID" }, { status: 400 });
    }

    // Delete only if it belongs to the user
    await prisma.apiKey.deleteMany({
      where: {
        id: id,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api-keys] DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 });
  }
}
