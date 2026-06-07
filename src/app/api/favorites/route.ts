import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { Bounds } from "@/lib/constants";

export const dynamic = "force-dynamic";

interface FavoriteRow {
  id: number;
  name: string;
  city_name: string | null;
  bounds: string;
}

export async function GET() {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({ favorites: [] });
    }
    const rows = db
      .prepare(
        "SELECT id, name, city_name, bounds FROM favorite_maps WHERE user_id = 1 ORDER BY id DESC",
      )
      .all() as FavoriteRow[];

    const favorites = rows.map((r) => ({
      id: r.id,
      name: r.name,
      cityName: r.city_name,
      bounds: JSON.parse(r.bounds) as Bounds,
    }));

    return NextResponse.json({ favorites });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
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
      name: string;
      cityName?: string;
      bounds: Bounds;
    };
    const { name, cityName, bounds } = body;

    if (!name || !bounds) {
      return NextResponse.json(
        { error: "Missing name or bounds" },
        { status: 400 },
      );
    }

    const stmt = db.prepare(
      "INSERT INTO favorite_maps (user_id, name, city_name, bounds) VALUES (1, ?, ?, ?)",
    );
    const result = stmt.run(name, cityName ?? null, JSON.stringify(bounds)) as {
      lastInsertRowid: number;
    };

    return NextResponse.json({ id: result.lastInsertRowid, success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to save favorite" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 },
      );
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    db.prepare("DELETE FROM favorite_maps WHERE id = ? AND user_id = 1").run(
      id,
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to delete favorite" },
      { status: 500 },
    );
  }
}
