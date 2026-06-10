# Citydle — Read the Map, Name the City

[中文版](README_zh.md) | English

> 🚧 **Work in progress** — Citydle is being rebuilt from the old "Financial Street Cartographer". The playable concept prototype lives in `prototype/`.

---

**Citydle** (中文名：每日街图) is a daily map-reading puzzle. Every day you get one city's real road network — rendered as a parchment-style cartographic silhouette — and you have **6 clues** to figure out which of 6 candidate cities it is. Use fewer clues, score higher.

Think Wordle, but for geography — and instead of letters, you're reading the bones of a city.

---

## How It Works

Each puzzle reveals the same city's road network in progressive layers:

| Clue | What you see |
|------|-------------|
| 1 | Major arterial silhouette |
| 2 | + Main road network / coastline / rivers |
| 3 | + Full road texture (most distinctive layer) |
| 4 | + Landmark positions |
| 5 | + One street name |
| 6 | + Country / first letter (last resort, not the answer itself) |

**6-choice multiple select** — pick from 6 candidate cities. Difficulty comes from *how few clues you needed*, not from a blank canvas.

Share your result as a Wordle-style emoji grid (planned) + track your daily streak (planned).

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
| Current prototype | 5 cities (New York, London, Tokyo, Hong Kong, Singapore) |
| MVP target | ~30 high-distinctiveness world cities — enough for 1–2 months of daily puzzles without repeats |
| Selection criteria | Cities with coastline, rivers, or uniquely shaped road networks (grid, radial, irregular old town); generic suburban grids are excluded |
| Generation pipeline | Batch Overpass queries, human-curated bounding boxes, machine-fetched data |

Expanding the city library from 5 → ~30 is **in progress**.

---

## Current Status vs. Planned

| Feature | Status |
|---------|--------|
| Prototype (visual proof-of-concept, single session) | ✅ Done — see `prototype/` |
| City library 5 → ~30 | 🔄 In progress |
| 6-choice multiple-select mode | 📋 Planned |
| Wordle-style emoji share card | 📋 Planned |
| Daily streak tracking | 📋 Planned |
| Difficulty curve tuning | 📋 Planned |
| Full codebase rebuild (replacing old gameplay) | 📋 Planned |
| Persistent storage / anti-cheat / analytics | 📋 Planned |

> The source code in `src/` currently reflects the old "Financial Street Cartographer" gameplay (spelling street names). The rebuild has not started yet. The `prototype/` directory contains the new Citydle concept.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS + CSS Variables |
| **Map** | Leaflet.js |
| **Tiles** | CARTO Positron (label-free) |
| **Geocoding** | OpenStreetMap Nominatim |
| **Road / Feature Data** | Overpass API (OSM) — 4 mirrors, parallel racing |
| **Database** | SQLite (Node.js native `node:sqlite`) |
| **Fonts** | Cinzel (display), IM Fell English (body) |

---

## Getting Started

### Prerequisites

- Node.js 22.x or later
- npm 10.x or later

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/citydle.git
cd citydle

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> Note: the running app is the old Financial Street Cartographer gameplay. The new Citydle concept prototype is in `prototype/`.

### Production Build

```bash
npm run build
npm start
```

### Environment Variables

No environment variables required for local development. The app uses:
- Local SQLite database (auto-created in `data/`)
- Public Overpass API mirrors
- Public Nominatim API

---

## Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/citydle)

**Note**: SQLite is copied to `/tmp` on Vercel serverless — data resets on cold starts. For persistence consider Vercel Postgres, Turso, or PlanetScale.

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
- [CARTO](https://carto.com/) for label-free tile styles
- [Leaflet.js](https://leafletjs.com/) for the interactive map engine
- [Wordle](https://www.nytimes.com/games/wordle/index.html) for the daily-puzzle format inspiration
