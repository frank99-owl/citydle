"use client";

import { memo } from "react";
import { Language } from "@/types";
import { PRESETS } from "@/lib/constants";
import { TRANSLATIONS } from "@/lib/i18n";
import { DailyChallenge, DailyChallengeRecord } from "@/hooks/useStats";

interface DailyChallengeCardProps {
  lang: Language;
  dailyChallenge: DailyChallenge | null;
  isCompletedToday: boolean;
  todayResult: DailyChallengeRecord | null;
  dailyStreak: number;
  onStartChallenge: (presetIndex: number, difficulty: string) => void;
}

function getDifficultyLabel(difficulty: string, lang: Language): string {
  if (lang === "zh") {
    if (difficulty === "easy") return "简单";
    if (difficulty === "medium") return "中等";
    return "困难";
  }
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

function getDifficultyColor(difficulty: string): string {
  if (difficulty === "easy") return "#3a5f43";
  if (difficulty === "medium") return "#c5a059";
  return "#8a3324";
}

export const DailyChallengeCard = memo(function DailyChallengeCard({
  lang,
  dailyChallenge,
  isCompletedToday,
  todayResult,
  dailyStreak,
  onStartChallenge,
}: DailyChallengeCardProps) {
  if (!dailyChallenge) return null;

  const t = TRANSLATIONS[lang];
  const preset = PRESETS[dailyChallenge.presetIndex];
  const today = new Date();
  const dateStr =
    lang === "zh"
      ? `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
      : today.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "900px",
        zIndex: 1,
        marginBottom: "1.5rem",
        background:
          "linear-gradient(135deg, rgba(197,160,89,0.12) 0%, rgba(138,51,36,0.08) 100%)",
        border: "1.5px solid rgba(197,160,89,0.4)",
        borderRadius: "4px",
        padding: "1.5rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative corner */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "60px",
          height: "60px",
          background:
            "linear-gradient(225deg, rgba(197,160,89,0.2) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        {/* Left: Challenge Info */}
        <div style={{ flex: "1 1 300px" }}>
          <div
            style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: "0.7rem",
              letterSpacing: "0.3em",
              color: "#c5a059",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            {t.dailyChallenge}
          </div>

          <div
            style={{
              fontSize: "0.85rem",
              color: "rgba(244,235,208,0.6)",
              marginBottom: "0.75rem",
            }}
          >
            {dateStr}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            <span style={{ fontSize: "2rem" }}>{preset.emoji}</span>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  fontSize: "1.1rem",
                  color: "#f4ebd0",
                  fontWeight: 700,
                }}
              >
                {lang === "zh"
                  ? dailyChallenge.cityName
                  : dailyChallenge.cityNameEn}
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "rgba(197,160,89,0.7)",
                  fontStyle: "italic",
                }}
              >
                {preset.subtitle}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "0.2rem 0.6rem",
                background: getDifficultyColor(dailyChallenge.difficulty),
                color: "#f4ebd0",
                borderRadius: "2px",
                fontSize: "0.75rem",
                fontFamily: "var(--font-cinzel), serif",
                letterSpacing: "0.1em",
              }}
            >
              {getDifficultyLabel(dailyChallenge.difficulty, lang)}
            </span>

            {dailyStreak > 0 && (
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "#c5a059",
                }}
              >
                🔥 {dailyStreak} {t.dayStreak}
              </span>
            )}
          </div>
        </div>

        {/* Right: Action / Result */}
        <div
          style={{ flex: "0 0 auto", textAlign: "center", minWidth: "140px" }}
        >
          {isCompletedToday && todayResult ? (
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "rgba(244,235,208,0.5)",
                  marginBottom: "0.5rem",
                  fontFamily: "var(--font-cinzel), serif",
                  letterSpacing: "0.1em",
                }}
              >
                {t.completedToday}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  fontSize: "1.8rem",
                  color: "#c5a059",
                  fontWeight: 900,
                }}
              >
                {(todayResult.completionRate * 100).toFixed(0)}%
              </div>
              <div
                style={{ fontSize: "0.8rem", color: "rgba(244,235,208,0.6)" }}
              >
                {todayResult.score}/{todayResult.totalStreets} 🔥
                {todayResult.maxStreak}
              </div>
            </div>
          ) : (
            <button
              onClick={() =>
                onStartChallenge(
                  dailyChallenge.presetIndex,
                  dailyChallenge.difficulty,
                )
              }
              style={{
                fontFamily: "var(--font-cinzel), serif",
                fontSize: "0.85rem",
                letterSpacing: "0.1em",
                padding: "0.6rem 1.5rem",
                background:
                  "linear-gradient(135deg, rgba(197,160,89,0.2) 0%, rgba(197,160,89,0.1) 100%)",
                border: "1.5px solid #c5a059",
                borderRadius: "3px",
                color: "#c5a059",
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(197,160,89,0.3)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 15px rgba(197,160,89,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "linear-gradient(135deg, rgba(197,160,89,0.2) 0%, rgba(197,160,89,0.1) 100%)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {t.startChallenge}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
