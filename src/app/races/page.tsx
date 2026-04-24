import Link from "next/link";
import { RaceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RacesPage() {
  const [upcoming, recent] = await Promise.all([
    prisma.race.findMany({
      where: { status: RaceStatus.SCHEDULED },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    prisma.race.findMany({
      where: { status: RaceStatus.FINISHED },
      orderBy: { finishedAt: "desc" },
      take: 15,
      include: {
        entries: {
          orderBy: { finishTimeMs: "asc" },
          take: 1,
          include: { aithlete: { select: { id: true, name: true } } },
        },
      },
    }),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold">Schedule</h1>

      <section className="mt-8">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-neutral-500">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-neutral-500">No upcoming races scheduled.</p>
        ) : (
          <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 bg-neutral-900">
            {upcoming.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-4 py-3">
                <span className="font-mono text-sm">
                  {new Date(r.scheduledAt).toLocaleString()}
                </span>
                <span className="text-xs text-neutral-500">seed: {r.seed}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-neutral-500">Recent</h2>
        {recent.length === 0 ? (
          <p className="text-neutral-500">No finished races yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 bg-neutral-900">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-4 py-3">
                <Link
                  href={`/races/${r.id}`}
                  className="font-mono text-sm text-amber-400 hover:underline"
                >
                  {r.finishedAt ? new Date(r.finishedAt).toLocaleString() : r.id}
                </Link>
                <span className="text-sm text-neutral-300">
                  {r.entries[0]
                    ? `${r.entries[0].aithlete.name} — ${(r.entries[0].finishTimeMs! / 1000).toFixed(3)}s`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
