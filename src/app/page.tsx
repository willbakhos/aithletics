import Link from "next/link";
import { RaceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [next, recent, aithletes] = await Promise.all([
    prisma.race.findFirst({
      where: { status: RaceStatus.SCHEDULED },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.race.findFirst({
      where: { status: RaceStatus.FINISHED },
      orderBy: { finishedAt: "desc" },
      include: {
        entries: {
          orderBy: { finishTimeMs: "asc" },
          include: { aithlete: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.aithlete.count(),
  ]).catch(() => [null, null, 0] as const);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight">AI Olympics</h1>
      <p className="mt-3 text-neutral-400">
        LLM-coached stick-figure athletes running always-on 100m sprints.
        Spectate any race. Create an Aithlete and coach your own.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
          <div className="text-xs uppercase tracking-wide text-neutral-500">Next race</div>
          {next ? (
            <>
              <div className="mt-2 font-mono text-lg">
                {new Date(next.scheduledAt).toLocaleString()}
              </div>
              <Link
                href="/live"
                className="mt-3 inline-block text-sm text-amber-400 hover:underline"
              >
                Watch live →
              </Link>
            </>
          ) : (
            <div className="mt-2 text-sm text-neutral-500">
              No race scheduled yet. Start the worker or hit /api/admin/tick.
            </div>
          )}
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
          <div className="text-xs uppercase tracking-wide text-neutral-500">Most recent race</div>
          {recent ? (
            <>
              <div className="mt-2 text-lg">Winner: {recent.entries[0]?.aithlete.name ?? "?"}</div>
              <div className="text-sm text-neutral-500">
                {recent.entries[0]?.finishTimeMs
                  ? `${(recent.entries[0].finishTimeMs / 1000).toFixed(3)}s`
                  : ""}
              </div>
              <Link
                href={`/races/${recent.id}`}
                className="mt-3 inline-block text-sm text-amber-400 hover:underline"
              >
                Watch replay →
              </Link>
            </>
          ) : (
            <div className="mt-2 text-sm text-neutral-500">No finished races yet.</div>
          )}
        </div>
      </div>

      <div className="mt-8 text-sm text-neutral-500">
        {aithletes} Aithlete{aithletes === 1 ? "" : "s"} registered.{" "}
        <Link href="/signup" className="text-amber-400 hover:underline">
          Create your own →
        </Link>
      </div>

      <div className="mt-10 rounded-lg border border-neutral-800 bg-neutral-900/60 p-5 text-sm text-neutral-400">
        <div className="font-semibold text-neutral-200">Try the sim without signing up</div>
        <p className="mt-1">
          The sim is deterministic. See a sample heat animate in the browser:
        </p>
        <Link href="/playback" className="mt-2 inline-block text-amber-400 hover:underline">
          /playback →
        </Link>
      </div>
    </main>
  );
}
