import { NextRequest, NextResponse } from "next/server";
import { getCastByUrl } from "@/lib/neynar";

// In-memory cache: castUrl → { data, expiresAt }
const castCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "Warpcast URL is required" },
        { status: 400 }
      );
    }

    // Check in-memory cache first
    const cached = castCache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ cast: cached.data }, {
        headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600', 'X-Cache': 'HIT' },
      });
    }

    const cast = await getCastByUrl(url);

    if (!cast) {
      return NextResponse.json(
        { error: "Cast not found" },
        { status: 404 }
      );
    }

    // Store in cache
    castCache.set(url, { data: cast, expiresAt: Date.now() + CACHE_TTL_MS });
    // Evict old entries if cache grows large
    if (castCache.size > 500) {
      const now = Date.now();
      for (const [k, v] of castCache) {
        if (v.expiresAt < now) castCache.delete(k);
      }
    }

    return NextResponse.json({ cast }, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
    });
  } catch (error) {
    console.error("Error fetching cast by URL:", error);
    return NextResponse.json(
      { error: "Failed to fetch cast" },
      { status: 500 }
    );
  }
}
