import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { opaqueId, category, explanation } = await req.json().catch(() => ({}));

    if (!opaqueId || typeof opaqueId !== "string") {
      return NextResponse.json({ error: "Invalid card ID." }, { status: 400 });
    }

    const card = await prisma.careerAtlasCard.findUnique({
      where: { opaqueId },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found." }, { status: 404 });
    }

    await prisma.careerAtlasReport.create({
      data: {
        cardId: card.id,
        category: category || "other",
        explanation: explanation ? String(explanation).slice(0, 500) : null,
      },
    });

    return NextResponse.json({ ok: true, message: "Report received. Thank you for keeping our community safe." });
  } catch (err) {
    console.error("Report card error:", err);
    return NextResponse.json({ error: "Failed to submit report." }, { status: 500 });
  }
}
