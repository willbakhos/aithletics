import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { decryptApiKey } from "@/lib/crypto";
import {
  buildSystemPrompt,
  buildUserPrompt,
  callOpenRouter,
} from "@/lib/openrouter";
import { applyDeltas, validateDeltas } from "@/sim/attributes";
import { hydrateAttributes } from "@/server/orchestrator";

const MAX_COACHING_CALLS_PER_RACE = 3;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const { id } = await params;
  const aithlete = await prisma.aithlete.findUnique({ where: { id } });
  if (!aithlete || aithlete.userId !== user.id) {
    return NextResponse.json({ error: "not your Aithlete" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const userMessage = typeof body?.message === "string" ? body.message.trim() : "";
  if (userMessage.length < 4 || userMessage.length > 2000) {
    return NextResponse.json(
      { error: "message must be 4-2000 chars" },
      { status: 400 },
    );
  }

  if (!user.openrouterKeyEncrypted) {
    return NextResponse.json(
      { error: "set your OpenRouter API key first (BYOK required for MVP)" },
      { status: 400 },
    );
  }

  // Find the most recent race this Aithlete ran in. Coaching is scoped to that race.
  const lastEntry = await prisma.raceEntry.findFirst({
    where: { aithleteId: aithlete.id, finishTimeMs: { not: null } },
    orderBy: { race: { finishedAt: "desc" } },
    include: { race: true },
  });
  if (!lastEntry) {
    return NextResponse.json(
      { error: "Aithlete hasn't raced yet; coaching requires at least one finished race" },
      { status: 400 },
    );
  }
  const raceId = lastEntry.raceId;

  // Rate-limit coaching calls per race per user
  const callsSoFar = await prisma.coachingSession.count({
    where: { aithleteId: aithlete.id, raceId },
  });
  if (callsSoFar >= MAX_COACHING_CALLS_PER_RACE) {
    return NextResponse.json(
      { error: `max ${MAX_COACHING_CALLS_PER_RACE} coaching calls per race` },
      { status: 429 },
    );
  }

  const recentEntries = await prisma.raceEntry.findMany({
    where: { aithleteId: aithlete.id, finishTimeMs: { not: null } },
    orderBy: { race: { finishedAt: "desc" } },
    take: 5,
    include: { race: true },
  });

  const currentAttrs = hydrateAttributes(aithlete.attributesJson);
  const systemPrompt = buildSystemPrompt(currentAttrs);
  const userPrompt = buildUserPrompt({
    aithleteName: aithlete.name,
    currentAttributes: currentAttrs,
    lastRace: {
      raceId: lastEntry.raceId,
      summary:
        (lastEntry.performanceLogJson as Record<string, unknown> | null)?.summary as Record<
          string,
          unknown
        > ?? {},
      keyframes:
        ((lastEntry.performanceLogJson as Record<string, unknown> | null)?.keyframes as unknown[]) ??
        [],
    },
    recentRaces: recentEntries.map((e) => ({
      raceId: e.raceId,
      finishTimeMs: e.finishTimeMs ?? 0,
      placement:
        ((e.performanceLogJson as Record<string, unknown> | null)?.placement as number) ?? 0,
      conditions: e.race.conditionsJson,
    })),
    userMessage,
  });

  const apiKey = decryptApiKey(Buffer.from(user.openrouterKeyEncrypted));
  const { raw, parsed, error } = await callOpenRouter({
    apiKey,
    model: aithlete.chosenModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  if (!parsed) {
    const session = await prisma.coachingSession.create({
      data: {
        aithleteId: aithlete.id,
        raceId,
        userMessage,
        llmResponseRaw: raw,
        applied: false,
        errorMessage: error ?? "LLM response did not match required JSON shape",
      },
    });
    return NextResponse.json(
      { error: session.errorMessage, sessionId: session.id, raw },
      { status: 502 },
    );
  }

  const validation = validateDeltas(currentAttrs, parsed.attribute_deltas);
  if (!validation.ok) {
    const session = await prisma.coachingSession.create({
      data: {
        aithleteId: aithlete.id,
        raceId,
        userMessage,
        llmResponseRaw: raw,
        proposedDeltasJson: parsed.attribute_deltas,
        applied: false,
        errorMessage: validation.errors.join("; "),
      },
    });
    return NextResponse.json(
      {
        error: "LLM proposal rejected",
        reasons: validation.errors,
        sessionId: session.id,
      },
      { status: 422 },
    );
  }

  const nextAttributes = applyDeltas(currentAttrs, parsed.attribute_deltas);

  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.coachingSession.create({
      data: {
        aithleteId: aithlete.id,
        raceId,
        userMessage,
        llmResponseRaw: raw,
        proposedDeltasJson: parsed.attribute_deltas,
        applied: true,
      },
    });
    await tx.aithlete.update({
      where: { id: aithlete.id },
      data: { attributesJson: nextAttributes },
    });
    await tx.attributeSnapshot.create({
      data: {
        aithleteId: aithlete.id,
        attributesJson: nextAttributes,
      },
    });
    return session;
  });

  return NextResponse.json({
    sessionId: result.id,
    applied: true,
    deltas: parsed.attribute_deltas,
    rationale: parsed.rationale_for_user,
    newAttributes: nextAttributes,
  });
}
