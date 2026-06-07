import { Street, Bounds } from "@/types";

/**
 * Levenshtein edit distance between two strings.
 * Uses O(min(m,n)) space with a single-row rolling array.
 */
export function levenshtein(a: string, b: string): number {
  // Ensure a is the shorter string to minimize array size
  if (a.length > b.length) {
    [a, b] = [b, a];
  }
  const m = a.length;
  const n = b.length;

  // Single row: prev[j] = distance for a[0..i-1] vs b[0..j]
  const prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    let diag = prev[0]; // dp[i-1][j-1]
    prev[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = prev[j]; // save dp[i-1][j] before overwriting
      if (a[i - 1] === b[j - 1]) {
        prev[j] = diag;
      } else {
        prev[j] = 1 + Math.min(prev[j], prev[j - 1], diag); // dp[i-1][j], dp[i][j-1], dp[i-1][j-1]
      }
      diag = temp;
    }
  }
  return prev[n];
}

/**
 * Similarity score between 0 and 1 (1 = identical).
 */
export function calculateSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  return 1 - dist / maxLen;
}

/**
 * Normalize a string for matching: lowercase, strip punctuation and separators.
 */
export function normalizeString(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s._\-,.!?;:'"()[\]{}]/g, "")
    .trim();
}

/**
 * Get a compass direction label from an angle in degrees.
 */
export function getDirectionLabel(angleDeg: number, lang: "zh" | "en"): string {
  const a = ((angleDeg % 360) + 360) % 360;
  if (lang === "zh") {
    if (a >= 337.5 || a < 22.5) return "北";
    if (a >= 22.5 && a < 67.5) return "东北";
    if (a >= 67.5 && a < 112.5) return "东";
    if (a >= 112.5 && a < 157.5) return "东南";
    if (a >= 157.5 && a < 202.5) return "南";
    if (a >= 202.5 && a < 247.5) return "西南";
    if (a >= 247.5 && a < 292.5) return "西";
    return "西北";
  }
  if (a >= 337.5 || a < 22.5) return "North";
  if (a >= 22.5 && a < 67.5) return "Northeast";
  if (a >= 67.5 && a < 112.5) return "East";
  if (a >= 112.5 && a < 157.5) return "Southeast";
  if (a >= 157.5 && a < 202.5) return "South";
  if (a >= 202.5 && a < 247.5) return "Southwest";
  if (a >= 247.5 && a < 292.5) return "West";
  return "Northwest";
}

/**
 * Check if a guess matches a street's primary name or any alias.
 */
export function matchesAlias(guess: string, street: Street): boolean {
  const norm = normalizeString(guess);
  if (normalizeString(street.name) === norm) return true;
  if (street.aliases) {
    for (const alias of street.aliases) {
      if (normalizeString(alias) === norm) return true;
    }
  }
  return false;
}

/**
 * Generate a hint pattern: first letter visible, rest replaced with underscores.
 * Handles CJK and Latin scripts differently.
 */
export function generateHintPattern(name: string): string {
  const words = name.split(" ");
  const patternWords = words.map((word) => {
    if (word.length === 0) return "";
    const firstChar = word[0];
    const rest = word.slice(1);
    if (/[一-鿿぀-ゟ゠-ヿ]/.test(word)) {
      if (word.length <= 2) return word;
      return firstChar + "_".repeat(rest.length);
    }
    const restHidden = rest.replace(/[a-zA-Z]/g, "_");
    return firstChar + restHidden;
  });
  return patternWords.join(" ");
}

/**
 * Calculate direction hint for an unguessed street relative to map center.
 */
export function calculateDirectionHint(
  street: Street,
  bounds: Bounds | null,
  lang: "zh" | "en",
): string | null {
  if (!street.geometry || street.geometry.length === 0 || !bounds) return null;
  const geom = street.geometry;
  let latSum = 0,
    lngSum = 0;
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
