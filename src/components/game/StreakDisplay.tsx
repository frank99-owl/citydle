"use client";

import { memo } from "react";
import { Language } from "@/types";
import { TRANSLATIONS } from "@/lib/i18n";

interface StreakDisplayProps {
  lang: Language;
  streak: number;
}

export const StreakDisplay = memo(function StreakDisplay({
  lang,
  streak,
}: StreakDisplayProps) {
  const t = TRANSLATIONS[lang];

  return (
    <div
      className={`vintage-panel ${streak > 0 ? "streak-active" : ""}`}
      style={{
        padding: "0.75rem",
        textAlign: "center",
        marginBottom: "1.5rem",
        background: streak > 0 ? "#fdf8eb" : "#f4ebd0",
        transition: "all 0.3s",
      }}
    >
      <span
        style={{
          fontSize: "0.8rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          display: "block",
          color: "var(--ink-sepia)",
        }}
      >
        {t.currentStreak}
      </span>
      <span
        style={{
          fontSize: "2.2rem",
          fontWeight: 900,
          fontFamily: "var(--font-cinzel)",
          color: streak > 0 ? "#c5a059" : "var(--ink-dark)",
        }}
      >
        {streak}
      </span>
    </div>
  );
});
