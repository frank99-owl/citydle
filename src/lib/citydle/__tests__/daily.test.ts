import { describe, expect, it } from "vitest";
import { EPOCH_UTC, dayNumber, morphDist, msToNextPuzzle, mulberry32, pickAnswerId, pickCandidates, seededShuffle } from "../daily";
import type { CityIndexEntry, Morphology } from "../types";
import cityIndex from "../../../../public/cities/index.json";
import cityMorphology from "../../../../public/cities/morphology.json";

const IDS = Array.from({ length: 30 }, (_, i) => `city-${String(i).padStart(2, "0")}`);

describe("dayNumber", () => {
  it("epoch 当天是第 1 期", () => {
    expect(dayNumber(new Date(EPOCH_UTC))).toBe(1);
    expect(dayNumber(new Date(EPOCH_UTC + 3 * 3600e3))).toBe(1);
  });
  it("UTC 日界换期", () => {
    expect(dayNumber(new Date(EPOCH_UTC + 86400e3))).toBe(2);
    expect(dayNumber(new Date(EPOCH_UTC + 86400e3 - 1))).toBe(1);
  });
  it("epoch 之前不产生非法期数", () => {
    expect(dayNumber(new Date(EPOCH_UTC - 10 * 86400e3))).toBe(1);
  });
});

describe("msToNextPuzzle", () => {
  it("距 UTC 午夜的剩余毫秒", () => {
    expect(msToNextPuzzle(new Date(EPOCH_UTC))).toBe(86400e3);
    expect(msToNextPuzzle(new Date(EPOCH_UTC + 86400e3 - 1000))).toBe(1000);
  });
});

describe("mulberry32 / seededShuffle", () => {
  it("同种子同序列", () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 5; i++) expect(a()).toBe(b());
  });
  it("洗牌是排列且不改原数组", () => {
    const arr = [1, 2, 3, 4, 5];
    const out = seededShuffle(arr, mulberry32(7));
    expect(arr).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("pickAnswerId", () => {
  it("确定性:同一天同答案,与传入顺序无关", () => {
    const shuffled = [...IDS].reverse();
    for (const day of [1, 17, 300]) {
      expect(pickAnswerId(IDS, day)).toBe(pickAnswerId(shuffled, day));
    }
  });
  it("同一轮(30 天)内不重题", () => {
    const seen = new Set(Array.from({ length: 30 }, (_, i) => pickAnswerId(IDS, i + 1)));
    expect(seen.size).toBe(30);
  });
  it("不同轮次顺序不同(种子换轮)", () => {
    const cycle1 = Array.from({ length: 30 }, (_, i) => pickAnswerId(IDS, i + 1));
    const cycle2 = Array.from({ length: 30 }, (_, i) => pickAnswerId(IDS, 31 + i));
    expect(cycle1).not.toEqual(cycle2);
    expect(new Set(cycle2).size).toBe(30);
  });
});

describe("pickCandidates", () => {
  const index: CityIndexEntry[] = IDS.map((id) => ({ id, cn: id, en: id, country: { cn: "测", en: "T" } }));
  const morphology: Morphology = Object.fromEntries(
    IDS.map((id, i) => [id, { grid: i / 30, water: i % 2 ? ("coast" as const) : ("river" as const) }]),
  );

  it("6 个候选、唯一、含答案、确定性", () => {
    const a = pickCandidates(index, morphology, IDS[5], 42);
    const b = pickCandidates(index, morphology, IDS[5], 42);
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
    expect(a).toHaveLength(6);
    expect(new Set(a.map((c) => c.id)).size).toBe(6);
    expect(a.some((c) => c.id === IDS[5])).toBe(true);
  });
  it("包含 3 个形态最近的城市", () => {
    const answerId = IDS[10];
    const nearest = IDS.filter((id) => id !== answerId)
      .sort((x, y) => morphDist(morphology[x], morphology[answerId]) - morphDist(morphology[y], morphology[answerId]) || x.localeCompare(y))
      .slice(0, 3);
    const got = pickCandidates(index, morphology, answerId, 7).map((c) => c.id);
    for (const id of nearest) expect(got).toContain(id);
  });
  it("缺形态数据时不崩(回退默认值)", () => {
    const got = pickCandidates(index, {}, IDS[0], 1);
    expect(got).toHaveLength(6);
  });
});

describe("真实城市库的形态数据与候选", () => {
  const index = cityIndex as CityIndexEntry[];
  const morphology = cityMorphology as Morphology;

  it("每座城都有形态数据,grid 在 [0, 1]", () => {
    for (const c of index) {
      const m = morphology[c.id];
      expect(m, c.id).toBeDefined();
      expect(m.grid).toBeGreaterThanOrEqual(0);
      expect(m.grid).toBeLessThanOrEqual(1);
    }
  });

  // OSMnx 2.1.1 在各城相同 bbox、相同 highway+name 过滤下算出的 Boeing φ(按长度加权,36 箱)
  const OSMNX_PHI: Record<string, number> = {
    chicago: 0.928, xian: 0.941, kyoto: 0.944, philadelphia: 0.914, barcelona: 0.504, "new-york": 0.192,
    seattle: 0.535, paris: 0.175, london: 0.058, venice: 0.024, amsterdam: 0.141, rome: 0.022,
  };
  it("grid 与 OSMnx 的 φ 相差不超过 0.05", () => {
    for (const [id, phi] of Object.entries(OSMNX_PHI)) {
      expect(Math.abs(morphology[id].grid - phi), id).toBeLessThanOrEqual(0.05);
    }
  });

  it("grid 没有被压扁到 0 附近((1 − r)² 公式曾让 57 城 < 0.01)", () => {
    expect(index.filter((c) => morphology[c.id].grid < 0.01).length).toBeLessThan(5);
  });

  it("强网格城市的干扰项里至少 3 个也是强网格", () => {
    const strong = index.filter((c) => morphology[c.id].grid >= 0.85);
    expect(strong.length).toBeGreaterThanOrEqual(5); // 芝加哥、京都、费城、西安、北京……
    for (const c of strong) {
      const grids = pickCandidates(index, morphology, c.id, 1)
        .filter((x) => x.id !== c.id)
        .map((x) => morphology[x.id].grid);
      expect(grids.filter((g) => g >= 0.75).length, c.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("不规则老城的干扰项里至少 3 个也是不规则老城", () => {
    for (const id of ["venice", "rome"]) {
      const grids = pickCandidates(index, morphology, id, 1)
        .filter((x) => x.id !== id)
        .map((x) => morphology[x.id].grid);
      expect(grids.filter((g) => g <= 0.1).length, id).toBeGreaterThanOrEqual(3);
    }
  });
});
