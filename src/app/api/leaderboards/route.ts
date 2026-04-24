import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const aithletes = await prisma.aithlete.findMany({
    include: {
      raceEntries: {
        where: { finishTimeMs: { not: null } },
        orderBy: { finishTimeMs: "asc" },
        take: 1,
      },
      user: { select: { id: true, email: true } },
    },
  });

  const byAithlete = aithletes
    .map((a) => {
      const best = a.raceEntries[0]?.finishTimeMs ?? null;
      return {
        id: a.id,
        name: a.name,
        model: a.chosenModel,
        totalRaces: a.totalRaces,
        wins: a.wins,
        bestFinishMs: best,
        winRate: a.totalRaces > 0 ? a.wins / a.totalRaces : 0,
      };
    })
    .sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.bestFinishMs !== b.bestFinishMs) {
        return (a.bestFinishMs ?? 9e9) - (b.bestFinishMs ?? 9e9);
      }
      return b.totalRaces - a.totalRaces;
    });

  const byModel = aggregateBy(aithletes, (a) => a.chosenModel);
  const byUser = aggregateBy(
    aithletes.filter((a) => a.user),
    (a) => a.user!.email,
  );

  return NextResponse.json({ byAithlete, byModel, byUser });
}

interface AggInput {
  totalRaces: number;
  wins: number;
  raceEntries: { finishTimeMs: number | null }[];
}

function aggregateBy<T extends AggInput>(items: T[], keyFn: (t: T) => string) {
  const groups = new Map<string, { races: number; wins: number; best: number | null; count: number }>();
  for (const it of items) {
    const key = keyFn(it);
    const existing = groups.get(key) ?? { races: 0, wins: 0, best: null, count: 0 };
    existing.races += it.totalRaces;
    existing.wins += it.wins;
    existing.count += 1;
    const best = it.raceEntries[0]?.finishTimeMs ?? null;
    if (best !== null && (existing.best === null || best < existing.best)) {
      existing.best = best;
    }
    groups.set(key, existing);
  }
  return [...groups.entries()]
    .map(([key, v]) => ({
      key,
      aithleteCount: v.count,
      totalRaces: v.races,
      wins: v.wins,
      bestFinishMs: v.best,
      winRate: v.races > 0 ? v.wins / v.races : 0,
    }))
    .sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      return (a.bestFinishMs ?? 9e9) - (b.bestFinishMs ?? 9e9);
    });
}
