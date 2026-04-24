import { RacePlayer } from "@/components/RacePlayer";
import { applyDeltas, baselineAttributes } from "@/sim/attributes";
import { rollConditions } from "@/sim/conditions";
import { simulateHeat } from "@/sim/race";

export const dynamic = "force-dynamic";

export default function PlaybackPage() {
  const seed = `demo-${Math.floor(Date.now() / 60_000)}`;
  const conditions = rollConditions(seed);

  const entries = [
    { name: "Baseline", deltas: {} },
    { name: "Speedster", deltas: { top_speed: 3, acceleration: 2 } },
    { name: "Quickstart", deltas: { reaction_time: 3, start_technique: 2 } },
    { name: "Endurance", deltas: { endurance: 3, fatigue_resistance: 2 } },
    { name: "Strider", deltas: { stride_length: 3, stride_frequency: 2 } },
    { name: "Balanced", deltas: { top_speed: 1, endurance: 1, acceleration: 1, reaction_time: 1, mental_focus: 1 } },
    { name: "Powerhouse", deltas: { acceleration: 3, drive_phase_length: 2 } },
    { name: "Formwork", deltas: { arm_drive: 2, core_stability: 2, lean_angle: 1 } },
  ];

  const raceInputs = entries.map((e, i) => ({
    aithleteId: `demo-${i}`,
    name: e.name,
    lane: i,
    attributes: applyDeltas(baselineAttributes(), e.deltas),
  }));

  const race = simulateHeat("demo-race", seed, conditions, raceInputs);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Canvas playback demo</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Eight Aithletes with synthetic attribute loadouts run a 100m heat. The
          sim is deterministic — the same seed always produces the same result.
        </p>
      </header>
      <RacePlayer race={race} />
    </main>
  );
}
