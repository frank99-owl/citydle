import { describe, it, expect } from "vitest";
import { outOfChina, wgs84togcj02, gcj02towgs84 } from "../coord";

describe("outOfChina", () => {
  it("returns true for New York", () => {
    expect(outOfChina(-74.006, 40.7128)).toBe(true);
  });

  it("returns true for London", () => {
    expect(outOfChina(-0.1276, 51.5074)).toBe(true);
  });

  it("returns true for Tokyo", () => {
    expect(outOfChina(139.6917, 35.6895)).toBe(true);
  });

  it("returns false for Beijing", () => {
    expect(outOfChina(116.4074, 39.9042)).toBe(false);
  });

  it("returns false for Shanghai", () => {
    expect(outOfChina(121.4737, 31.2304)).toBe(false);
  });

  it("returns false for Guangzhou", () => {
    expect(outOfChina(113.2644, 23.1291)).toBe(false);
  });
});

describe("wgs84togcj02", () => {
  it("returns same coordinates when out of China", () => {
    const [lng, lat] = wgs84togcj02(-74.006, 40.7128);
    expect(lng).toBe(-74.006);
    expect(lat).toBe(40.7128);
  });

  it("shifts coordinates when in China (Beijing)", () => {
    const [lng, lat] = wgs84togcj02(116.4074, 39.9042);
    expect(lng).not.toBe(116.4074);
    expect(lat).not.toBe(39.9042);
    // GCJ-02 shift is typically a few hundred meters
    expect(Math.abs(lng - 116.4074)).toBeLessThan(0.01);
    expect(Math.abs(lat - 39.9042)).toBeLessThan(0.01);
  });

  it("shifts coordinates when in China (Shanghai)", () => {
    const [lng, lat] = wgs84togcj02(121.4737, 31.2304);
    expect(lng).not.toBe(121.4737);
    expect(lat).not.toBe(31.2304);
    expect(Math.abs(lng - 121.4737)).toBeLessThan(0.01);
    expect(Math.abs(lat - 31.2304)).toBeLessThan(0.01);
  });
});

describe("gcj02towgs84", () => {
  it("is the inverse of wgs84togcj02 (round-trip)", () => {
    const wgsLng = 116.4074;
    const wgsLat = 39.9042;
    const [gcjLng, gcjLat] = wgs84togcj02(wgsLng, wgsLat);
    const [backLng, backLat] = gcj02towgs84(gcjLng, gcjLat);
    expect(backLng).toBeCloseTo(wgsLng, 4);
    expect(backLat).toBeCloseTo(wgsLat, 4);
  });

  it("round-trip preserves Shanghai coordinates", () => {
    const wgsLng = 121.4737;
    const wgsLat = 31.2304;
    const [gcjLng, gcjLat] = wgs84togcj02(wgsLng, wgsLat);
    const [backLng, backLat] = gcj02towgs84(gcjLng, gcjLat);
    expect(backLng).toBeCloseTo(wgsLng, 4);
    expect(backLat).toBeCloseTo(wgsLat, 4);
  });

  it("round-trip preserves Guangzhou coordinates", () => {
    const wgsLng = 113.2644;
    const wgsLat = 23.1291;
    const [gcjLng, gcjLat] = wgs84togcj02(wgsLng, wgsLat);
    const [backLng, backLat] = gcj02towgs84(gcjLng, gcjLat);
    expect(backLng).toBeCloseTo(wgsLng, 4);
    expect(backLat).toBeCloseTo(wgsLat, 4);
  });

  it("returns same coordinates when out of China", () => {
    const [lng, lat] = gcj02towgs84(-74.006, 40.7128);
    expect(lng).toBe(-74.006);
    expect(lat).toBe(40.7128);
  });
});
