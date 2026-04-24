import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RacePlayer } from "@/components/RacePlayer";
import { reconstructRace } from "@/lib/raceReplay";

export const dynamic = "force-dynamic";

export default async function RaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const race = await prisma.race.findUnique({
    where: { id },
    include: {
      entries: {
        orderBy: { lane: "asc" },
        include: { aithlete: { select: { id: true, name: true, chosenModel: true } } },
      },
    },
  });
  if (!race) notFound();

  const reconstructed = reconstructRace(race, race.entries);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/races" className="text-xs text-neutral-500 hover:text-neutral-300">
            ← schedule
          </Link>
          <h1 className="mt-1 text-xl font-semibold">
            Race {race.id}
          </h1>
          <div className="mt-1 text-sm text-neutral-500">
            Status: {race.status}
            {race.finishedAt ? ` · finished ${new Date(race.finishedAt).toLocaleString()}` : ""}
          </div>
        </div>
        <div className="rounded border border-neutral-800 bg-neutral-900 p-2 font-mono text-xs text-neutral-500">
          seed: {race.seed}
        </div>
      </div>

      {reconstructed ? (
        <RacePlayer race={reconstructed} />
      ) : (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-neutral-400">
          This race hasn&apos;t run yet. Check back after{" "}
          {new Date(race.scheduledAt).toLocaleString()}.
        </div>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-neutral-500">Entrants</h2>
        <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 bg-neutral-900">
          {race.entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className="w-8 text-neutral-500">L{e.lane + 1}</span>
              <Link href={`/aithletes/${e.aithlete.id}`} className="flex-1 hover:underline">
                {e.aithlete.name}
              </Link>
              <span className="text-xs text-neutral-500">{e.aithlete.chosenModel}</span>
              <span className="font-mono text-neutral-400">
                {e.finishTimeMs ? `${(e.finishTimeMs / 1000).toFixed(3)}s` : "—"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
