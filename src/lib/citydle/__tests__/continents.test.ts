import { describe, expect, it } from "vitest";
import { CONTINENTS, continentOf } from "../continents.mjs";
import { pickAnswerId, pickCandidates } from "../daily";
import { STRINGS } from "../i18n";
import type { CityIndexEntry, Morphology } from "../types";
import cityIndex from "../../../../public/cities/index.json";
import cityMorphology from "../../../../public/cities/morphology.json";

const index = cityIndex as CityIndexEntry[];
const morphology = cityMorphology as Morphology;

describe("continentOf", () => {
  it("城市库里每个国家都有大洲", () => {
    for (const c of index) {
      const continent = continentOf(c.country.en);
      expect(continent, c.country.en).not.toBeNull();
      expect(continent!.cn).not.toBe("");
      expect(continent!.en).not.toBe("");
    }
  });

  it("未收录的国家返回 null,而不是猜一个", () => {
    expect(continentOf("Atlantis")).toBeNull();
  });

  it("跨洲国家按库里城市所在的一侧", () => {
    expect(continentOf("Russia")).toBe(CONTINENTS.europe);
    expect(continentOf("Türkiye")).toBe(CONTINENTS.europe);
  });
});

describe("线索 6 文案", () => {
  it("只给大洲,不再带国家和首字母", () => {
    expect(STRINGS.zh.continentHint("欧洲")).toBe("提示:欧洲");
    expect(STRINGS.en.continentHint("Europe")).toBe("Hint: Europe");
    expect(STRINGS.zh.clues[5]).toBe("+ 所在大洲");
    expect(STRINGS.en.clues[5]).toBe("+ Continent");
  });
});

describe("线索 6 在真实城市库上不再等于直接给答案", () => {
  // 完整一轮:每座城恰好当一次答案。国家 + 首字母时 98% 的题只剩答案一个候选
  const ids = index.map((c) => c.id);
  const days = Array.from({ length: ids.length }, (_, i) => ids.length * 2 + 1 + i);
  const left = days.map((day) => {
    const answerId = pickAnswerId(ids, day);
    const answer = continentOf(index.find((c) => c.id === answerId)!.country.en);
    return pickCandidates(index, morphology, answerId, day).filter((c) => continentOf(c.country.en) === answer).length;
  });

  it("只剩答案一个候选的题不超过三成", () => {
    expect(left.filter((n) => n === 1).length).toBeLessThanOrEqual(ids.length * 0.3);
  });

  it("平均至少还剩 2 个候选", () => {
    expect(left.reduce((a, b) => a + b, 0) / left.length).toBeGreaterThanOrEqual(2);
  });
});
