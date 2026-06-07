/**
 * Simple in-memory sliding window rate limiter.
 * Suitable for single-instance deployments (Vercel serverless, local dev).
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 60_000);
    if (entry.timestamps.length === 0) store.delete(key);
  });
}, 300_000);

interface RateLimitOptions {
  /** Unique key (e.g. IP address or endpoint name) */
  key: string;
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in milliseconds (default: 60s) */
  windowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Check if a request is allowed under the rate limit.
 * Returns { allowed, remaining, retryAfterMs }.
 */
export function checkRateLimit({
  key,
  limit,
  windowMs = 60_000,
}: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { timestamps: [now] });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0];
    const retryAfterMs = windowMs - (now - oldest);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: limit - entry.timestamps.length,
    retryAfterMs: 0,
  };
}

/**
 * Get client IP from request headers.
 * Works with Vercel, Cloudflare, and standard proxies.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}
