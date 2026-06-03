# Financial Street Cartographer

[中文版](README_zh.md) | English

> A vintage-styled street guessing game that tests your geographical knowledge of the world's financial districts.

**Financial Street Cartographer** is a full-stack web application where players spell out street names on an interactive parchment-style map. Choose from 5 preset financial centers or draw custom areas anywhere in the world.

---

## ✨ Features

### 🎮 Core Gameplay
- **5 Preset Financial Centers**: New York (Wall Street), London (City), Tokyo (Marunouchi), Hong Kong (Central), Singapore (Downtown)
- **Custom Area Mode**: Draw any region on the map to create your own challenge
- **Location Search**: Search for any city or address to jump to that location
- **Multi-Language Street Matching**: Input street names in English, Chinese, or Japanese (with fuzzy matching)

### 🗺️ Map Experience
- **Vintage Paper Aesthetics**: Dark parchment theme with sepia-toned maps
- **60fps Performance**: GPU-accelerated CSS filters, canvas vector rendering
- **Anti-Cheat Design**: Label-free map tiles prevent reading street names
- **4 Map Providers**: CartoDB Dark, CartoDB Light, OpenStreetMap, Amap (China-optimized)
- **GCJ-02 Coordinate Correction**: Automatic coordinate translation for Chinese maps

### 🏆 Achievement System (11 Achievements)
| Series | Achievements | Description |
|--------|-------------|-------------|
| **Progress** | Explorer, Navigator, Cartographer Master | 10%, 50%, 80% completion |
| **City Master** | 5 city-specific achievements | 100% completion per city |
| **Skill** | Streak Master, Lightning Hand, Sharpshooter | 20+ streak, 5 in 30s, zero errors |
| **Exploration** | Pathfinder, City Hunter | 10 custom areas, 20 city searches |

### 📊 Statistics & Challenges
- **Personal Stats Panel**: Games played, streets guessed, favorite city, play time
- **Daily Challenge**: Deterministic daily area with streak tracking
- **Game History**: Complete log of all games with scores and completion rates
- **Favorites**: Save and replay your favorite map regions

### 💡 Difficulty Modes
| Mode | Hints | Map Highlight | Description |
|------|-------|---------------|-------------|
| **Easy** | First letter + pattern | ✅ Pulsing amber | Best for learning |
| **Medium** | First letter + pattern | ❌ | Moderate challenge |
| **Hard** | None | ❌ | Pure recall |

### 📤 Social Features
- **Share Cards**: Canvas-generated vintage-style achievement cards
- **Share Options**: Save image, copy link, Twitter, WeChat
- **Leaderboard**: SQLite-backed global rankings with city/time filtering
- **Player Profiles**: Persistent name and statistics

### 🌐 Internationalization
- **Full Bilingual UI**: Chinese (中文) and English
- **Localized Street Names**: Preset data includes native names + translations
- **Smart Hints**: Pattern generation adapts to CJK and Latin characters

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── page.tsx                    # Root SPA orchestrator
│   ├── layout.tsx                  # Global layout & fonts
│   ├── globals.css                 # Theme variables & animations
│   └── api/                        # Serverless API routes
│       ├── streets/route.ts        # Street data (preset + Overpass)
│       ├── search/route.ts         # Nominatim location proxy
│       ├── favorites/route.ts      # Saved maps CRUD
│       ├── history/route.ts        # Game history & scores
│       ├── leaderboard/route.ts    # Global rankings
│       └── daily/route.ts          # Daily challenge generation
├── types/
│   └── index.ts                    # Centralized TypeScript types
├── hooks/
│   ├── useLeafletMap.ts            # Map lifecycle & layer management
│   ├── useMapProvider.ts           # Provider switching & coordinate transforms
│   ├── useStreets.ts               # Street data fetching & caching
│   ├── useGameLogic.ts             # Core game mechanics
│   ├── useAchievements.ts          # Achievement tracking & popups
│   ├── useStats.ts                 # Personal statistics
│   ├── useTutorial.ts              # Onboarding flow
│   ├── useShare.ts                 # Share card generation
│   └── useLocalStorage.ts          # Persistent storage with cross-tab sync
├── components/
│   ├── lobby/                      # Lobby view components
│   │   ├── LobbyOverlay.tsx        # Main lobby container
│   │   ├── PresetCards.tsx         # City selection grid
│   │   ├── MapSettings.tsx         # Provider & difficulty controls
│   │   ├── HistoryTable.tsx        # Game history display
│   │   ├── FavoritesList.tsx       # Saved maps list
│   │   ├── DailyChallengeCard.tsx  # Daily challenge widget
│   │   └── AchievementPanel.tsx    # Achievement gallery
│   ├── game/                       # Active game components
│   │   ├── GameSidebar.tsx         # Game sidebar container
│   │   ├── GameStats.tsx           # Score & progress display
│   │   ├── GuessInput.tsx          # Street name input
│   │   ├── HintConsole.tsx         # Hint button & clues
│   │   ├── StreakDisplay.tsx       # Streak counter
│   │   ├── StreetList.tsx          # Street list with filters
│   │   └── GameActions.tsx         # Save/forfeit/exit buttons
│   ├── settlement/
│   │   └── SettlementView.tsx      # End-game results & sharing
│   ├── achievement/
│   │   ├── AchievementPopup.tsx    # Unlock notification
│   │   └── AchievementPanel.tsx    # Achievement gallery
│   ├── share/
│   │   ├── ShareCard.tsx           # Canvas share card generator
│   │   └── ShareModal.tsx          # Share options modal
│   ├── leaderboard/
│   │   └── Leaderboard.tsx         # Global rankings table
│   ├── stats/
│   │   └── StatsPanel.tsx          # Personal statistics
│   ├── tutorial/
│   │   └── TutorialOverlay.tsx     # Onboarding tutorial
│   └── shared/
│       ├── LanguageToggle.tsx      # Language switch
│       └── LoadingSpinner.tsx      # Loading indicator
├── lib/
│   ├── constants.ts                # Presets, achievements, types
│   ├── i18n.ts                     # Translations (zh/en)
│   ├── coord.ts                    # WGS-84/GCJ-02 conversions
│   ├── db.ts                       # SQLite singleton
│   └── daily.ts                    # Daily challenge generation
└── data/
    └── presets/                     # Pre-compiled street data
        ├── new-york.json            # 141 streets
        ├── london.json              # 360 streets
        ├── tokyo.json               # 55 streets
        ├── hong-kong.json           # 155 streets
        └── singapore.json           # 174 streets
```

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS + CSS Variables |
| **Map** | Leaflet.js + Geoman |
| **Tiles** | CARTO Positron (label-free) |
| **Geocoding** | OpenStreetMap Nominatim |
| **Street Data** | Overpass API (4 mirrors, parallel racing) |
| **Database** | SQLite (Node.js native `node:sqlite`) |
| **Animations** | canvas-confetti |
| **Fonts** | Cinzel (display), IM Fell English (body) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 22.x or later
- npm 10.x or later

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/financial-street-cartographer.git
cd financial-street-cartographer

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

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

## 📦 Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/financial-street-cartographer)

**Note**: SQLite database is copied to `/tmp` on Vercel serverless. Data resets on cold starts. For persistent storage, consider:
- Vercel Postgres
- Turso (SQLite-compatible)
- PlanetScale

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

## 🔌 API Reference

### `POST /api/streets`

Fetch street data for a bounding box.

**Request Body:**
```json
{
  "bounds": {
    "south": 40.6981,
    "west": -74.0201,
    "north": 40.7209,
    "east": -73.9977
  }
}
```

**Response:**
```json
{
  "streets": [
    {
      "name": "Wall Street",
      "geometry": [[40.7074, -74.0113], ...],
      "aliases": ["Wall Street", "华尔街"]
    }
  ],
  "count": 141,
  "source": "local_preset"
}
```

### `GET /api/search?q={query}`

Search for locations via Nominatim.

### `GET /api/leaderboard?city={city}&period={daily|weekly|all}`

Get top 50 scores.

### `POST /api/leaderboard`

Submit a score (validates all fields server-side).

### `GET /api/daily`

Get today's challenge parameters.

---

## 🧪 Testing

```bash
# Build verification
npm run build

# Lint check
npm run lint
```

---

## 📄 License

MIT

---

## 🙏 Acknowledgments

- [OpenStreetMap](https://www.openstreetmap.org/) for map data
- [CARTO](https://carto.com/) for tile styles
- [Leaflet.js](https://leafletjs.com/) for the interactive map
- [Overpass API](https://overpass-api.de/) for street data
- [canvas-confetti](https://github.com/catdad/canvas-confetti) for celebrations
