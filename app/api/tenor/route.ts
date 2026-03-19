import { NextRequest, NextResponse } from 'next/server';

const GIPHY_KEY = process.env.GIPHY_API_KEY || '';
const BASE = 'https://api.giphy.com/v1/gifs';

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('search') || '';
  const limit = 20;

  const url = search
    ? `${BASE}/search?q=${encodeURIComponent(search)}&api_key=${GIPHY_KEY}&limit=${limit}&rating=g`
    : `${BASE}/trending?api_key=${GIPHY_KEY}&limit=${limit}&rating=g`;

  try {
    const res = await fetch(url, { next: { revalidate: search ? 300 : 60 } });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();
    const results = (data.data ?? []).map((item: any) => ({
      id: item.id,
      title: item.title || '',
      url: item.images?.original?.url || item.images?.fixed_height?.url || '',
      preview: item.images?.fixed_height_small?.url || item.images?.fixed_height?.url || '',
    })).filter((r: any) => r.url);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
