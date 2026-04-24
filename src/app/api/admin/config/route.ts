import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getAdminConfig, updateAdminConfig } from "@/server/adminConfig";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = requireAdmin(req);
  if (!gate.ok) return gate.response!;
  return NextResponse.json(await getAdminConfig());
}

export async function PUT(req: Request) {
  const gate = requireAdmin(req);
  if (!gate.ok) return gate.response!;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const next = await updateAdminConfig({
    raceIntervalMs:
      typeof body.raceIntervalMs === "number" ? body.raceIntervalMs : undefined,
    coachingWindowMs:
      typeof body.coachingWindowMs === "number" ? body.coachingWindowMs : undefined,
    maxEntries: typeof body.maxEntries === "number" ? body.maxEntries : undefined,
    paused: typeof body.paused === "boolean" ? body.paused : undefined,
  });
  return NextResponse.json(next);
}
