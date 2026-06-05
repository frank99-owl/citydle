import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Rate limit: 20 searches per minute per IP
  const ip = getClientIp(req);
  const { allowed, retryAfterMs } = checkRateLimit({ key: `search:${ip}`, limit: 20 });
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfterMs },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');

    if (!q || !q.trim()) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 StreetGuesser/1.0',
        'Referer': 'https://github.com/frank/financial-street-cartographer',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Nominatim API returned status ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Search API error:', err);
    return NextResponse.json({ error: 'Failed to search location. Please try again.' }, { status: 500 });
  }
}
