'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Achievement, GameResult } from '@/types';
import { ACHIEVEMENTS } from '@/lib/constants';

const STORAGE_KEY = 'cartographer_achievements';
const STATS_KEY = 'cartographer_stats';

interface AchievementStats {
  customUsed: number;
  searchedCities: string[];
  speedGuesses: number;
  speedGuessTimestamp: number;
}

function loadUnlocked(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // { achievementId: ISO date string }
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveUnlocked(data: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore quota */ }
}

function loadStats(): AchievementStats {
  if (typeof window === 'undefined') {
    return { customUsed: 0, searchedCities: [], speedGuesses: 0, speedGuessTimestamp: 0 };
  }
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { customUsed: 0, searchedCities: [], speedGuesses: 0, speedGuessTimestamp: 0 };
    const parsed = JSON.parse(raw);
    return { customUsed: 0, searchedCities: [], speedGuesses: 0, speedGuessTimestamp: 0, ...parsed };
  } catch {
    return { customUsed: 0, searchedCities: [], speedGuesses: 0, speedGuessTimestamp: 0 };
  }
}

function saveStats(stats: AchievementStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch { /* ignore */ }
}

export function useAchievements() {
  const [unlockedMap, setUnlockedMap] = useState<Record<string, string>>({});
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([]);
  const [popupQueue, setPopupQueue] = useState<Achievement[]>([]);
  const [currentPopup, setCurrentPopup] = useState<Achievement | null>(null);
  const statsRef = useRef<AchievementStats>(loadStats());
  const shownIdsRef = useRef<Set<string>>(new Set());

  // Load on mount
  useEffect(() => {
    setUnlockedMap(loadUnlocked());
    statsRef.current = loadStats();
  }, []);

  // Popup queue processing - show next when current disappears
  useEffect(() => {
    if (currentPopup === null && popupQueue.length > 0) {
      const [next, ...rest] = popupQueue;
      setCurrentPopup(next);
      setPopupQueue(rest);
    }
  }, [currentPopup, popupQueue]);

  const dismissPopup = useCallback(() => {
    setCurrentPopup(null);
  }, []);

  // Track a custom area use
  const trackCustomUse = useCallback(() => {
    statsRef.current.customUsed += 1;
    saveStats(statsRef.current);
  }, []);

  // Track a city search
  const trackCitySearch = useCallback((cityName: string) => {
    const normalized = cityName.trim().toLowerCase();
    if (normalized && !statsRef.current.searchedCities.includes(normalized)) {
      statsRef.current.searchedCities.push(normalized);
      saveStats(statsRef.current);
    }
  }, []);

  // Track speed guesses
  const trackSpeedGuess = useCallback((): number => {
    const now = Date.now();
    const stats = statsRef.current;
    // If last guess was >30s ago, reset counter
    if (now - stats.speedGuessTimestamp > 30_000) {
      stats.speedGuesses = 1;
    } else {
      stats.speedGuesses += 1;
    }
    stats.speedGuessTimestamp = now;
    saveStats(stats);
    return stats.speedGuesses;
  }, []);

  // Check achievements against a game result
  const checkAchievements = useCallback((result: GameResult): Achievement[] => {
    const unlocked = loadUnlocked();
    const newly: Achievement[] = [];
    const stats = statsRef.current;

    for (const ach of ACHIEVEMENTS) {
      // Already unlocked
      if (unlocked[ach.id]) continue;

      let earned = false;

      if (ach.city) {
        // City master: completion 100% on specific city
        if (result.mapId === ach.city && result.completionRate >= ach.threshold) {
          earned = true;
        }
      } else if (ach.type === 'streak') {
        if (result.maxStreak >= ach.threshold) {
          earned = true;
        }
      } else if (ach.type === 'speed') {
        // Speed: guessed >= threshold within 30s window
        if (stats.speedGuesses >= ach.threshold) {
          earned = true;
        }
      } else if (ach.type === 'perfect') {
        // Perfect: zero errors and completed
        if (result.errorsCount === 0 && result.completionRate >= 1.0) {
          earned = true;
        }
      } else if (ach.type === 'custom') {
        if (stats.customUsed >= ach.threshold) {
          earned = true;
        }
      } else if (ach.type === 'search') {
        if (stats.searchedCities.length >= ach.threshold) {
          earned = true;
        }
      } else {
        // Progress-based (explorer, navigator, cartographer)
        if (result.completionRate >= ach.threshold) {
          earned = true;
        }
      }

      if (earned) {
        unlocked[ach.id] = new Date().toISOString();
        newly.push(ach);
      }
    }

    if (newly.length > 0) {
      saveUnlocked(unlocked);
      setUnlockedMap({ ...unlocked });
      setNewlyUnlocked(newly);

      // Queue popups - filter out already shown in this game
      const toShow = newly.filter(a => !shownIdsRef.current.has(a.id));
      toShow.forEach(a => shownIdsRef.current.add(a.id));

      setPopupQueue(prev => [...prev, ...toShow]);
    }

    return newly;
  }, []);

  // Reset shown IDs when starting a new game
  const resetGameTracking = useCallback(() => {
    shownIdsRef.current.clear();
    statsRef.current.speedGuesses = 0;
    statsRef.current.speedGuessTimestamp = 0;
  }, []);

  // Get all achievements with unlock status
  const getAllAchievements = useCallback((): Array<Achievement & { unlocked: boolean; unlockedAt?: string }> => {
    const unlocked = loadUnlocked();
    return ACHIEVEMENTS.map(ach => ({
      ...ach,
      unlocked: !!unlocked[ach.id],
      unlockedAt: unlocked[ach.id],
    }));
  }, []);

  // Get stats for display
  const getStats = useCallback(() => {
    const stats = loadStats();
    return {
      customUsed: stats.customUsed,
      searchedCitiesCount: stats.searchedCities.length,
    };
  }, []);

  return {
    unlockedMap,
    newlyUnlocked,
    currentPopup,
    dismissPopup,
    checkAchievements,
    trackCustomUse,
    trackCitySearch,
    trackSpeedGuess,
    resetGameTracking,
    getAllAchievements,
    getStats,
  };
}
