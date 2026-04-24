import { RaceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * SSE stream for a single race. Emits:
 *  - event: state  { status, startedAt, finishedAt, conditions, entries }
 *  - event: done   { placements } once the race has completed
 *
 * Since races run server-side in a single tick, this stream mostly serves as
 * the "live" handshake for the spectator view — the client receives the full
 * race payload and then locally advances playback in real time.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      let closed = false;
      let interval: ReturnType<typeof setInterval> | null = null;

      const close = () => {
        if (closed) return;
        closed = true;
        if (interval) clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      const tick = async () => {
        if (closed) return;
        const race = await prisma.race.findUnique({
          where: { id },
          include: {
            entries: {
              orderBy: { lane: "asc" },
              include: { aithlete: { select: { id: true, name: true } } },
            },
          },
        });
        if (!race) {
          send("error", { message: "race not found" });
          close();
          return;
        }
        send("state", {
          id: race.id,
          status: race.status,
          seed: race.seed,
          startedAt: race.startedAt,
          finishedAt: race.finishedAt,
          conditions: race.conditionsJson,
          entries: race.entries,
        });
        if (race.status === RaceStatus.FINISHED || race.status === RaceStatus.FAILED) {
          send("done", {
            placements: race.entries
              .map((e) => ({
                aithleteId: e.aithleteId,
                name: e.aithlete.name,
                finishTimeMs: e.finishTimeMs,
              }))
              .sort((a, b) => (a.finishTimeMs ?? 9e9) - (b.finishTimeMs ?? 9e9)),
          });
          close();
        }
      };

      await tick();
      if (!closed) interval = setInterval(tick, 2000);
    },
    cancel() {
      // noop - cleanup happens in close()
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
