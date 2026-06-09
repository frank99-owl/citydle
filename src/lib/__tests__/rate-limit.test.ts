import { describe, it, expect } from "vitest";
import { checkRateLimit, getClientIp } from "../rate-limit";

describe("checkRateLimit", () => {
  it("first request is always allowed", () => {
    const result = checkRateLimit({ key: "first-request", limit: 3 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.retryAfterMs).toBe(0);
  });

  it("requests within limit are allowed with correct remaining count", () => {
    const key = "within-limit";
    const limit = 5;

    for (let i = 0; i < limit; i++) {
      const result = checkRateLimit({ key, limit });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(limit - 1 - i);
    }
  });

  it("requests exceeding limit are denied with retryAfterMs > 0", () => {
    const key = "exceed-limit";
    const limit = 2;

    checkRateLimit({ key, limit });
    checkRateLimit({ key, limit });
    const result = checkRateLimit({ key, limit });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("different keys have independent limits", () => {
    const limit = 2;

    const keyA = "independent-key-a";
    const keyB = "independent-key-b";

    checkRateLimit({ key: keyA, limit });
    checkRateLimit({ key: keyA, limit });

    // keyA should be at limit
    const resultA = checkRateLimit({ key: keyA, limit });
    expect(resultA.allowed).toBe(false);

    // keyB should still be allowed
    const resultB = checkRateLimit({ key: keyB, limit });
    expect(resultB.allowed).toBe(true);
    expect(resultB.remaining).toBe(1);
  });

  it("requests outside the window are cleaned up", async () => {
    const key = "window-cleanup";
    const limit = 2;
    const windowMs = 100;

    checkRateLimit({ key, limit, windowMs });
    checkRateLimit({ key, limit, windowMs });

    // Should be denied now
    const denied = checkRateLimit({ key, limit, windowMs });
    expect(denied.allowed).toBe(false);

    // Wait for the window to expire
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should be allowed again after window expires
    const allowed = checkRateLimit({ key, limit, windowMs });
    expect(allowed.allowed).toBe(true);
    expect(allowed.remaining).toBe(1);
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for header", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.50, 70.41.3.18" },
    });
    expect(getClientIp(request)).toBe("203.0.113.50");
  });

  it("extracts IP from x-real-ip header", () => {
    const request = new Request("http://localhost", {
      headers: { "x-real-ip": "198.51.100.7" },
    });
    expect(getClientIp(request)).toBe("198.51.100.7");
  });

  it("returns 'unknown' when no headers present", () => {
    const request = new Request("http://localhost");
    expect(getClientIp(request)).toBe("unknown");
  });
});
