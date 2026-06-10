import { describe, expect, it } from "vitest";
import { SKELETON_MIN_KM, buildClueLayers } from "../clues";
import type { CityData, Street } from "../types";

const BBOX = { south: 0, west: 0, north: 0.03, east: 0.03 };

function st(name: string, tier: 1 | 2 | 3, km: number, nSegs = 1): Street {
  const segments = Array.from({ length: nSegs }, (_, i) => [
    [0.001 * i, 0],
    [0.001 * i, 0.01],
  ]) as Street["segments"];
  return { name, tier, km, segments };
}
function city(streets: Street[]): CityData {
  // 管线保证排序:tier 升序、km 降序
  const sorted = [...streets].sort((a, b) => a.tier - b.tier || b.km - a.km);
  return { id: "t", cn: "测", en: "Test", feature: "", bbox: BBOX, streets: sorted, water: [], coastline: [] };
}

describe("buildClueLayers 骨架规则", () => {
  it("干道充足(≥30km):骨架只含干道", () => {
    const c = city([st("A", 1, 20), st("B", 1, 15), st("C", 2, 50)]);
    const layers = buildClueLayers(c);
    expect(layers.skeleton).toHaveLength(2);
    expect(layers.t2).toHaveLength(1);
  });
  it("干道不足:按 km 降序补真实次干/毛细直到 30km", () => {
    const c = city([st("A", 1, 10), st("B", 2, 12), st("C", 2, 9), st("D", 2, 5), st("E", 3, 99)]);
    const layers = buildClueLayers(c);
    // 10 + 12 + 9 = 31 ≥ 30,D/E 不进骨架
    expect(layers.skeleton).toHaveLength(3);
  });
  it("完全没有干道(威尼斯型):骨架仍非空", () => {
    const c = city([st("A", 3, 8), st("B", 3, 7), st("C", 3, 20)]);
    const layers = buildClueLayers(c);
    expect(layers.skeleton.length).toBeGreaterThan(0);
  });
  it("阈值常量与设计一致", () => {
    expect(SKELETON_MIN_KM).toBe(30);
  });
});

describe("buildClueLayers 街名线索", () => {
  it("取排序后的第一条街(最长干道),标注点在最长段中点", () => {
    const long = st("Main Avenue", 1, 40, 3);
    const c = city([long, st("B", 2, 10)]);
    const layers = buildClueLayers(c);
    expect(layers.nameStreet?.name).toBe("Main Avenue");
    expect(layers.nameStreet?.at).toHaveLength(2);
  });
  it("空城市不崩", () => {
    const layers = buildClueLayers(city([]));
    expect(layers.nameStreet).toBeNull();
    expect(layers.skeleton).toHaveLength(0);
  });
});
