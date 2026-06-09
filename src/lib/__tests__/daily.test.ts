import { describe, it, expect } from "vitest";
import { getTodayString, generateDailyChallenge, DailyChallenge } from "../daily";
import { PRESETS } from "@/lib/constants";

describe("getTodayString", () => {
  it("returns YYYY-MM-DD format", () => {
    const result = getTodayString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns today's date", () => {
    const result = getTodayString();
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(result).toBe(expected);
  });
});

describe("generateDailyChallenge", () => {
  it("is deterministic: same input produces same output", () => {
    const first = generateDailyChallenge("2026-01-15");
    const second = generateDailyChallenge("2026-01-15");
    expect(first).toEqual(second);
  });

  it("produces different output for different dates", () => {
    const results = [
      generateDailyChallenge("2026-01-01"),
      generateDailyChallenge("2026-02-02"),
      generateDailyChallenge("2026-03-03"),
      generateDailyChallenge("2026-04-04"),
      generateDailyChallenge("2026-05-05"),
      generateDailyChallenge("2026-06-06"),
    ];
    // Every result must carry its own date
    for (const r of results) {
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    // All results should not be identical objects
    const unique = new Set(results.map((r) => JSON.stringify(r)));
    expect(unique.size).toBeGreaterThan(1);
  });

  it("returns correct output structure", () => {
    const result = generateDailyChallenge("2025-12-25");
    expect(result).toHaveProperty("date", "2025-12-25");
    expect(result).toHaveProperty("presetIndex");
    expect(result).toHaveProperty("presetId");
    expect(result).toHaveProperty("bounds");
    expect(result).toHaveProperty("cityName");
    expect(result).toHaveProperty("cityNameEn");
    expect(result).toHaveProperty("difficulty");
  });

  it("presetIndex is within valid range", () => {
    const result = generateDailyChallenge("2026-03-01");
    expect(result.presetIndex).toBeGreaterThanOrEqual(0);
    expect(result.presetIndex).toBeLessThan(PRESETS.length);
  });

  it("presetIndex corresponds to a real preset", () => {
    const result = generateDailyChallenge("2026-03-01");
    const preset = PRESETS[result.presetIndex];
    expect(preset).toBeDefined();
    expect(result.presetId).toBe(preset.id);
  });

  it("difficulty is one of easy, medium, hard", () => {
    const validDifficulties = ["easy", "medium", "hard"];
    // Test several dates to cover all difficulty values
    const dates = [
      "2026-01-01", "2026-02-01", "2026-03-01",
      "2026-04-01", "2026-05-01", "2026-06-01",
      "2026-07-01", "2026-08-01", "2026-09-01",
    ];
    for (const date of dates) {
      const result = generateDailyChallenge(date);
      expect(validDifficulties).toContain(result.difficulty);
    }
  });

  it("bounds has all 4 required properties", () => {
    const result = generateDailyChallenge("2026-04-10");
    expect(result.bounds).toHaveProperty("north");
    expect(result.bounds).toHaveProperty("south");
    expect(result.bounds).toHaveProperty("east");
    expect(result.bounds).toHaveProperty("west");
    expect(typeof result.bounds.north).toBe("number");
    expect(typeof result.bounds.south).toBe("number");
    expect(typeof result.bounds.east).toBe("number");
    expect(typeof result.bounds.west).toBe("number");
  });

  it("bounds values are valid (south < north, west < east)", () => {
    const result = generateDailyChallenge("2026-05-20");
    expect(result.bounds.south).toBeLessThan(result.bounds.north);
    expect(result.bounds.west).toBeLessThan(result.bounds.east);
  });

  it("date field matches the input dateStr", () => {
    const dateStr = "2025-08-08";
    const result = generateDailyChallenge(dateStr);
    expect(result.date).toBe(dateStr);
  });
});
