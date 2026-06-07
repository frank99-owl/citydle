"use client";

import { memo } from "react";
import { Language } from "@/types";
import { TRANSLATIONS } from "@/lib/i18n";

interface GameStatsProps {
  lang: Language;
  mapName: string;
  guessedCount: number;
  totalStreets: number;
}

function getEncouragement(rate: number, lang: Language): string | null {
  if (rate >= 0.9)
    return lang === "zh"
      ? "只差几步即可完美通关！"
      : "Just a few more to perfect completion!";
  if (rate >= 0.75)
    return lang === "zh" ? "即将征服此图！" : "Almost conquered this map!";
  if (rate >= 0.5)
    return lang === "zh"
      ? "已过半程，继续加油！"
      : "Halfway there, keep going!";
  return null;
}

export const GameStats = memo(function GameStats({
  lang,
  mapName,
  guessedCount,
  totalStreets,
}: GameStatsProps) {
  const t = TRANSLATIONS[lang];
  const rate = totalStreets > 0 ? guessedCount / totalStreets : 0;
  const percent = (rate * 100).toFixed(1);
  const remaining = totalStreets - guessedCount;
  const encouragement = getEncouragement(rate, lang);

  return (
    <div
      style={{
        background: "#e6dfc7",
        padding: "1rem",
        borderRadius: "2px",
        border: "1px solid rgba(66,48,35,0.2)",
        marginBottom: "1.25rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "0.5rem",
        }}
      >
        <span
          style={{
            fontSize: "0.8rem",
            textTransform: "uppercase",
            fontFamily: "var(--font-cinzel)",
          }}
        >
          {t.currentMap}:
        </span>
        <strong style={{ fontSize: "0.9rem" }}>{mapName}</strong>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "0.5rem",
        }}
      >
        <span
          style={{
            fontSize: "0.8rem",
            textTransform: "uppercase",
            fontFamily: "var(--font-cinzel)",
          }}
        >
          {t.guessedStreets}:
        </span>
        <strong style={{ fontSize: "1.1rem", color: "#3a5f43" }}>
          {guessedCount} / {totalStreets}
        </strong>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: "100%",
          height: "10px",
          background: "#d9d0bc",
          borderRadius: "5px",
          overflow: "hidden",
          margin: "0.5rem 0",
          border: "1px solid rgba(66,48,35,0.15)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(rate * 100, 100)}%`,
            background:
              rate >= 0.9
                ? "linear-gradient(90deg, #3a5f43, #c5a059)"
                : rate >= 0.5
                  ? "linear-gradient(90deg, #3a5f43, #5a8f63)"
                  : "#3a5f43",
            borderRadius: "5px",
            transition: "width 0.5s ease, background 0.5s ease",
          }}
        />
      </div>

      {/* Remaining count */}
      {remaining > 0 && (
        <div
          style={{
            textAlign: "center",
            fontSize: "0.78rem",
            color: "#7a6b55",
            marginBottom: "0.3rem",
            fontFamily: "var(--font-cinzel)",
          }}
        >
          {t.progressRemaining.replace("{count}", String(remaining))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: "0.8rem",
            textTransform: "uppercase",
            fontFamily: "var(--font-cinzel)",
          }}
        >
          {t.completionRate}:
        </span>
        <strong>{percent}%</strong>
      </div>

      {/* Encouragement message */}
      {encouragement && (
        <div
          style={{
            textAlign: "center",
            marginTop: "0.5rem",
            padding: "0.35rem 0.6rem",
            background: "#fdf8eb",
            border: "1px dashed #c5a059",
            borderRadius: "2px",
            fontSize: "0.8rem",
            color: "#8a6d3b",
            fontFamily: "var(--font-cinzel)",
          }}
        >
          {encouragement}
        </div>
      )}
    </div>
  );
});
