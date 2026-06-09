"use client";

import { useState, useEffect, useCallback } from "react";
import { Language } from "@/types";
import { TRANSLATIONS } from "@/lib/i18n";

interface LeaderboardEntry {
  id: number;
  player_name: string;
  city: string;
  score: number;
  total_streets: number;
  completion_rate: number;
  max_streak: number;
  time_seconds: number;
  played_at: string;
}

interface LeaderboardProps {
  lang: Language;
  isVisible: boolean;
}

type TimePeriod = "daily" | "weekly" | "all";

export function Leaderboard({ lang, isVisible }: LeaderboardProps) {
  const t = TRANSLATIONS[lang];
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("all");
  const [loading, setLoading] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCity !== "all") params.set("city", selectedCity);
      params.set("period", selectedPeriod);

      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      const data = await res.json();
      setEntries(data.entries || []);
      if (data.cities) setCities(data.cities);
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCity, selectedPeriod]);

  useEffect(() => {
    if (isVisible) {
      fetchLeaderboard();
    }
  }, [isVisible, fetchLeaderboard]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const periodLabels: Record<TimePeriod, string> = {
    daily: t.leaderboardToday,
    weekly: t.leaderboardWeek,
    all: t.leaderboardAll,
  };

  const cityLabels: Record<string, string> = {
    "new-york": t.presetNY,
    london: t.presetLondon,
    tokyo: t.presetTokyo,
    "hong-kong": t.presetHK,
    singapore: t.presetSG,
  };

  const getRankDecoration = (index: number): string => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}`;
  };

  return (
    <div>
      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          style={{
            padding: "0.3rem 0.5rem",
            background: "#fcfaf2",
            color: "var(--ink-dark)",
            border: "1px solid var(--wood-border)",
            borderRadius: "2px",
            fontFamily: "var(--font-serif), serif",
            fontSize: "0.75rem",
            outline: "none",
            cursor: "pointer",
            flex: 1,
            minWidth: "80px",
          }}
        >
          <option value="all">{t.leaderboardAllCities}</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {cityLabels[city] || city}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 0 }}>
          {(["daily", "weekly", "all"] as TimePeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              style={{
                padding: "0.3rem 0.6rem",
                background:
                  selectedPeriod === period ? "#4e3629" : "transparent",
                color:
                  selectedPeriod === period ? "#f4ebd0" : "rgba(66,48,35,0.6)",
                border: "1px solid var(--wood-border)",
                borderRadius: "2px",
                fontFamily: "var(--font-cinzel), serif",
                fontSize: "0.65rem",
                letterSpacing: "0.05em",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {periodLabels[period]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div
          style={{
            padding: "1.5rem",
            textAlign: "center",
            color: "rgba(78,54,41,0.4)",
            fontStyle: "italic",
            fontSize: "0.8rem",
          }}
        >
          {t.leaderboardLoading}
        </div>
      ) : entries.length === 0 ? (
        <div
          style={{
            padding: "1.5rem",
            textAlign: "center",
            color: "rgba(78,54,41,0.4)",
            fontStyle: "italic",
            fontSize: "0.8rem",
          }}
        >
          {t.leaderboardEmpty}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              fontSize: "0.75rem",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(66,48,35,0.2)" }}>
                <th style={thStyle}>{t.leaderboardRank}</th>
                <th style={{ ...thStyle, textAlign: "left" }}>
                  {t.leaderboardPlayer}
                </th>
                <th style={thStyle}>{t.leaderboardRate}</th>
                <th style={thStyle}>{t.leaderboardStreak}</th>
                <th style={thStyle}>{t.leaderboardTime}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.id}
                  style={{
                    borderBottom: "1px solid rgba(66,48,35,0.08)",
                    background: i < 3 ? "rgba(197,160,89,0.08)" : "transparent",
                  }}
                >
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: i < 3 ? "bold" : "normal",
                    }}
                  >
                    {getRankDecoration(i)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "left" }}>
                    {entry.player_name}
                  </td>
                  <td
                    style={{ ...tdStyle, fontWeight: "bold", color: "#8a3324" }}
                  >
                    {(entry.completion_rate * 100).toFixed(1)}%
                  </td>
                  <td style={{ ...tdStyle, color: "#c5a059" }}>
                    {entry.max_streak}
                  </td>
                  <td style={tdStyle}>{formatTime(entry.time_seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.4rem 0.3rem",
  textAlign: "center",
  fontFamily: "var(--font-cinzel), serif",
  fontSize: "0.65rem",
  letterSpacing: "0.1em",
  color: "rgba(66,48,35,0.5)",
  fontWeight: 600,
  textTransform: "uppercase",
};

const tdStyle: React.CSSProperties = {
  padding: "0.4rem 0.3rem",
  textAlign: "center",
  fontFamily: "var(--font-serif), serif",
  color: "#2c2519",
};

