import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user-auth";

const GUEST_OWNER_COOKIE = "cr_atlas_owner";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
  try {
    const { opaqueId } = await req.json().catch(() => ({}));

    if (!opaqueId || typeof opaqueId !== "string") {
      return NextResponse.json({ error: "Invalid card ID." }, { status: 400 });
    }

    const card = await prisma.careerAtlasCard.findUnique({
      where: { opaqueId },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found." }, { status: 404 });
    }

    const cookieStore = await cookies();
    const currentUser = await getCurrentUser().catch(() => null);
    const guestToken = cookieStore.get(GUEST_OWNER_COOKIE)?.value;
    const guestTokenHash = guestToken ? hashToken(guestToken) : null;

    const isUserOwner = currentUser && card.userId === currentUser.id;
    const isGuestOwner = guestTokenHash && card.guestTokenHash === guestTokenHash;

    if (!isUserOwner && !isGuestOwner) {
      return NextResponse.json({ error: "Unauthorized. You are not the owner of this card." }, { status: 403 });
    }

    await prisma.careerAtlasCard.update({
      where: { opaqueId },
      data: { status: "revoked" },
    });

    return NextResponse.json({ ok: true, status: "revoked" });
  } catch (err) {
    console.error("Revoke card error:", err);
    return NextResponse.json({ error: "Failed to revoke card." }, { status: 500 });
  }
}
