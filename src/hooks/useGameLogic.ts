import { useState, useCallback, useRef } from 'react';
import { Street, HintClue, Difficulty, Achievement, GuessResult, Bounds } from '@/types';
import { ACHIEVEMENTS } from '@/lib/constants';

// Levenshtein distance
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function calculateSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  return 1 - dist / maxLen;
}

function getDirectionLabel(angleDeg: number, lang: 'zh' | 'en'): string {
  // Normalize to 0-360
  const a = ((angleDeg % 360) + 360) % 360;
  if (lang === 'zh') {
    if (a >= 337.5 || a < 22.5) return '北';
    if (a >= 22.5 && a < 67.5) return '东北';
    if (a >= 67.5 && a < 112.5) return '东';
    if (a >= 112.5 && a < 157.5) return '东南';
    if (a >= 157.5 && a < 202.5) return '南';
    if (a >= 202.5 && a < 247.5) return '西南';
    if (a >= 247.5 && a < 292.5) return '西';
    return '西北';
  }
  if (a >= 337.5 || a < 22.5) return 'North';
  if (a >= 22.5 && a < 67.5) return 'Northeast';
  if (a >= 67.5 && a < 112.5) return 'East';
  if (a >= 112.5 && a < 157.5) return 'Southeast';
  if (a >= 157.5 && a < 202.5) return 'South';
  if (a >= 202.5 && a < 247.5) return 'Southwest';
  if (a >= 247.5 && a < 292.5) return 'West';
  return 'Northwest';
}

function normalizeString(s: string): string {
  return s.toLowerCase().replace(/[\s._\-,.!?;:'"()[\]{}]/g, '').trim();
}

function matchesAlias(guess: string, street: Street): boolean {
  const norm = normalizeString(guess);
  // Check against street name
  if (normalizeString(street.name) === norm) return true;
  // Check against all aliases
  if (street.aliases) {
    for (const alias of street.aliases) {
      if (normalizeString(alias) === norm) return true;
    }
  }
  return false;
}

function calculateDirectionHint(street: Street, bounds: Bounds | null, lang: 'zh' | 'en'): string | null {
  if (!street.geometry || street.geometry.length === 0 || !bounds) return null;
  const geom = street.geometry;
  let latSum = 0, lngSum = 0;
  const points = geom.length;
  for (const pt of geom) {
    latSum += pt[1];
    lngSum += pt[0];
  }
  const streetLat = latSum / points;
  const streetLng = lngSum / points;
  const centerLat = (bounds.south + bounds.north) / 2;
  const centerLng = (bounds.west + bounds.east) / 2;

  const dLat = streetLat - centerLat;
  const dLng = streetLng - centerLng;
  const angle = Math.atan2(dLng, dLat) * (180 / Math.PI);

  return getDirectionLabel(angle, lang);
}

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
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);

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
      // Detect if word contains CJK characters
      if (/[一-鿿぀-ゟ゠-ヿ]/.test(word)) {
        // CJK: show first char + underscores for remaining chars
        if (word.length <= 2) return word;
        return firstChar + '_'.repeat(rest.length);
      }
      // English: show first char + underscore for each letter, preserve spaces/numbers
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
    bounds: Bounds | null,
    lang: 'zh' | 'en',
    onReveal: (name: string) => void,
    onStreakConfetti: (streak: number) => void,
    onAllGuessed: () => void
  ): GuessResult => {
    const cleanGuess = guessText.toLowerCase().trim();
    if (!cleanGuess || streets.length === 0) return { found: false };

    let found = false;
    let newGuessedCount = guessedCount;
    let matchedStreetName = '';

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
      setGuess('');
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

    const unguessed = streets.filter(s => !s.guessed);
    const closeMatches = unguessed
      .map(s => ({ name: s.name, similarity: calculateSimilarity(cleanGuess, s.name.toLowerCase().trim()) }))
      .filter(m => m.similarity > 0.6 && m.similarity < 1)
      .sort((a, b) => b.similarity - a.similarity);

    let hint: string | undefined;
    if (closeMatches.length > 0) {
      const t = TRANSLATIONS_ZH_EN[lang];
      hint = t.nearMissHint.replace('{name}', closeMatches[0].name);
    }

    let directionHint: string | undefined;
    if (newWrong >= 3 && unguessed.length > 0) {
      // Find the closest street by fuzzy match for direction hint
      const target = closeMatches.length > 0
        ? unguessed.find(s => s.name === closeMatches[0].name) || unguessed[0]
        : unguessed[Math.floor(Math.random() * unguessed.length)];
      const dir = calculateDirectionHint(target, bounds, lang);
      if (dir) {
        const t = TRANSLATIONS_ZH_EN[lang];
        directionHint = t.directionHint.replace('{direction}', dir);
      }
    }

    return { found: false, hint, directionHint };
  }, [guessedCount, streak, maxStreak, consecutiveWrong, hintClue, clearHint]);

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
    setConsecutiveWrong(0);
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
    directionHint: '这条街道在地图的 {direction} 方',
  },
  en: {
    nearMissHint: 'Almost! Did you mean "{name}"?',
    directionHint: 'This street is in the {direction} part of the map',
  },
} as const;
