/**
 * Game action factories.
 * Each function receives its dependencies as parameters and returns a callback.
 * This keeps GameContext.tsx focused on state declarations and wiring.
 */
import { PRESETS } from "@/lib/constants";
import { TRANSLATIONS, Language } from "@/lib/i18n";
import {
  Bounds,
  Favorite,
  MapProvider,
  Difficulty,
  Street,
  HintClue,
  GameResult,
  Preset,
} from "@/types";
import { PlayerStats } from "@/hooks/useStats";

// ============================================================
// Helper: extract display name from preset based on language
// ============================================================
export function getPresetDisplayName(preset: Preset, lang: Language): string {
  return lang === "zh"
    ? preset.name.split(" ")[0]
    : preset.name.split(" ").slice(1).join(" ") || preset.name;
}

// ============================================================
// Helper: show error message with auto-clear
// ============================================================
export function showError(
  setter: (v: string | null) => void,
  message: string,
  clearTimer: ReturnType<typeof setTimeout> | null,
): ReturnType<typeof setTimeout> {
  setter(message);
  if (clearTimer) clearTimeout(clearTimer);
  return setTimeout(() => setter(null), 3000);
}

// ============================================================
// Game start dependencies (shared by startGame, startFromFavorite, startDailyChallenge)
// ============================================================
export interface GameStartDeps {
  lang: Language;
  setMapName: (v: string) => void;
  setCurrentMapId: (v: string) => void;
  setCustomMode: (v: boolean) => void;
  setBounds: (v: Bounds | null) => void;
  setShowResult: (v: boolean) => void;
  clearGameHint: () => void;
  clearHint: () => void;
  setErrorMessage: (v: string | null) => void;
  setHintMessage: (v: string | null) => void;
  setDirectionMessage: (v: string | null) => void;
  resetGameTracking: () => void;
  setTotalErrors: (v: number | ((prev: number) => number)) => void;
  setIsDailyChallenge: (v: boolean) => void;
  setGameTimeSeconds: (v: number) => void;
  fetchStreets: (bounds: Bounds) => void;
  startGameTimer: () => void;
  gameStartTimeRef: React.MutableRefObject<number>;
  setIsTransitioning: (v: boolean) => void;
  setView: (v: "lobby" | "game") => void;
  setGameStarted: (v: boolean) => void;
  updateURLParams: (params: Record<string, any> | null) => void;
}

// ============================================================
// Reset game state for a fresh start
// ============================================================
export function resetForNewGame(deps: GameStartDeps) {
  deps.setShowResult(false);
  deps.clearGameHint();
  deps.clearHint();
  deps.setErrorMessage(null);
  deps.setHintMessage(null);
  deps.setDirectionMessage(null);
  deps.resetGameTracking();
  deps.setTotalErrors(0);
  deps.setGameTimeSeconds(0);
}

// ============================================================
// Transition to game view
// ============================================================
export function transitionToGame(
  deps: GameStartDeps,
  name: string,
  bounds: Bounds,
) {
  deps.setMapName(name);
  deps.setIsTransitioning(true);
  deps.setView("game");
  deps.setGameStarted(true);
  deps.fetchStreets(bounds);
  deps.updateURLParams({
    name,
    south: bounds.south,
    west: bounds.west,
    north: bounds.north,
    east: bounds.east,
  });
  setTimeout(() => deps.setIsTransitioning(false), 600);
}

// ============================================================
// Start timer + ref
// ============================================================
export function startTimer(
  deps: GameStartDeps,
) {
  deps.startGameTimer();
  deps.gameStartTimeRef.current = Date.now();
}

// ============================================================
// Confetti effects for streaks
// ============================================================
export function triggerStreakConfetti(streakCount: number) {
  import("canvas-confetti").then(({ default: confetti }) => {
    if (streakCount >= 20) {
      confetti({
        particleCount: 200,
        spread: 160,
        startVelocity: 40,
        origin: { y: 0.5 },
      });
      setTimeout(() => {
        confetti({
          particleCount: 120,
          angle: 60,
          spread: 80,
          origin: { x: 0, y: 0.6 },
        });
        confetti({
          particleCount: 120,
          angle: 120,
          spread: 80,
          origin: { x: 1, y: 0.6 },
        });
      }, 200);
      document.body.style.animation = "none";
      void document.body.offsetHeight;
      document.body.style.animation = "screen-shake 0.5s ease";
      setTimeout(() => {
        document.body.style.animation = "";
      }, 500);
    } else if (streakCount >= 10) {
      confetti({
        particleCount: 80,
        spread: 90,
        startVelocity: 30,
        origin: { y: 0.6 },
      });
    } else {
      confetti({
        particleCount: Math.min(30 + streakCount * 10, 80),
        spread: Math.min(40 + streakCount * 5, 70),
        origin: { y: 0.6 },
      });
    }
  });
}

// ============================================================
// Search location helper
// ============================================================
export interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: string[];
}

export async function searchLocation(
  query: string,
): Promise<SearchResult[]> {
  const res = await fetch(
    `/api/search?q=${encodeURIComponent(query)}`,
  );
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}
