import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
    const city = searchParams.get('city');
    const period = searchParams.get('period') || 'all';

    let whereClause = '';
    const params: any[] = [];

    if (city && city !== 'all') {
      whereClause += ' WHERE city = ?';
      params.push(city);
    }

    if (period === 'daily') {
      whereClause += whereClause ? ' AND played_at >= datetime("now", "-1 day")' : ' WHERE played_at >= datetime("now", "-1 day")';
    } else if (period === 'weekly') {
      whereClause += whereClause ? ' AND played_at >= datetime("now", "-7 days")' : ' WHERE played_at >= datetime("now", "-7 days")';
    }

    const rows = db.prepare(
      `SELECT id, player_name, city, score, total_streets, completion_rate, max_streak, time_seconds, played_at
       FROM leaderboard${whereClause}
       ORDER BY completion_rate DESC, max_streak DESC, time_seconds ASC
       LIMIT 50`
    ).all(...params) as LeaderboardRow[];

    // Get available cities for filter
    const cities = db.prepare(
      `SELECT DISTINCT city FROM leaderboard ORDER BY city`
    ).all() as { city: string }[];

    return NextResponse.json({
      entries: rows,
      cities: cities.map(c => c.city),
    });
  } catch (err) {
    console.error('Leaderboard GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}

/**
 * POST /api/leaderboard
 * Submit a score to the leaderboard.
 */
export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    ensureTable(db);

    const body = await req.json() as {
      playerName?: string;
      city: string;
      score: number;
      totalStreets: number;
      completionRate: number;
      maxStreak: number;
      timeSeconds: number;
    };

    const {
      playerName = 'Anonymous',
      city,
      score,
      totalStreets,
      completionRate,
      maxStreak,
      timeSeconds,
    } = body;

    // Validate required fields
    if (!city || totalStreets === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const stmt = db.prepare(
      `INSERT INTO leaderboard (player_name, city, score, total_streets, completion_rate, max_streak, time_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(playerName, city, score, totalStreets, completionRate, maxStreak, timeSeconds);

    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error('Leaderboard POST error:', err);
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 });
  }
}
