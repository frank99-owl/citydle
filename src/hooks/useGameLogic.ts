import { useState, useCallback, useRef } from 'react';
import { Street, HintClue, Difficulty, Achievement } from '@/types';
import { ACHIEVEMENTS } from '@/lib/constants';

export function useGameLogic() {
  const [guess, setGuess] = useState('');
  const [guessedCount, setGuessedCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintClue, setHintClue] = useState<HintClue | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('hard');

  const difficultyRef = useRef<Difficulty>('hard');
  const hintClueRef = useRef<HintClue | null>(null);
  const showResultRef = useRef(false);

  // Load difficulty from localStorage
  const loadDifficulty = useCallback(() => {
    const saved = localStorage.getItem('cartographer_difficulty') as Difficulty;
    if (saved && ['easy', 'medium', 'hard'].includes(saved)) {
      setDifficulty(saved);
      difficultyRef.current = saved;
    }
  }, []);

  const updateDifficulty = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    difficultyRef.current = diff;
    localStorage.setItem('cartographer_difficulty', diff);
    if (diff === 'hard') {
      clearHint();
    }
  }, []);

  const generateHintPattern = useCallback((name: string): string => {
    const words = name.split(' ');
    const patternWords = words.map(word => {
      if (word.length === 0) return '';
      const firstChar = word[0];
      const rest = word.slice(1);
      const restHidden = rest.replace(/[a-zA-Z]/g, '_');
      return firstChar + restHidden;
    });
    return patternWords.join(' ');
  }, []);

  const clearHint = useCallback(() => {
    setHintClue(null);
    hintClueRef.current = null;
  }, []);

  const getHint = useCallback((streets: Street[]): HintClue | null => {
    const unguessed = streets.filter(s => !s.guessed);
    if (unguessed.length === 0) return null;

    const randomStreet = unguessed[Math.floor(Math.random() * unguessed.length)];
    const pattern = generateHintPattern(randomStreet.name);

    const newHint: HintClue = {
      name: randomStreet.name,
      pattern,
      geom: randomStreet.geometry,
    };

    setHintsUsed(prev => prev + 1);
    setHintClue(newHint);
    hintClueRef.current = newHint;

    return newHint;
  }, [generateHintPattern]);

  const checkGuess = useCallback((
    guessText: string,
    streets: Street[],
    onReveal: (name: string) => void,
    onStreakConfetti: (streak: number) => void,
    onAllGuessed: () => void
  ): boolean => {
    const cleanGuess = guessText.toLowerCase().trim();
    if (!cleanGuess) return false;

    let found = false;
    let newGuessedCount = guessedCount;

    const updatedStreets = streets.map(street => {
      if (street.name.toLowerCase().trim() === cleanGuess) {
        if (!street.guessed) {
          found = true;
          onReveal(cleanGuess);
          return { ...street, guessed: true };
        }
      }
      return street;
    });

    if (found) {
      newGuessedCount = guessedCount + 1;
      setGuessedCount(newGuessedCount);
      setGuess('');

      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) {
        setMaxStreak(newStreak);
      }

      if (newStreak > 1) {
        onStreakConfetti(newStreak);
      }

      // Check if hint was for this street
      if (hintClue && hintClue.name.toLowerCase().trim() === cleanGuess) {
        clearHint();
      }

      if (newGuessedCount === streets.length) {
        onAllGuessed();
      }
    } else {
      setStreak(0);
      setGuess('');
    }

    return found;
  }, [guessedCount, streak, maxStreak, hintClue, clearHint]);

  const endGame = useCallback(() => {
    setShowResult(true);
    showResultRef.current = true;
  }, []);

  const resetGame = useCallback(() => {
    setGuess('');
    setGuessedCount(0);
    setStreak(0);
    setMaxStreak(0);
    setShowResult(false);
    setIsSaved(false);
    setHintsUsed(0);
    clearHint();
    showResultRef.current = false;
  }, [clearHint]);

  const calculateBadge = useCallback((totalStreets: number): Achievement | null => {
    const rate = totalStreets > 0 ? guessedCount / totalStreets : 0;
    if (rate >= 0.8) return ACHIEVEMENTS[2];
    if (rate >= 0.5) return ACHIEVEMENTS[1];
    if (rate >= 0.1) return ACHIEVEMENTS[0];
    return null;
  }, [guessedCount]);

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
