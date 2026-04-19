import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "";
const HAATZ = "https://haatz.quilibrium.com/v2";
const CACHE = { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } };

function mapUsers(raw: any[]) {
  return raw.map((u: any) => ({
    fid: u.fid,
    username: u.username,
    display_name: u.display_name,
    pfp_url: u.pfp_url,
    follower_count: u.follower_count,
  }));
}

async function haatzGet(path: string) {
  const r = await fetch(`${HAATZ}${path}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) return null;
  return r.json();
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ users: [] });

  const isFid = /^\d+$/.test(q);

  if (isFid) {
    // FID lookup — Haatz primary
    const data = await haatzGet(`/farcaster/user/bulk?fids=${q}`).catch(() => null);
    const users = mapUsers(data?.users || []);
    if (users.length) return NextResponse.json({ users }, CACHE);

    // Fallback: Neynar
    const r = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${q}`, {
      headers: { accept: "application/json", api_key: NEYNAR_API_KEY },
    }).catch(() => null);
    if (!r?.ok) return NextResponse.json({ users: [] });
    const nd = await r.json();
    return NextResponse.json({ users: mapUsers(nd.users || []) }, CACHE);
  }

  // Text search — Haatz primary
  const data = await haatzGet(`/farcaster/user/search?q=${encodeURIComponent(q)}&limit=5`).catch(() => null);
  const users = mapUsers(data?.users || []);
  if (users.length) return NextResponse.json({ users }, CACHE);

  // Fallback: Neynar
  const r = await fetch(
    `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(q)}&limit=5`,
    { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
  ).catch(() => null);
  if (!r?.ok) return NextResponse.json({ users: [] });
  const nd = await r.json();
  return NextResponse.json({ users: mapUsers(nd.result?.users || []) }, CACHE);
}
