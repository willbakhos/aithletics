import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ATTRIBUTE_KEYS, BUDGET_TOTAL, budgetSpent } from "@/sim/attributes";
import { hydrateAttributes } from "@/server/orchestrator";
import { CoachingPanel } from "./CoachingPanel";

export const dynamic = "force-dynamic";

export default async function MyAithletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  const { id } = await params;
  const aithlete = await prisma.aithlete.findUnique({
    where: { id },
    include: {
      raceEntries: {
        orderBy: { race: { scheduledAt: "desc" } },
        take: 5,
        include: { race: true },
      },
      coachingSessions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!aithlete || aithlete.userId !== user.id) notFound();

  const attrs = hydrateAttributes(aithlete.attributesJson);
  const spent = budgetSpent(attrs);
  const hasKey = Boolean(user.openrouterKeyEncrypted);
  const lastEntry = aithlete.raceEntries[0];
  const callsThisRace = lastEntry
    ? await prisma.coachingSession.count({
        where: { aithleteId: aithlete.id, raceId: lastEntry.raceId },
      })
    : 0;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/my" className="text-xs text-neutral-500 hover:text-neutral-300">
        ← your aithletes
      </Link>
      <h1 className="mt-1 text-2xl font-bold">{aithlete.name}</h1>
      <div className="mt-1 font-mono text-xs text-neutral-500">{aithlete.chosenModel}</div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Attributes</h2>
            <span className="font-mono text-xs text-neutral-500">
              budget: {spent}/{BUDGET_TOTAL}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-sm">
            {ATTRIBUTE_KEYS.map((k) => (
              <div key={k} className="flex justify-between">
                <span className="text-neutral-400">{k}</span>
                <span className="font-mono">{attrs[k]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="mb-2 text-sm font-semibold">Recent races</h2>
          {aithlete.raceEntries.length === 0 ? (
            <p className="text-sm text-neutral-500">Hasn&apos;t raced yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {aithlete.raceEntries.map((e) => (
                <li key={e.id} className="flex justify-between">
                  <Link
                    href={`/races/${e.raceId}`}
                    className="font-mono text-xs text-amber-400 hover:underline"
                  >
                    {e.race.finishedAt
                      ? new Date(e.race.finishedAt).toLocaleString()
                      : "scheduled"}
                  </Link>
                  <span className="font-mono text-neutral-400">
                    {e.finishTimeMs ? `${(e.finishTimeMs / 1000).toFixed(3)}s` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-8 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-2 text-sm font-semibold">Coach</h2>
        {!hasKey ? (
          <p className="text-sm text-neutral-400">
            Add your OpenRouter key in{" "}
            <Link href="/my/settings" className="text-amber-400 hover:underline">
              settings
            </Link>{" "}
            to enable coaching.
          </p>
        ) : !lastEntry ? (
          <p className="text-sm text-neutral-400">
            Coaching opens after the first finished race.
          </p>
        ) : (
          <CoachingPanel
            aithleteId={aithlete.id}
            callsUsed={callsThisRace}
            raceFinishedAt={lastEntry.race.finishedAt?.toISOString() ?? null}
          />
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-neutral-500">
          Coaching history
        </h2>
        {aithlete.coachingSessions.length === 0 ? (
          <p className="text-sm text-neutral-500">No coaching sessions yet.</p>
        ) : (
          <ul className="space-y-2">
            {aithlete.coachingSessions.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm"
              >
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>{new Date(s.createdAt).toLocaleString()}</span>
                  <span
                    className={s.applied ? "text-emerald-400" : "text-rose-400"}
                  >
                    {s.applied ? "applied" : "rejected"}
                  </span>
                </div>
                <div className="mt-1 text-neutral-300">
                  <strong className="text-neutral-500">You:</strong> {s.userMessage}
                </div>
                {s.errorMessage && (
                  <div className="mt-1 text-xs text-rose-400">{s.errorMessage}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
