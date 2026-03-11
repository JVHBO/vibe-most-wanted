import { NextRequest, NextResponse } from 'next/server';

const TENOR_KEY = process.env.TENOR_API_KEY || '';
const BASE = 'https://tenor.googleapis.com/v2';

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('search') || '';
  const limit = 20;

  const url = search
    ? `${BASE}/search?q=${encodeURIComponent(search)}&key=${TENOR_KEY}&limit=${limit}&media_filter=gif,tinygif`
    : `${BASE}/featured?key=${TENOR_KEY}&limit=${limit}&media_filter=gif,tinygif`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();
    const results = (data.results ?? []).map((item: any) => ({
      id: item.id,
      title: item.title || '',
      url: item.media_formats?.gif?.url || item.media_formats?.tinygif?.url || '',
      preview: item.media_formats?.tinygif?.url || item.media_formats?.gif?.url || '',
    })).filter((r: any) => r.url);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
