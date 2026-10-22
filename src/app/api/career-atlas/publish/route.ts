import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user-auth";

const GUEST_OWNER_COOKIE = "cr_atlas_owner";

function generateOpaqueId(): string {
  // 10 chars base36 string e.g. "k8m2q7x9w1"
  return crypto.randomBytes(6).toString("hex").slice(0, 10);
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { storyType, profession, displayName, headline, role, avatarUrl, theme, aspectRatio, publicPayload } = body;

    if (!displayName || typeof displayName !== "string" || displayName.trim().length === 0) {
      return NextResponse.json({ error: "Display name is required." }, { status: 400 });
    }

    if (!storyType || !["journey", "footprint", "memory"].includes(storyType)) {
      return NextResponse.json({ error: "Valid story type is required." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const currentUser = await getCurrentUser().catch(() => null);

    let guestToken = cookieStore.get(GUEST_OWNER_COOKIE)?.value;
    let guestTokenHash: string | undefined;

    if (!currentUser) {
      if (!guestToken) {
        guestToken = crypto.randomBytes(24).toString("hex");
      }
      guestTokenHash = hashToken(guestToken);
    }

    const opaqueId = generateOpaqueId();

    const card = await prisma.careerAtlasCard.create({
      data: {
        opaqueId,
        userId: currentUser?.id ?? null,
        guestTokenHash: guestTokenHash ?? null,
        storyType,
        profession: profession || "other",
        displayName: displayName.trim().slice(0, 60),
        headline: headline ? String(headline).trim().slice(0, 100) : null,
        role: role ? String(role).trim().slice(0, 80) : null,
        avatarUrl: avatarUrl || null,
        publicPayload: publicPayload || {},
        theme: theme || "midnight",
        aspectRatio: aspectRatio || "portrait",
        status: "active",
      },
    });

    const response = NextResponse.json({
      ok: true,
      opaqueId: card.opaqueId,
      shareUrl: `/career-atlas/s/${card.opaqueId}`,
    });

    // Set guest owner cookie if guest
    if (!currentUser && guestToken) {
      response.cookies.set(GUEST_OWNER_COOKIE, guestToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 365 * 24 * 60 * 60, // 1 year
      });
    }

    return response;
  } catch (err) {
    console.error("Publish Atlas Card Error:", err);
    return NextResponse.json({ error: "Failed to publish Career Atlas card." }, { status: 500 });
  }
}
