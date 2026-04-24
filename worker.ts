import { startRaceLoop } from "./src/server/raceLoop";

const controller = new AbortController();
process.on("SIGINT", () => controller.abort());
process.on("SIGTERM", () => controller.abort());

startRaceLoop({
  signal: controller.signal,
  tickMs: Number(process.env.RACE_LOOP_TICK_MS ?? 5000),
  raceIntervalMs: Number(process.env.RACE_INTERVAL_MS ?? 20 * 60_000),
  maxEntries: Number(process.env.MAX_RACE_ENTRIES ?? 8),
}).catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
