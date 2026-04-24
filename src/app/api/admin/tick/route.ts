import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { runDueRaces } from "@/server/orchestrator";
import { getAdminConfig } from "@/server/adminConfig";

export const dynamic = "force-dynamic";

/**
 * Manual tick: run any due races immediately. Useful for cron deployments where
 * the orchestrator is not a long-running worker (hit this from a scheduler).
 */
export async function POST(req: Request) {
  const gate = requireAdmin(req);
  if (!gate.ok) return gate.response!;
  const cfg = await getAdminConfig();
  if (cfg.paused) return NextResponse.json({ paused: true, ran: 0 });
  const ran = await runDueRaces({
    raceIntervalMs: cfg.raceIntervalMs,
    maxEntries: cfg.maxEntries,
  });
  return NextResponse.json({ ran });
}
