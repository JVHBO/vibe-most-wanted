import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "";
const HAATZ = "https://haatz.quilibrium.com/v2";

function mapChannels(raw: any[]) {
  return raw.map((c: any) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    image_url: c.image_url,
    follower_count: c.follower_count,
  }));
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ channels: [] });

  // Haatz primary (free)
  try {
    const r = await fetch(`${HAATZ}/farcaster/channel/search?q=${encodeURIComponent(q)}&limit=5`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const data = await r.json();
      const channels = mapChannels(data.channels || []);
      if (channels.length) return NextResponse.json({ channels }, { headers: { "Cache-Control": "public, s-maxage=30" } });
    }
  } catch {}

  // Fallback: Neynar
  const resp = await fetch(
    `https://api.neynar.com/v2/farcaster/channel/search?q=${encodeURIComponent(q)}&limit=5`,
    { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
  ).catch(() => null);
  if (!resp?.ok) return NextResponse.json({ channels: [] });

  const data = await resp.json();
  return NextResponse.json({ channels: mapChannels(data.channels || []) }, {
    headers: { "Cache-Control": "public, s-maxage=30" },
  });
}
