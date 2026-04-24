import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ATTRIBUTE_KEYS } from "@/sim/attributes";
import { hydrateAttributes } from "@/server/orchestrator";

export const dynamic = "force-dynamic";

export default async function AithletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const aithlete = await prisma.aithlete.findUnique({
    where: { id },
    include: {
      snapshots: { orderBy: { createdAt: "desc" }, take: 25 },
      raceEntries: {
        orderBy: { race: { scheduledAt: "desc" } },
        take: 15,
        include: { race: true },
      },
      coachingSessions: {
        where: { applied: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!aithlete) notFound();

  const attrs = hydrateAttributes(aithlete.attributesJson);
  const winRate = aithlete.totalRaces > 0 ? (aithlete.wins / aithlete.totalRaces) * 100 : 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{aithlete.name}</h1>
          <div className="mt-1 font-mono text-xs text-neutral-500">{aithlete.chosenModel}</div>
        </div>
        <div className="text-right text-sm text-neutral-400">
          <div>
            {aithlete.wins} wins in {aithlete.totalRaces} races
          </div>
          <div>{winRate.toFixed(1)}% win rate</div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-neutral-500">
          Current attributes
        </h2>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4 md:grid-cols-3">
          {ATTRIBUTE_KEYS.map((k) => (
            <div key={k} className="flex justify-between text-sm">
              <span className="text-neutral-400">{k}</span>
              <span className="font-mono">{attrs[k]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-neutral-500">
          Recent races
        </h2>
        {aithlete.raceEntries.length === 0 ? (
          <p className="text-sm text-neutral-500">Hasn&apos;t raced yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 bg-neutral-900">
            {aithlete.raceEntries.map((e) => {
              const placement =
                (e.performanceLogJson as { placement?: number } | null)?.placement ?? 0;
              return (
                <li key={e.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="w-8 text-neutral-500">#{placement || "?"}</span>
                  <Link
                    href={`/races/${e.raceId}`}
                    className="flex-1 font-mono text-xs text-amber-400 hover:underline"
                  >
                    {e.race.finishedAt
                      ? new Date(e.race.finishedAt).toLocaleString()
                      : e.race.id}
                  </Link>
                  <span className="font-mono text-neutral-400">
                    {e.finishTimeMs ? `${(e.finishTimeMs / 1000).toFixed(3)}s` : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-neutral-500">
          Recent coaching
        </h2>
        <p className="mb-2 text-xs text-neutral-500">
          Public view shows only the coach&apos;s public rationale, never the owner&apos;s
          raw prompt.
        </p>
        {aithlete.coachingSessions.length === 0 ? (
          <p className="text-sm text-neutral-500">No coaching yet.</p>
        ) : (
          <ul className="space-y-2">
            {aithlete.coachingSessions.map((s) => {
              const rationale = extractRationale(s.llmResponseRaw);
              const deltas = s.proposedDeltasJson as Record<string, number> | null;
              return (
                <li
                  key={s.id}
                  className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm"
                >
                  <div className="font-mono text-xs text-neutral-500">
                    {new Date(s.createdAt).toLocaleString()}
                  </div>
                  <div className="mt-1 text-neutral-200">{rationale ?? "—"}</div>
                  {deltas && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {Object.entries(deltas).map(([k, v]) => (
                        <span
                          key={k}
                          className={`rounded px-2 py-0.5 font-mono ${
                            v > 0
                              ? "bg-emerald-900/50 text-emerald-300"
                              : v < 0
                                ? "bg-rose-900/50 text-rose-300"
                                : "bg-neutral-800 text-neutral-400"
                          }`}
                        >
                          {k} {v > 0 ? `+${v}` : v}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function extractRationale(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { rationale_for_user?: string }).rationale_for_user ?? null;
  } catch {
    return null;
  }
}
