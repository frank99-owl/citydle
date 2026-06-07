import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifySignature } from "@/lib/hmac";

export const dynamic = "force-dynamic";

// Ensure the leaderboard table exists
function ensureTable(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_name TEXT NOT NULL DEFAULT 'Anonymous',
      city TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      total_streets INTEGER NOT NULL DEFAULT 0,
      completion_rate REAL NOT NULL DEFAULT 0,
      max_streak INTEGER NOT NULL DEFAULT 0,
      time_seconds INTEGER NOT NULL DEFAULT 0,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

interface LeaderboardRow {
  id: number;
  player_name: string;
  city: string;
  score: number;
  total_streets: number;
  completion_rate: number;
  max_streak: number;
  time_seconds: number;
  played_at: string;
}

/**
 * GET /api/leaderboard?city=new-york&period=weekly
 * Returns top 50 scores, optionally filtered by city and time period.
 */
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({ entries: [] });
    }

    ensureTable(db);

    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");
    const period = searchParams.get("period") || "all";

    let whereClause = "";
    const params: any[] = [];

    if (city && city !== "all") {
      whereClause += " WHERE city = ?";
      params.push(city);
    }

    if (period === "daily") {
      whereClause += whereClause
        ? ' AND played_at >= datetime("now", "-1 day")'
        : ' WHERE played_at >= datetime("now", "-1 day")';
    } else if (period === "weekly") {
      whereClause += whereClause
        ? ' AND played_at >= datetime("now", "-7 days")'
        : ' WHERE played_at >= datetime("now", "-7 days")';
    }

    const rows = db
      .prepare(
        `SELECT id, player_name, city, score, total_streets, completion_rate, max_streak, time_seconds, played_at
       FROM leaderboard${whereClause}
       ORDER BY completion_rate DESC, max_streak DESC, time_seconds ASC
       LIMIT 50`,
      )
      .all(...params) as LeaderboardRow[];

    // Get available cities for filter
    const cities = db
      .prepare(`SELECT DISTINCT city FROM leaderboard ORDER BY city`)
      .all() as { city: string }[];

    return NextResponse.json({
      entries: rows,
      cities: cities.map((c) => c.city),
    });
  } catch (err) {
    console.error("Leaderboard GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/leaderboard
 * Submit a score to the leaderboard.
 */
export async function POST(req: NextRequest) {
  // Rate limit: 10 submissions per minute per IP
  const ip = getClientIp(req);
  const { allowed, retryAfterMs } = checkRateLimit({
    key: `leaderboard:${ip}`,
    limit: 10,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many submissions", retryAfterMs },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
      },
    );
  }

  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 },
      );
    }

    ensureTable(db);

    const body = (await req.json()) as {
      playerName?: string;
      city: string;
      score: number;
      totalStreets: number;
      completionRate: number;
      maxStreak: number;
      timeSeconds: number;
      signature?: string;
    };

    const {
      playerName = "Anonymous",
      city,
      score,
      totalStreets,
      completionRate,
      maxStreak,
      timeSeconds,
      signature,
    } = body;

    // Validate and sanitize playerName
    const safeName =
      typeof playerName === "string"
        ? playerName.trim().slice(0, 20) || "Anonymous"
        : "Anonymous";

    // Validate required fields
    if (!city || totalStreets === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate numeric ranges (anti-cheat)
    if (completionRate < 0 || completionRate > 1) {
      return NextResponse.json(
        { error: "Invalid completion rate" },
        { status: 400 },
      );
    }
    if (score < 0 || score > totalStreets) {
      return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }
    if (maxStreak < 0 || maxStreak > totalStreets) {
      return NextResponse.json({ error: "Invalid streak" }, { status: 400 });
    }
    if (timeSeconds < 0 || timeSeconds > 86400) {
      return NextResponse.json({ error: "Invalid time" }, { status: 400 });
    }

    // Verify HMAC signature
    if (signature) {
      const valid = await verifySignature({
        city,
        score,
        totalStreets,
        completionRate,
        maxStreak,
        timeSeconds,
        signature,
      });
      if (!valid) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 403 },
        );
      }
    }

    const stmt = db.prepare(
      `INSERT INTO leaderboard (player_name, city, score, total_streets, completion_rate, max_streak, time_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    const result = stmt.run(
      safeName,
      city,
      score,
      totalStreets,
      completionRate,
      maxStreak,
      timeSeconds,
    );

    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error("Leaderboard POST error:", err);
    return NextResponse.json(
      { error: "Failed to submit score" },
      { status: 500 },
    );
  }
}
