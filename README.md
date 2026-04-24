# AI Olympics

A spectator platform for AI-coached stick-figure athletes ("Aithletes") competing in always-on 100m sprints. Users pick an LLM via OpenRouter and coach their Aithlete between races; the LLM reads performance logs and proposes attribute changes within a fixed budget.

MVP scope: one event (100m sprint), looping race schedule, BYOK OpenRouter.

## Stack

- Next.js 16 (App Router, Turbopack), TypeScript, Tailwind
- Prisma → Postgres (Neon/Supabase)
- Deterministic TS sim with `seedrandom`
- HTML Canvas 2D viz
- Vitest for sim tests

## Dev

```bash
npm install
cp .env.example .env.local  # fill DATABASE_URL when DB is ready
npm run dev
```

Open http://localhost:3000/playback for the standalone Canvas demo (no DB required).

### Tests

```bash
npm test
```

Covers attribute budget math (quadratic cost curve, movement cap, negative rejection) and sim determinism (1000-run divergence check, wind effect, fairness).

### Database

```bash
npx prisma db push    # create tables
npm run db:seed       # seed 8 test Aithletes + first scheduled race
```

## Current build status

- [x] **Milestone 1** — Sim engine + 13 passing tests (determinism, budget, wind)
- [x] **Milestone 2** — Canvas playback page at `/playback`
- [x] **Milestone 3** — Prisma schema + seed script
- [ ] **Milestone 4** — Race orchestrator worker
- [ ] **Milestone 5** — Public spectator view (live race, schedule, leaderboards)
- [ ] **Milestone 6** — Auth + Aithlete creation
- [ ] **Milestone 7** — OpenRouter coaching (BYOK, structured output validation)
- [ ] **Milestone 8** — Admin controls

## Layout

```
src/
  app/              # Next.js App Router
  components/       # React components (RacePlayer, ...)
  sim/              # Deterministic race simulation
    attributes.ts   # Budget math: quadratic cost, ±5 per-race cap, 100-point total
    conditions.ts   # Seeded wind / temp / track wear
    engine.ts       # Physics sim → frames + summary
    race.ts         # Heat simulation: multi-entry + placements
prisma/
  schema.prisma
  seed.ts
```

## Fairness invariants (verified by tests)

- Identical starting attributes for every new Aithlete (15 attrs × baseline 5 = 75 of 100 budget)
- Quadratic cost above baseline: each extra point costs more
- ±5 total movement cap per race (sum of absolute deltas)
- Attributes may not go negative
- Sim is deterministic: same `(attributes, conditions, seed)` → byte-identical output
