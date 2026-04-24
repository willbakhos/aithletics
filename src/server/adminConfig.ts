import { DEFAULT_MAX_ENTRIES, DEFAULT_RACE_INTERVAL_MS } from "./orchestrator";

export interface AdminConfig {
  raceIntervalMs: number;
  coachingWindowMs: number;
  maxEntries: number;
  paused: boolean;
}

// In-memory store for MVP admin config. Restart resets to env defaults — fine
// for single-process deployments; a future DB-backed version can replace this.
let current: AdminConfig | null = null;

function envDefaults(): AdminConfig {
  return {
    raceIntervalMs: Number(process.env.RACE_INTERVAL_MS ?? DEFAULT_RACE_INTERVAL_MS),
    coachingWindowMs: Number(process.env.COACHING_WINDOW_MS ?? 15 * 60_000),
    maxEntries: Number(process.env.MAX_RACE_ENTRIES ?? DEFAULT_MAX_ENTRIES),
    paused: false,
  };
}

export async function getAdminConfig(): Promise<AdminConfig> {
  if (!current) current = envDefaults();
  return current;
}

export async function updateAdminConfig(
  patch: Partial<AdminConfig>,
): Promise<AdminConfig> {
  const cfg = await getAdminConfig();
  current = {
    ...cfg,
    ...Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    ),
  } as AdminConfig;
  return current;
}
