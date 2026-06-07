import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

interface HistoryRow {
  id: number;
  map_name: string;
  score: number;
  total_streets: number;
  completion_rate: number;
  max_streak: number;
  played_at: string;
}

export async function GET() {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({ history: [], highScore: 0 });
    }
    const rows = db
      .prepare(
        `SELECT id, map_name, score, total_streets, completion_rate, max_streak, played_at
       FROM game_history WHERE user_id = 1 ORDER BY played_at DESC LIMIT 50`,
      )
      .all() as HistoryRow[];

    const highScore = db
      .prepare(`SELECT MAX(score) as hs FROM game_history WHERE user_id = 1`)
      .get() as { hs: number | null };

    return NextResponse.json({ history: rows, highScore: highScore?.hs ?? 0 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 },
      );
    }
    const body = (await req.json()) as {
      mapName: string;
      score: number;
      totalStreets: number;
      completionRate: number;
      maxStreak: number;
    };
    const { mapName, score, totalStreets, completionRate, maxStreak } = body;

    const stmt = db.prepare(
      `INSERT INTO game_history (user_id, map_name, score, total_streets, completion_rate, max_streak)
       VALUES (1, ?, ?, ?, ?, ?)`,
    );
    stmt.run(mapName, score, totalStreets, completionRate, maxStreak);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save game" }, { status: 500 });
  }
}
