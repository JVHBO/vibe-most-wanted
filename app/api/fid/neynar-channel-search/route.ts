import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ channels: [] });

  const resp = await fetch(
    `https://api.neynar.com/v2/farcaster/channel/search?q=${encodeURIComponent(q)}&limit=5`,
    { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
  );
  if (!resp.ok) return NextResponse.json({ channels: [] });

  const data = await resp.json();
  const channels = (data.channels || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    image_url: c.image_url,
    follower_count: c.follower_count,
  }));

  return NextResponse.json({ channels }, {
    headers: { "Cache-Control": "public, s-maxage=30" },
  });
}
