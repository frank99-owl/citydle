"use client";

import { Suspense, useCallback } from "react";
import dynamic from "next/dynamic";
import { GameProvider, useGame, useLobby } from "@/context/GameContext";
import { PRESETS } from "@/lib/constants";
import { TRANSLATIONS } from "@/lib/i18n";

// Components - eagerly loaded (always visible)
import { GameMap } from "@/components/map/GameMap";
import { LobbyOverlay } from "@/components/lobby/LobbyOverlay";
import { LobbyView } from "@/components/lobby/LobbyView";
import { GameSidebar } from "@/components/game/GameSidebar";

// Components - lazy loaded (conditional / rare)
const SettlementView = dynamic(
  () =>
    import("@/components/settlement/SettlementView").then((m) => ({
      default: m.SettlementView,
    })),
  { ssr: false },
);
const AchievementPopup = dynamic(
  () =>
    import("@/components/achievement/AchievementPopup").then((m) => ({
      default: m.AchievementPopup,
    })),
  { ssr: false },
);
const ShareModal = dynamic(
  () =>
    import("@/components/share/ShareModal").then((m) => ({
      default: m.ShareModal,
    })),
  { ssr: false },
);

function GameContent() {
  const ctx = useGame();
  const lobby = useLobby();
  const closeShareModal = useCallback(
    () => ctx.setShareModalOpen(false),
    [ctx.setShareModalOpen],
  );

  return (
    <main
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Background Map View */}
      <GameMap mapContainerId={ctx.mapContainerId} />

      {/* Lobby Landing UI */}
      <LobbyOverlay
        lang={lobby.lang}
        view={ctx.view}
        presets={PRESETS}
        history={lobby.history}
        highScore={lobby.highScore}
        favorites={lobby.favorites}
        mapProvider={ctx.mapProvider}
        difficulty={ctx.difficulty}
        playerStats={lobby.playerStats}
        dailyChallenge={lobby.getDailyChallenge()}
        isDailyCompletedToday={lobby.isDailyCompletedToday()}
        todayDailyResult={lobby.getTodayDailyResult()}
        onToggleLanguage={ctx.toggleLanguage}
        onSelectPreset={ctx.startGame}
        onStartCustom={ctx.startCustomAreaMode}
        onStartFavorite={ctx.startFromFavorite}
        onDeleteFavorite={lobby.deleteFavorite}
        onProviderChange={ctx.updateMapProvider}
        onDifficultyChange={ctx.updateDifficulty}
        onStartDailyChallenge={ctx.startDailyChallenge}
      />

      {/* Lobby overlays (tutorial button, error banner, tutorial) */}
      <LobbyView
        lang={lobby.lang}
        view={ctx.view}
        tutorial={lobby.tutorial}
        lobbyError={lobby.lobbyError}
        onRetryLobby={lobby.fetchHistoryAndFavorites}
      />

      {/* Game Sidebar */}
      <GameSidebar
        lang={ctx.lang}
        view={ctx.view}
        customMode={ctx.customMode}
        gameStarted={ctx.gameStarted}
        loading={ctx.loading}
        showResult={ctx.showResult}
        mapName={ctx.mapName}
        streets={ctx.streets}
        guessedCount={ctx.guessedCount}
        streak={ctx.streak}
        guess={ctx.guess}
        isSaved={ctx.isSaved}
        hintsUsed={ctx.hintsUsed}
        hintClue={ctx.hintClue}
        difficulty={ctx.difficulty}
        mapProvider={ctx.mapProvider}
        bounds={ctx.bounds}
        searchQuery={ctx.searchQuery}
        searchLoading={ctx.searchLoading}
        errorMessage={ctx.errorMessage}
        hintMessage={ctx.hintMessage}
        directionMessage={ctx.directionMessage}
        onToggleLanguage={ctx.toggleLanguage}
        onGuessChange={ctx.setGuess}
        onGuessSubmit={ctx.handleGuessSubmit}
        onGetHint={ctx.handleGetHint}
        onSave={ctx.handleSaveMap}
        onForfeit={ctx.handleEndGame}
        onExit={ctx.handleExitToLobby}
        onBackToLobby={ctx.returnToLobby}
        onStartCustomGame={ctx.handleStartCustomGame}
        onSearchQueryChange={ctx.setSearchQuery}
        onSearchSubmit={ctx.handleSearchSubmit}
        onMapNameChange={ctx.setMapName}
        onDifficultyChange={ctx.updateDifficulty}
        onMapProviderChange={ctx.updateMapProvider}
      />

      {/* Achievement Unlock Popup */}
      <AchievementPopup
        achievement={lobby.currentAchievementPopup}
        lang={lobby.lang}
        onDismiss={lobby.dismissAchievementPopup}
      />

      {/* Settlement View (inside sidebar when showing results) */}
      {ctx.showResult && (
        <aside
          className="vintage-panel"
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
            boxShadow: "4px 0 15px rgba(0,0,0,0.3)",
          }}
        >
          <SettlementView
            lang={ctx.lang}
            streets={ctx.streets}
            guessedCount={ctx.guessedCount}
            maxStreak={ctx.maxStreak}
            hintsUsed={ctx.hintsUsed}
            difficulty={ctx.difficulty}
            badge={ctx.badge}
            cityName={ctx.mapName}
            timeSeconds={ctx.gameTimeSeconds}
            onBackToLobby={ctx.returnToLobby}
            onShare={ctx.handleOpenShare}
            onSubmitLeaderboard={ctx.handleSubmitLeaderboard}
          />
        </aside>
      )}

      {/* Share Modal */}
      <ShareModal
        lang={ctx.lang}
        isOpen={ctx.shareModalOpen}
        onClose={closeShareModal}
        cityName={ctx.mapName}
        completionRate={
          ctx.streets.length > 0 ? ctx.guessedCount / ctx.streets.length : 0
        }
        maxStreak={ctx.maxStreak}
        guessedCount={ctx.guessedCount}
        totalStreets={ctx.streets.length}
        timeSeconds={ctx.gameTimeSeconds}
        badge={ctx.badge}
      />
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            height: "100vh",
            width: "100vw",
            alignItems: "center",
            justifyContent: "center",
            background: "#2c2519",
            color: "#f4ebd0",
          }}
        >
          Loading...
        </div>
      }
    >
      <GameProvider>
        <GameContent />
      </GameProvider>
    </Suspense>
  );
}
