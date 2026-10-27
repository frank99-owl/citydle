import { describe, expect, it } from "vitest";
import { mulberry32, seededShuffle } from "../daily";
import {
  CODE_PREFIX,
  LOST_LEVEL,
  assignPuzzles,
  decodeResult,
  encodeResult,
  extractCodes,
  summarize,
} from "../playtest.mjs";

const assign = (tester: string, n: number) => assignPuzzles(tester, n, mulberry32, seededShuffle);

describe("assignPuzzles", () => {
  it("题序是 0..n-1 的排列,两组各半", () => {
    const a = assign("tester-a", 12);
    expect(a.map((x) => x.index).sort((x, y) => x - y)).toEqual(Array.from({ length: 12 }, (_, i) => i));
    expect(a.filter((x) => x.arm === "phi")).toHaveLength(6);
    expect(a.filter((x) => x.arm === "legacy")).toHaveLength(6);
  });

  it("同一测试者确定性,不同测试者不同", () => {
    expect(assign("tester-a", 12)).toEqual(assign("tester-a", 12));
    expect(assign("tester-a", 12)).not.toEqual(assign("tester-b", 12));
  });

  it("多人下来每题两组都有人玩", () => {
    const phiCount = new Array(12).fill(0);
    for (let t = 0; t < 40; t++) for (const x of assign(`t${t}`, 12)) if (x.arm === "phi") phiCount[x.index]++;
    for (const c of phiCount) {
      expect(c).toBeGreaterThan(5);
      expect(c).toBeLessThan(35);
    }
  });
});

describe("成绩码", () => {
  const result = {
    tester: "abc123",
    name: "小王",
    set: "s1",
    plays: [{ id: "paris", arm: "phi", won: true, level: 3, picks: [{ id: "lyon", level: 2 }] }],
  };

  it("编码后可原样解码,含中文", () => {
    const code = encodeResult(result);
    expect(code.startsWith(CODE_PREFIX)).toBe(true);
    expect(code).toMatch(/^CTP1\.[A-Za-z0-9_-]+$/);
    expect(decodeResult(code)).toEqual(result);
  });

  it("前后空白不影响,格式不对抛错", () => {
    expect(decodeResult(`  ${encodeResult(result)}\n`)).toEqual(result);
    expect(() => decodeResult("hello")).toThrow();
    expect(() => decodeResult(CODE_PREFIX + "bm90IGpzb24")).toThrow();
    expect(() => decodeResult(encodeResult({ tester: "x" }))).toThrow();
  });

  it("能从聊天记录里捞出多段成绩码", () => {
    const a = encodeResult(result);
    const b = encodeResult({ ...result, tester: "def" });
    expect(extractCodes(`小王: ${a}\n小李:\n${b} 谢谢`)).toEqual([a, b]);
  });
});

describe("summarize", () => {
  const puzzleSet = {
    set: "s1",
    puzzles: [
      {
        id: "paris",
        arms: {
          phi: { candidates: ["paris", "lyon", "seoul", "guangzhou", "oslo", "lima"], similar: ["lyon", "seoul", "guangzhou"] },
          legacy: { candidates: ["paris", "tokyo", "lagos", "hanoi", "oslo", "lima"], similar: ["tokyo", "lagos", "hanoi"] },
        },
      },
    ],
  };
  const play = (arm: "phi" | "legacy", won: boolean, level: number, picks: string[] = []) => ({
    id: "paris",
    arm,
    won,
    level,
    picks: picks.map((id, i) => ({ id, level: i + 1 })),
  });

  it("按组统计答对线索数,没猜中记作 7", () => {
    const s = summarize(
      [
        { tester: "a", set: "s1", plays: [play("phi", true, 3, ["lyon", "seoul"])] },
        { tester: "b", set: "s1", plays: [play("phi", false, LOST_LEVEL, ["lyon", "oslo", "lima", "seoul", "guangzhou"])] },
        { tester: "c", set: "s1", plays: [play("legacy", true, 1)] },
      ],
      puzzleSet,
    );
    expect(s.testers).toBe(3);
    expect(s.overall.phi.plays).toBe(2);
    expect(s.overall.phi.meanLevel).toBe((3 + 7) / 2);
    expect(s.overall.phi.winRate).toBe(0.5);
    expect(s.overall.legacy.meanLevel).toBe(1);
    expect(s.puzzles[0].levelDelta).toBe(4);
    expect(s.meanPairedDelta).toBe(4);
  });

  it("选错时选中相似干扰项的比例", () => {
    const s = summarize(
      [{ tester: "a", set: "s1", plays: [play("phi", true, 4, ["lyon", "oslo", "seoul"])] }],
      puzzleSet,
    );
    expect(s.overall.phi.wrong).toBe(3);
    expect(s.overall.phi.similarShare).toBeCloseTo(2 / 3);
  });

  it("热身题、别的题集、同一人重复提交都不重复计数", () => {
    const s = summarize(
      [
        { tester: "a", set: "s1", plays: [play("phi", true, 6)] },
        { tester: "a", set: "s1", plays: [play("phi", true, 2), { ...play("phi", true, 1), warmup: true }] },
        { tester: "z", set: "old-set", plays: [play("phi", true, 1)] },
      ],
      puzzleSet,
    );
    expect(s.testers).toBe(1);
    expect(s.skipped).toBe(1);
    expect(s.overall.phi.levels).toEqual([2]);
  });

  it("某组没人玩时差值为空,不算出假数", () => {
    const s = summarize([{ tester: "a", set: "s1", plays: [play("phi", true, 2)] }], puzzleSet);
    expect(s.puzzles[0].levelDelta).toBeNull();
    expect(s.meanPairedDelta).toBeNull();
    expect(s.overall.legacy.meanLevel).toBeNull();
  });
});
