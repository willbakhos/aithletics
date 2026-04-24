import { Prisma, RaceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  baselineAttributes,
  type AttributeKey,
  ATTRIBUTE_KEYS,
  type Attributes,
} from "@/sim/attributes";
import { rollConditions } from "@/sim/conditions";
import { simulateHeat, type RaceEntryInput } from "@/sim/race";

export const DEFAULT_RACE_INTERVAL_MS = 20 * 60_000;
export const DEFAULT_MAX_ENTRIES = 8;

/**
 * Hydrate a free-form attributes JSON blob into a fully populated Attributes
 * vector, filling any missing key with the baseline value. This keeps the sim
 * safe even if a stored row was written before an attribute was added.
 */
export function hydrateAttributes(raw: unknown): Attributes {
  const base = baselineAttributes();
  if (!raw || typeof raw !== "object") return base;
  const out = { ...base };
  for (const key of ATTRIBUTE_KEYS) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      out[key as AttributeKey] = v;
    }
  }
  return out;
}

export interface SelectionResult {
  aithleteId: string;
  name: string;
  attributes: Attributes;
  snapshotId: string;
}

/**
 * Pick up to `max` entrants for a race, rotating across aithletes to spread
 * starts evenly. Uses `totalRaces` asc as the rotation key — the aithletes
 * who've raced the fewest times go first. Ties broken by createdAt asc.
 */
export async function selectEntrants(max: number): Promise<SelectionResult[]> {
  const aithletes = await prisma.aithlete.findMany({
    orderBy: [{ totalRaces: "asc" }, { createdAt: "asc" }],
    take: max,
    include: {
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return aithletes.map((a) => {
    const snap = a.snapshots[0];
    return {
      aithleteId: a.id,
      name: a.name,
      attributes: hydrateAttributes(snap?.attributesJson ?? a.attributesJson),
      snapshotId: snap?.id ?? "",
    };
  });
}

export interface OrchestratorOptions {
  raceIntervalMs?: number;
  maxEntries?: number;
  now?: () => Date;
}

/**
 * Execute a scheduled race end-to-end: lock entrants, simulate, persist
 * entries, bump stats, schedule the next race. Designed to be idempotent per
 * race id (guarded by status transitions) so double-invocations are safe.
 */
export async function runRace(raceId: string, opts: OrchestratorOptions = {}): Promise<void> {
  const maxEntries = opts.maxEntries ?? DEFAULT_MAX_ENTRIES;

  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) throw new Error(`race ${raceId} not found`);
  if (race.status !== RaceStatus.SCHEDULED) {
    // already running, finished, or failed — don't re-enter
    return;
  }

  const transitioned = await prisma.race.updateMany({
    where: { id: raceId, status: RaceStatus.SCHEDULED },
    data: { status: RaceStatus.RUNNING, startedAt: new Date() },
  });
  if (transitioned.count === 0) return; // lost the race to another worker

  try {
    const entrants = await selectEntrants(maxEntries);
    if (entrants.length === 0) {
      await prisma.race.update({
        where: { id: raceId },
        data: {
          status: RaceStatus.FAILED,
          finishedAt: new Date(),
        },
      });
      return;
    }

    const conditions = rollConditions(race.seed);
    const shuffled = rotateLanes(entrants, race.seed);
    const inputs: RaceEntryInput[] = shuffled.map((e, lane) => ({
      aithleteId: e.aithleteId,
      name: e.name,
      lane,
      attributes: e.attributes,
    }));

    const result = simulateHeat(race.id, race.seed, conditions, inputs);

    await prisma.$transaction(async (tx) => {
      for (const entry of result.entries) {
        await tx.raceEntry.create({
          data: {
            raceId: race.id,
            aithleteId: entry.aithleteId,
            lane: entry.lane,
            finishTimeMs: entry.summary.finishTimeMs,
            performanceLogJson: {
              summary: entry.summary,
              keyframes: keyframesOnly(entry.frames),
              frames: entry.frames,
              placement: entry.placement,
            } as unknown as Prisma.InputJsonValue,
          },
        });
        await tx.aithlete.update({
          where: { id: entry.aithleteId },
          data: {
            totalRaces: { increment: 1 },
            wins: entry.placement === 1 ? { increment: 1 } : undefined,
          },
        });
      }
      await tx.race.update({
        where: { id: race.id },
        data: {
          status: RaceStatus.FINISHED,
          finishedAt: new Date(),
          conditionsJson: conditions as unknown as Prisma.InputJsonValue,
        },
      });
    });
  } catch (err) {
    await prisma.race.update({
      where: { id: raceId },
      data: { status: RaceStatus.FAILED, finishedAt: new Date() },
    });
    throw err;
  }
}

export async function ensureNextRaceScheduled(
  opts: OrchestratorOptions = {},
): Promise<void> {
  const intervalMs = opts.raceIntervalMs ?? DEFAULT_RACE_INTERVAL_MS;
  const now = (opts.now ?? (() => new Date()))();

  const upcoming = await prisma.race.count({
    where: { status: RaceStatus.SCHEDULED, scheduledAt: { gte: now } },
  });
  if (upcoming > 0) return;

  const lastRace = await prisma.race.findFirst({
    orderBy: { scheduledAt: "desc" },
  });
  const base = lastRace ? lastRace.scheduledAt.getTime() : now.getTime();
  const target = Math.max(base + intervalMs, now.getTime() + 5_000);
  const scheduledAt = new Date(target);

  await prisma.race.create({
    data: {
      scheduledAt,
      seed: `race-${scheduledAt.toISOString()}`,
    },
  });
}

/**
 * Run every race whose scheduled time has passed, then ensure one more
 * upcoming race exists. Called from the worker loop or a cron hit.
 */
export async function runDueRaces(opts: OrchestratorOptions = {}): Promise<number> {
  const now = (opts.now ?? (() => new Date()))();
  const due = await prisma.race.findMany({
    where: { status: RaceStatus.SCHEDULED, scheduledAt: { lte: now } },
    orderBy: { scheduledAt: "asc" },
  });
  for (const race of due) {
    try {
      await runRace(race.id, opts);
    } catch (err) {
      console.error(`[orchestrator] race ${race.id} failed:`, err);
    }
  }
  await ensureNextRaceScheduled(opts);
  return due.length;
}

function rotateLanes<T>(items: T[], seed: string): T[] {
  const h = hashString(seed) >>> 0;
  const offset = h % Math.max(1, items.length);
  return items.slice(offset).concat(items.slice(0, offset));
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h;
}

function keyframesOnly<T extends { t: number }>(frames: T[]): T[] {
  const count = 20;
  if (frames.length <= count) return frames;
  const step = (frames.length - 1) / (count - 1);
  const out: T[] = [];
  for (let i = 0; i < count; i++) out.push(frames[Math.round(i * step)]);
  return out;
}
