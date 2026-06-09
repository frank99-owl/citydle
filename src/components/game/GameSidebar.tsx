"use client";

import {
  Language,
  MapProvider,
  Difficulty,
  Street,
  HintClue,
  Bounds,
} from "@/types";
import { TRANSLATIONS } from "@/lib/i18n";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { GameStats } from "./GameStats";
import { GuessInput } from "./GuessInput";
import { HintConsole } from "./HintConsole";
import { StreakDisplay } from "./StreakDisplay";
import { StreetList } from "./StreetList";
import { GameActions } from "./GameActions";

interface GameSidebarProps {
  lang: Language;
  view: "lobby" | "game";
  customMode: boolean;
  gameStarted: boolean;
  loading: boolean;
  showResult: boolean;
  mapName: string;
  streets: Street[];
  guessedCount: number;
  streak: number;
  guess: string;
  isSaved: boolean;
  hintsUsed: number;
  hintClue: HintClue | null;
  difficulty: Difficulty;
  mapProvider: MapProvider;
  bounds: Bounds | null;
  searchQuery: string;
  searchLoading: boolean;
  errorMessage?: string | null;
  hintMessage?: string | null;
  directionMessage?: string | null;
  onToggleLanguage: () => void;
  onGuessChange: (value: string) => void;
  onGuessSubmit: (e: React.FormEvent) => void;
  onGetHint: () => void;
  onSave: () => void;
  onForfeit: () => void;
  onExit: () => void;
  onBackToLobby: () => void;
  onStartCustomGame: () => void;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onMapNameChange: (value: string) => void;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onMapProviderChange: (provider: MapProvider) => void;
}

export function GameSidebar({
  lang,
  view,
  customMode,
  gameStarted,
  loading,
  showResult,
  mapName,
  streets,
  guessedCount,
  streak,
  guess,
  isSaved,
  hintsUsed,
  hintClue,
  difficulty,
  mapProvider,
  bounds,
  searchQuery,
  searchLoading,
  errorMessage,
  hintMessage,
  directionMessage,
  onToggleLanguage,
  onGuessChange,
  onGuessSubmit,
  onGetHint,
  onSave,
  onForfeit,
  onExit,
  onBackToLobby,
  onStartCustomGame,
  onSearchQueryChange,
  onSearchSubmit,
  onMapNameChange,
  onDifficultyChange,
  onMapProviderChange,
}: GameSidebarProps) {
  const t = TRANSLATIONS[lang];

  const selectStyle = {
    padding: "0.4rem 0.5rem",
    background: "#fcfaf2",
    color: "var(--ink-dark)",
    border: "1px solid var(--wood-border)",
    borderRadius: "2px",
    fontFamily: "var(--font-serif), serif",
    fontSize: "0.8rem",
    outline: "none",
    cursor: "pointer",
    width: "100%",
  };

  return (
    <aside
      className="vintage-panel"
      aria-label={t.gameControlsLabel}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "380px",
        height: "100%",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        padding: "1.5rem",
        borderLeft: "none",
        borderTop: "none",
        borderBottom: "none",
        borderRadius: 0,
        transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: view === "game" ? "translateX(0)" : "translateX(-100%)",
        boxShadow: "4px 0 15px rgba(0,0,0,0.3)",
      }}
    >
      {/* Banner header */}
      <div
        style={{
          borderBottom: "1px solid rgba(66,48,35,0.3)",
          paddingBottom: "1rem",
          marginBottom: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h2
            className="vintage-title"
            style={{
              fontSize: "1.25rem",
              color: "#2c2519",
              margin: "0 0 0.25rem",
            }}
          >
            {t.title}
          </h2>
          <div className="vintage-subtitle" style={{ fontSize: "0.85rem" }}>
            {t.sidebarSubtitle}
          </div>
        </div>
        <LanguageToggle
          lang={lang}
          onToggle={onToggleLanguage}
          variant="mini"
        />
      </div>

      {/* Custom Mode Setup */}
      {customMode && !gameStarted && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          <h3 className="vintage-title" style={{ fontSize: "1rem", margin: 0 }}>
            {t.customSetupTitle}
          </h3>
          <p style={{ fontSize: "0.85rem", lineHeight: 1.5, color: "#4e3629" }}>
            {t.customSetupDesc}
          </p>

          {/* City Search Bar */}
          <form
            onSubmit={onSearchSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}
          >
            <label
              style={{
                fontSize: "0.75rem",
                fontFamily: "var(--font-cinzel)",
                display: "block",
              }}
            >
              {t.customSearchLabel}
            </label>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder={t.customSearchPlaceholder}
                disabled={searchLoading}
                style={{
                  flex: 1,
                  padding: "0.4rem 0.5rem",
                  border: "1px solid var(--wood-border)",
                  background: "#fcfaf2",
                  fontSize: "0.85rem",
                }}
              />
              <button
                type="submit"
                className="vintage-btn"
                disabled={searchLoading}
                style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.8rem",
                  boxShadow: "none",
                  textShadow: "none",
                }}
              >
                {searchLoading ? t.customSearchLoading : t.customSearchBtn}
              </button>
            </div>
          </form>

          <div>
            <label
              style={{
                fontSize: "0.75rem",
                fontFamily: "var(--font-cinzel)",
                display: "block",
                marginBottom: "0.4rem",
              }}
            >
              {t.customNameLabel}
            </label>
            <input
              type="text"
              value={mapName}
              onChange={(e) => onMapNameChange(e.target.value)}
              placeholder={t.customNamePlaceholder}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid var(--wood-border)",
                background: "#fcfaf2",
                fontSize: "0.9rem",
              }}
            />
          </div>
          <button
            onClick={onStartCustomGame}
            className="vintage-btn"
            style={{ width: "100%", padding: "0.75rem", marginTop: "1rem" }}
          >
            {t.customInitBtn}
          </button>
          <button
            onClick={onBackToLobby}
            style={{
              background: "none",
              border: "1px solid #8a3324",
              color: "#8a3324",
              padding: "0.5rem",
              cursor: "pointer",
              fontFamily: "var(--font-cinzel)",
              fontSize: "0.8rem",
            }}
          >
            {t.backHome}
          </button>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <LoadingSpinner
          message={t.loadingStreets}
          onBack={onBackToLobby}
          backLabel={t.backHome}
        />
      )}

      {/* Active Game Console */}
      {gameStarted && !loading && !showResult && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <GameStats
            lang={lang}
            mapName={mapName}
            guessedCount={guessedCount}
            totalStreets={streets.length}
          />

          {/* Mini Settings Selection in game */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <select
              value={difficulty}
              onChange={(e) => onDifficultyChange(e.target.value as Difficulty)}
              style={selectStyle}
            >
              <option value="easy">
                {t.difficultyEasyOption}
              </option>
              <option value="medium">
                {t.difficultyMediumOption}
              </option>
              <option value="hard">
                {t.difficultyHardOption}
              </option>
            </select>
            <select
              value={mapProvider}
              onChange={(e) =>
                onMapProviderChange(e.target.value as MapProvider)
              }
              style={selectStyle}
            >
              <option value="cartodb-dark">
                {t.mapProviderCartoDarkOption}
              </option>
              <option value="cartodb">
                {t.mapProviderCartoOption}
              </option>
              <option value="osm">
                {t.mapProviderOSMOption}
              </option>
              <option value="amap">
                {t.mapProviderAmapOption}
              </option>
            </select>
          </div>

          {/* Hint Clue Console Widget */}
          {difficulty !== "hard" && (
            <HintConsole
              lang={lang}
              hintClue={hintClue}
              hintsUsed={hintsUsed}
              onGetHint={onGetHint}
            />
          )}

          {/* Streak component */}
          <StreakDisplay lang={lang} streak={streak} />

          {/* Input Form */}
          <GuessInput
            lang={lang}
            guess={guess}
            disabled={showResult}
            errorMessage={errorMessage}
            hintMessage={hintMessage}
            directionMessage={directionMessage}
            onGuessChange={onGuessChange}
            onSubmit={onGuessSubmit}
          />

          {/* Street List */}
          <StreetList
            lang={lang}
            streets={streets}
            guessedCount={guessedCount}
          />

          {/* Save / Forfeit Actions */}
          <GameActions
            lang={lang}
            isSaved={isSaved}
            onSave={onSave}
            onForfeit={onForfeit}
            onExit={onExit}
          />
        </div>
      )}
    </aside>
  );
}
