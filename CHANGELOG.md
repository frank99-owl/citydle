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
- **HMAC Signature**: Leaderboard submissions signed with HMAC-SHA256 to deter tampering (`lib/hmac.ts`)
- **CI Pipeline**: GitHub Actions workflow (lint → test → build)
- Comprehensive documentation (README, ARCHITECTURE, CHANGELOG)

### Changed
- **Dual Context Architecture**: Split monolithic GameContext into LobbyContext (low-frequency: history, stats, achievements) + GameContext (high-frequency: guess, streak, map). Both wrapped with `useMemo()`.
- **Lazy Loading**: `next/dynamic` for SettlementView, AchievementPopup, ShareModal, AchievementPanel, StatsPanel, Leaderboard. Dynamic `import('canvas-confetti')` for on-demand loading.
- `useGameLogic.ts` now imports algorithms from `lib/matching.ts` instead of inline functions
- All 4 documentation files (README, ARCHITECTURE, both zh/en) synchronized with code changes

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
