"use client";

import { memo } from "react";
import { Language } from "@/types";
import { TRANSLATIONS } from "@/lib/i18n";
import { PRESETS } from "@/lib/constants";
import { PlayerStats } from "@/hooks/useStats";

interface StatsPanelProps {
  lang: Language;
  stats: PlayerStats;
  isVisible: boolean;
}

function formatPlayTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getCityDisplayName(cityId: string, lang: Language): string {
  const preset = PRESETS.find((p) => p.id === cityId);
  if (!preset) return cityId;
  if (lang === "zh") return preset.name.split(" ")[0];
  return preset.name.split(" ").slice(1).join(" ") || preset.name;
}

function getCityEmoji(cityId: string): string {
  const preset = PRESETS.find((p) => p.id === cityId);
  return preset?.emoji || "🏙";
}

export const StatsPanel = memo(function StatsPanel({
  lang,
  stats,
  isVisible,
}: StatsPanelProps) {
  if (!isVisible) return null;

  const t = TRANSLATIONS[lang];

  const avgPerGame =
    stats.totalGamesPlayed > 0
      ? Math.round(stats.totalPlayTime / stats.totalGamesPlayed)
      : 0;

  return (
    <div style={{ padding: "0.5rem 0" }}>
      {/* Overview Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <StatCard
          label={t.gamesPlayed}
          value={String(stats.totalGamesPlayed)}
          emoji="🎮"
          lang={lang}
        />
        <StatCard
          label={t.streetsGuessed}
          value={String(stats.totalStreetsGuessed)}
          emoji="🗺"
          lang={lang}
        />
        <StatCard
          label={t.avgCompletion}
          value={
            stats.totalStreetsAttempted > 0
              ? `${(stats.averageCompletionRate * 100).toFixed(1)}%`
              : "--"
          }
          emoji="📊"
          lang={lang}
        />
      </div>

      {/* Records Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <StatCard
          label={t.bestStreakLabel}
          value={`🔥 ${stats.bestStreak}`}
          emoji=""
          lang={lang}
        />
        <StatCard
          label={t.favoriteCity}
          value={
            stats.favoriteCity
              ? getCityDisplayName(stats.favoriteCity, lang)
              : "--"
          }
          emoji={stats.favoriteCity ? getCityEmoji(stats.favoriteCity) : "🏙"}
          lang={lang}
        />
      </div>

      {/* Play Time */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <StatCard
          label={t.totalPlayTime}
          value={formatPlayTime(stats.totalPlayTime)}
          emoji="⏱"
          lang={lang}
        />
        <StatCard
          label={t.avgPerGame}
          value={formatPlayTime(avgPerGame)}
          emoji="📈"
          lang={lang}
        />
      </div>

      {/* City Stats Table */}
      {Object.keys(stats.cityStats).length > 0 && (
        <div style={{ marginTop: "0.5rem" }}>
          <h4
            style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: "0.7rem",
              letterSpacing: "0.15em",
              color: "rgba(197,160,89,0.7)",
              marginBottom: "0.5rem",
              textTransform: "uppercase",
            }}
          >
            {t.cityStats}
          </h4>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.8rem",
            }}
          >
            <thead>
              <tr
                style={{
                  color: "rgba(197,160,89,0.6)",
                  fontFamily: "var(--font-cinzel), serif",
                  fontSize: "0.65rem",
                  letterSpacing: "0.08em",
                }}
              >
                <th style={{ textAlign: "left", padding: "0.25rem 0.4rem" }}>
                  {t.statsCity}
                </th>
                <th style={{ textAlign: "center", padding: "0.25rem 0.4rem" }}>
                  {t.played}
                </th>
                <th style={{ textAlign: "center", padding: "0.25rem 0.4rem" }}>
                  {t.cleared}
                </th>
                <th style={{ textAlign: "center", padding: "0.25rem 0.4rem" }}>
                  {t.best}
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.cityStats)
                .sort(([, a], [, b]) => b.played - a.played)
                .map(([cityId, cs]) => (
                  <tr
                    key={cityId}
                    style={{
                      borderBottom: "1px solid rgba(197,160,89,0.1)",
                      color: "rgba(244,235,208,0.7)",
                    }}
                  >
                    <td style={{ padding: "0.3rem 0.4rem" }}>
                      {getCityEmoji(cityId)} {getCityDisplayName(cityId, lang)}
                    </td>
                    <td
                      style={{ textAlign: "center", padding: "0.3rem 0.4rem" }}
                    >
                      {cs.played}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        padding: "0.3rem 0.4rem",
                        color: cs.completed > 0 ? "#c5a059" : undefined,
                      }}
                    >
                      {cs.completed}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        padding: "0.3rem 0.4rem",
                        color: "#c5a059",
                      }}
                    >
                      {(cs.bestRate * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {stats.totalGamesPlayed === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "2rem 1rem",
            color: "rgba(244,235,208,0.3)",
            fontStyle: "italic",
            fontSize: "0.9rem",
          }}
        >
          {t.noStats}
        </div>
      )}
    </div>
  );
});

function StatCard({
  label,
  value,
  emoji,
  lang: _lang,
}: {
  label: string;
  value: string;
  emoji: string;
  lang: Language;
}) {
  return (
    <div
      style={{
        background: "rgba(244,235,208,0.06)",
        border: "1px solid rgba(197,160,89,0.2)",
        borderRadius: "4px",
        padding: "0.75rem",
        textAlign: "center",
      }}
    >
      {emoji && (
        <div style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>
          {emoji}
        </div>
      )}
      <div
        style={{
          fontFamily: "var(--font-cinzel), serif",
          fontSize: "1.1rem",
          color: "#c5a059",
          fontWeight: 700,
          marginBottom: "0.2rem",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "0.65rem",
          color: "rgba(244,235,208,0.5)",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
    </div>
  );
}
