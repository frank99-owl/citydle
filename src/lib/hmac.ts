/**
 * Client-side HMAC signature for leaderboard submissions.
 * Prevents casual score forgery by signing the submission payload.
 *
 * Note: Since the key is embedded in client JS, a determined attacker
 * can still forge submissions. For production use, consider server-side
 * session tokens or a proper anti-cheat service.
 */

const SECRET = "street-cartographer-v2-2026";

async function getKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Sign a leaderboard submission payload.
 * Returns a hex-encoded HMAC-SHA256 signature.
 */
export async function signSubmission(payload: {
  city: string;
  score: number;
  totalStreets: number;
  completionRate: number;
  maxStreak: number;
  timeSeconds: number;
}): Promise<string> {
  const key = await getKey();
  const message = [
    payload.city,
    payload.score,
    payload.totalStreets,
    Math.round(payload.completionRate * 10000),
    payload.maxStreak,
    payload.timeSeconds,
  ].join(":");

  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify a leaderboard submission signature.
 * Returns true if the signature is valid.
 */
export async function verifySignature(payload: {
  city: string;
  score: number;
  totalStreets: number;
  completionRate: number;
  maxStreak: number;
  timeSeconds: number;
  signature: string;
}): Promise<boolean> {
  try {
    const key = await getKey();
    const { signature, ...data } = payload;
    const message = [
      data.city,
      data.score,
      data.totalStreets,
      Math.round(data.completionRate * 10000),
      data.maxStreak,
      data.timeSeconds,
    ].join(":");

    const encoder = new TextEncoder();
    const sigBytes = Uint8Array.from(
      signature.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)),
    );
    return crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(message));
  } catch {
    return false;
  }
}
