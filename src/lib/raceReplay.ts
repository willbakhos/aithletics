import type { Race, RaceEntry, Aithlete } from "@prisma/client";
import type { Frame, SimSummary } from "@/sim/engine";
import type { Conditions } from "@/sim/conditions";
import type { SimulatedRace, RaceEntryResult } from "@/sim/race";

type EntryWithAithlete = RaceEntry & { aithlete: Pick<Aithlete, "id" | "name"> };

interface StoredLog {
  frames?: Frame[];
  keyframes?: Frame[];
  summary?: SimSummary;
  placement?: number;
}

export function reconstructRace(
  race: Race,
  entries: EntryWithAithlete[],
): SimulatedRace | null {
  if (!race.conditionsJson) return null;
  const conditions = race.conditionsJson as unknown as Conditions;
  const rebuilt: RaceEntryResult[] = entries.map((e) => {
    const log = (e.performanceLogJson ?? {}) as StoredLog;
    const frames = log.frames ?? log.keyframes ?? [];
    const summary: SimSummary = log.summary ?? {
      finishTimeMs: e.finishTimeMs ?? 0,
      peakSpeedMps: 0,
      reactionMs: 0,
      avgFormScore: 0,
      fatigueAtFinish: 0,
      didFinish: (e.finishTimeMs ?? 0) > 0,
    };
    return {
      aithleteId: e.aithleteId,
      name: e.aithlete.name,
      lane: e.lane,
      frames,
      summary,
      placement: log.placement ?? 0,
    };
  });
  const durationMs = Math.max(0, ...rebuilt.map((r) => r.summary.finishTimeMs));
  return {
    raceId: race.id,
    seed: race.seed,
    conditions,
    entries: rebuilt,
    durationMs,
  };
}
