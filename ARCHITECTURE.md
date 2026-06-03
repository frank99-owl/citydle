# System Architecture (ARCHITECTURE.md)

[中文文档 (Chinese Version)](ARCHITECTURE_zh.md)

This document describes the system design, data flow, and database schema for **Financial Street Cartographer** (金融街图志).

---

## 1. Overall Architectural Design

The system is built on a Next.js 14 full-stack monolithic architecture. The application is designed as a **Single Page Application (SPA)** at the root path (`/`) to achieve zero-latency game loading. The frontend consolidates the main landing lobby and the active game console on the same page, pre-initializing the Leaflet map container in the background immediately upon landing. The `/game` route acts as a lightweight client-side redirect wrapper, passing query params to the root route.

```
+-----------------------------------------------------------------------+
|                            Client Browser (SPA)                       |
|  - Leaflet.js (Background Initialized, Canvas Rendering)              |
|  - UI Views: Lobby Overlay & Game Sidebar (CSS Transition Driven)     |
|  - URL Parameter Sync (window.history.replaceState for bookmarks)     |
|  - State Management (Street List, Streaks, Guesses, Confetti)         |
+-----------------------------------+-----------------------------------+
                                    |
                          HTTPS (API Routes)
                                    |
+-----------------------------------v-----------------------------------+
|                           Next.js API Server                          |
|  - /api/streets (Static preset router & cached Overpass mirror race)  |
|  - /api/search (OSM Nominatim proxy for custom bounds lookup)        |
|  - /api/favorites (SQLite favorites CRUD)                             |
|  - /api/history (SQLite history & high score tracking)                |
+-----------------------------------+-----------------------------------+
                                    |
          +--------------------------+--------------------------+
          | (Geo Requests)           | (Search Proxy)           | (SQL Queries)
+--------v--------+        +--------v--------+        +--------v--------+
|  Overpass API   |        |  OSM Nominatim  |        | SQLite Database |
| (Parallel Race) |        | (Search Server) |        | (Lazy getDb())  |
+-----------------+        +-----------------+        +-----------------+
```

---

## 2. Frontend Module Architecture (Refactored)

The frontend has been refactored from a monolithic single-file component into a modular architecture with clear separation of concerns:

```
src/
├── app/
│   └── page.tsx                    # Root orchestrator (~570 lines)
│       - Composes hooks and components
│       - Manages top-level state transitions
│       - Handles API calls for history/favorites
├── types/
│   └── index.ts                    # Centralized TypeScript types
├── hooks/                          # Custom React hooks
│   ├── useLeafletMap.ts            # Map lifecycle, layers, drawing
│   ├── useMapProvider.ts           # Provider state, coordinate transforms
│   ├── useStreets.ts               # Street data fetching & caching
│   ├── useGameLogic.ts             # Guessing, streaks, hints, settlement
│   └── useLocalStorage.ts          # Persistent localStorage wrapper
├── components/
│   ├── map/GameMap.tsx              # Leaflet container + overlay
│   ├── lobby/                       # Lobby view components
│   │   ├── LobbyOverlay.tsx         # Main lobby container
│   │   ├── PresetCards.tsx          # City selection grid
│   │   ├── MapSettings.tsx          # Provider & difficulty controls
│   │   ├── HistoryTable.tsx         # Game history display
│   │   └── FavoritesList.tsx        # Saved maps list
│   ├── game/                        # Active game components
│   │   ├── GameSidebar.tsx          # Game sidebar container
│   │   ├── GameStats.tsx            # Score & completion display
│   │   ├── GuessInput.tsx           # Street name input form
│   │   ├── HintConsole.tsx          # Hint button & clue display
│   │   ├── StreakDisplay.tsx        # Streak counter
│   │   ├── StreetList.tsx           # Unlocked streets list
│   │   └── GameActions.tsx          # Save/forfeit/exit buttons
│   ├── settlement/
│   │   └── SettlementView.tsx       # End-game results & badge
│   └── shared/
│       ├── LanguageToggle.tsx       # Language switch button
│       └── LoadingSpinner.tsx       # Loading indicator
└── lib/                             # Utilities (unchanged)
    ├── constants.ts                 # Presets, achievements, types
    ├── i18n.ts                      # Translations (zh/en)
    ├── coord.ts                     # WGS-84/GCJ-02 conversions
    └── db.ts                        # SQLite singleton
```

### Hook Responsibilities

| Hook | Responsibility | Returns |
|------|---------------|---------|
| `useLeafletMap` | Map init/destroy, layer management, Geoman drawing | `mapRef`, drawing/layer operations |
| `useMapProvider` | Provider state, tile config, coordinate transforms | `mapProvider`, `toMapLatLng`, `toGameLatLng` |
| `useStreets` | Street API calls, fetch cancellation, loading state | `streets`, `fetchStreets`, `loading` |
| `useGameLogic` | Guess matching, streaks, hints, settlement, badges | Game state + action handlers |
| `useLocalStorage` | Read/write localStorage with SSR safety | `[value, setter]` |

### Component Hierarchy

```
<page.tsx>
├── <GameMap />                     # Background map
├── <LobbyOverlay />                # Lobby (fades out during game)
│   ├── <PresetCards />
│   ├── <MapSettings />
│   ├── <HistoryTable />
│   └── <FavoritesList />
├── <GameSidebar />                 # Game sidebar (slides in)
│   ├── <GameStats />
│   ├── <HintConsole />
│   ├── <StreakDisplay />
│   ├── <GuessInput />
│   ├── <StreetList />
│   └── <GameActions />
└── <SettlementView />              # Results overlay
```

---

## 3. Core Data Flow

### A. Street Quiz Data Flow (Game Initialization)
1. **Background Map Rendering & Mount**: The Leaflet map is initialized in the background behind a full-screen Lobby UI cover immediately on page load.
2. **Selection / Drawing**: The player selects a preset (e.g. London) or a favorite, or enters Custom Drawing Mode.
3. **Transition & Sync**:
   * The browser URL is immediately updated with coordinate parameters using `window.history.replaceState`.
   * The map centers/animates (`fitBounds`) to the target coordinate bounds with a padding offset (`paddingTopLeft: [400, 20]`) to ensure the bounds are centered perfectly in the open screen area next to the left sidebar console.
   * The Lobby UI fades out and scales up, while the Game Console sidebar slides in from the left over 500-600ms.
4. **API Request**: The frontend concurrently sends a `POST` request to `/api/streets` with the coordinates bounds.
5. **Preset Match (Instant)**:
   * The backend compares coordinates against known presets.
   * If matched, it reads the pre-compiled street names and geometry coordinates directly from `/data/presets/[preset-id].json` in under 10ms.
6. **Cache Check**:
   * If it is a custom box, the backend queries the local SQLite `street_cache` table using a parsed coordinate string key.
   * If a cache hit occurs, the streets geometry is parsed and returned instantly, bypassing external network queries.
7. **Parallel Overpass Race (On Cache Miss)**:
   * If it is a cache miss, the backend constructs an optimized regex query:
     `way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street|pedestrian|road)(_link)?$"]["name"](bounds);`
   * It concurrently queries 4 public Overpass API mirrors using `Promise.any` and aborts the trailing requests as soon as the fastest mirror responds.
   * The geometry data is processed, saved to SQLite `street_cache` for future hits, and returned.
8. **Frontend Rendering**: The frontend parses the list of street names and coordinates, then draws invisible path vectors on the Leaflet map. Guess inputs are automatically focused.

### B. Guess Matching and Streak Tracking (Gameplay)
1. The player types their guess in the input field.
2. The frontend performs fuzzy matching (ignoring case, trimming leading/trailing spaces).
3. If the guess is correct:
   * The opacity of the corresponding map vector path is set to `0.8`, the color turns dark green, and the map auto-pans/centers on the street.
   * The streak counter increases by 1. If the streak is greater than 1, a `canvas-confetti` particle animation is triggered.
   * The confetti particle count and dispersion angle scale linearly with the streak value:
     `particleCount = Math.min(30 + streak * 15, 180)`
4. If the guess is incorrect:
   * The streak counter is reset to `0`.

### C. Custom Mode Location Searching
1. In Custom Mode, the user inputs a city or address name in the search bar.
2. The frontend debounces inputs and hits the proxy `/api/search?q=...`.
3. The server forwards the query to OSM Nominatim to fetch matching locations with their bounding boxes and details.
4. The user selects a search result, and the map pans smoothly to the target coordinate bounds.

### D. Navigation Lifecycle (Closed Loop)
The UI forms a complete navigation loop. Every state has a clear path back to the lobby:

```
                  ┌──────────────────────────────────┐
                  │            LOBBY                  │
                  │  (Preset / Favorite / Custom)     │
                  └──┬─────────┬──────────┬───────────┘
                     │         │          │
              Preset │  Favorite│   Custom │
                     ▼         ▼          ▼
                  ┌─────────────────────────────────┐
                  │        LOADING STREETS           │
                  │  (Back to Lobby button visible)  │
                  └──────────┬──────────────────────┬┘
                             │                      │
                       loaded│               cancel │
                             ▼                      │
                  ┌──────────────────────┐          │
                  │    ACTIVE GAME       │          │
                  │  [Save] [Forfeit]    │          │
                  │  [Back to Lobby]     │──────────┤
                  └──────┬───────────────┘          │
                         │ forfeit / complete all   │
                         ▼                          │
                  ┌──────────────────────┐          │
                  │   SETTLE / RESULTS   │          │
                  │  [Back to Lobby]     │──────────┤
                  └──────────────────────┘          │
                                                    │
                             ┌──────────────────────┘
                             ▼
                  ┌──────────────────────┐
                  │      LOBBY           │ (history & favorites refreshed)
                  └──────────────────────┘
```

**Safety mechanisms:**
* **Fetch cancellation**: A `fetchIdRef` counter invalidates in-flight API responses when the user navigates away during loading, preventing stale state updates.
* **Exit confirmation**: During an active (unsettled) game, clicking "Back to Lobby" triggers a `window.confirm()` dialog to prevent accidental progress loss.
* **URL cleanup**: `returnToLobby()` clears URL search parameters, resets all game state, removes map layers, and refreshes the history/favorites lists.

---

## 4. Database Design (SQLite)

The project leverages Node.js 22.5+ native `node:sqlite` (`DatabaseSync`) synchronous interface. To prevent Next.js build-time static generation locks, the database is lazily initialized via a `getDb()` singleton pattern. 

**Vercel Serverless Deployment Workaround:**
Since Vercel's serverless runtime features a read-only filesystem (with the exception of `/tmp`), the database cannot write directly to the project root. On initialization, if the app detects a Vercel serverless environment, it copies the template database from `process.cwd()/data/cartographer.db` to `/tmp/cartographer.db` and loads it from there. If SQLite fails to initialize (e.g., due to local module mismatch or permission limits), the API routes fall back gracefully by returning empty arrays or HTTP 503 instead of crashing.

### Table Schemas:

#### 1. `users` (User Table)
* `id` (INTEGER, Primary Key): User identifier.
* `username` (TEXT, Unique): Username. Defaults to inserting a user named `Player` with `id = 1`.
* `created_at` (DATETIME): Account creation timestamp.

#### 2. `favorite_maps` (Saved Maps Table)
* `id` (INTEGER, Primary Key): Favorite ID.
* `user_id` (INTEGER, Foreign Key): References `users.id`.
* `name` (TEXT): A user-defined name for the saved region.
* `city_name` (TEXT, Nullable): Optional name of the associated city.
* `bounds` (TEXT): Serialized Bounding Box JSON string.

#### 3. `game_history` (Game History Table)
* `id` (INTEGER, Primary Key): Game record ID.
* `user_id` (INTEGER, Foreign Key): References `users.id`.
* `map_name` (TEXT): Name of the played region.
* `score` (INTEGER): Number of streets guessed correctly in this game session.
* `total_streets` (INTEGER): Total number of streets in the region.
* `completion_rate` (REAL): Exploration completion rate (`score / total_streets`).
* `max_streak` (INTEGER): Maximum streak achieved in the game session.
* `played_at` (DATETIME): Game session timestamp.

#### 4. `street_cache` (Street Cache Table)
* `id` (INTEGER, Primary Key): Cache entry ID.
* `bounds_key` (TEXT, Unique): Formatted bounding box key, e.g., `south_west_north_east` rounded to 4 decimal places.
* `streets_json` (TEXT): Serialized JSON array of street names and geometries.
* `created_at` (DATETIME): Cache creation timestamp.

---

## 5. Map & Rendering Optimizations

To deliver a premium, 60fps experience, the map rendering stack includes several optimization layers:

1. **Hardware-Accelerated CSS Filters**:
   * The custom vintage CSS filter (sepia, contrast, brightness tuning) is applied directly to the `.leaflet-tile-pane` container instead of individual `.leaflet-tile` images.
   * This enables the browser to perform a single compositing pass on the GPU, avoiding heavy CPU repaints during panning and zooming.

2. **Canvas-Based Vector Rendering**:
   * Leaflet is configured with `preferCanvas: true`.
   * Street geometries are drawn onto a single HTML5 Canvas element instead of generating thousands of heavy SVG DOM nodes, dramatically reducing memory overhead and layout recalculations.

3. **Smooth Tile Panning & Zoom Tuning**:
   * **`keepBuffer: 6`**: Retains a wider margin of off-screen tiles in memory, ensuring immediate rendering when panning.
   * **`updateWhenIdle: true`**: Postpones new tile downloads until panning has stopped, avoiding main-thread networking congestion.
   * **`updateWhenZooming: false`**: Disables map tile updates during zooming transitions to ensure fluid zoom animations.

4. **Anti-Cheat Design**:
   * Switched background tiles to CARTO Positron `light_nolabels` layer. This completely removes street and landmark text labels from the map tiles, ensuring that users can only identify street shapes and configurations without cheating.

---

## 6. Map Providers & Projection Systems

* **Supported Map Providers**:
  - **CartoDB Dark (`cartodb-dark`)**: Immersive dark paper aesthetic with labels removed for anti-cheat purposes. Uses standard WGS-84.
  - **CartoDB Light (`cartodb`)**: Standard light paper aesthetic with labels removed for anti-cheat purposes. Uses standard WGS-84.
  - **OpenStreetMap (`osm`)**: Standard osm tiles (including labels). Uses standard WGS-84.
  - **Amap (`amap`)**: Domestic Gaode Map tiles. Located in China, this provider offers extremely fast map loading speeds for users based in China.
* **Projection & GCJ-02 Coordinate Offsets**:
  - Amap tiles use the GCJ-02 coordinate system (also known as the Mars coordinate system), which is artificially offset from the standard WGS-84 coordinates.
  - To prevent alignment mismatch, the app implements translation functions (`wgs84togcj02` and `gcj02towgs84`) in `src/lib/coord.ts`.
  - When Amap is active, the app automatically translates street lines, bounds, and user-drawn rect polygons from WGS-84 to GCJ-02 when rendering them onto Leaflet layers. If the user shifts providers mid-game, the center point and all layers are dynamically recalculated and redrawn.
  - For standard providers (`osm`, `cartodb`, `cartodb-dark`), WGS-84 coords are rendered directly without offsets.

---

## 7. Gameplay Difficulty & Hint Systems

* **Easy Mode**: Offers first-letter clues (e.g. `W___ S_____`) and highlights/flashes the street geometry path in pulsing amber with a panning animation.
* **Medium Mode**: Offers only the first-letter word pattern clue. No map highlight or viewport panning.
* **Hard Mode**: Blind recall. No hints are available.
* **Hint Settle Statistics**: Settle statistics dynamically display the count of hints used if the user plays in Easy or Medium mode.

---

## 8. Multi-lingual Street Name Matching

To support international players in cities with local language street names (e.g. Japanese Kanji in Tokyo presets), a multi-lingual alias matching system is designed:

1. **Multi-lingual Aliases in Preset Data**: Streets contain an `aliases` array representing standard translations and transliterations (e.g., `["新宿通り", "Shinjuku-dori", "Shinjuku Street", "新宿路"]`):
   ```json
   {
     "name": "新宿通り",
     "geometry": [...],
     "aliases": ["新宿通り", "Shinjuku-dori", "Shinjuku Street", "新宿路"]
   }
   ```
2. **Fuzzy Normalization Matching**: When a guess is submitted, the matcher normalizes both the input and the aliases (converting to lowercase, stripping punctuation/spaces, and removing generic road suffixes like `street`, `road`, `通り`, `通`, `路`). If the normalized input matches *any* alias, the guess is approved.
3. **Contextual Clues**: Easy/Medium modes generate spelling clue patterns based on the user's active interface language (`lang = 'en' | 'zh'`) to provide accessible clues.


