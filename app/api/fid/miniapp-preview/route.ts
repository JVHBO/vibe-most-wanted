import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

// In-memory cache: url → { data, expiresAt }
const miniappCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Normalize manifest fields to the mini_app shape used by MiniappPreview
function fromManifest(frame: any, origin: string) {
  return {
    mini_app: {
      name: frame.name || "",
      icon_url: frame.iconUrl || "",
      splash_image_url: frame.imageUrl || frame.splashImageUrl || "",
      home_url: frame.homeUrl || origin,
      description: frame.description || frame.subtitle || "",
      screenshot_urls: frame.screenshotUrls || [],
    },
  };
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  const cached = miniappCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200", "X-Cache": "HIT" },
    });
  }

  // Try direct manifest fetch first (works for any homeUrl, no Neynar cost)
  try {
    const parsed = new URL(url);
    // Skip farcaster.xyz miniapp links — they don't host the manifest themselves
    if (!parsed.hostname.includes("farcaster.xyz")) {
      const manifestResp = await fetch(`${parsed.origin}/.well-known/farcaster.json`, {
        next: { revalidate: 3600 },
      });
      if (manifestResp.ok) {
        const manifest = await manifestResp.json();
        const frame = manifest?.frame ?? manifest?.miniapp ?? {};
        if (frame.name) {
          const data = fromManifest(frame, parsed.origin);
          miniappCache.set(url, { data, expiresAt: Date.now() + CACHE_TTL_MS });
          return NextResponse.json(data, {
            headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
          });
        }
      }
    }
  } catch {}

  // Fallback: Neynar (for farcaster.xyz URLs or when manifest fetch fails)
  if (!NEYNAR_API_KEY) return NextResponse.json({ error: "No API key" }, { status: 500 });
  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/mini_app?url=${encodeURIComponent(url)}`,
      { headers: { api_key: NEYNAR_API_KEY } }
    );
    if (!response.ok) return NextResponse.json({ error: "Neynar error" }, { status: 502 });
    const data = await response.json();
    miniappCache.set(url, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
