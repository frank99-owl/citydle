"use client";

import { Language, View } from "@/types";
import { TutorialOverlay } from "@/components/tutorial/TutorialOverlay";
import { useTutorial } from "@/hooks/useTutorial";

interface LobbyViewProps {
  lang: Language;
  view: View;
  tutorial: ReturnType<typeof useTutorial>;
  lobbyError: string | null;
  onRetryLobby: () => void;
}

export function LobbyView({
  lang,
  view,
  tutorial,
  lobbyError,
  onRetryLobby,
}: LobbyViewProps) {
  return (
    <>
      {/* Lobby error banner */}
      {view === "lobby" && lobbyError && (
        <div
          onClick={onRetryLobby}
          style={{
            position: "fixed",
            top: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
            fontFamily: "var(--font-cinzel), serif",
            fontSize: "0.75rem",
            padding: "0.6rem 1.2rem",
            background: "rgba(120,30,30,0.9)",
            border: "1px solid rgba(220,80,60,0.6)",
            borderRadius: "4px",
            color: "#f4ebd0",
            cursor: "pointer",
            backdropFilter: "blur(6px)",
            textAlign: "center",
          }}
        >
          {lobbyError}
        </div>
      )}

      {/* Tutorial "View Tutorial" button in lobby */}
      {view === "lobby" && !tutorial.isActive && (
        <button
          onClick={tutorial.startTutorial}
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            zIndex: 20,
            fontFamily: "var(--font-cinzel), serif",
            fontSize: "0.7rem",
            letterSpacing: "0.1em",
            padding: "0.5rem 1rem",
            background: "rgba(44,37,25,0.85)",
            border: "1.5px solid rgba(197,160,89,0.4)",
            borderRadius: "3px",
            color: "#c5a059",
            cursor: "pointer",
            backdropFilter: "blur(6px)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(197,160,89,0.15)";
            e.currentTarget.style.borderColor = "#c5a059";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(44,37,25,0.85)";
            e.currentTarget.style.borderColor = "rgba(197,160,89,0.4)";
          }}
        >
          {lang === "zh" ? "📖 查看教程" : "📖 View Tutorial"}
        </button>
      )}

      {/* Tutorial Overlay */}
      <TutorialOverlay
        lang={lang}
        isActive={tutorial.isActive}
        currentStep={tutorial.currentStep}
        totalSteps={tutorial.totalSteps}
        onSkip={tutorial.skipTutorial}
        onNext={tutorial.nextStep}
        onPrev={tutorial.prevStep}
      />
    </>
  );
}
