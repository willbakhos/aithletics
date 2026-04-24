import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { baselineAttributes } from "@/sim/attributes";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const model = typeof body?.model === "string" ? body.model.trim() : "";
  if (name.length < 2 || name.length > 40) {
    return NextResponse.json({ error: "name must be 2-40 chars" }, { status: 400 });
  }
  if (!model.includes("/")) {
    return NextResponse.json(
      { error: "model must be an OpenRouter model id (e.g. openai/gpt-4o-mini)" },
      { status: 400 },
    );
  }

  const existing = await prisma.aithlete.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  if (existing.length >= 5) {
    return NextResponse.json({ error: "5 Aithletes max per user in MVP" }, { status: 400 });
  }

  const attributes = baselineAttributes();
  const aithlete = await prisma.aithlete.create({
    data: {
      userId: user.id,
      name,
      chosenModel: model,
      attributesJson: attributes,
    },
  });
  await prisma.attributeSnapshot.create({
    data: {
      aithleteId: aithlete.id,
      attributesJson: attributes,
    },
  });
  return NextResponse.json({ aithlete });
}
