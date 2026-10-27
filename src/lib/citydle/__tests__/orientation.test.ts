import { describe, expect, it } from "vitest";
import { ORIENTATION_BINS, orientationHistogram, orientationOrder } from "../orientation.mjs";
import type { Seg } from "../types";

/** 从 (0,0) 出发、方位角 deg(0°=正东,逆时针)、长 km 的一段直线;cosLat=1 */
function ray(deg: number, km = 1): Seg {
  const r = (deg * Math.PI) / 180;
  return [
    [0, 0],
    [(Math.sin(r) * km) / 111, (Math.cos(r) * km) / 111],
  ];
}

const phiOf = (segs: Seg[], cosLat = 1) => orientationOrder(orientationHistogram(segs, cosLat));

describe("orientationOrder (Boeing φ)", () => {
  it("正南北 + 正东西的纯网格 = 1", () => {
    expect(phiOf([ray(0), ray(90), ray(180), ray(270)])).toBeCloseTo(1, 6);
  });

  it("贴着正方向轻微抖动的网格仍是 1(箱中心对齐 0°/90°,不会被拆进两个箱)", () => {
    const segs = [-3, -1, 1, 3].flatMap((j) => [ray(j), ray(90 + j)]);
    expect(phiOf(segs)).toBeCloseTo(1, 6);
  });

  it("方向均匀分布 = 0", () => {
    const segs = Array.from({ length: ORIENTATION_BINS }, (_, i) => ray(i * 10));
    expect(phiOf(segs)).toBeCloseTo(0, 6);
  });

  it("四个方向等长:φ = 1 − (ln2 / ln9)²,不是 (1 − r)²", () => {
    const r = Math.log(2) / Math.log(9);
    const phi = phiOf([ray(0), ray(30), ray(90), ray(120)]);
    expect(phi).toBeCloseTo(1 - r * r, 6);
    expect(phi).not.toBeCloseTo((1 - r) ** 2, 2);
  });

  it("按长度加权:一条长干道压过多条短斜街", () => {
    const segs = [ray(0, 10), ray(90, 10), ...[20, 40, 60].map((d) => ray(d, 0.1))];
    expect(phiOf(segs)).toBeGreaterThan(0.9);
  });

  it("空数据记 0,单一方向记 1", () => {
    expect(phiOf([])).toBe(0);
    expect(phiOf([ray(45), ray(45)])).toBe(1);
  });
});

describe("orientationHistogram", () => {
  it("经度按 cosLat 缩放:60° 纬度上等差经纬度的线是 63.4°,不是 45°", () => {
    const seg: Seg = [
      [0, 0],
      [0.01, 0.01],
    ];
    const hist = orientationHistogram([seg], 0.5);
    expect(hist[6]).toBeGreaterThan(0); // [55°, 65°)
    expect(hist.reduce((a, b) => a + b, 0)).toBeCloseTo(hist[6], 9);
  });

  it("总量是各段公里数之和", () => {
    const hist = orientationHistogram([ray(0, 2), ray(90, 3)], 1);
    expect(hist.reduce((a, b) => a + b, 0)).toBeCloseTo(5, 6);
  });
});
