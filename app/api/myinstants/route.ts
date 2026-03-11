import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://www.myinstants.com';

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('search') || '';
  const url = search
    ? `${BASE}/api/v1/instants/?name=${encodeURIComponent(search)}&format=json`
    : `${BASE}/api/v1/instants/featured/?format=json`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.myinstants.com/',
        'Origin': 'https://www.myinstants.com',
      },
      cache: 'no-store',
    });
    const raw = await res.text();
    if (!res.ok) return NextResponse.json({ results: [], _debug: `status:${res.status} body:${raw.slice(0,100)}` }, { status: 200 });
    let data: any;
    try { data = JSON.parse(raw); } catch { return NextResponse.json({ results: [], _debug: `not_json:${raw.slice(0,100)}` }); }
    // Normalize: return [{name, url}]
    const results = (data.results ?? []).slice(0, 24).map((item: any) => ({
      name: item.name as string,
      url: item.sound?.startsWith('http') ? item.sound : `${BASE}${item.sound}`,
    }));
    return NextResponse.json({ results, _debug: `ok_count:${results.length}` });
  } catch (e: any) {
    return NextResponse.json({ results: [], _debug: `err:${e?.message}` });
  }
}
