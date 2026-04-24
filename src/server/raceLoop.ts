import { DEFAULT_RACE_INTERVAL_MS, DEFAULT_MAX_ENTRIES, runDueRaces } from "./orchestrator";

export interface LoopOptions {
  tickMs?: number;
  raceIntervalMs?: number;
  maxEntries?: number;
  signal?: AbortSignal;
}

/**
 * Long-running loop: every `tickMs`, run any due races and ensure the schedule
 * stays populated. Intended to run as a dedicated Node process (Railway/Render).
 */
export async function startRaceLoop(opts: LoopOptions = {}): Promise<void> {
  const tickMs = opts.tickMs ?? 5_000;
  const raceIntervalMs = opts.raceIntervalMs ?? DEFAULT_RACE_INTERVAL_MS;
  const maxEntries = opts.maxEntries ?? DEFAULT_MAX_ENTRIES;

  console.log(
    `[race-loop] starting tick=${tickMs}ms interval=${raceIntervalMs}ms max=${maxEntries}`,
  );

  while (!opts.signal?.aborted) {
    try {
      const ran = await runDueRaces({ raceIntervalMs, maxEntries });
      if (ran > 0) console.log(`[race-loop] ran ${ran} race(s)`);
    } catch (err) {
      console.error("[race-loop] tick error:", err);
    }
    await sleep(tickMs, opts.signal);
  }

  console.log("[race-loop] aborted");
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    }, { once: true });
  });
}
