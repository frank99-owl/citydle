// 盲测:题目分配、成绩码、结果汇总。纯 JS(.mjs):页面内联、汇总脚本 import、vitest 都直接用。
// 实验:每人玩同一组题,每题按测试者随机分到 φ 组或旧指标组的候选(组内各半),
// 看两组的「第几条线索答对」和「选错时是否选中相似干扰项」。

export const CODE_PREFIX = "CTP1.";
export const MAX_LEVEL = 6;
/** 没猜中记作第 7 条:比用满 6 条更差,便于取平均 */
export const LOST_LEVEL = MAX_LEVEL + 1;
export const ARMS = /** @type {const} */ (["phi", "legacy"]);

/** FNV-1a,把测试者 id 变成 PRNG 种子 */
export function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * 给一位测试者排题:题序随机,φ / 旧指标两组各占一半(奇数题时多出的一题随机归组)。
 * @param {string} testerId
 * @param {number} n 题数(不含热身)
 * @param {(seed: number) => () => number} makeRand daily.ts 的 mulberry32
 * @param {<T>(arr: T[], rand: () => number) => T[]} shuffle daily.ts 的 seededShuffle
 * @returns {{ index: number, arm: "phi" | "legacy" }[]}
 */
export function assignPuzzles(testerId, n, makeRand, shuffle) {
  const rand = makeRand(hashString(testerId));
  const arms = Array.from({ length: n }, (_, i) => ARMS[i % 2]);
  const armOf = shuffle(arms, rand);
  return shuffle(
    Array.from({ length: n }, (_, i) => i),
    rand,
  ).map((index) => ({ index, arm: armOf[index] }));
}

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** 成绩 → 可复制的一行文本 */
export function encodeResult(result) {
  return CODE_PREFIX + toBase64Url(JSON.stringify(result));
}

/** 一行成绩码 → 成绩;格式不对时抛错 */
export function decodeResult(code) {
  const s = code.trim();
  if (!s.startsWith(CODE_PREFIX)) throw new Error("not a playtest code");
  const r = JSON.parse(fromBase64Url(s.slice(CODE_PREFIX.length)));
  if (typeof r.tester !== "string" || typeof r.set !== "string" || !Array.isArray(r.plays)) {
    throw new Error("malformed playtest code");
  }
  return r;
}

/** 从任意粘贴文本(聊天记录、邮件)里找出所有成绩码 */
export function extractCodes(text) {
  return text.match(/CTP1\.[A-Za-z0-9_-]+/g) || [];
}

/**
 * 汇总多份成绩。同一测试者交了多次只算最后一份;热身题、不属于本题集的成绩码不计。
 * @param {{ tester: string, set: string, plays: Play[] }[]} results
 * @param {{ set: string, puzzles: { id: string, arms: Record<string, { candidates: string[], similar: string[] }> }[] }} puzzleSet
 *
 * @typedef {{ id: string, arm: "phi" | "legacy", warmup?: boolean, won: boolean, level: number,
 *   picks: { id: string, level: number }[] }} Play
 */
export function summarize(results, puzzleSet) {
  const latest = new Map();
  let skipped = 0;
  for (const r of results) {
    if (r.set !== puzzleSet.set) skipped++;
    else latest.set(r.tester, r);
  }

  const byId = new Map(puzzleSet.puzzles.map((p) => [p.id, p]));
  const blank = () => ({ plays: 0, wins: 0, levelSum: 0, levels: [], wrong: 0, wrongOnSimilar: 0 });
  const perPuzzle = new Map(puzzleSet.puzzles.map((p) => [p.id, { phi: blank(), legacy: blank() }]));
  const overall = { phi: blank(), legacy: blank() };

  for (const r of latest.values()) {
    for (const play of r.plays) {
      const puzzle = byId.get(play.id);
      if (play.warmup || !puzzle || !(play.arm in overall)) continue;
      const similar = puzzle.arms[play.arm].similar;
      const level = play.won ? play.level : LOST_LEVEL;
      for (const cell of [perPuzzle.get(play.id)[play.arm], overall[play.arm]]) {
        cell.plays++;
        if (play.won) cell.wins++;
        cell.levelSum += level;
        cell.levels.push(level);
        for (const pick of play.picks) {
          if (pick.id === play.id) continue;
          cell.wrong++;
          if (similar.includes(pick.id)) cell.wrongOnSimilar++;
        }
      }
    }
  }

  const finish = (c) => ({
    plays: c.plays,
    winRate: c.plays ? c.wins / c.plays : null,
    meanLevel: c.plays ? c.levelSum / c.plays : null,
    levels: c.levels,
    wrong: c.wrong,
    // 5 个干扰项里 3 个是「相似」:随便乱选时这个比例约 0.6
    similarShare: c.wrong ? c.wrongOnSimilar / c.wrong : null,
  });

  const puzzles = puzzleSet.puzzles.map((p) => {
    const cell = perPuzzle.get(p.id);
    const phi = finish(cell.phi);
    const legacy = finish(cell.legacy);
    return {
      id: p.id,
      phi,
      legacy,
      // 正数 = φ 组平均多用了几条线索(更难)
      levelDelta: phi.plays && legacy.plays ? phi.meanLevel - legacy.meanLevel : null,
    };
  });
  const paired = puzzles.filter((p) => p.levelDelta !== null);

  return {
    testers: latest.size,
    skipped,
    overall: { phi: finish(overall.phi), legacy: finish(overall.legacy) },
    pairedPuzzles: paired.length,
    meanPairedDelta: paired.length ? paired.reduce((a, p) => a + p.levelDelta, 0) / paired.length : null,
    puzzles,
  };
}
