import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const race = await prisma.race.findUnique({
    where: { id },
    include: {
      entries: {
        orderBy: { lane: "asc" },
        include: { aithlete: { select: { id: true, name: true, chosenModel: true } } },
      },
    },
  });
  if (!race) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(race);
}
