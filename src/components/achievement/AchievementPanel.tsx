"use client";

import { useState, useEffect } from "react";
import { Achievement, Language } from "@/types";
import { ACHIEVEMENTS } from "@/lib/constants";
import { loadUnlocked } from "@/hooks/useAchievements";

interface AchievementPanelProps {
  lang: Language;
  isVisible: boolean;
}

const tierIcons: Record<string, string> = {
  bronze: "🛡",
  silver: "⚔",
  gold: "👑",
};

const tierColors: Record<string, string> = {
  bronze: "#8b6914",
  silver: "#b0b0b0",
  gold: "#d4a843",
};

function formatDate(iso: string, lang: Language): string {
  try {
    const d = new Date(iso);
    if (lang === "zh") {
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    }
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function AchievementPanel({ lang, isVisible }: AchievementPanelProps) {
  const [unlockedMap, setUnlockedMap] = useState<Record<string, string>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    setUnlockedMap(loadUnlocked());
    // Refresh when panel becomes visible
    if (isVisible) {
      setUnlockedMap(loadUnlocked());
    }
  }, [isVisible]);

  const totalUnlocked = Object.keys(unlockedMap).length;
  const totalAchievements = ACHIEVEMENTS.length;

  return (
    <div style={{ width: "100%" }}>
      {/* Progress summary */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
          padding: "0.5rem 0.75rem",
          background: "rgba(244,235,208,0.06)",
          borderRadius: "3px",
          border: "1px solid rgba(197,160,89,0.15)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-cinzel), serif",
            fontSize: "0.7rem",
            letterSpacing: "0.1em",
            color: "rgba(244,235,208,0.6)",
          }}
        >
          {lang === "zh" ? "总进度" : "Overall"}
        </span>
        <span
          style={{
            fontFamily: "var(--font-cinzel), serif",
            fontSize: "0.75rem",
            color: "#c5a059",
          }}
        >
          {totalUnlocked} / {totalAchievements}
        </span>
      </div>

      {/* Achievement list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {ACHIEVEMENTS.map((ach) => {
          const unlocked = !!unlockedMap[ach.id];
          const unlockedAt = unlockedMap[ach.id];
          const tierColor = tierColors[ach.tier] || tierColors.bronze;
          const isHovered = hoveredId === ach.id;

          return (
            <div
              key={ach.id}
              onMouseEnter={() => setHoveredId(ach.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.6rem 0.75rem",
                background: unlocked
                  ? `rgba(197,160,89,${isHovered ? 0.12 : 0.06})`
                  : "rgba(244,235,208,0.02)",
                border: `1px solid ${unlocked ? `${tierColor}40` : "rgba(244,235,208,0.08)"}`,
                borderRadius: "3px",
                transition: "all 0.2s",
                opacity: unlocked ? 1 : 0.5,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Tier icon */}
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: unlocked
                    ? `${tierColor}20`
                    : "rgba(244,235,208,0.05)",
                  border: `1.5px solid ${unlocked ? `${tierColor}60` : "rgba(244,235,208,0.1)"}`,
                  fontSize: "0.9rem",
                  flexShrink: 0,
                  filter: unlocked ? "none" : "grayscale(1)",
                }}
              >
                {tierIcons[ach.tier]}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-cinzel), serif",
                    fontSize: "0.7rem",
                    letterSpacing: "0.05em",
                    color: unlocked ? "#f4ebd0" : "rgba(244,235,208,0.4)",
                    marginBottom: "0.1rem",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {lang === "zh" ? ach.nameCn : ach.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-im-fell), Georgia, serif",
                    fontSize: "0.6rem",
                    fontStyle: "italic",
                    color: unlocked
                      ? "rgba(244,235,208,0.5)"
                      : "rgba(244,235,208,0.25)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {ach.description}
                </div>
              </div>

              {/* Status */}
              <div
                style={{
                  flexShrink: 0,
                  textAlign: "right",
                }}
              >
                {unlocked ? (
                  <div
                    style={{
                      fontSize: "0.55rem",
                      color: tierColor,
                      fontFamily: "var(--font-cinzel), serif",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {formatDate(unlockedAt, lang)}
                  </div>
                ) : (
                  /* Progress bar for locked */
                  <div
                    style={{
                      width: "40px",
                      height: "4px",
                      background: "rgba(244,235,208,0.08)",
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: "0%",
                        height: "100%",
                        background: tierColor,
                        borderRadius: "2px",
                        opacity: 0.5,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
