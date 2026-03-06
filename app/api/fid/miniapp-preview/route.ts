import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

// In-memory cache: url → { data, expiresAt }
const miniappCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });
  if (!NEYNAR_API_KEY) return NextResponse.json({ error: "No API key" }, { status: 500 });

  const cached = miniappCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200", "X-Cache": "HIT" },
    });
  }

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/mini_app?url=${encodeURIComponent(url)}`,
      { headers: { api_key: NEYNAR_API_KEY } }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Neynar error", status: response.status }, { status: 502 });
    }

    const data = await response.json();
    miniappCache.set(url, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
