# Financial Street Cartographer

[中文文档 (Chinese Version)](README_zh.md)

**Financial Street Cartographer** (also known as *World Financial Center Street Guesser*) is a full-stack, vintage-styled street guessing web game. Players can test their geographical knowledge and memory by spelling out all the street names within preset world-famous financial districts (New York Wall Street, London City, Tokyo Marunouchi, Hong Kong Central, Singapore Downtown) or arbitrary custom regions drawn freehand on a vintage paper map.

---

## 🌟 Key Features & Gameplay

1.  **Vintage Paper Map Aesthetics**:
    *   The entire application features a premium dark/yellow parchment-style background and typography.
    *   Leaflet.js integrates with CARTO Positron tile layers and applies an in-browser CSS filter to render an interactive map resembling an ancient hand-drawn parchment chart.
    *   **60fps Panning & Zooming**: The CSS filter is applied directly to the `.leaflet-tile-pane` container (leveraging GPU acceleration) instead of individual tile images, eliminating rendering lag.
2.  **Gameplay Integrity (Cheat Prevention)**:
    *   Uses CARTO Positron `light_nolabels` base tiles. Background maps are completely label-free, preventing players from reading street names directly off the map tiles.
3.  **Instant Preset Game Starts**:
    *   Geometries for the 5 preset cities are stored locally in static JSON files (`data/presets/*.json`). Starting a preset game loads the map in **< 10ms** with zero Overpass API latency or downtime risks.
4.  **Flexible Custom Area Mode with Auto-Search**:
    *   **Location Search Bar**: Users can search for any city or location (e.g. "Paris", "Beijing") directly in custom mode. The server proxies search queries safely to the OpenStreetMap Nominatim API, panning the map to the target location instantly.
    *   **SQLite Bounding Box Cache**: Drawn custom areas are cached inside SQLite (`street_cache`). Repeating or loading previously played custom regions is instantaneous.
    *   **Parallel Overpass Mirror Racing**: First-time custom coordinates trigger parallel requests to 4 public Overpass API mirrors concurrently, returning the fastest mirror's response and aborting slow queries.
5.  **Streak and Confetti Animations**:
    *   Correct guesses trigger a streak counter and fire full-screen confetti animations using `canvas-confetti`. Confetti density and dispersion scale linearly with your active streak.
6.  **Shield Trophy Achievement System**:
    *   Awarded upon settlement (when clicking "Settle & Forfeit" or completing the map):
        *   🥉 **Explorer** (Bronze Shield) — Guessed 10%+ streets.
        *   🥈 **Navigator** (Silver Shield) — Guessed 50%+ streets.
        *   🥇 **Cartographer Master** (Gold Shield) — Guessed 80%+ streets.
7.  **Local Database Persistence (SQLite)**:
    *   Uses Node.js native `node:sqlite` module to log game histories and track personal high scores.
    *   **Lazy Database Loading**: Connection is initialized lazily at request time, completely avoiding Next.js build-time SQLite file lock errors.

---

## 🏗️ Project Structure

The frontend follows a modular architecture with clear separation of concerns:

```
src/
├── app/page.tsx              # Root orchestrator
├── types/                    # TypeScript type definitions
├── hooks/                    # Custom React hooks
│   ├── useLeafletMap.ts      # Map lifecycle & layers
│   ├── useMapProvider.ts     # Provider & coordinates
│   ├── useStreets.ts         # Street data fetching
│   ├── useGameLogic.ts       # Game state & actions
│   └── useLocalStorage.ts    # Persistent storage
├── components/
│   ├── lobby/                # Lobby UI components
│   ├── game/                 # Active game components
│   ├── settlement/           # Results view
│   └── shared/               # Reusable UI elements
└── lib/                      # Utilities & constants
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed module documentation.

---

## 🛠 Tech Stack

*   **Framework**: Next.js 14 (App Router) + TypeScript (Lazy SQLite Connection Lifecycle)
*   **Styling**: Vanilla CSS / Tailwind CSS (parchment theme variables)
*   **Map API**: Leaflet.js + CARTO Positron Label-free Tiles (Canvas Vector Renderer)
*   **Geospatial Data**: OpenStreetMap Overpass API (Parallel Racing & Regex Query) + OSM Nominatim API Proxy
*   **Database**: SQLite (via Node's built-in `node:sqlite` DatabaseSync module)
*   **Animations**: `canvas-confetti`

---

## 🚀 Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Run Development Server**:
    ```bash
    npm run dev
    ```
3.  **Build Production Bundle**:
    ```bash
    npm run build
    ```
