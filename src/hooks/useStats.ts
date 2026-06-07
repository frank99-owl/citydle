"use client";

import { useState, useCallback, useEffect } from "react";
import {
  generateDailyChallenge,
  getTodayString,
  DailyChallenge,
} from "@/lib/daily";

const STATS_KEY = "cartographer_player_stats";

export interface CityStat {
  played: number;
  completed: number;
  bestRate: number;
}

export interface PlayerStats {
  totalGamesPlayed: number;
  totalStreetsGuessed: number;
  totalStreetsAttempted: number;
  bestStreak: number;
  averageCompletionRate: number;
  favoriteCity: string;
  totalPlayTime: number;
  cityStats: Record<string, CityStat>;
  dailyChallengeStreak: number;
  lastDailyChallenge: string;
  dailyHistory: DailyChallengeRecord[];
}

export interface DailyChallengeRecord {
  date: string;
  cityName: string;
  completionRate: number;
  score: number;
  totalStreets: number;
  maxStreak: number;
  completed: boolean;
}

export type { DailyChallenge };

function getDefaultStats(): PlayerStats {
  return {
    totalGamesPlayed: 0,
    totalStreetsGuessed: 0,
    totalStreetsAttempted: 0,
    bestStreak: 0,
    averageCompletionRate: 0,
    favoriteCity: "",
    totalPlayTime: 0,
    cityStats: {},
    dailyChallengeStreak: 0,
    lastDailyChallenge: "",
    dailyHistory: [],
  };
}

function loadStats(): PlayerStats {
  if (typeof window === "undefined") return getDefaultStats();
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return getDefaultStats();
    const parsed = JSON.parse(raw);
    return { ...getDefaultStats(), ...parsed };
  } catch {
    return getDefaultStats();
  }
}

function saveStats(stats: PlayerStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* ignore quota */
  }
}

export function useStats() {
  const [stats, setStats] = useState<PlayerStats>(getDefaultStats());
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [currentDaily, setCurrentDaily] = useState<DailyChallenge | null>(null);

  // Load stats on mount
  useEffect(() => {
    setStats(loadStats());
    const today = getTodayString();
    setCurrentDaily(generateDailyChallenge(today));
  }, []);

  const updateStats = useCallback(
    (
      mapId: string,
      mapName: string,
      completionRate: number,
      maxStreak: number,
      streetsGuessed: number,
      totalStreets: number,
      isDailyChallenge?: boolean,
    ) => {
      const current = loadStats();
      const newGamesPlayed = current.totalGamesPlayed + 1;
      const newStreetsGuessed = current.totalStreetsGuessed + streetsGuessed;
      const newStreetsAttempted = current.totalStreetsAttempted + totalStreets;
      const newBestStreak = Math.max(current.bestStreak, maxStreak);
      const newAvgCompletion =
        newStreetsAttempted > 0 ? newStreetsGuessed / newStreetsAttempted : 0;

      // Update city stats
      const cityStats = { ...current.cityStats };
      if (!cityStats[mapId]) {
        cityStats[mapId] = { played: 0, completed: 0, bestRate: 0 };
      }
      cityStats[mapId].played += 1;
      if (completionRate >= 1.0) cityStats[mapId].completed += 1;
      cityStats[mapId].bestRate = Math.max(
        cityStats[mapId].bestRate,
        completionRate,
      );

      // Find favorite city (most played)
      let favoriteCity = current.favoriteCity;
      let maxPlayed = 0;
      for (const [id, cs] of Object.entries(cityStats)) {
        if (cs.played > maxPlayed) {
          maxPlayed = cs.played;
          favoriteCity = id;
        }
      }

      // Play time
      const endTime = Date.now();
      const playTime = gameStartTime
        ? Math.floor((endTime - gameStartTime) / 1000)
        : 0;
      const newPlayTime = current.totalPlayTime + playTime;

      // Daily challenge - dedup: skip if already completed today
      let dailyChallengeStreak = current.dailyChallengeStreak;
      let lastDailyChallenge = current.lastDailyChallenge;
      let dailyHistory = [...current.dailyHistory];
      const today = getTodayString();

      if (
        isDailyChallenge &&
        completionRate >= 0.5 &&
        lastDailyChallenge !== today
      ) {
        // Completed daily challenge (>=50%) and not already completed today
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

        if (lastDailyChallenge === yesterdayStr) {
          dailyChallengeStreak += 1;
        } else {
          dailyChallengeStreak = 1;
        }
        lastDailyChallenge = today;

        dailyHistory.push({
          date: today,
          cityName: mapName,
          completionRate,
          score: streetsGuessed,
          totalStreets,
          maxStreak,
          completed: completionRate >= 1.0,
        });

        // Keep only last 30 days
        if (dailyHistory.length > 30) {
          dailyHistory = dailyHistory.slice(-30);
        }
      }

      const newStats: PlayerStats = {
        totalGamesPlayed: newGamesPlayed,
        totalStreetsGuessed: newStreetsGuessed,
        totalStreetsAttempted: newStreetsAttempted,
        bestStreak: newBestStreak,
        averageCompletionRate: newAvgCompletion,
        favoriteCity,
        totalPlayTime: newPlayTime,
        cityStats,
        dailyChallengeStreak,
        lastDailyChallenge,
        dailyHistory,
      };

      saveStats(newStats);
      setStats(newStats);
    },
    [gameStartTime],
  );

  const startGameTimer = useCallback(() => {
    setGameStartTime(Date.now());
  }, []);

  const getDailyChallenge = useCallback((): DailyChallenge | null => {
    return currentDaily;
  }, [currentDaily]);

  const isDailyCompletedToday = useCallback((): boolean => {
    const today = getTodayString();
    return stats.lastDailyChallenge === today;
  }, [stats.lastDailyChallenge]);

  const getTodayDailyResult = useCallback((): DailyChallengeRecord | null => {
    const today = getTodayString();
    return stats.dailyHistory.find((h) => h.date === today) || null;
  }, [stats.dailyHistory]);

  const loadStats_ = useCallback(() => {
    return loadStats();
  }, []);

  return {
    stats,
    updateStats,
    startGameTimer,
    getDailyChallenge,
    isDailyCompletedToday,
    getTodayDailyResult,
    loadStats: loadStats_,
  };
}
