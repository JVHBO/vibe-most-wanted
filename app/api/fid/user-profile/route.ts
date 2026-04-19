import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "";
const HAATZ = "https://haatz.quilibrium.com/v2";
const cache = new Map<string, { data: any; expiresAt: number }>();

export async function GET(request: NextRequest) {
  const fid = request.nextUrl.searchParams.get("fid");
  if (!fid) return NextResponse.json({ error: "Missing fid" }, { status: 400 });

  const cached = cache.get(fid);
  if (cached && cached.expiresAt > Date.now()) return NextResponse.json(cached.data);

  // Haatz primary (free)
  let u: any = null;
  try {
    const r = await fetch(`${HAATZ}/farcaster/user/bulk?fids=${fid}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) u = ((await r.json()).users || [])[0] ?? null;
  } catch {}

  // Fallback: Neynar
  if (!u) {
    const r = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      headers: { accept: "application/json", api_key: NEYNAR_API_KEY },
    }).catch(() => null);
    if (!r?.ok) return NextResponse.json({ error: "User not found" }, { status: 502 });
    u = ((await r.json()).users || [])[0];
  }

  if (!u) return NextResponse.json({});

  const result = {
    fid: u.fid,
    username: u.username,
    pfp_url: u.pfp_url,
    banner_url: u.profile?.banner?.url || u.profile?.banner_image_url || u.banner_url || null,
  };

  cache.set(fid, { data: result, expiresAt: Date.now() + 60 * 60 * 1000 });
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
  });
}
