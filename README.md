# Citydle — Read the Map, Name the City

[中文版](README_zh.md) | English

> The daily game is fully playable at `/`. The legacy "Financial Street Cartographer" gameplay has been removed (see git history).

---

**Citydle** (中文名：每日街图) is a daily map-reading puzzle. Every day you get one city's real road network — rendered as a parchment-style cartographic silhouette — and you have **6 clues** to figure out which of 6 candidate cities it is. Use fewer clues, score higher.

Think Wordle, but for geography — and instead of letters, you're reading the bones of a city.

---

## How It Works

Each puzzle reveals the same city's road network in progressive layers:

| Clue | What you see |
|------|-------------|
| 1 | Arterial skeleton (filled from real lower-tier streets if arterials are sparse) |
| 2 | + Water & coastline |
| 3 | + Secondary roads |
| 4 | + Full street texture (most distinctive layer) |
| 5 | + One street name |
| 6 | + Country / first letter (last resort, not the answer itself) |

A landmark clue will join the ladder once the pipeline fetches real OSM POIs — never fabricated.

**6-choice elimination** — pick from 6 candidates (3 of them morphologically similar to the answer: that's the difficulty dial). A wrong pick eliminates the candidate *and* burns a clue. Same puzzle for everyone worldwide, every UTC day.

Share your result as a Wordle-style emoji grid + track your daily streak.

---

## Aesthetic

**The Weathered Cartographer**: parchment textures, warm-gold line-work. You are reading fragments of old maps, identifying the city they depict.

This is the key differentiator from GeoGuessr (which uses street-level photos). Citydle uses the map itself — *the lines* — as the puzzle.

---

## Data Principles

Every line you see on screen represents a real road or feature that exists in that city. No invented geometry.

- **Road networks** → Overpass API (OpenStreetMap)
- **Coastlines / rivers / water** → OSM `natural=coastline`, `natural=water`, `waterway`
- **Landmarks** → OSM POIs (`tourism`, `amenity`, etc.) — if the data isn't there, the clue is omitted; nothing is fabricated
- **Every city dataset carries a source tag** (`source: overpass` + fetch date) for full traceability
- **Zero hand-crafted coordinates**

---

## City Library

| Status | Details |
|--------|---------|
| Library | **100 high-distinctiveness world cities** — a full 100-day cycle of daily puzzles without repeats |
| Selection criteria | Cities with coastline, rivers, or uniquely shaped road networks (grid, radial, irregular old town); generic suburban grids are excluded |
| Generation pipeline | `fetch-cities.mjs` (Overpass, curated bboxes) → `validate-cities.mjs` (machine QA gate, 0 errors) → `compute-morphology.mjs` (grid score + water class for distractor similarity) |

---

## Current Status vs. Planned

| Feature | Status |
|---------|--------|
| Daily puzzle — deterministic, same worldwide, no repeats within a library cycle | ✅ Done |
| 100-city library with machine-validated real OSM data (incl. relation water bodies) | ✅ Done |
| 6-choice elimination mode with morphology-based distractors | ✅ Done |
| Wordle-style emoji share + daily streak (localStorage) | ✅ Done |
| Unlimited practice mode after the daily (random city, stats untouched) | ✅ Done |
| Fluid all-device responsive layout + first-visit onboarding | ✅ Done |
| Full codebase rebuild — legacy gameplay removed, app is fully static | ✅ Done |
| Difficulty curve tuning (post-launch, data-driven) | 📋 Planned |
| Landmark clue (needs OSM POI pipeline support) | 📋 Planned |
| Analytics (PostHog) / server-side judging / anti-cheat | 📋 Planned |

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 14 (App Router) — fully static output, zero server code |
| **Language** | TypeScript |
| **Styling** | Tailwind base + CSS Modules |
| **Rendering** | Raw `<canvas>` (no map library) |
| **Road / Feature Data** | Overpass API (OSM) — offline pipeline, 4 mirrors raced, data committed to `public/cities/` |
| **Persistence** | localStorage only (streak, stats, anti-replay) |
| **Fonts** | Cinzel (display), IM Fell English (body) |

---

## Getting Started

### Prerequisites

- Node.js 22.x or later
- npm 10.x or later

### Installation

```bash
# Clone the repository
git clone https://github.com/frank99-owl/citydle.git
cd citydle

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Data pipeline

```bash
node fetch-cities.mjs            # refetch the 100-city library from Overpass
node validate-cities.mjs         # machine QA gate — must pass after every fetch
node compute-morphology.mjs      # grid score + water class → morphology.json
node make-prototype.mjs          # standalone playable demo → prototype/index.html
node inspect-cities.mjs          # all-city visual QA sheet → prototype/inspect.html
```

### Production Build

```bash
npm run build
npm start
```

### Environment Variables

No environment variables required — the app is fully static. The data pipeline scripts use public Overpass API mirrors.

---

## Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/frank99-owl/citydle)

The app is fully static — no environment variables, no database, no server functions. Any static host works.

### Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Self-Hosted

```bash
npm run build
PORT=3000 npm start
```

---

## Testing

```bash
# Run unit tests (Vitest)
npm test

# Watch mode
npm run test:watch

# Build verification (lint + type check)
npm run build
```

---

## License

MIT

---

## Acknowledgments

- [OpenStreetMap](https://www.openstreetmap.org/) contributors for all geographic data
- [Overpass API](https://overpass-api.de/) for road network and feature queries
- [Wordle](https://www.nytimes.com/games/wordle/index.html) for the daily-puzzle format inspiration
