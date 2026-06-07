"use client";

import { memo } from "react";
import { HintClue, Language } from "@/types";
import { TRANSLATIONS } from "@/lib/i18n";

interface HintConsoleProps {
  lang: Language;
  hintClue: HintClue | null;
  hintsUsed: number;
  onGetHint: () => void;
}

export const HintConsole = memo(function HintConsole({
  lang,
  hintClue,
  hintsUsed,
  onGetHint,
}: HintConsoleProps) {
  const t = TRANSLATIONS[lang];

  return (
    <div
      style={{
        background: "#fcfaf2",
        padding: "0.75rem 1rem",
        borderRadius: "4px",
        border: "1px solid var(--wood-border)",
        boxShadow: "inset 0 0 10px rgba(44, 37, 25, 0.05)",
        marginBottom: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={onGetHint}
          className="vintage-btn"
          style={{
            padding: "0.4rem 0.8rem",
            fontSize: "0.8rem",
            boxShadow: "none",
            textShadow: "none",
          }}
        >
          {t.getHintBtn}
        </button>
        <span
          style={{
            fontSize: "0.8rem",
            fontStyle: "italic",
            color: "var(--ink-sepia)",
          }}
        >
          {t.hintUsageText.replace("{count}", hintsUsed.toString())}
        </span>
      </div>

      {hintClue && (
        <div
          style={{
            marginTop: "0.4rem",
            padding: "0.5rem 0.75rem",
            background: "rgba(197, 160, 89, 0.1)",
            borderLeft: "3px solid #c5a059",
            fontSize: "0.85rem",
            color: "var(--ink-dark)",
            fontFamily: "monospace",
          }}
        >
          <strong
            style={{
              fontFamily: "var(--font-cinzel), serif",
              display: "block",
              fontSize: "0.75rem",
              color: "#c5a059",
              marginBottom: "0.2rem",
            }}
          >
            {t.hintClueTitle}
          </strong>
          <div style={{ wordBreak: "break-all" }}>
            {t.hintClueText
              .replace("{pattern}", hintClue.pattern)
              .replace("{length}", hintClue.name.length.toString())}
          </div>
        </div>
      )}
    </div>
  );
});
