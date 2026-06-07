import { useState, useCallback, useRef } from "react";
import {
  Street,
  HintClue,
  Difficulty,
  Achievement,
  GuessResult,
  Bounds,
} from "@/types";
import { ACHIEVEMENTS } from "@/lib/constants";
import {
  calculateSimilarity,
  matchesAlias,
  calculateDirectionHint,
  generateHintPattern,
} from "@/lib/matching";

export function useGameLogic() {
  const [guess, setGuess] = useState("");
  const [guessedCount, setGuessedCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintClue, setHintClue] = useState<HintClue | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("hard");
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);

  const difficultyRef = useRef<Difficulty>("hard");
  const hintClueRef = useRef<HintClue | null>(null);
  const showResultRef = useRef(false);

  // Load difficulty from localStorage
  const loadDifficulty = useCallback(() => {
    const saved = localStorage.getItem("cartographer_difficulty") as Difficulty;
    if (saved && ["easy", "medium", "hard"].includes(saved)) {
      setDifficulty(saved);
      difficultyRef.current = saved;
    }
  }, []);

  const updateDifficulty = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    difficultyRef.current = diff;
    localStorage.setItem("cartographer_difficulty", diff);
    if (diff === "hard") {
      clearHint();
    }
  }, []);

  const clearHint = useCallback(() => {
    setHintClue(null);
    hintClueRef.current = null;
  }, []);

  const getHint = useCallback(
    (streets: Street[]): HintClue | null => {
      const unguessed = streets.filter((s) => !s.guessed);
      if (unguessed.length === 0) return null;

      const randomStreet =
        unguessed[Math.floor(Math.random() * unguessed.length)];
      const pattern = generateHintPattern(randomStreet.name);

      const newHint: HintClue = {
        name: randomStreet.name,
        pattern,
        geom: randomStreet.geometry,
      };

      setHintsUsed((prev) => prev + 1);
      setHintClue(newHint);
      hintClueRef.current = newHint;

      return newHint;
    },
    [generateHintPattern],
  );

  const checkGuess = useCallback(
    (
      guessText: string,
      streets: Street[],
      bounds: Bounds | null,
      lang: "zh" | "en",
      onReveal: (name: string) => void,
      onStreakConfetti: (streak: number) => void,
      onAllGuessed: () => void,
    ): GuessResult => {
      const cleanGuess = guessText.toLowerCase().trim();
      if (!cleanGuess || streets.length === 0) return { found: false };

      let found = false;
      let newGuessedCount = guessedCount;
      let matchedStreetName = "";

      for (const street of streets) {
        if (!street.guessed && matchesAlias(cleanGuess, street)) {
          found = true;
          matchedStreetName = street.name;
          onReveal(street.name);
          break;
        }
      }

      if (found) {
        newGuessedCount = guessedCount + 1;
        setGuessedCount(newGuessedCount);
        setGuess("");
        setConsecutiveWrong(0);

        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > maxStreak) {
          setMaxStreak(newStreak);
        }

        if (newStreak > 1) {
          onStreakConfetti(newStreak);
        }

        // Check if hint was for this street
        if (hintClue && hintClue.name === matchedStreetName) {
          clearHint();
        }

        if (newGuessedCount === streets.length) {
          onAllGuessed();
        }
        return { found: true };
      }

      // Wrong guess — fuzzy matching
      const newWrong = consecutiveWrong + 1;
      setConsecutiveWrong(newWrong);
      setStreak(0);

      const unguessed = streets.filter((s) => !s.guessed);
      const closeMatches = unguessed
        .map((s) => ({
          name: s.name,
          similarity: calculateSimilarity(
            cleanGuess,
            s.name.toLowerCase().trim(),
          ),
        }))
        .filter((m) => m.similarity > 0.6 && m.similarity < 1)
        .sort((a, b) => b.similarity - a.similarity);

      let hint: string | undefined;
      if (closeMatches.length > 0) {
        const t = TRANSLATIONS_ZH_EN[lang];
        hint = t.nearMissHint.replace("{name}", closeMatches[0].name);
      }

      let directionHint: string | undefined;
      if (newWrong >= 3 && unguessed.length > 0) {
        // Find the closest street by fuzzy match for direction hint
        const target =
          closeMatches.length > 0
            ? unguessed.find((s) => s.name === closeMatches[0].name) ||
              unguessed[0]
            : unguessed[Math.floor(Math.random() * unguessed.length)];
        const dir = calculateDirectionHint(target, bounds, lang);
        if (dir) {
          const t = TRANSLATIONS_ZH_EN[lang];
          directionHint = t.directionHint.replace("{direction}", dir);
        }
      }

      return { found: false, hint, directionHint };
    },
    [guessedCount, streak, maxStreak, consecutiveWrong, hintClue, clearHint],
  );

  const endGame = useCallback(() => {
    setShowResult(true);
    showResultRef.current = true;
  }, []);

  const resetGame = useCallback(() => {
    setGuess("");
    setGuessedCount(0);
    setStreak(0);
    setMaxStreak(0);
    setShowResult(false);
    setIsSaved(false);
    setHintsUsed(0);
    setConsecutiveWrong(0);
    clearHint();
    showResultRef.current = false;
  }, [clearHint]);

  const calculateBadge = useCallback(
    (totalStreets: number): Achievement | null => {
      const rate = totalStreets > 0 ? guessedCount / totalStreets : 0;
      if (rate >= 0.8) return ACHIEVEMENTS[2];
      if (rate >= 0.5) return ACHIEVEMENTS[1];
      if (rate >= 0.1) return ACHIEVEMENTS[0];
      return null;
    },
    [guessedCount],
  );

  return {
    guess,
    setGuess,
    guessedCount,
    streak,
    maxStreak,
    showResult,
    setShowResult,
    isSaved,
    setIsSaved,
    hintsUsed,
    hintClue,
    hintClueRef,
    difficulty,
    difficultyRef,
    showResultRef,
    consecutiveWrong,
    loadDifficulty,
    updateDifficulty,
    getHint,
    clearHint,
    checkGuess,
    endGame,
    resetGame,
    calculateBadge,
  };
}

// Minimal translation helper for hints (avoid circular dep with i18n.ts)
const TRANSLATIONS_ZH_EN = {
  zh: {
    nearMissHint: '差一点！你是否想输入 "{name}"？',
    directionHint: "这条街道在地图的 {direction} 方",
  },
  en: {
    nearMissHint: 'Almost! Did you mean "{name}"?',
    directionHint: "This street is in the {direction} part of the map",
  },
} as const;
