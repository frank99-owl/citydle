"use client";

import { memo, useRef, useEffect, useState } from "react";
import { Language } from "@/types";
import { TRANSLATIONS } from "@/lib/i18n";

interface GuessInputProps {
  lang: Language;
  guess: string;
  disabled: boolean;
  errorMessage?: string | null;
  hintMessage?: string | null;
  directionMessage?: string | null;
  onGuessChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const GuessInput = memo(function GuessInput({
  lang,
  guess,
  disabled,
  errorMessage,
  hintMessage,
  directionMessage,
  onGuessChange,
  onSubmit,
}: GuessInputProps) {
  const t = TRANSLATIONS[lang];
  const inputRef = useRef<HTMLInputElement>(null);
  const [shakeClass, setShakeClass] = useState("");

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  // Trigger red border animation on error
  useEffect(() => {
    if (errorMessage) {
      setShakeClass("guess-input-error");
      const timer = setTimeout(() => setShakeClass(""), 1000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  return (
    <form onSubmit={onSubmit} style={{ marginBottom: "0.75rem" }}>
      <label
        htmlFor="guess-input"
        style={{
          fontSize: "0.75rem",
          textTransform: "uppercase",
          fontFamily: "var(--font-cinzel)",
          display: "block",
          marginBottom: "0.4rem",
        }}
      >
        {t.inputLabel}
      </label>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          id="guess-input"
          type="text"
          value={guess}
          onChange={(e) => onGuessChange(e.target.value)}
          ref={inputRef}
          placeholder={t.inputPlaceholder}
          disabled={disabled}
          className={shakeClass}
          aria-invalid={!!errorMessage}
          aria-describedby={
            errorMessage
              ? "guess-error"
              : hintMessage
                ? "guess-hint"
                : undefined
          }
          autoComplete="off"
          style={{
            flex: 1,
            padding: "0.6rem",
            border: "2px solid var(--wood-border)",
            background: "#fcfaf2",
            fontSize: "0.95rem",
          }}
        />
        <button
          type="submit"
          className="vintage-btn"
          aria-label={t.submitBtn}
          style={{ padding: "0 1rem" }}
        >
          {t.submitBtn}
        </button>
      </div>

      {/* Hint / Direction messages */}
      {hintMessage && (
        <div
          id="guess-hint"
          role="status"
          style={{
            marginTop: "0.4rem",
            padding: "0.4rem 0.6rem",
            background: "#fef9e7",
            border: "1px solid #e6dfc7",
            borderRadius: "2px",
            fontSize: "0.8rem",
            color: "#6b5c3d",
          }}
        >
          {hintMessage}
        </div>
      )}
      {directionMessage && (
        <div
          role="status"
          style={{
            marginTop: "0.3rem",
            padding: "0.3rem 0.6rem",
            background: "#f0f4e8",
            border: "1px solid #c5d4a8",
            borderRadius: "2px",
            fontSize: "0.78rem",
            color: "#4a6b2a",
          }}
        >
          {directionMessage}
        </div>
      )}
      {errorMessage && (
        <div
          id="guess-error"
          role="alert"
          style={{
            marginTop: "0.3rem",
            padding: "0.3rem 0.6rem",
            background: "#fde8e8",
            border: "1px solid #e6a8a8",
            borderRadius: "2px",
            fontSize: "0.78rem",
            color: "#8a3324",
          }}
        >
          {errorMessage}
        </div>
      )}

      <style jsx>{`
        .guess-input-error {
          animation: shake-red 1s ease;
          border-color: #c0392b !important;
          box-shadow: 0 0 6px rgba(192, 57, 43, 0.3);
        }
        @keyframes shake-red {
          0% {
            border-color: #c0392b;
            box-shadow: 0 0 6px rgba(192, 57, 43, 0.3);
          }
          25% {
            border-color: #c0392b;
            transform: translateX(-3px);
          }
          50% {
            border-color: #c0392b;
            transform: translateX(3px);
          }
          75% {
            border-color: #c0392b;
            transform: translateX(-2px);
          }
          100% {
            border-color: var(--wood-border);
            box-shadow: none;
            transform: translateX(0);
          }
        }
      `}</style>
    </form>
  );
});
