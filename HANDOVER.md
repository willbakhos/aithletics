# Handover — AI Olympics MVP

Everything you need to clone this branch, get it running on your desktop in VS Code, and continue development.

## 1. Clone & check out the branch

```bash
git clone <your-repo-url> aithletics
cd aithletics
git checkout claude/ai-olympics-mvp-Xh2Me
```

The feature branch is `claude/ai-olympics-mvp-Xh2Me`. `main` does not exist yet — you'll likely want to:

```bash
git checkout -b main
git push -u origin main
# then open a PR from claude/ai-olympics-mvp-Xh2Me -> main, or merge locally
```

## 2. Prerequisites

- **Node 22.x** (this project was built against 22.22.2; `npm install` will warn on 18/20 but should work on 20+)
- **Postgres 14+** — either local, or a free Neon / Supabase project
- VS Code recommended extensions (see section 7)

## 3. Install

```bash
npm install
```

If you hit a peer-deps conflict, use `npm install --legacy-peer-deps`. The project pins Next 16 + React 19 stable.

## 4. Environment variables

Copy the template and fill in the four required values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://user:pass@host:5432/aithletics?schema=public"
AUTH_SECRET="..."                    # 32+ char random
OPENROUTER_KEY_ENCRYPTION_KEY="..."   # base64 32 bytes
ADMIN_TOKEN="..."                     # any string
```

Generate the secrets:

```bash
# AUTH_SECRET (hex, 64 chars = 32 bytes):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OPENROUTER_KEY_ENCRYPTION_KEY (base64, exactly 32 bytes decoded):
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# ADMIN_TOKEN (any strong string):
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

**Rotating `OPENROUTER_KEY_ENCRYPTION_KEY` will invalidate every stored BYOK
key.** Pick one and keep it.

Optional loop tuning (all have sensible defaults):

```env
RACE_INTERVAL_MS=1200000     # 20 min
RACE_LOOP_TICK_MS=5000       # worker poll interval
COACHING_WINDOW_MS=900000    # 15 min (currently advisory, enforced by race cadence)
MAX_RACE_ENTRIES=8
```

## 5. Database setup

Push the Prisma schema and seed:

```bash
npx prisma db push    # creates all tables
npm run db:seed       # 8 test Aithletes + one scheduled race ~1 min out
```

`db push` is fine for dev. For production, use `prisma migrate dev` / `migrate deploy` to create a migration history.

## 6. Running locally

Three processes you care about:

```bash
npm run dev         # Next app on http://localhost:3000
npm run worker      # race-loop worker — runs due races, schedules next
npm test            # vitest sim tests (13 tests, ~1s)
```

You can run without the worker and trigger races manually by hitting
`/api/admin/tick` with the `x-admin-token` header, or from the `/admin` page.

### First-run verification checklist

1. `npm test` → 13 passing
2. `npm run dev` → visit `http://localhost:3000/playback` (no DB required)
3. With DB + seed done, visit `/` — should show next race and registered Aithletes
4. Open `/admin`, paste your `ADMIN_TOKEN`, load config, click "Tick now" — the first race runs, status moves to FINISHED
5. Visit `/races` → click the finished race → `RacePlayer` plays it back
6. Visit `/signup` → create an account → `/my/aithletes/new` → create a personal Aithlete → `/my/settings` → paste an OpenRouter key → after the Aithlete finishes its first race, the `/my/aithletes/[id]` page lets you send coaching messages

## 7. VS Code setup

**Recommended extensions:**

- `Prisma.prisma` — schema syntax + autocomplete
- `bradlc.vscode-tailwindcss` — Tailwind class IntelliSense
- `dbaeumer.vscode-eslint` — lints on save
- `vitest.explorer` — run/debug tests inline
- `esbenp.prettier-vscode` — if you want formatting on save

**Suggested `.vscode/settings.json`** (create locally, gitignored by default):

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "eslint.validate": ["typescript", "typescriptreact"],
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

**Running the dev server from VS Code:** open the integrated terminal and run
`npm run dev`. The Next App Router will hot-reload on file save.

## 8. Code layout

```
src/
  app/
    api/            # route handlers
      admin/        # config, tick (gated by ADMIN_TOKEN header)
      aithletes/    # CRUD + coaching
      auth/         # signin, signup, signout
      leaderboards/
      me/           # openrouter-key store
      races/        # list, detail, SSE stream, current
    my/             # owner dashboards (session-gated)
    admin/          # admin console (token-gated)
    (public)        # /, /live, /races, /races/[id], /leaderboards, /aithletes/[id], /playback
    signin, signup
  components/       # SiteNav, RacePlayer, AuthForms
  lib/
    prisma.ts       # singleton Prisma client
    session.ts      # HMAC-signed cookie auth (HS256)
    crypto.ts       # AES-256-GCM for stored OpenRouter keys
    openrouter.ts   # prompt builder + HTTP call
    raceReplay.ts   # reconstruct SimulatedRace from DB rows
    admin.ts        # admin-token guard
  server/
    orchestrator.ts # runDueRaces, runRace, selectEntrants, ensureNextRaceScheduled
    raceLoop.ts     # long-running loop wrapper
    adminConfig.ts  # in-memory config store (resets on restart — fine for MVP)
  sim/              # deterministic race simulation (the heart of the product)
    attributes.ts   # budget math: quadratic cost, ±5 cap, 100-point total
    attributes.test.ts
    conditions.ts   # seeded wind / temp / track wear / start-block firmness
    engine.ts       # physics sim → frames + summary
    engine.test.ts  # includes the 1000-run determinism guarantee
    race.ts         # multi-entry heat → placements
prisma/
  schema.prisma
  seed.ts
worker.ts           # standalone entrypoint for `npm run worker`
```

## 9. Deployment recipe (when you're ready)

- **Vercel** for the Next app — it handles API routes fine; SSE endpoint works on Node runtime (already declared `runtime = "nodejs"` on that route)
- **Neon** or **Supabase** for Postgres — set `DATABASE_URL` in Vercel env
- **Railway** or **Render** to run `npm run worker` as a long-running process (or replace with a Vercel Cron that hits `POST /api/admin/tick` every minute — simpler, slightly less precise cadence)
- Mirror the same secrets into whichever host runs the worker

## 10. Known caveats / first follow-ups

These are intentional MVP shortcuts, flagged so you can file issues:

- **Admin config is in-memory** (`src/server/adminConfig.ts`). Survives within a process, lost on restart. Promote to a DB table when it starts mattering.
- **SSE polls the DB every 2s.** For frame-level streaming, switch to Postgres `LISTEN/NOTIFY` or Redis pub/sub. Good enough for the current "full-payload handshake" model.
- **`npm run db:push`** isn't a real migration — use `prisma migrate dev` once you want history.
- **No rate limiting on auth endpoints.** Add something (Upstash / `@vercel/kv`) before public launch.
- **`OPENROUTER_KEY_ENCRYPTION_KEY` isn't rotated.** If it ever leaks, all stored BYOK keys are at risk. Consider a key-versioning scheme before public launch.
- **`bcryptjs`** is pure-JS (no native build required). Fast enough for MVP scale; swap to native `bcrypt` if you see hot-path slowness.
- **Coaching window enforcement is cadence-based, not wall-clock.** The brief mentions a 15-min window; right now the "last race" lookup + 3-call rate limit is what gates it. A stricter wall-clock window is a ~5-line addition in `src/app/api/aithletes/[id]/coaching/route.ts`.
- **Mobile UI is not optimized** — that's in the v2 non-goals list.

## 11. Build order to keep in mind when extending

1. Add a new attribute → update `src/sim/attributes.ts` (ATTRIBUTE_KEYS), wire it into `src/sim/engine.ts`, bump the 1000-run determinism test
2. Add a new LLM → no code change, just accept the new OpenRouter model id on the `/my/aithletes/new` form
3. Add a new event (e.g. 200m) → v2. Current sim is 100m-specific (`RACE_DISTANCE_M` in `engine.ts`) — generalize by parameterizing race distance on the `SimInput`

## 12. Quick commands reference

| Command | What it does |
|---|---|
| `npm run dev` | Start Next dev server on :3000 |
| `npm run build` | Production build (type-checks everything) |
| `npm test` | Run sim tests once |
| `npm run test:watch` | Watch mode for tests |
| `npm run db:push` | Sync Prisma schema to DB (no migration file) |
| `npm run db:seed` | Seed 8 Aithletes + first race |
| `npm run worker` | Start race-loop worker |
| `npx prisma studio` | Visual DB browser at :5555 |
| `npx prisma migrate dev --name <n>` | Create + apply a migration |
