import { describe, it, expect } from 'vitest';
import {
  levenshtein,
  calculateSimilarity,
  normalizeString,
  getDirectionLabel,
  matchesAlias,
  generateHintPattern,
  calculateDirectionHint,
} from '../matching';
import { Street, Bounds } from '@/types';

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('hello', 'hello')).toBe(0);
  });

  it('returns length for empty vs non-empty', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });

  it('returns 0 for two empty strings', () => {
    expect(levenshtein('', '')).toBe(0);
  });

  it('computes single-character edit', () => {
    expect(levenshtein('cat', 'bat')).toBe(1);
    expect(levenshtein('cat', 'cats')).toBe(1);
    expect(levenshtein('cat', 'at')).toBe(1);
  });

  it('computes multi-edit distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('saturday', 'sunday')).toBe(3);
  });

  it('handles CJK characters', () => {
    expect(levenshtein('东京', '东京')).toBe(0);
    expect(levenshtein('东京', '京都')).toBe(2);
  });
});

describe('calculateSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(calculateSimilarity('wall street', 'wall street')).toBe(1);
  });

  it('returns 1 for two empty strings', () => {
    expect(calculateSimilarity('', '')).toBe(1);
  });

  it('is case-insensitive', () => {
    expect(calculateSimilarity('Wall Street', 'wall street')).toBe(1);
  });

  it('returns high score for close matches', () => {
    const score = calculateSimilarity('wall stret', 'wall street');
    expect(score).toBeGreaterThan(0.8);
  });

  it('returns low score for very different strings', () => {
    const score = calculateSimilarity('abc', 'xyz');
    expect(score).toBeLessThan(0.5);
  });
});

describe('normalizeString', () => {
  it('lowercases', () => {
    expect(normalizeString('Wall Street')).toBe('wallstreet');
  });

  it('strips spaces and punctuation', () => {
    expect(normalizeString('Wall St.')).toBe('wallst');
    expect(normalizeString('hello-world')).toBe('helloworld');
    expect(normalizeString('test_name')).toBe('testname');
  });

  it('preserves CJK characters', () => {
    expect(normalizeString('丸の内')).toBe('丸の内');
    expect(normalizeString('中央通')).toBe('中央通');
  });

  it('handles mixed CJK and Latin', () => {
    expect(normalizeString('テスト Street')).toBe('テストstreet');
  });

  it('trims whitespace', () => {
    expect(normalizeString('  hello  ')).toBe('hello');
  });
});

describe('getDirectionLabel', () => {
  describe('English', () => {
    it('returns North for 0 degrees', () => {
      expect(getDirectionLabel(0, 'en')).toBe('North');
    });

    it('returns East for 90 degrees', () => {
      expect(getDirectionLabel(90, 'en')).toBe('East');
    });

    it('returns South for 180 degrees', () => {
      expect(getDirectionLabel(180, 'en')).toBe('South');
    });

    it('returns West for 270 degrees', () => {
      expect(getDirectionLabel(270, 'en')).toBe('West');
    });

    it('returns Northeast for 45 degrees', () => {
      expect(getDirectionLabel(45, 'en')).toBe('Northeast');
    });

    it('normalizes negative angles', () => {
      expect(getDirectionLabel(-90, 'en')).toBe('West');
    });

    it('normalizes angles > 360', () => {
      expect(getDirectionLabel(450, 'en')).toBe('East');
    });
  });

  describe('Chinese', () => {
    it('returns 北 for 0 degrees', () => {
      expect(getDirectionLabel(0, 'zh')).toBe('北');
    });

    it('returns 东 for 90 degrees', () => {
      expect(getDirectionLabel(90, 'zh')).toBe('东');
    });

    it('returns 南 for 180 degrees', () => {
      expect(getDirectionLabel(180, 'zh')).toBe('南');
    });

    it('returns 西北 for 315 degrees', () => {
      expect(getDirectionLabel(315, 'zh')).toBe('西北');
    });
  });
});

describe('matchesAlias', () => {
  const street: Street = {
    name: 'Wall Street',
    guessed: false,
    aliases: ['ウォール街', 'Wall St'],
  };

  it('matches primary name exactly', () => {
    expect(matchesAlias('Wall Street', street)).toBe(true);
  });

  it('matches primary name case-insensitively', () => {
    expect(matchesAlias('wall street', street)).toBe(true);
  });

  it('matches alias', () => {
    expect(matchesAlias('ウォール街', street)).toBe(true);
    expect(matchesAlias('Wall St', street)).toBe(true);
  });

  it('does not match unrelated name', () => {
    expect(matchesAlias('Broadway', street)).toBe(false);
  });

  it('handles punctuation in guess', () => {
    expect(matchesAlias('Wall St.', street)).toBe(true);
  });

  it('handles street with no aliases', () => {
    const noAlias: Street = { name: 'Broadway', guessed: false };
    expect(matchesAlias('Broadway', noAlias)).toBe(true);
    expect(matchesAlias('Other', noAlias)).toBe(false);
  });
});

describe('generateHintPattern', () => {
  it('shows first letter, hides rest', () => {
    expect(generateHintPattern('Wall')).toBe('W___');
  });

  it('handles multi-word names', () => {
    expect(generateHintPattern('Wall Street')).toBe('W___ S_____');
  });

  it('preserves numbers', () => {
    expect(generateHintPattern('5th Avenue')).toBe('5__ A_____');
  });

  it('handles CJK: shows first char for 3+ char words', () => {
    expect(generateHintPattern('丸の内中央通')).toBe('丸_____');
  });

  it('handles CJK: shows full word for 1-2 char words', () => {
    expect(generateHintPattern('東京')).toBe('東京');
  });

  it('handles single character', () => {
    expect(generateHintPattern('A')).toBe('A');
  });
});

describe('calculateDirectionHint', () => {
  const bounds: Bounds = { south: 40.0, west: -74.0, north: 41.0, east: -73.0 };

  it('returns null for street without geometry', () => {
    const street: Street = { name: 'Test', guessed: false, geometry: [] };
    expect(calculateDirectionHint(street, bounds, 'en')).toBeNull();
  });

  it('returns null for null bounds', () => {
    const street: Street = { name: 'Test', guessed: false, geometry: [[-73.5, 40.5]] };
    expect(calculateDirectionHint(street, null, 'en')).toBeNull();
  });

  it('returns direction for street north of center', () => {
    const street: Street = {
      name: 'North St',
      guessed: false,
      geometry: [[-73.5, 40.9]], // north of center (40.5)
    };
    const result = calculateDirectionHint(street, bounds, 'en');
    expect(result).toBe('North');
  });

  it('returns direction for street east of center', () => {
    const street: Street = {
      name: 'East St',
      guessed: false,
      geometry: [[-73.1, 40.5]], // east of center (-73.5)
    };
    const result = calculateDirectionHint(street, bounds, 'en');
    expect(result).toBe('East');
  });

  it('returns Chinese direction label', () => {
    const street: Street = {
      name: 'South St',
      guessed: false,
      geometry: [[-73.5, 40.1]], // south of center (40.5)
    };
    const result = calculateDirectionHint(street, bounds, 'zh');
    expect(result).toBe('南');
  });
});
