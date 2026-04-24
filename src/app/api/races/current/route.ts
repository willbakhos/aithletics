import { NextResponse } from "next/server";
import { RaceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Returns the race the spectator view should auto-advance to: running, else next. */
export async function GET() {
  const running = await prisma.race.findFirst({
    where: { status: RaceStatus.RUNNING },
    orderBy: { startedAt: "desc" },
  });
  if (running) return NextResponse.json({ race: running, state: "running" });

  const next = await prisma.race.findFirst({
    where: { status: RaceStatus.SCHEDULED },
    orderBy: { scheduledAt: "asc" },
  });
  if (next) return NextResponse.json({ race: next, state: "upcoming" });

  const last = await prisma.race.findFirst({
    where: { status: RaceStatus.FINISHED },
    orderBy: { finishedAt: "desc" },
  });
  return NextResponse.json({ race: last, state: last ? "finished" : "none" });
}
