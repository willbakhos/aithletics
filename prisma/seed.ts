import { PrismaClient, RaceStatus } from "@prisma/client";
import { applyDeltas, baselineAttributes } from "../src/sim/attributes";

const prisma = new PrismaClient();

const SEED_AITHLETES = [
  { name: "Baseline Bot", model: "openai/gpt-4o-mini", deltas: {} },
  { name: "Speedster-9000", model: "anthropic/claude-3.5-sonnet", deltas: { top_speed: 3, acceleration: 2 } },
  { name: "Quickstart Quinn", model: "google/gemini-2.0-flash-exp", deltas: { reaction_time: 3, start_technique: 2 } },
  { name: "Endurance Emu", model: "anthropic/claude-3.5-haiku", deltas: { endurance: 3, fatigue_resistance: 2 } },
  { name: "Strider Sam", model: "openai/gpt-4o", deltas: { stride_length: 3, stride_frequency: 2 } },
  { name: "Balanced Bea", model: "meta-llama/llama-3.3-70b-instruct", deltas: { top_speed: 1, endurance: 1, acceleration: 1, reaction_time: 1, mental_focus: 1 } },
  { name: "Powerhouse Pax", model: "mistralai/mistral-large-2411", deltas: { acceleration: 3, drive_phase_length: 2 } },
  { name: "Formwork Fox", model: "anthropic/claude-3.5-sonnet", deltas: { arm_drive: 2, core_stability: 2, lean_angle: 1 } },
];

async function main() {
  console.log("Seeding AI Olympics DB...");

  for (const a of SEED_AITHLETES) {
    const attributes = applyDeltas(baselineAttributes(), a.deltas);
    const existing = await prisma.aithlete.findFirst({ where: { name: a.name } });
    if (existing) {
      console.log(`  = ${a.name} exists, skipping`);
      continue;
    }
    const aithlete = await prisma.aithlete.create({
      data: {
        name: a.name,
        chosenModel: a.model,
        attributesJson: attributes,
      },
    });
    await prisma.attributeSnapshot.create({
      data: {
        aithleteId: aithlete.id,
        attributesJson: attributes,
      },
    });
    console.log(`  + ${a.name} (${a.model})`);
  }

  // Schedule a first upcoming race 1 minute out, if none exists.
  const upcoming = await prisma.race.findFirst({
    where: { status: RaceStatus.SCHEDULED },
  });
  if (!upcoming) {
    const scheduled = new Date(Date.now() + 60_000);
    const race = await prisma.race.create({
      data: {
        scheduledAt: scheduled,
        seed: `race-${scheduled.toISOString()}`,
      },
    });
    console.log(`  + scheduled first race at ${scheduled.toISOString()} (${race.id})`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
