"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";

import { PRESETS } from "@/lib/constants";
import { signSubmission } from "@/lib/hmac";
import { TRANSLATIONS, Language } from "@/lib/i18n";
import {
  Bounds,
  HistoryEntry,
  Favorite,
  MapProvider,
  Difficulty,
  View,
  Street,
  HintClue,
  Achievement,
  GameResult,
  Preset,
  GuessResult,
} from "@/types";

// Hooks
import { useMapProvider } from "@/hooks/useMapProvider";
import { useLeafletMap } from "@/hooks/useLeafletMap";
import { useStreets } from "@/hooks/useStreets";
import { useGameLogic } from "@/hooks/useGameLogic";
import { useTutorial } from "@/hooks/useTutorial";
import { useAchievements } from "@/hooks/useAchievements";
import {
  useStats,
  PlayerStats,
  DailyChallenge,
  DailyChallengeRecord,
} from "@/hooks/useStats";

// Lobby context: low-frequency data (history, stats, achievements)
interface LobbyContextValue {
  lang: Language;
  history: HistoryEntry[];
  highScore: number;
  favorites: Favorite[];
  lobbyError: string | null;
  fetchHistoryAndFavorites: () => Promise<void>;
  playerStats: PlayerStats;
  tutorial: ReturnType<typeof useTutorial>;
  currentAchievementPopup: Achievement | null;
  dismissAchievementPopup: () => void;
  getDailyChallenge: () => DailyChallenge | null;
  isDailyCompletedToday: () => boolean;
  getTodayDailyResult: () => DailyChallengeRecord | null;
  deleteFavorite: (id: number) => void;
}

// Game context: high-frequency state (guess, streak, map, timers)
interface GameContextValue {
  // 语言
  lang: Language;
  toggleLanguage: () => void;

  // 视图状态
  view: View;
  customMode: boolean;
  gameStarted: boolean;
  isTransitioning: boolean;

  // 游戏核心状态
  mapName: string;
  setMapName: (v: string) => void;
  streets: Street[];
  guessedCount: number;
  streak: number;
  maxStreak: number;
  guess: string;
  setGuess: (v: string) => void;
  showResult: boolean;
  isSaved: boolean;
  hintsUsed: number;
  hintClue: HintClue | null;
  difficulty: Difficulty;
  bounds: Bounds | null;
  totalErrors: number;

  // 反馈
  errorMessage: string | null;
  hintMessage: string | null;
  directionMessage: string | null;

  // 每日挑战 & 时间
  isDailyChallenge: boolean;
  gameTimeSeconds: number;

  // 地图
  mapProvider: MapProvider;
  mapContainerId: string;
  mapLoaded: boolean;

  // 搜索
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searchLoading: boolean;

  // 分享
  shareModalOpen: boolean;
  setShareModalOpen: (v: boolean) => void;

  // 徽章
  badge: Achievement | null;

  // === 业务动作 ===
  startGame: (preset: Preset) => void;
  startFromFavorite: (fav: Favorite) => void;
  startCustomAreaMode: () => void;
  startDailyChallenge: (presetIndex: number, diff: string) => void;
  handleStartCustomGame: () => void;
  returnToLobby: () => void;
  handleExitToLobby: () => void;
  handleGuessSubmit: (e: React.FormEvent) => void;
  handleGetHint: () => void;
  handleEndGame: () => void;
  handleSaveMap: () => void;
  handleSearchSubmit: (e: React.FormEvent) => void;
  handleSubmitLeaderboard: (playerName: string) => Promise<boolean>;
  handleOpenShare: () => void;

  // 地图操作
  mapRef: React.RefObject<any>;
  toMapLatLng: (lat: number, lng: number) => [number, number];
  drawBounds: (bounds: Bounds | null) => void;
  fitToBounds: (bounds: Bounds, animate?: boolean) => void;
  drawStreets: (streets: Street[], showAll: boolean) => void;
  revealStreet: (name: string) => void;
  revealMissedStreets: (streets: Street[]) => void;
  drawHint: (geom: number[][]) => void;
  clearHint: () => void;
  clearAllLayers: () => void;
  setupDrawing: (
    enabled: boolean,
    onDraw: (bounds: Bounds) => void,
    mapProvider: MapProvider,
  ) => void;
  syncTileLayer: (url: string, options: Record<string, any>) => void;
  shiftMapCenter: (
    oldProvider: string,
    newProvider: string,
    convertFn: (
      lat: number,
      lng: number,
      oldP: string,
      newP: string,
    ) => [number, number],
  ) => void;
  loading: boolean;
  noStreetsFound: boolean;
  fetchStreets: (bounds: Bounds) => void;
  clearStreets: () => void;
  cancelFetch: () => void;
  getTileConfig: () => { url: string; options: Record<string, any> };
  updateMapProvider: (p: MapProvider) => void;
  updateDifficulty: (d: Difficulty) => void;
  prevProviderRef: React.RefObject<MapProvider>;
  startGameTimer: () => void;
  updatePlayerStats: (...args: any[]) => void;
  checkAchievements: (result: GameResult) => void;
  resetGameTracking: () => void;
  trackCustomUse: () => void;
  trackCitySearch: (name: string) => void;
  trackSpeedGuess: () => void;
  calculateBadge: (total: number) => Achievement | null;
}

const LobbyContext = createContext<LobbyContextValue | null>(null);
const GameContext = createContext<GameContextValue | null>(null);

export function useLobby() {
  const ctx = useContext(LobbyContext);
  if (!ctx) throw new Error("useLobby must be used within GameProvider");
  return ctx;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();

  // Language state
  const [lang, setLang] = useState<Language>("en");

  // Lobby records lists
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [highScore, setHighScore] = useState(0);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  // Determine initial states based on query parameters
  const hasBoundsParams =
    searchParams.get("south") &&
    searchParams.get("west") &&
    searchParams.get("north") &&
    searchParams.get("east");
  const isCustomParam = searchParams.get("custom") === "1";

  // Navigation / View State
  const [view, setView] = useState<View>(
    hasBoundsParams || isCustomParam ? "game" : "lobby",
  );
  const [customMode, setCustomMode] = useState(isCustomParam);
  const [gameStarted, setGameStarted] = useState(!!hasBoundsParams);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Active game logic states
  const [mapName, setMapName] = useState(
    searchParams.get("name") || "Custom Area",
  );
  const [currentMapId, setCurrentMapId] = useState<string>("custom");
  const [totalErrors, setTotalErrors] = useState(0);
  const [bounds, setBounds] = useState<Bounds | null>(() => {
    const s = searchParams.get("south");
    const w = searchParams.get("west");
    const n = searchParams.get("north");
    const e = searchParams.get("east");
    if (s && w && n && e) {
      return {
        south: parseFloat(s),
        west: parseFloat(w),
        north: parseFloat(n),
        east: parseFloat(e),
      };
    }
    return null;
  });

  // Custom mode location search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  // Guess feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [directionMessage, setDirectionMessage] = useState<string | null>(null);

  // Initialize hooks
  const {
    mapProvider,
    updateMapProvider,
    toMapLatLng,
    convertCoordinate,
    getTileConfig,
    prevProviderRef,
  } = useMapProvider();

  const {
    mapRef,
    mapContainerId,
    mapLoaded,
    drawBounds,
    fitToBounds,
    drawStreets,
    revealStreet,
    revealMissedStreets,
    drawHint,
    clearHint,
    clearAllLayers,
    setupDrawing,
    syncTileLayer,
    shiftMapCenter,
  } = useLeafletMap({ toMapLatLng });

  const {
    streets,
    loading,
    noStreetsFound,
    fetchStreets,
    updateStreetGuessed,
    clearStreets,
    cancelFetch,
  } = useStreets(lang);

  // Handle empty streets result
  useEffect(() => {
    if (noStreetsFound && !loading) {
      alert(
        lang === "zh"
          ? "该区域未找到任何街道，请尝试缩小范围或换个区域。"
          : "No streets found in this area. Try a smaller region or pick a different one.",
      );
    }
  }, [noStreetsFound, loading, lang]);

  const tutorial = useTutorial();

  const {
    currentPopup: currentAchievementPopup,
    dismissPopup: dismissAchievementPopup,
    checkAchievements,
    trackCustomUse,
    trackCitySearch,
    trackSpeedGuess,
    resetGameTracking,
  } = useAchievements();

  const {
    stats: playerStats,
    updateStats: updatePlayerStats,
    startGameTimer,
    getDailyChallenge,
    isDailyCompletedToday,
    getTodayDailyResult,
  } = useStats();

  // Daily challenge state
  const [isDailyChallenge, setIsDailyChallenge] = useState(false);

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Game time tracking
  const [gameTimeSeconds, setGameTimeSeconds] = useState(0);
  const gameStartTimeRef = useRef<number>(0);

  const {
    guess,
    setGuess,
    guessedCount,
    streak,
    maxStreak,
    showResult,
    setShowResult,
    isSaved,
    setIsSaved,
    hintsUsed,
    hintClue,
    hintClueRef,
    difficulty,
    difficultyRef,
    showResultRef,
    loadDifficulty,
    updateDifficulty,
    getHint: getGameHint,
    clearHint: clearGameHint,
    checkGuess,
    endGame,
    resetGame,
    calculateBadge,
  } = useGameLogic();

  // Translation accessor
  const t = TRANSLATIONS[lang];

  // Sync language and settings with localStorage on load
  useEffect(() => {
    const savedLang = localStorage.getItem("cartographer_lang") as Language;
    if (savedLang) {
      setLang(savedLang);
    } else {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.includes("zh") || browserLang.includes("cn")) {
        setLang("zh");
      }
    }
    loadDifficulty();
  }, [loadDifficulty]);

  // Auto-start tutorial for first-time users
  useEffect(() => {
    if (tutorial.shouldAutoStart && view === "lobby") {
      const timer = setTimeout(() => tutorial.startTutorial(), 800);
      return () => clearTimeout(timer);
    }
  }, [tutorial.shouldAutoStart, tutorial.startTutorial, view]);

  // Toggle language
  const toggleLanguage = useCallback(() => {
    const newLang = lang === "en" ? "zh" : "en";
    setLang(newLang);
    localStorage.setItem("cartographer_lang", newLang);
  }, [lang]);

  // Update URL params
  const updateURLParams = useCallback(
    (
      params: {
        name?: string;
        south?: number;
        west?: number;
        north?: number;
        east?: number;
        custom?: string;
      } | null,
    ) => {
      if (typeof window === "undefined") return;
      if (!params) {
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }
      const urlParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined) {
          urlParams.set(key, val.toString());
        }
      });
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}?${urlParams.toString()}`,
      );
    },
    [],
  );

  // Fetch history & favorites list
  const fetchHistoryAndFavorites = useCallback(async () => {
    setLobbyError(null);
    try {
      const [historyRes, favoritesRes] = await Promise.all([
        fetch("/api/history"),
        fetch("/api/favorites"),
      ]);
      const historyData = await historyRes.json();
      const favoritesData = await favoritesRes.json();
      setHistory(historyData.history || []);
      setHighScore(historyData.highScore || 0);
      setFavorites(favoritesData.favorites || []);
    } catch (err) {
      console.error("Failed to load lobby data:", err);
      setLobbyError("Failed to load data. Tap to retry.");
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchHistoryAndFavorites();
  }, [fetchHistoryAndFavorites]);

  // Refresh history/favorites after tutorial completes
  const wasTutorialActiveRef = useRef(false);
  useEffect(() => {
    if (wasTutorialActiveRef.current && !tutorial.isActive) {
      fetchHistoryAndFavorites();
    }
    wasTutorialActiveRef.current = tutorial.isActive;
  }, [tutorial.isActive, fetchHistoryAndFavorites]);

  // Sync tile layer when provider changes
  useEffect(() => {
    const config = getTileConfig();
    syncTileLayer(config.url, config.options);
  }, [mapProvider, mapLoaded, getTileConfig, syncTileLayer]);

  // Track previous streets length to detect new data vs individual guesses
  const prevStreetsLenRef = useRef(0);

  // Redraw layers when mapProvider or difficulty changes
  useEffect(() => {
    if (!mapLoaded) return;

    shiftMapCenter(prevProviderRef.current, mapProvider, convertCoordinate);
    prevProviderRef.current = mapProvider;

    drawBounds(bounds);

    if (streets.length !== prevStreetsLenRef.current) {
      drawStreets(streets, showResult);
      prevStreetsLenRef.current = streets.length;
    }

    if (hintClue && hintClue.geom && difficulty === "easy") {
      drawHint(hintClue.geom);
    } else {
      clearHint();
    }
  }, [
    mapProvider,
    mapLoaded,
    difficulty,
    bounds,
    streets,
    showResult,
    hintClue,
    drawBounds,
    drawStreets,
    drawHint,
    clearHint,
    shiftMapCenter,
    convertCoordinate,
    prevProviderRef,
  ]);

  // Fit to bounds when bounds change
  useEffect(() => {
    if (bounds) {
      fitToBounds(bounds);
      drawBounds(bounds);
    }
  }, [bounds, fitToBounds, drawBounds]);

  // Setup Geoman drawing for custom mode
  useEffect(() => {
    const enabled = view === "game" && customMode && !gameStarted;
    setupDrawing(
      enabled,
      (drawnBounds) => {
        setBounds(drawnBounds);
      },
      mapProvider,
    );
  }, [view, customMode, gameStarted, mapLoaded, setupDrawing, mapProvider]);

  // Handle hint with map drawing
  const handleGetHint = useCallback(() => {
    const hint = getGameHint(streets);
    if (hint && hint.geom && difficulty === "easy") {
      drawHint(hint.geom);
    }
  }, [getGameHint, streets, difficulty, drawHint]);

  // Handle guess submit with map reveal
  const handleGuessSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const result = checkGuess(
        guess,
        streets,
        bounds,
        lang,
        revealStreet,
        (streakCount) => {
          // Dynamic import: canvas-confetti only loaded when actually needed
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
              void document.body.offsetHeight; // force reflow
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
        },
        endGame,
      );

      if (!result.found && guess.trim()) {
        setTotalErrors((prev) => prev + 1);
        setErrorMessage(t.guessWrong);
        setHintMessage(result.hint || null);
        setDirectionMessage(result.directionHint || null);
        setTimeout(() => setErrorMessage(null), 1000);
        setTimeout(() => {
          setHintMessage(null);
          setDirectionMessage(null);
        }, 3000);
      } else if (result.found) {
        setErrorMessage(null);
        setHintMessage(null);
        setDirectionMessage(null);
        trackSpeedGuess();
        if (result.matchedName) {
          updateStreetGuessed(result.matchedName);
        }
      }
    },
    [
      checkGuess,
      guess,
      streets,
      bounds,
      lang,
      revealStreet,
      endGame,
      t,
      trackSpeedGuess,
      updateStreetGuessed,
    ],
  );

  // Handle end game
  const handleEndGame = useCallback(async () => {
    endGame();
    revealMissedStreets(streets);

    const elapsed =
      gameStartTimeRef.current > 0
        ? Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
        : 0;
    setGameTimeSeconds(elapsed);

    const completionRate =
      streets.length > 0 ? guessedCount / streets.length : 0;
    checkAchievements({
      completionRate,
      maxStreak,
      totalStreets: streets.length,
      guessedCount,
      errorsCount: totalErrors,
      mapId: currentMapId,
      timeMs: elapsed * 1000,
    });

    updatePlayerStats(
      currentMapId,
      mapName,
      completionRate,
      maxStreak,
      guessedCount,
      streets.length,
      isDailyChallenge,
    );

    try {
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapName,
          score: guessedCount,
          totalStreets: streets.length,
          completionRate,
          maxStreak,
        }),
      });
    } catch (err) {
      console.error("Failed to save score history", err);
    }
  }, [
    endGame,
    revealMissedStreets,
    streets,
    mapName,
    guessedCount,
    maxStreak,
    checkAchievements,
    currentMapId,
    totalErrors,
    updatePlayerStats,
    isDailyChallenge,
  ]);

  // Start game with preset
  const startGame = useCallback(
    (preset: (typeof PRESETS)[0]) => {
      const presetName =
        lang === "zh"
          ? preset.name.split(" ")[0]
          : preset.name.split(" ").slice(1).join(" ") || preset.name;
      setMapName(presetName);
      setCurrentMapId(preset.id);
      setCustomMode(false);
      setBounds(preset.bounds);
      setShowResult(false);
      clearGameHint();
      clearHint();
      setErrorMessage(null);
      setHintMessage(null);
      setDirectionMessage(null);
      resetGameTracking();
      setTotalErrors(0);
      setIsDailyChallenge(false);
      setGameTimeSeconds(0);

      fetchStreets(preset.bounds);
      startGameTimer();
      gameStartTimeRef.current = Date.now();

      setIsTransitioning(true);
      setView("game");
      setGameStarted(true);

      updateURLParams({
        name: presetName,
        south: preset.bounds.south,
        west: preset.bounds.west,
        north: preset.bounds.north,
        east: preset.bounds.east,
      });

      setTimeout(() => setIsTransitioning(false), 600);
    },
    [
      lang,
      clearGameHint,
      clearHint,
      fetchStreets,
      updateURLParams,
      resetGameTracking,
      startGameTimer,
    ],
  );

  // Start from favorite
  const startFromFavorite = useCallback(
    (fav: Favorite) => {
      setMapName(fav.name);
      setCurrentMapId("custom");
      setCustomMode(false);
      setBounds(fav.bounds);
      setShowResult(false);
      clearGameHint();
      clearHint();
      resetGameTracking();
      setTotalErrors(0);

      fetchStreets(fav.bounds);

      setIsTransitioning(true);
      setView("game");
      setGameStarted(true);

      updateURLParams({
        name: fav.name,
        south: fav.bounds.south,
        west: fav.bounds.west,
        north: fav.bounds.north,
        east: fav.bounds.east,
      });

      setTimeout(() => setIsTransitioning(false), 600);
    },
    [
      clearGameHint,
      clearHint,
      fetchStreets,
      updateURLParams,
      resetGameTracking,
    ],
  );

  // Start custom area mode
  const startCustomAreaMode = useCallback(() => {
    setMapName(lang === "zh" ? "自定义区域" : "Custom Area");
    setCurrentMapId("custom");
    setCustomMode(true);
    setBounds(null);
    clearStreets();
    setShowResult(false);
    clearGameHint();
    clearHint();
    resetGameTracking();
    trackCustomUse();
    setTotalErrors(0);

    setIsTransitioning(true);
    setView("game");
    setGameStarted(false);

    updateURLParams({
      custom: "1",
      name: lang === "zh" ? "自定义区域" : "Custom Area",
    });

    setTimeout(() => setIsTransitioning(false), 600);
  }, [
    lang,
    clearStreets,
    clearGameHint,
    clearHint,
    updateURLParams,
    resetGameTracking,
    trackCustomUse,
  ]);

  // Handle start custom game
  const handleStartCustomGame = useCallback(() => {
    if (!bounds) {
      alert(TRANSLATIONS[lang].alertNoBounds);
      return;
    }
    if (!mapName.trim()) {
      alert(TRANSLATIONS[lang].alertNoName);
      return;
    }
    setGameStarted(true);
    fetchStreets(bounds);
  }, [bounds, mapName, lang, fetchStreets]);

  // Start daily challenge
  const startDailyChallenge = useCallback(
    (presetIndex: number, diff: string) => {
      const preset = PRESETS[presetIndex];
      if (!preset) return;

      const presetName =
        lang === "zh"
          ? preset.name.split(" ")[0]
          : preset.name.split(" ").slice(1).join(" ") || preset.name;
      setMapName(presetName);
      setCurrentMapId(preset.id);
      setCustomMode(false);
      setBounds(preset.bounds);
      setShowResult(false);
      clearGameHint();
      clearHint();
      setErrorMessage(null);
      setHintMessage(null);
      setDirectionMessage(null);
      resetGameTracking();
      setTotalErrors(0);
      setIsDailyChallenge(true);
      setGameTimeSeconds(0);

      if (diff === "easy" || diff === "medium" || diff === "hard") {
        updateDifficulty(diff as Difficulty);
      }

      fetchStreets(preset.bounds);
      startGameTimer();
      gameStartTimeRef.current = Date.now();

      setIsTransitioning(true);
      setView("game");
      setGameStarted(true);

      updateURLParams({
        name: presetName,
        south: preset.bounds.south,
        west: preset.bounds.west,
        north: preset.bounds.north,
        east: preset.bounds.east,
      });

      setTimeout(() => setIsTransitioning(false), 600);
    },
    [
      lang,
      clearGameHint,
      clearHint,
      fetchStreets,
      updateURLParams,
      resetGameTracking,
      startGameTimer,
      updateDifficulty,
    ],
  );

  // Return to lobby
  const returnToLobby = useCallback(() => {
    cancelFetch();
    setIsTransitioning(true);
    setView("lobby");
    setGameStarted(false);
    setCustomMode(false);
    clearStreets();
    setShowResult(false);
    resetGame();
    clearAllLayers();
    setErrorMessage(null);
    setHintMessage(null);
    setDirectionMessage(null);
    setGameTimeSeconds(0);
    gameStartTimeRef.current = 0;

    updateURLParams(null);
    fetchHistoryAndFavorites();

    setTimeout(() => setIsTransitioning(false), 600);
  }, [
    cancelFetch,
    clearStreets,
    resetGame,
    clearAllLayers,
    updateURLParams,
    fetchHistoryAndFavorites,
  ]);

  // Open share modal
  const handleOpenShare = useCallback(() => {
    setShareModalOpen(true);
  }, []);

  // Submit to leaderboard
  const handleSubmitLeaderboard = useCallback(
    async (playerName: string): Promise<boolean> => {
      try {
        const payload = {
          playerName,
          city: currentMapId,
          score: guessedCount,
          totalStreets: streets.length,
          completionRate:
            streets.length > 0 ? guessedCount / streets.length : 0,
          maxStreak,
          timeSeconds: gameTimeSeconds,
        };
        const signature = await signSubmission(payload);
        const res = await fetch("/api/leaderboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, signature }),
        });
        return res.ok;
      } catch (err) {
        console.error("Failed to submit to leaderboard:", err);
        return false;
      }
    },
    [currentMapId, guessedCount, streets.length, maxStreak, gameTimeSeconds],
  );

  // Handle exit to lobby with confirmation
  const handleExitToLobby = useCallback(() => {
    if (window.confirm(TRANSLATIONS[lang].confirmExit)) {
      returnToLobby();
    }
  }, [lang, returnToLobby]);

  // Save map to favorites
  const handleSaveMap = useCallback(async () => {
    if (!bounds) return;
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: mapName, bounds }),
      });
      if (res.ok) {
        setIsSaved(true);
      }
    } catch (err) {
      console.error(err);
    }
  }, [bounds, mapName, setIsSaved]);

  // Delete favorite
  const deleteFavorite = useCallback(async (id: number) => {
    await fetch(`/api/favorites?id=${id}`, { method: "DELETE" });
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // Handle search submit
  const handleSearchSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;
      setSearchLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery)}`,
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const place = data[0];
          trackCitySearch(place.display_name || searchQuery);
          const lat = parseFloat(place.lat);
          const lon = parseFloat(place.lon);

          if (mapRef.current) {
            const mapCoords = toMapLatLng(lat, lon);
            mapRef.current.setView(mapCoords, 14);

            if (place.boundingbox && place.boundingbox.length === 4) {
              const s = parseFloat(place.boundingbox[0]);
              const n = parseFloat(place.boundingbox[1]);
              const w = parseFloat(place.boundingbox[2]);
              const e = parseFloat(place.boundingbox[3]);
              import("leaflet").then((L) => {
                const sw = toMapLatLng(s, w);
                const ne = toMapLatLng(n, e);
                const boundsObj = L.latLngBounds(
                  L.latLng(sw[0], sw[1]),
                  L.latLng(ne[0], ne[1]),
                );
                mapRef.current.fitBounds(boundsObj, {
                  paddingTopLeft: [400, 20],
                  paddingBottomRight: [20, 20],
                });
              });
            }
          }
        } else {
          alert(TRANSLATIONS[lang].customSearchNoResults);
        }
      } catch (err) {
        console.error(err);
        alert(TRANSLATIONS[lang].customSearchNoResults);
      } finally {
        setSearchLoading(false);
      }
    },
    [searchQuery, lang, toMapLatLng, mapRef, trackCitySearch],
  );

  // Calculate badge
  const badge = calculateBadge(streets.length);

  // Memoize lobby context (low-frequency: history, stats, achievements)
  const lobbyValue: LobbyContextValue = useMemo(
    () => ({
      lang,
      history,
      highScore,
      favorites,
      lobbyError,
      fetchHistoryAndFavorites,
      playerStats,
      tutorial,
      currentAchievementPopup,
      dismissAchievementPopup,
      getDailyChallenge,
      isDailyCompletedToday,
      getTodayDailyResult,
      deleteFavorite,
    }),
    [
      lang,
      history,
      highScore,
      favorites,
      lobbyError,
      fetchHistoryAndFavorites,
      playerStats,
      tutorial,
      currentAchievementPopup,
      dismissAchievementPopup,
      getDailyChallenge,
      isDailyCompletedToday,
      getTodayDailyResult,
      deleteFavorite,
    ],
  );

  // Memoize game context (high-frequency: guess, streak, map, timers)
  const gameValue: GameContextValue = useMemo(
    () => ({
      lang,
      toggleLanguage,
      view,
      customMode,
      gameStarted,
      isTransitioning,
      mapName,
      setMapName,
      streets,
      guessedCount,
      streak,
      maxStreak,
      guess,
      setGuess,
      showResult,
      isSaved,
      hintsUsed,
      hintClue,
      difficulty,
      bounds,
      totalErrors,
      errorMessage,
      hintMessage,
      directionMessage,
      isDailyChallenge,
      gameTimeSeconds,
      mapProvider,
      mapContainerId,
      mapLoaded,
      searchQuery,
      setSearchQuery,
      searchLoading,
      shareModalOpen,
      setShareModalOpen,
      badge,
      startGame,
      startFromFavorite,
      startCustomAreaMode,
      startDailyChallenge,
      handleStartCustomGame,
      returnToLobby,
      handleExitToLobby,
      handleGuessSubmit,
      handleGetHint,
      handleEndGame,
      handleSaveMap,
      handleSearchSubmit,
      handleSubmitLeaderboard,
      handleOpenShare,
      mapRef,
      toMapLatLng,
      drawBounds,
      fitToBounds,
      drawStreets,
      revealStreet,
      revealMissedStreets,
      drawHint,
      clearHint,
      clearAllLayers,
      setupDrawing,
      syncTileLayer,
      shiftMapCenter,
      loading,
      noStreetsFound,
      fetchStreets,
      clearStreets,
      cancelFetch,
      getTileConfig,
      updateMapProvider,
      updateDifficulty,
      prevProviderRef,
      startGameTimer,
      updatePlayerStats,
      checkAchievements,
      resetGameTracking,
      trackCustomUse,
      trackCitySearch,
      trackSpeedGuess,
      calculateBadge,
    }),
    [
      lang,
      toggleLanguage,
      view,
      customMode,
      gameStarted,
      isTransitioning,
      mapName,
      setMapName,
      streets,
      guessedCount,
      streak,
      maxStreak,
      guess,
      setGuess,
      showResult,
      isSaved,
      hintsUsed,
      hintClue,
      difficulty,
      bounds,
      totalErrors,
      errorMessage,
      hintMessage,
      directionMessage,
      isDailyChallenge,
      gameTimeSeconds,
      mapProvider,
      mapContainerId,
      mapLoaded,
      searchQuery,
      setSearchQuery,
      searchLoading,
      shareModalOpen,
      setShareModalOpen,
      badge,
      startGame,
      startFromFavorite,
      startCustomAreaMode,
      startDailyChallenge,
      handleStartCustomGame,
      returnToLobby,
      handleExitToLobby,
      handleGuessSubmit,
      handleGetHint,
      handleEndGame,
      handleSaveMap,
      handleSearchSubmit,
      handleSubmitLeaderboard,
      handleOpenShare,
      mapRef,
      toMapLatLng,
      drawBounds,
      fitToBounds,
      drawStreets,
      revealStreet,
      revealMissedStreets,
      drawHint,
      clearHint,
      clearAllLayers,
      setupDrawing,
      syncTileLayer,
      shiftMapCenter,
      loading,
      noStreetsFound,
      fetchStreets,
      clearStreets,
      cancelFetch,
      getTileConfig,
      updateMapProvider,
      updateDifficulty,
      prevProviderRef,
      startGameTimer,
      updatePlayerStats,
      checkAchievements,
      resetGameTracking,
      trackCustomUse,
      trackCitySearch,
      trackSpeedGuess,
      calculateBadge,
    ],
  );

  return (
    <LobbyContext.Provider value={lobbyValue}>
      <GameContext.Provider value={gameValue}>{children}</GameContext.Provider>
    </LobbyContext.Provider>
  );
}
