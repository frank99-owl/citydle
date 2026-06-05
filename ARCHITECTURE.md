# System Architecture

[中文版](ARCHITECTURE_zh.md) | English

This document describes the technical architecture, data flows, and design decisions for **Financial Street Cartographer**.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Data Flow](#4-data-flow)
5. [Database Schema](#5-database-schema)
6. [Map & Rendering](#6-map--rendering)
7. [Multi-Language System](#7-multi-language-system)
8. [Achievement System](#8-achievement-system)
9. [Security & Anti-Cheat](#9-security--anti-cheat)
10. [Performance Optimizations](#10-performance-optimizations)

---

## 1. System Overview

### Architecture Pattern

The application uses a **Next.js 14 full-stack monolithic architecture** with:

- **Frontend**: React 18 SPA with custom hooks pattern
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: SQLite via Node.js native `node:sqlite`
- **External APIs**: Overpass API, Nominatim API

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    React SPA (page.tsx)                      ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐  ││
│  │  │  Lobby  │ │  Game   │ │ Settle  │ │ Achievement/Share│  ││
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────────┬────────┘  ││
│  │       │           │           │                │            ││
│  │  ┌────┴───────────┴───────────┴────────────────┴────────┐  ││
│  │  │                    Custom Hooks                        │  ││
│  │  │  useLeafletMap | useGameLogic | useAchievements | ... │  ││
│  │  └───────────────────────┬───────────────────────────────┘  ││
│  │                          │                                   ││
│  │  ┌───────────────────────┴───────────────────────────────┐  ││
│  │  │                    Leaflet.js Map                       │  ││
│  │  │        (Canvas rendering, Geoman drawing)               │  ││
│  │  └───────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js API Routes                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ /streets │ │ /search  │ │ /history │ │/favorites│          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       │            │            │            │                  │
│  ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐          │
│  │/leaderbrd│ │  /daily  │ │          │ │          │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Overpass │ │ Nominatim│ │  SQLite  │ │  SQLite  │
│   API    │ │   API    │ │ (cache)  │ │ (persist)│
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| SPA at root path `/` | Zero-latency game loading, pre-initialized map |
| SQLite over PostgreSQL | Zero-config, embedded, perfect for single-server |
| Canvas over SVG rendering | 60fps with thousands of polylines |
| Custom hooks over Redux | Simpler state management, co-located logic |
| Static preset JSON | Instant loading for popular cities |

---

## 2. Frontend Architecture

### Module Structure

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Root SPA shell (~175 lines)
│   ├── layout.tsx                # Global layout & fonts
│   ├── globals.css               # Theme & animations
│   └── api/                      # Serverless functions
├── context/                      # React Context
│   └── GameContext.tsx            # Game state provider (all hooks + logic)
├── types/                        # TypeScript definitions
│   └── index.ts                  # Centralized types
├── hooks/                        # Custom React hooks
│   ├── useLeafletMap.ts          # Map lifecycle & layers
│   ├── useMapProvider.ts         # Provider & coordinates
│   ├── useStreets.ts             # Street data fetching
│   ├── useGameLogic.ts           # Core game mechanics
│   ├── useAchievements.ts        # Achievement tracking
│   ├── useStats.ts               # Personal statistics
│   ├── useTutorial.ts            # Onboarding flow
│   ├── useShare.ts               # Share card generation
│   └── useLocalStorage.ts        # Persistent storage
├── components/                   # React components
│   ├── lobby/                    # Lobby views
│   │   └── LobbyView.tsx         # Tutorial button, error banner
│   ├── game/                     # Active game views
│   ├── settlement/               # Results view
│   ├── achievement/              # Achievement system
│   ├── share/                    # Social sharing
│   ├── leaderboard/              # Global rankings
│   ├── stats/                    # Personal stats
│   ├── tutorial/                 # Onboarding
│   └── shared/                   # Reusable UI
├── lib/                          # Utilities
│   ├── constants.ts              # Presets & config
│   ├── i18n.ts                   # Translations
│   ├── coord.ts                  # Coordinate math
│   ├── db.ts                     # SQLite singleton
│   ├── daily.ts                  # Daily challenge
│   ├── matching.ts               # Core algorithms (Levenshtein, matching, hints)
│   ├── rate-limit.ts             # Sliding window rate limiter
│   └── hmac.ts                   # HMAC-SHA256 signing for leaderboard
└── data/                         # Static data
    └── presets/                   # Street geometries
```

### Hook Architecture

Each hook encapsulates a specific domain of logic:

| Hook | State | Operations | Dependencies |
|------|-------|------------|--------------|
| `useLeafletMap` | `mapRef`, `mapLoaded` | init, destroy, layer ops, drawing | Leaflet, Geoman |
| `useMapProvider` | `mapProvider` | switch provider, convert coords | `coord.ts` |
| `useStreets` | `streets`, `loading` | fetch, cancel, cache | `/api/streets` |
| `useGameLogic` | `guess`, `streak`, `score` | match, hint, settle | `i18n.ts` |
| `useAchievements` | `unlocked`, `popup` | check, unlock, display | `localStorage` |
| `useStats` | `stats` | update, daily challenge | `localStorage`, `/api/daily` |
| `useTutorial` | `step`, `isActive` | start, next, skip | `localStorage` |
| `useShare` | - | generate image, share | Canvas API |
| `useLocalStorage` | `value` | read, write, sync | `localStorage`, `storage` event |

### Component Hierarchy

```
<page.tsx>
│
└── <GameProvider>                       # Context provider (all state + hooks)
    │
    └── <GameContent>                    # Consumer, wires props to children
        │
        ├── <GameMap />                  # Background map
        │
        ├── <LobbyOverlay />            # Lobby (CSS transition)
        │   ├── <DailyChallengeCard />  # Daily challenge widget
        │   ├── <PresetCards />         # City selection
        │   ├── <MapSettings />         # Provider & difficulty
        │   └── <Tabs>
        │       ├── <HistoryTable />    # Game history
        │       ├── <FavoritesList />   # Saved maps
        │       ├── <AchievementPanel /># Achievements
        │       ├── <StatsPanel />      # Personal stats
        │       └── <Leaderboard />     # Global rankings
        │
        ├── <LobbyView />               # Tutorial button, error banner, tutorial overlay
        │
        ├── <GameSidebar />             # Game sidebar (slides in)
        │   ├── <GameStats />           # Score display
        │   ├── <HintConsole />         # Hint button
        │   ├── <StreakDisplay />       # Streak counter
        │   ├── <GuessInput />          # Input form
        │   ├── <StreetList />          # Street list
        │   └── <GameActions />         # Action buttons
        │
        ├── <SettlementView />          # Results (inside sidebar)
        │
        ├── <AchievementPopup />        # Unlock notification
        │
        └── <ShareModal />              # Share options
```

### State Management

No external state management library. State flows through:

1. **GameContext** (`context/GameContext.tsx`): Single source of truth — all game state, hook initialization, and business logic live in the Provider. Components consume via `useGame()`.
2. **Custom hooks**: Domain-specific logic encapsulated in hooks, initialized inside the Provider.
3. **Props**: Parent-to-child communication (context value → component props).
4. **localStorage**: Persistent user preferences and data.
5. **URL params**: Shareable game state.

---

## 3. Backend Architecture

### API Routes

| Route | Method | Purpose | Data Source |
|-------|--------|---------|-------------|
| `/api/streets` | POST | Fetch street data | Presets, SQLite cache, Overpass |
| `/api/search` | GET | Location search | Nominatim API |
| `/api/favorites` | GET/POST/DELETE | Saved maps CRUD | SQLite |
| `/api/history` | GET/POST | Game history | SQLite |
| `/api/leaderboard` | GET/POST | Global rankings | SQLite |
| `/api/daily` | GET | Daily challenge | Date-based hash |

### Database Layer

```typescript
// lib/db.ts - Singleton pattern
let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync | null {
  if (!dbInstance) {
    // Lazy initialization
    // Vercel: copy to /tmp
    // Local: use data/ directory
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    // Create tables...
  }
  return dbInstance;
}
```

**Vercel Workaround**: On serverless, the DB is copied from read-only project space to writable `/tmp`. Data resets on cold starts.

---

## 4. Data Flow

### Game Initialization Flow

```
User clicks preset →
  1. page.tsx: setBounds(preset.bounds)
  2. useLeafletMap: fitBounds(bounds)
  3. useStreets: fetchStreets(bounds)
     ├── POST /api/streets { bounds }
     │   ├── Check preset match → return local JSON (<10ms)
     │   ├── Check SQLite cache → return cached data
     │   └── Race 4 Overpass mirrors → process & cache
     └── Return streets[]
  4. useLeafletMap: drawStreets(streets)
  5. UI transition: Lobby fades out, Sidebar slides in
```

### Guess Matching Flow

```
User submits guess →
  1. useGameLogic: checkGuess(guess, streets, bounds, lang)
     ├── Normalize input (lowercase, trim, strip punctuation)
     ├── For each unguessed street:
     │   ├── Check name match
     │   └── Check aliases[] match
     ├── If no exact match:
     │   ├── Calculate Levenshtein similarity
     │   └── If >60% similar → return hint
     └── Return { found, matchedName, hint?, direction? }
  2. If found:
     ├── useLeafletMap: revealStreet(name) → green polyline
     ├── Update streak counter
     ├── Trigger confetti (scaled by streak)
     └── Check achievements
  3. If not found:
     ├── Show error animation (1s)
     ├── Show hint if available
     └── Reset streak
```

### Achievement Check Flow

```
Game ends →
  1. useAchievements: checkAchievements(gameResult)
     ├── Load unlocked[] from localStorage
     ├── For each achievement:
     │   ├── Progress: completionRate >= threshold
     │   ├── City Master: city === id && rate >= 1.0
     │   ├── Skill: streak/time/errors check
     │   └── Exploration: customUses/citySearches count
     ├── Filter newly unlocked
     ├── Save to localStorage
     └── Return newlyUnlocked[]
  2. For each newly unlocked:
     ├── Show AchievementPopup (queue)
     ├── Metal sheen animation
     └── Auto-dismiss after 2.5s
```

---

## 5. Database Schema

### Tables

```sql
-- User accounts (default: id=1, username='Player')
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Saved map regions
CREATE TABLE favorite_maps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  city_name TEXT,
  bounds TEXT NOT NULL,  -- JSON: { south, west, north, east }
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Game history
CREATE TABLE game_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 1,
  map_name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_streets INTEGER NOT NULL DEFAULT 0,
  completion_rate REAL NOT NULL DEFAULT 0,
  max_streak INTEGER NOT NULL DEFAULT 0,
  played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Street data cache (custom areas)
CREATE TABLE street_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bounds_key TEXT UNIQUE NOT NULL,  -- "south_west_north_east"
  streets_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Global leaderboard
CREATE TABLE leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name TEXT NOT NULL DEFAULT 'Anonymous',
  city TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_streets INTEGER NOT NULL,
  completion_rate REAL NOT NULL,
  max_streak INTEGER NOT NULL,
  time_seconds INTEGER NOT NULL,
  played_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes

```sql
CREATE INDEX idx_history_user ON game_history(user_id);
CREATE INDEX idx_history_played ON game_history(played_at);
CREATE INDEX idx_leaderboard_city ON leaderboard(city);
CREATE INDEX idx_leaderboard_rate ON leaderboard(completion_rate DESC);
CREATE INDEX idx_cache_key ON street_cache(bounds_key);
```

---

## 6. Map & Rendering

### Tile Providers

| Provider | URL | Labels | Coordinate System |
|----------|-----|--------|-------------------|
| CartoDB Dark | `basemaps.cartocdn.com/dark_nolabels` | No | WGS-84 |
| CartoDB Light | `basemaps.cartocdn.com/light_nolabels` | No | WGS-84 |
| OpenStreetMap | `tile.openstreetmap.org` | Yes | WGS-84 |
| Amap | `webrd0{s}.is.autonavi.com` | Yes | GCJ-02 |

### GCJ-02 Coordinate Correction

Chinese map providers use the GCJ-02 coordinate system (offset from WGS-84). The app handles this:

```typescript
// src/lib/coord.ts
export function wgs84togcj02(lng: number, lat: number): [number, number]
export function gcj02towgs84(lng: number, lat: number): [number, number]
```

When Amap is active:
- Street geometries: WGS-84 → GCJ-02
- Bounds: WGS-84 → GCJ-02
- User drawings: GCJ-02 → WGS-84 (for storage)

### Rendering Pipeline

```
Street data[] →
  1. Convert coordinates (WGS-84 → GCJ-02 if Amap)
  2. Create Leaflet polyline for each street
  3. Set initial opacity: 0 (invisible)
  4. Add to canvas layer (preferCanvas: true)
  5. On guess: update opacity to 0.8, color to green
```

### Performance Settings

```typescript
L.map(container, {
  preferCanvas: true,        // Canvas over SVG
  zoomControl: false,        // Custom position
  attributionControl: true,
});

L.tileLayer(url, {
  keepBuffer: 6,             // Extra tiles in memory
  updateWhenIdle: true,      // Download after pan stops
  updateWhenZooming: false,  // No downloads during zoom
  maxZoom: 20,
});
```

---

## 7. Multi-Language System

### Translation Architecture

```typescript
// src/lib/i18n.ts
export const TRANSLATIONS = {
  zh: { /* 150+ keys */ },
  en: { /* 150+ keys */ },
};
```

### Street Name Matching

```typescript
// src/hooks/useGameLogic.ts
function matchesAlias(guess: string, street: Street): boolean {
  const normalized = normalizeString(guess);
  
  // Check primary name
  if (normalizeString(street.name) === normalized) return true;
  
  // Check aliases
  if (street.aliases?.some(a => normalizeString(a) === normalized)) return true;
  
  return false;
}

function normalizeString(s: string): string {
  return s.toLowerCase()
    .trim()
    .replace(/[\s\-_.]/g, '')  // Strip separators
    .replace(/[^\w一-鿿぀-ゟ゠-ヿ]/g, ''); // Keep CJK
}
```

### Hint Pattern Generation

```typescript
function generateHintPattern(name: string, lang: Language): string {
  // CJK: first char + underscores
  // Latin: first letter + underscores per word
  if (/[一-鿿぀-ゟ]/.test(name)) {
    return name[0] + '_'.repeat(name.length - 1);
  }
  return name.split(' ').map(w => w[0] + '_'.repeat(w.length - 1)).join(' ');
}
```

---

## 8. Achievement System

### Achievement Categories

| Category | Count | Criteria |
|----------|-------|----------|
| Progress | 3 | Completion rate thresholds |
| City Master | 5 | 100% per city |
| Skill | 3 | Streak, speed, perfection |
| Exploration | 2 | Custom areas, city searches |

### Storage

```typescript
// localStorage keys
'cartographer_achievements'  // string[] of unlocked achievement IDs
'cartographer_stats'         // { customUses, citySearches, speedGuesses }
```

### Unlock Flow

```
Game ends →
  checkAchievements(gameResult) →
    newlyUnlocked[] →
      Queue popups →
        Show one by one →
          Auto-dismiss after 2.5s
```

---

## 9. Security & Anti-Cheat

### Map Anti-Cheat
- Label-free tiles (CartoDB dark/light_nolabels)
- Street names never shown until guessed

### Leaderboard Validation
```typescript
// Server-side validation
if (completionRate < 0 || completionRate > 1) return 400;
if (score < 0 || score > totalStreets) return 400;
if (maxStreak < 0 || maxStreak > totalStreets) return 400;
if (timeSeconds < 0 || timeSeconds > 86400) return 400;
if (playerName.length > 20) playerName = playerName.slice(0, 20);
```

### HMAC Signature (Anti-Tampering)

Leaderboard submissions include an HMAC-SHA256 signature (`lib/hmac.ts`):
- Client signs the payload before sending
- Server verifies the signature; rejects invalid submissions with 403
- Uses Web Crypto API for signing/verification
- Note: key is client-embedded, so determined attackers can still forge; this deters casual tampering

### Rate Limiting

API endpoints are protected by an in-memory sliding window rate limiter (`lib/rate-limit.ts`):

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/leaderboard` | 10 req | 60s |
| `POST /api/streets` | 30 req | 60s |
| `GET /api/search` | 20 req | 60s |

Returns `429 Too Many Requests` with `Retry-After` header when exceeded.

### Daily Challenge Integrity
- Deterministic hash based on date seed
- Same challenge for all users on same day
- Server-side generation (not client-trusted)

### Known Limitations
- No user authentication (anonymous play)
- Rate limiter is in-memory (resets on serverless cold starts)

---

## 10. Performance Optimizations

### Frontend

| Optimization | Implementation |
|--------------|----------------|
| React.memo | All pure display components |
| Canvas rendering | `preferCanvas: true` for Leaflet |
| Incremental updates | Only redraw changed streets |
| Lazy loading | Dynamic imports for Leaflet, Geoman |
| CSS animations | GPU-accelerated transforms |
| Debounced search | 300ms delay on location search |

### Backend

| Optimization | Implementation |
|--------------|----------------|
| Preset matching | Local JSON (<10ms) |
| SQLite cache | Avoid repeated Overpass queries |
| Parallel racing | 4 mirrors, fastest wins |
| Lazy DB init | Avoid build-time locks |
| WAL mode | Concurrent read/write |

### Bundle Size

```
Route (app)                    Size      First Load JS
┌ ○ /                          39 kB     126 kB
├ ○ /_not-found                875 B     88.2 kB
└ ƒ /api/*                     ~0 B      ~0 B (server only)
```

---

## Appendix: File Reference

### Core Files

| File | Lines | Purpose |
|------|-------|---------|
| `app/page.tsx` | ~175 | Root SPA shell (renders context consumer) |
| `context/GameContext.tsx` | ~940 | Game state provider (all hooks + logic) |
| `hooks/useGameLogic.ts` | ~230 | Core game mechanics (delegates to matching.ts) |
| `hooks/useLeafletMap.ts` | ~350 | Map lifecycle |
| `lib/matching.ts` | ~110 | Core algorithms: Levenshtein, matching, hints |
| `lib/i18n.ts` | ~200 | Translations |
| `lib/constants.ts` | ~100 | Presets & config |
| `lib/rate-limit.ts` | ~60 | Sliding window rate limiter |
| `lib/hmac.ts` | ~70 | HMAC-SHA256 signing |
| `components/lobby/LobbyView.tsx` | ~90 | Tutorial button & error banner |

### Data Files

| File | Streets | Size |
|------|---------|------|
| `data/presets/new-york.json` | 141 | ~150KB |
| `data/presets/london.json` | 360 | ~300KB |
| `data/presets/tokyo.json` | 55 | ~50KB |
| `data/presets/hong-kong.json` | 155 | ~130KB |
| `data/presets/singapore.json` | 174 | ~150KB |
