# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- **GameContext**: Extracted all game state and logic from page.tsx into `context/GameContext.tsx` (page.tsx 955→180 lines, GameContext.tsx ~990 lines)
- **LobbyView**: Extracted tutorial button and error banner into `components/lobby/LobbyView.tsx`
- **GameMap**: Extracted background map into `components/map/GameMap.tsx` (memo'd)
- **Core Algorithm Tests**: 44 unit tests for matching functions using Vitest
- **Matching Module**: Extracted pure functions (Levenshtein, similarity, normalization, hints) into `lib/matching.ts`
- **Rate Limiting**: In-memory sliding window rate limiter for API endpoints (`lib/rate-limit.ts`)
- **CI Pipeline**: GitHub Actions workflow (lint → test → build)
- Comprehensive documentation (README, ARCHITECTURE, CHANGELOG)
- **SEO**: OpenGraph/Twitter card metadata, canonical URL, JSON-LD WebApplication structured data
- **SEO**: `robots.txt` and dynamic `sitemap.xml`
- **Accessibility**: Semantic HTML (`<main>`, `<aside>`, `role="tablist"`, `role="tabpanel"`, `role="alert"`)
- **Accessibility**: ARIA labels on map, sidebar, lobby dialog, filter buttons, input field
- **Accessibility**: `prefers-reduced-motion` media query disables animations for users who prefer reduced motion
- **Performance**: `next.config.js` — gzip compression, AVIF/WebP image formats, `optimizePackageImports` for Leaflet
- **Exit Confirmation**: Custom styled confirmation dialog replaces `window.confirm()` for game exit
- **Accessibility**: ShareModal focus trap, `role="dialog"`, `aria-modal`, close button `aria-label`
- **Accessibility**: AchievementPopup `role="alert"`, `aria-live="assertive"`, Escape key dismiss

### Fixed
- **Street guessed state**: `updateStreetGuessed` now wired up in `handleGuessSubmit` — StreetList filter (guessed/unguessed) works correctly during gameplay
- **Game time tracking**: `timeMs` in `GameResult` now passes actual elapsed milliseconds instead of 0
- **useStats stale closure**: Changed `gameStartTime` from `useState` to `useRef` to prevent stale closure in `updateStats`
- **useGameLogic dependency**: Added missing `clearHint` dependency to `updateDifficulty` callback, reordered declarations

### Changed
- **Dual Context Architecture**: Split monolithic GameContext into LobbyContext (low-frequency: history, stats, achievements) + GameContext (high-frequency: guess, streak, map). Both wrapped with `useMemo()`.
- **Lazy Loading**: `next/dynamic` for SettlementView, AchievementPopup, ShareModal, AchievementPanel, StatsPanel, Leaderboard. Dynamic `import('canvas-confetti')` for on-demand loading.
- `useGameLogic.ts` now imports algorithms from `lib/matching.ts` instead of inline functions
- All 4 documentation files (README, ARCHITECTURE, both zh/en) synchronized with code changes
- **Performance**: Levenshtein algorithm optimized from O(m×n) to O(min(m,n)) space
- **Performance**: StreetList items use `content-visibility: auto` for off-screen rendering skip
- **Performance**: `drawStreets` incremental update — reuses existing layers when street set unchanged
- **Performance**: API preset JSON files loaded with `fs.promises.readFile` instead of `fs.readFileSync`
- **Performance**: Achievement badge image converted from PNG to WebP (1,034KB → 214KB, -79%)
- **Performance**: All `alert()` calls replaced with state-driven inline error messages
- **Accessibility**: `<html lang>` now dynamically synced with language toggle (was hardcoded `zh`)
- **Accessibility**: LobbyOverlay `aria-modal` corrected from `false` to `true`
- **Security**: Removed client-side HMAC signing (secret was exposed in JS bundle); server-side range validation remains as anti-cheat
- **Security**: Leaderboard POST no longer accepts optional signature field
- **Security**: Favorites `name` field sanitized (trim, strip HTML, limit 100 chars)
- **Security**: Favorites DELETE validates `id` as positive integer
- **Security**: Search API filters Nominatim response to only return needed fields
- **Types**: Removed unused `customUsed`, `searchedCities`, `speedGuesses` fields from `GameResult`
- **i18n**: Unified all ~65 inline translation strings across 16 component files into `i18n.ts` (added ~35 new keys)
- **i18n**: Removed duplicated `isZh()` helper from ShareModal.tsx and Leaderboard.tsx
- **i18n**: Refactored `getDirectionLabel` in matching.ts to accept `DirectionLabels` object instead of raw language string
- **Bug fix**: GameSidebar subtitle was showing English when `lang=zh` and vice versa (reversed ternary)

## [2.0.0] - 2026-06-04

### Added
- **Multi-Language Support**: Street names now support English, Chinese, and Japanese input with fuzzy matching (Levenshtein distance 60% threshold)
- **Tutorial System**: 3-step interactive onboarding for new users with auto-start and replay button
- **Enhanced Guess Feedback**: Close match hints, direction hints after 3 consecutive errors, progress bar with encouragement messages
- **Expanded Achievement System**: 11 achievements across 4 series (Progress, City Master, Skill, Exploration)
- **Personal Statistics Panel**: Games played, streets guessed, favorite city, play time tracking
- **Daily Challenge**: Deterministic daily area with streak tracking, server-side generation
- **Share Cards**: Canvas-generated vintage-style achievement cards with save/copy/share options
- **Global Leaderboard**: SQLite-backed rankings with city/time filtering, input validation
- **Cross-Tab Sync**: localStorage changes sync across browser tabs
- **Error Recovery**: Friendly error messages with retry options for API failures
- **Empty State Handling**: Graceful handling when no streets found in area

### Changed
- Modular frontend architecture: split monolithic page.tsx into 22+ component/hook files
- React.memo applied to all pure display components for performance
- Street layer rendering optimized: incremental updates instead of full redraw
- Achievement popups use queue system for sequential display
- Leaderboard POST validates all numeric ranges server-side
- Daily challenge deduplication prevents same-day double counting

### Fixed
- Badge description showing undefined (was using badge.id instead of badge.tier)
- Daily challenge streak double-counting on same day
- AchievementPopup useEffect dependency causing potential infinite loop
- setInterval leak in hint pulse animation on component unmount
- StreetList using array index as React key (now uses street name)
- Non-null assertion in direction hint calculation
- Share link now includes game state parameters

### Security
- Leaderboard input validation: completionRate 0-1, score ≤ totalStreets, maxStreak ≤ totalStreets, timeSeconds ≤ 86400
- Player name sanitization: trim, slice(0,20), default "Anonymous"

## [1.0.0] - 2026-05-21

### Added
- Initial release
- 5 preset financial centers (New York, London, Tokyo, Hong Kong, Singapore)
- Custom area drawing with Geoman
- 3 difficulty modes (Easy, Medium, Hard)
- Hint system with first-letter clues
- Streak counter with confetti animations
- 3-tier achievement system (Explorer, Navigator, Cartographer Master)
- Game history and favorites
- Multi-map provider support (CartoDB, OpenStreetMap, Amap)
- GCJ-02 coordinate correction for Chinese maps
- SQLite database with lazy initialization
- Vercel serverless compatibility
- Bilingual UI (Chinese, English)
