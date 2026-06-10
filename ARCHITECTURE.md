# System Architecture

[中文版](ARCHITECTURE_zh.md) | English

**Citydle** is a fully static web app plus an offline data pipeline. There is no server code, no database, and no API routes — the previous architecture document (SQLite, 6 API routes, Leaflet, anti-cheat rate limiting) described the legacy game and is obsolete.

---

## 1. Overview

```
┌────────────────── build time / offline ──────────────────┐
│  fetch-cities.mjs      Overpass/OSM → public/cities/*.json│
│  validate-cities.mjs   machine QA gate (segments, bounds) │
│  compute-morphology.mjs grid score + water class          │
│  make-prototype.mjs    standalone playable demo           │
└───────────────────────────────────────────────────────────┘
                              │  committed to git
                              ▼
┌────────────────────── runtime (CDN) ──────────────────────┐
│  Next.js static export-style app                          │
│   /            → Game.tsx (client component)              │
│   /cities/*.json → static city data (fetched lazily)      │
│  localStorage  → day record (anti-replay), stats, streak  │
└───────────────────────────────────────────────────────────┘
```

| Decision | Rationale |
|----------|-----------|
| Fully static, no backend | Daily puzzle is deterministic client-side; nothing to persist server-side for MVP |
| City data in `public/cities/` | CDN-cached JSON, one ~200–400KB file fetched per day |
| Canvas rendering, no map library | The game shows curated geometry, not an interactive map; Leaflet removed |
| localStorage only | Streak/stats are personal; no accounts in MVP |

## 2. Data pipeline (`*.mjs`, repo root)

`fetch-cities.mjs` — pulls each city's road network, water and coastline from Overpass (4 mirrors raced, retries with backoff). Key invariants:

- **Every line is a real road**: each OSM way is kept as its own polyline segment; same-name ways are never concatenated (concatenation draws phantom straights).
- **Tiers preserved**: highway class → tier 1 (motorway/trunk/primary), 2 (secondary/tertiary), 3 (rest). Clue layers render by tier.
- **Bounded geometry**: ways are clipped to bbox+10% with true line–box intersection points (every kept point lies on the real polyline).
- **index.json rebuilt from disk** after every run — re-fetching one city can't wipe the rest.

`validate-cities.mjs` — QA gate, run after every fetch. Checks segment continuity (gap thresholds catch fake joins), bounds, tier validity, counts, index completeness. Exit 1 on error.

`compute-morphology.mjs` — per-city street-orientation entropy (Boeing method) → `grid` 0–1, plus `water` class (coast/river/inland) → `public/cities/morphology.json`. Drives distractor similarity.

Water mapped as multipolygon relations (e.g. Sydney Harbour) is fetched via bbox-filtered member ways and deduped by way id.

## 3. Game runtime (`src/`)

```
src/lib/citydle/
├── types.ts      city data / index / morphology types
├── daily.ts      UTC day number; seeded PRNG (mulberry32);
│                 answer = per-cycle shuffle (no repeat within a cycle);
│                 candidates = 3 morphologically-nearest + 2 seeded-random
├── clues.ts      6 clue layers from real data; skeleton fills from
│                 lower tiers when arterials < 30km (selection, never invention)
├── render.ts     canvas renderer; frames the curated bbox; parchment/gold
├── storage.ts    localStorage: day record, stats, streak, language
└── i18n.ts       ~20 UI strings, zh/en (country names come from index.json)

src/components/citydle/
├── Game.tsx         single-screen game: fetch index+morphology+city,
│                    6-choice elimination, share blocks, confetti,
│                    countdown, first-visit onboarding overlay;
│                    fluid responsive (portrait single column /
│                    landscape>=640px board+side-panel, clamp() type)
└── Game.module.css  weathered-cartographer aesthetic
```

**Determinism**: everything random is seeded by the day number, so every player worldwide gets the same answer, the same 6 candidates, in the same order. Epoch: `EPOCH_UTC` in `daily.ts`.

**Game rules**: 6 clue levels (skeleton → +water → +secondary → +full texture → +street name → +country/initial). A wrong pick eliminates that candidate *and* burns a clue. Win = correct pick at level L (share as L/6). 5 wrong picks or running out of clues = loss (X/6).

**Anti-replay**: the daily result is stored in localStorage; reloading shows the settle screen. After the daily, **practice mode** offers unlimited random rounds (today's answer excluded; daily stats/streak untouched). (Server-side judging / real anti-cheat is explicitly out of MVP scope — the answer is derivable client-side, same as early Wordle.)

## 4. Testing & CI

- `vitest`: `src/lib/citydle/__tests__/` — day math, determinism, no-repeat cycle, candidate selection, skeleton rule, street name clue (18 tests).
- `npm run lint` + `npm run build` must pass; the build is fully static (every route ○).
- Visual QA: `node inspect-cities.mjs` renders all cities into `prototype/inspect.html`; `node make-prototype.mjs` builds the standalone demo.

## 5. Deployment

Static output deploys anywhere (Vercel zero-config). No environment variables, no database, no cold-start state. The only moving part is the CDN.
