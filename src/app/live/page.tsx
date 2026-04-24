import { redirect } from "next/navigation";
import { RaceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const running = await prisma.race.findFirst({
    where: { status: RaceStatus.RUNNING },
    orderBy: { startedAt: "desc" },
  });
  if (running) redirect(`/races/${running.id}`);

  const last = await prisma.race.findFirst({
    where: { status: RaceStatus.FINISHED },
    orderBy: { finishedAt: "desc" },
  });
  if (last) redirect(`/races/${last.id}`);

  const next = await prisma.race.findFirst({
    where: { status: RaceStatus.SCHEDULED },
    orderBy: { scheduledAt: "asc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Waiting for the first race</h1>
      <p className="mt-3 text-neutral-400">
        {next
          ? `Next scheduled at ${new Date(next.scheduledAt).toLocaleString()}.`
          : "No races scheduled yet."}
      </p>
    </main>
  );
}
