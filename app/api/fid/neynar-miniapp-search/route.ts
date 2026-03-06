import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "";

// Cache the full catalog (rarely changes, expensive to fetch)
let catalogCache: { frames: any[]; expiresAt: number } | null = null;
const CATALOG_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ miniapps: [] });

  // Use cached catalog if available
  let frames: any[] = [];
  if (catalogCache && catalogCache.expiresAt > Date.now()) {
    frames = catalogCache.frames;
  } else {
    // Neynar frame catalog with name filter
    const resp = await fetch(
      `https://api.neynar.com/v2/farcaster/frame/catalog?limit=100`,
      { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
    );
    if (!resp.ok) return NextResponse.json({ miniapps: [] });
    const data = await resp.json();
    frames = data.frames || [];
    catalogCache = { frames, expiresAt: Date.now() + CATALOG_TTL_MS };
  }

  const lower = q.toLowerCase();

  const miniapps = frames
    .filter((f: any) => {
      const m = f.manifest?.frame || {};
      const domain = f.frames_url || "";
      return (
        m.name?.toLowerCase().includes(lower) ||
        domain.toLowerCase().includes(lower)
      );
    })
    .slice(0, 5)
    .map((f: any) => {
      const m = f.manifest?.frame || {};
      const domain = f.frames_url || "";
      return {
        name: m.name || domain,
        url: m.home_url || domain,
        domain: domain.replace(/^https?:\/\//, "").replace(/\/$/, ""),
        icon_url: m.icon_url || f.image || "",
      };
    });

  return NextResponse.json({ miniapps }, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
  });
}
