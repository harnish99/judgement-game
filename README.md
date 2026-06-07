# Judgement

A trick-taking card game (a.k.a. *Kachufool* / *Oh Hell*) built as an installable
PWA. Play solo against AI or in real-time multiplayer rooms with 3–6 players.

> **Goal of each round:** predict exactly how many tricks you'll win, then win
> precisely that many. Hit your bid and score `10 + bid`; miss it and score `0`.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v3 |
| Animation | Framer Motion |
| Realtime backend | Supabase (Postgres + Realtime) |
| Analytics | PostHog |
| Tests | Vitest |
| PWA | Service worker + Web App Manifest |

---

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev                        # http://localhost:3000
```

### Environment variables

| Variable | Required for | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Multiplayer | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `…_PUBLISHABLE_KEY`) | Multiplayer | Public anon key |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics | Optional |
| `NEXT_PUBLIC_POSTHOG_HOST` | Analytics | Optional |

Solo play works without any environment variables — multiplayer features fail
gracefully when Supabase credentials are absent.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (Next core-web-vitals + TS rules) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Coverage report for `src/game/**` |

CI (`.github/workflows/ci.yml`) runs lint → typecheck → test → build on every PR.

---

## Project structure

```
src/
├── app/                 # Next.js routes (home, lobby, room/[code], stats, api)
│   ├── error.tsx        # Route error boundary
│   ├── global-error.tsx # Root error boundary
│   └── not-found.tsx    # 404
├── components/          # UI components (game + multiplayer/)
├── game/                # Pure, framework-free game logic (unit-tested)
│   ├── deck.ts          #   deal & shuffle
│   ├── bidding.ts       #   bid rules + forbidden-bid constraint
│   ├── trick.ts         #   trick resolution + legal-move rules
│   ├── scoring.ts       #   round scoring
│   ├── match.ts         #   match lifecycle (rounds, dealer rotation)
│   ├── perspective.ts   #   remaps ids so each MP client is "player 0"
│   └── ai.ts            #   easy/medium opponents
├── hooks/               # React hooks (game state, sound, haptics, timer, room)
└── lib/
    ├── multiplayer/     # Supabase room + game-state services
    └── supabase/        # client + generated DB types
```

### Game logic is pure and tested

Everything in `src/game/` is deterministic and free of React/DOM, so it's
covered by fast unit tests (`src/game/__tests__/`). Keep new rules there and add
a test alongside.

---

## Multiplayer architecture

- **Rooms & players** live in Postgres; clients subscribe via Supabase Realtime
  (`postgres_changes`) with a 4-second polling fallback for missed events.
- **Game state** is a single JSONB document per room (`game_state.state`). The
  host's client is currently authoritative: it computes transitions and writes
  the new state, which Realtime fans out to everyone.
- **Perspective transform** (`game/perspective.ts`) rotates player ids so each
  client renders itself as "player 0" at the bottom of the table, letting the
  solo UI components be reused unchanged.

### Database

Schema lives in `supabase/migrations/`. Apply with the Supabase CLI or by
pasting into the SQL editor. Remember to add the tables to the
`supabase_realtime` publication (see migration comments).

> ⚠️ **Security note:** the current RLS policies are fully open (anon key can
> read/write any row) and game state is client-authoritative. This is fine for
> casual play but **not** production-hardened — see the roadmap below.

---

## Roadmap to production hardening

- [ ] **Auth**: Supabase Auth (anonymous → linkable accounts); replace
      localStorage identity with `auth.uid()`.
- [ ] **RLS**: scope every policy to room membership instead of `USING (true)`.
- [ ] **Authoritative state**: validate moves server-side (Edge Functions / RPC)
      and store each player's private hand separately so hands aren't broadcast.
- [ ] **Resilience**: mid-game disconnect/reconnect + AI takeover; rematch loop.
- [ ] **Observability**: exception tracking (e.g. Sentry) wired into the error
      boundaries.
- [ ] **Accessibility**: full WCAG 2.1 AA pass (keyboard play, live regions).
- [ ] **i18n** and persistent cloud profiles/leaderboards.
