# AI Olympics

Spectator platform for AI-coached stick-figure Aithletes. Users pick an LLM via OpenRouter and coach their Aithlete between races; the LLM reads performance logs and proposes attribute changes within a fixed budget. Always-on 100m sprints.

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind
- Prisma → Postgres (Neon/Supabase)
- Deterministic TS sim (`seedrandom`)
- HTML Canvas 2D viz
- Vitest for sim tests
- Cookie-based auth with HMAC-signed sessions, bcrypt password hashing
- AES-256-GCM encryption for stored OpenRouter BYOK API keys
- SSE endpoint for race streaming

## Build status

All 8 MVP milestones implemented:

1. **Sim engine** — 15-attribute vector, quadratic cost curve, 100-point budget, ±5 per-race cap. 13 Vitest tests pass (including 1000-run determinism check).
2. **Canvas playback** — `/playback` renders side-scrolling stick figures with play/pause/speed/scrub.
3. **Prisma schema + seed** — User, Aithlete, AttributeSnapshot, Race, RaceEntry, CoachingSession; seed creates 8 test Aithletes + first race.
4. **Race orchestrator** — `src/server/orchestrator.ts` (idempotent per-race run, lane rotation, next-race scheduling) + `src/server/raceLoop.ts` long-running loop + `worker.ts` entrypoint.
5. **Public spectator view** — `/`, `/live`, `/races`, `/races/[id]`, `/leaderboards`, `/aithletes/[id]` with a public SSE stream at `/api/races/[id]/stream`.
6. **Auth + Aithlete creation** — `/signin`, `/signup`, `/my`, `/my/aithletes/new`, `/my/aithletes/[id]`, `/my/settings`.
7. **OpenRouter coaching** — BYOK, prompt-building, structured-JSON validation, budget/cap/negative checks before apply, per-race call rate limit (3).
8. **Admin controls** — `/admin` (token-gated), `/api/admin/config`, `/api/admin/tick`.

## Dev

```bash
npm install
cp .env.example .env.local
# Fill DATABASE_URL, AUTH_SECRET (32+ chars), OPENROUTER_KEY_ENCRYPTION_KEY (32 bytes base64)

npx prisma db push   # create tables
npm run db:seed      # 8 test Aithletes + first scheduled race
npm run dev          # app on :3000
npm run worker       # long-running race loop (separate process)
```

Try `/playback` for the sim demo (no DB needed) once `npm run dev` is up.

### Tests

```bash
npm test
```

Covers attribute math (quadratic cost, movement cap, negatives) and sim determinism (1000-run byte-identical, wind effect, fairness).

## Fairness invariants

- Identical starting attributes for every new Aithlete (15 × 5 = 75 of 100 budget; 25 headroom)
- Quadratic cost above baseline
- ±5 total movement cap per race (sum of absolute deltas)
- Attributes may not go negative
- Sim is deterministic: `(attributes, conditions, seed)` → byte-identical output
- Shared conditions across lanes per race (rolled from race seed)

## Rate & cost controls

- BYOK for MVP (OpenRouter key encrypted with AES-256-GCM, never returned to client)
- Max 3 coaching calls per race per user
- 4000 input / 1500 output token caps per call

## Layout

```
src/
  app/
    api/            # route handlers (races, leaderboards, auth, aithletes, coaching, me, admin)
    my/             # owner dashboard (sign-in gated)
    admin/          # admin console (token-gated)
    (public pages)  # /, /live, /races, /races/[id], /leaderboards, /aithletes/[id], /playback
  components/       # SiteNav, RacePlayer, AuthForms
  lib/              # prisma, session, crypto, openrouter, raceReplay, admin
  server/           # orchestrator, raceLoop, adminConfig
  sim/              # deterministic race simulation
prisma/
  schema.prisma
  seed.ts
worker.ts           # standalone race-loop worker process
```

## Deferred (v2)

Multiple events, betting/economy, mobile optimization, AI-generated commentary, user-vs-user challenges, model tiering, monetization, platform-covered OpenRouter spend with per-user quota.

## Open questions for live tuning

- Cost-curve shape (linear vs quadratic vs logistic) — currently quadratic; needs 50–100 races to assess strategy variety.
- Race cadence — 20 min default; env-configurable, admin-adjustable.
- Log granularity to LLM — 20 keyframes + summary; expand if models consistently misdiagnose.
