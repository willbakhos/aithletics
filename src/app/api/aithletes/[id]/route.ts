import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const aithlete = await prisma.aithlete.findUnique({
    where: { id },
    include: {
      snapshots: { orderBy: { createdAt: "desc" } },
      raceEntries: {
        orderBy: { race: { scheduledAt: "desc" } },
        take: 20,
        include: { race: true },
      },
      coachingSessions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        // Deliberately omit userMessage: the brief says only rationale_for_user
        // may be exposed publicly, never the owner's raw prompt.
        select: {
          id: true,
          createdAt: true,
          applied: true,
          proposedDeltasJson: true,
          errorMessage: true,
          // Extract rationale_for_user from llmResponseRaw on the client if needed.
          llmResponseRaw: false,
        },
      },
    },
  });
  if (!aithlete) return NextResponse.json({ error: "not found" }, { status: 404 });

  const publicCoaching = await prisma.coachingSession.findMany({
    where: { aithleteId: id, applied: true },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      createdAt: true,
      proposedDeltasJson: true,
      llmResponseRaw: true,
    },
  });

  const coaching = publicCoaching.map((c) => ({
    id: c.id,
    createdAt: c.createdAt,
    proposedDeltasJson: c.proposedDeltasJson,
    rationale: extractRationale(c.llmResponseRaw),
  }));

  return NextResponse.json({ aithlete, coaching });
}

function extractRationale(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const rationale = parsed?.rationale_for_user;
    return typeof rationale === "string" ? rationale : null;
  } catch {
    return null;
  }
}
