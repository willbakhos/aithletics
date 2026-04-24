import { NextResponse } from "next/server";
import { RaceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [upcoming, recent, running] = await Promise.all([
    prisma.race.findMany({
      where: { status: RaceStatus.SCHEDULED },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    prisma.race.findMany({
      where: { status: RaceStatus.FINISHED },
      orderBy: { finishedAt: "desc" },
      take: 10,
      include: {
        entries: {
          orderBy: { finishTimeMs: "asc" },
          include: { aithlete: { select: { id: true, name: true, chosenModel: true } } },
        },
      },
    }),
    prisma.race.findFirst({
      where: { status: RaceStatus.RUNNING },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  return NextResponse.json({ upcoming, recent, running });
}
