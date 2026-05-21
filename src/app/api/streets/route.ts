import { NextRequest, NextResponse } from 'next/server';
import { Bounds, PRESETS } from '@/lib/constants';
import { getDb } from '@/lib/db';
import fs from 'fs';
import path from 'path';

import newYorkPreset from '../../../../data/presets/new-york.json';
import londonPreset from '../../../../data/presets/london.json';
import tokyoPreset from '../../../../data/presets/tokyo.json';
import hongKongPreset from '../../../../data/presets/hong-kong.json';
import singaporePreset from '../../../../data/presets/singapore.json';

const PRESET_DATA: Record<string, any> = {
  'new-york': newYorkPreset,
  'london': londonPreset,
  'tokyo': tokyoPreset,
  'hong-kong': hongKongPreset,
  'singapore': singaporePreset,
};

export const dynamic = 'force-dynamic';

const ALLOWED_HIGHWAY_TYPES = [
  'primary', 'secondary', 'tertiary', 'residential',
  'unclassified', 'living_street', 'pedestrian', 'road',
  'primary_link', 'secondary_link', 'tertiary_link',
];

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// Matches coordinates against presets with small tolerance to return local JSON directly
function getPresetIdForBounds(bounds: Bounds): string | null {
  for (const preset of PRESETS) {
    const pb = preset.bounds;
    const diff = Math.abs(bounds.south - pb.south) +
                 Math.abs(bounds.west - pb.west) +
                 Math.abs(bounds.north - pb.north) +
                 Math.abs(bounds.east - pb.east);
    if (diff < 0.0002) {
      return preset.id;
    }
  }
  return null;
}

async function raceOverpass(query: string): Promise<any> {
  const controllers = OVERPASS_MIRRORS.map(() => new AbortController());
  
  const promises = OVERPASS_MIRRORS.map(async (url, idx) => {
    const signal = controllers[idx].signal;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://github.com/frank/financial-street-cartographer'
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: signal,
      });

      if (!res.ok) {
        throw new Error(`Status ${res.status} from ${url}`);
      }

      const data = await res.json();
      if (!data || !data.elements || data.elements.length === 0) {
        throw new Error(`Empty elements from ${url}`);
      }

      // Succeeded! Abort all other active requests
      controllers.forEach((controller, cIdx) => {
        if (cIdx !== idx) {
          controller.abort();
        }
      });

      return data;
    } catch (err: any) {
      throw err;
    }
  });

  return Promise.any(promises);
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json() as { bounds: Bounds };
    const { bounds } = body;

    if (!bounds?.south || !bounds?.west || !bounds?.north || !bounds?.east) {
      return NextResponse.json({ error: 'Invalid bounds' }, { status: 400 });
    }

    const { south, west, north, east } = bounds;

    // Check if it matches a preset city
    const presetId = getPresetIdForBounds(bounds);
    if (presetId && PRESET_DATA[presetId]) {
      const data = PRESET_DATA[presetId];
      return NextResponse.json({ streets: data.streets, count: data.count, source: 'local_preset' });
    }

    const cacheKey = `${south.toFixed(4)}_${west.toFixed(4)}_${north.toFixed(4)}_${east.toFixed(4)}`;

    // Check SQLite cache for custom bounds
    if (db) {
      try {
        const cachedRow = db.prepare('SELECT streets_json FROM street_cache WHERE bounds_key = ?').get(cacheKey) as { streets_json: string } | undefined;
        if (cachedRow) {
          const streets = JSON.parse(cachedRow.streets_json);
          return NextResponse.json({ streets, count: streets.length, source: 'sqlite_cache' });
        }
      } catch (err) {
        console.error('Failed to read from SQLite cache:', err);
      }
    }

    // Validate bounds size (prevent huge custom queries)
    const latDiff = north - south;
    const lngDiff = east - west;
    if (latDiff > 0.15 || lngDiff > 0.15) {
      return NextResponse.json(
        { error: 'Area too large. Please select a smaller region (max ~15km²).' },
        { status: 400 }
      );
    }

    // Regex-optimized query
    const query = `
      [out:json][timeout:25];
      (
        way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street|pedestrian|road)(_link)?$"]["name"](${south},${west},${north},${east});
      );
      out tags geom;
    `;

    // Race mirrors
    const data = await raceOverpass(query);

    // Extract unique street names with geometry
    const streetMap = new Map<string, number[][]>();
    for (const element of data.elements) {
      const name = element.tags?.name;
      if (name) {
        const geometry = element.geometry?.map((p: any) => [p.lat, p.lon]) ?? [];
        if (geometry.length > 0) {
          if (!streetMap.has(name)) {
            streetMap.set(name, []);
          }
          streetMap.get(name)!.push(...geometry);
        }
      }
    }

    const streets = Array.from(streetMap.entries()).map(([name, geometry]) => ({
      name,
      geometry,
    }));

    streets.sort((a, b) => a.name.localeCompare(b.name));

    // Save to SQLite cache asynchronously (don't block the response)
    if (db) {
      try {
        db.prepare('INSERT OR REPLACE INTO street_cache (bounds_key, streets_json) VALUES (?, ?)')
          .run(cacheKey, JSON.stringify(streets));
      } catch (err) {
        console.error('Failed to write to SQLite cache:', err);
      }
    }

    return NextResponse.json({ streets, count: streets.length, source: 'overpass_live' });
  } catch (err: any) {
    console.error('Overpass API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch street data. Please try again.' },
      { status: 500 }
    );
  }
}
