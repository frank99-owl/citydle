// 每日选题:全球同题、确定性、同一轮内不重复。
// 所有随机都来自以「期数」为种子的 PRNG —— 任何时区任何设备,同一天得到同一题、同一组候选。
import type { CityIndexEntry, Morph, Morphology } from "./types";

/** 第 1 期的 UTC 日期。上线前调整即可,改动只影响期数编号。 */
export const EPOCH_UTC = Date.UTC(2026, 5, 10); // 2026-06-10

const DAY_MS = 86400000;

/** 今天是第几期(UTC 日界,≥1) */
export function dayNumber(now: Date = new Date()): number {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(1, Math.floor((todayUtc - EPOCH_UTC) / DAY_MS) + 1);
}

/** 距下一期(UTC 午夜)的毫秒数 */
export function msToNextPuzzle(now: Date = new Date()): number {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return todayUtc + DAY_MS - now.getTime();
}

/** mulberry32 — 小而稳定的种子 PRNG */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 当天答案:以「轮」(cities.length 天)为单位做种子洗牌,
 * 同一轮内每城恰好出现一次 —— 30 城就是 30 天不重题。
 */
export function pickAnswerId(ids: string[], day: number): string {
  const sorted = [...ids].sort();
  const cycle = Math.floor((day - 1) / sorted.length);
  const perm = seededShuffle(sorted, mulberry32(cycle * 7919 + 13));
  return perm[(day - 1) % sorted.length];
}

/** 形态距离:网格度差 + 水系类型不同的罚分。干扰项相似度是主难度旋钮。 */
export function morphDist(a: Morph, b: Morph): number {
  return Math.abs(a.grid - b.grid) + (a.water === b.water ? 0 : 0.3);
}

const FALLBACK_MORPH: Morph = { grid: 0, water: "inland" };

/**
 * 当天 6 个候选:答案 + 3 个形态最近的城市 + 2 个种子随机,
 * 再整体种子洗牌。同一天全球看到同一组、同一顺序。
 */
export function pickCandidates(
  index: CityIndexEntry[],
  morphology: Morphology,
  answerId: string,
  day: number,
): CityIndexEntry[] {
  const answer = index.find((c) => c.id === answerId);
  if (!answer) throw new Error("answer not in index: " + answerId);
  const morphOf = (id: string) => morphology[id] || FALLBACK_MORPH;
  const others = index
    .filter((c) => c.id !== answerId)
    .sort(
      (a, b) =>
        morphDist(morphOf(a.id), morphOf(answerId)) - morphDist(morphOf(b.id), morphOf(answerId)) ||
        a.id.localeCompare(b.id),
    );
  const rand = mulberry32(day * 104729 + 7);
  const similar = others.slice(0, 3);
  const rest = seededShuffle(others.slice(3), rand);
  return seededShuffle([...similar, ...rest.slice(0, 2), answer], rand);
}
