import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LeaderboardsPage() {
  const aithletes = await prisma.aithlete.findMany({
    include: {
      raceEntries: {
        where: { finishTimeMs: { not: null } },
        orderBy: { finishTimeMs: "asc" },
        take: 1,
      },
      user: { select: { email: true } },
    },
  });

  const byAithlete = [...aithletes].sort((a, b) => {
    if (a.wins !== b.wins) return b.wins - a.wins;
    const ab = a.raceEntries[0]?.finishTimeMs ?? 9e9;
    const bb = b.raceEntries[0]?.finishTimeMs ?? 9e9;
    return ab - bb;
  });

  type Agg = { races: number; wins: number; best: number | null; count: number };
  const modelAgg = new Map<string, Agg>();
  const userAgg = new Map<string, Agg>();
  for (const a of aithletes) {
    const best = a.raceEntries[0]?.finishTimeMs ?? null;
    const mkey = a.chosenModel;
    const m = modelAgg.get(mkey) ?? { races: 0, wins: 0, best: null, count: 0 };
    m.races += a.totalRaces;
    m.wins += a.wins;
    m.count += 1;
    if (best !== null && (m.best === null || best < m.best)) m.best = best;
    modelAgg.set(mkey, m);

    if (a.user?.email) {
      const ukey = a.user.email;
      const u = userAgg.get(ukey) ?? { races: 0, wins: 0, best: null, count: 0 };
      u.races += a.totalRaces;
      u.wins += a.wins;
      u.count += 1;
      if (best !== null && (u.best === null || best < u.best)) u.best = best;
      userAgg.set(ukey, u);
    }
  }

  const sortedModels = [...modelAgg.entries()].sort(
    (a, b) => b[1].wins - a[1].wins || (a[1].best ?? 9e9) - (b[1].best ?? 9e9),
  );
  const sortedUsers = [...userAgg.entries()].sort(
    (a, b) => b[1].wins - a[1].wins || (a[1].best ?? 9e9) - (b[1].best ?? 9e9),
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold">Leaderboards</h1>

      <section className="mt-8">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-neutral-500">
          By Aithlete
        </h2>
        <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900/70 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Model</th>
                <th className="px-4 py-2 text-right">Races</th>
                <th className="px-4 py-2 text-right">Wins</th>
                <th className="px-4 py-2 text-right">Best</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {byAithlete.map((a, i) => (
                <tr key={a.id}>
                  <td className="px-4 py-2 text-neutral-500">{i + 1}</td>
                  <td className="px-4 py-2">
                    <Link href={`/aithletes/${a.id}`} className="hover:underline">
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-neutral-400">
                    {a.chosenModel}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-neutral-300">
                    {a.totalRaces}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-neutral-300">
                    {a.wins}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-neutral-300">
                    {a.raceEntries[0]
                      ? `${(a.raceEntries[0].finishTimeMs! / 1000).toFixed(3)}s`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm uppercase tracking-wide text-neutral-500">
            By Model
          </h2>
          <AggTable rows={sortedModels} keyLabel="Model" />
        </section>
        <section>
          <h2 className="mb-3 text-sm uppercase tracking-wide text-neutral-500">By User</h2>
          {sortedUsers.length === 0 ? (
            <p className="text-sm text-neutral-500">No user-owned Aithletes yet.</p>
          ) : (
            <AggTable rows={sortedUsers} keyLabel="User" />
          )}
        </section>
      </div>
    </main>
  );
}

function AggTable({
  rows,
  keyLabel,
}: {
  rows: [string, { races: number; wins: number; best: number | null; count: number }][];
  keyLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
      <table className="w-full text-sm">
        <thead className="bg-neutral-900/70 text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-4 py-2 text-left">{keyLabel}</th>
            <th className="px-4 py-2 text-right">Aithletes</th>
            <th className="px-4 py-2 text-right">Races</th>
            <th className="px-4 py-2 text-right">Wins</th>
            <th className="px-4 py-2 text-right">Best</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {rows.map(([key, v]) => (
            <tr key={key}>
              <td className="px-4 py-2 font-mono text-xs text-neutral-300">{key}</td>
              <td className="px-4 py-2 text-right font-mono text-neutral-300">{v.count}</td>
              <td className="px-4 py-2 text-right font-mono text-neutral-300">{v.races}</td>
              <td className="px-4 py-2 text-right font-mono text-neutral-300">{v.wins}</td>
              <td className="px-4 py-2 text-right font-mono text-neutral-300">
                {v.best !== null ? `${(v.best / 1000).toFixed(3)}s` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
