import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://www.myinstants.com';

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('search') || '';
  const url = search
    ? `${BASE}/api/v1/instants/?name=${encodeURIComponent(search)}&format=json`
    : `${BASE}/api/v1/instants/featured/?format=json`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json({ results: [] }, { status: 200 });
    const data = await res.json();
    // Normalize: return [{name, url}]
    const results = (data.results ?? []).slice(0, 24).map((item: any) => ({
      name: item.name as string,
      url: item.sound?.startsWith('http') ? item.sound : `${BASE}${item.sound}`,
    }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
