import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { SharedCardView } from "@/components/career-atlas/SharedCardView";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user-auth";
import type { AtlasCardDraft } from "@/lib/career-atlas/types";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const card = await prisma.careerAtlasCard.findUnique({
    where: { opaqueId: id },
  });

  if (!card || card.status !== "active") {
    return { title: "Career Atlas — Card Unavailable" };
  }

  const title = `${card.displayName}'s Career Atlas — ${card.role || "Professional Story"}`;
  const description =
    card.headline ||
    `Explore ${card.displayName}'s professional career journey, footprint and milestones on Programming Hero Career Radar.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SharedCardPage({ params }: Props) {
  const { id } = await params;

  const card = await prisma.careerAtlasCard.findUnique({
    where: { opaqueId: id },
  });

  if (!card) {
    notFound();
  }

  // Increment view counter asynchronously
  prisma.careerAtlasCard
    .update({
      where: { opaqueId: id },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {});

  // Check ownership
  const cookieStore = await cookies();
  const currentUser = await getCurrentUser().catch(() => null);
  const guestToken = cookieStore.get("cr_atlas_owner")?.value;
  const guestTokenHash = guestToken ? hashToken(guestToken) : null;

  const isUserOwner = Boolean(currentUser && card.userId === currentUser.id);
  const isGuestOwner = Boolean(guestTokenHash && card.guestTokenHash === guestTokenHash);
  const isOwner = isUserOwner || isGuestOwner;

  const draft = card.publicPayload as unknown as AtlasCardDraft;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <SharedCardView
        opaqueId={card.opaqueId}
        draft={draft}
        isOwner={isOwner}
        status={card.status}
      />
    </main>
  );
}
