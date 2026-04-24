import type { Attributes } from "./attributes";
import type { Conditions } from "./conditions";
import type { Frame, SimSummary } from "./engine";
import { simulateRace } from "./engine";

export interface RaceEntryInput {
  aithleteId: string;
  name: string;
  attributes: Attributes;
  lane: number;
}

export interface RaceEntryResult {
  aithleteId: string;
  name: string;
  lane: number;
  frames: Frame[];
  summary: SimSummary;
  placement: number;
}

export interface SimulatedRace {
  raceId: string;
  seed: string;
  conditions: Conditions;
  entries: RaceEntryResult[];
  durationMs: number;
}

export function simulateHeat(
  raceId: string,
  seed: string,
  conditions: Conditions,
  entries: RaceEntryInput[],
): SimulatedRace {
  const results = entries.map((entry) => {
    const sim = simulateRace({
      attributes: entry.attributes,
      conditions,
      seed: `${seed}:lane-${entry.lane}`,
    });
    return {
      aithleteId: entry.aithleteId,
      name: entry.name,
      lane: entry.lane,
      frames: sim.frames,
      summary: sim.summary,
    };
  });

  const sorted = [...results].sort((a, b) => a.summary.finishTimeMs - b.summary.finishTimeMs);
  const placements = new Map<string, number>();
  sorted.forEach((r, i) => placements.set(r.aithleteId, i + 1));

  const withPlacement: RaceEntryResult[] = results.map((r) => ({
    ...r,
    placement: placements.get(r.aithleteId) ?? 0,
  }));

  const durationMs = Math.max(...results.map((r) => r.summary.finishTimeMs));

  return {
    raceId,
    seed,
    conditions,
    entries: withPlacement,
    durationMs,
  };
}
