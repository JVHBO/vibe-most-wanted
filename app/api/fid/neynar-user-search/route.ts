import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "";
const HAATZ_BASE = "https://haatz.quilibrium.com/v2";

function mapUsers(raw: any[]) {
  return raw.map((u: any) => ({
    fid: u.fid,
    username: u.username,
    display_name: u.display_name,
    pfp_url: u.pfp_url,
    follower_count: u.follower_count,
  }));
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ users: [] });

  const isFid = /^\d+$/.test(q);

  // For FID lookups: try Haatz first (free), fallback to Neynar
  if (isFid) {
    try {
      const haatzResp = await fetch(`${HAATZ_BASE}/farcaster/user/bulk?fids=${q}`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (haatzResp.ok) {
        const data = await haatzResp.json();
        const raw = data.users || [];
        if (raw.length > 0) {
          return NextResponse.json({ users: mapUsers(raw) }, {
            headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
          });
        }
      }
    } catch { /* fallthrough to Neynar */ }

    const resp = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${q}`, {
      headers: { accept: "application/json", api_key: NEYNAR_API_KEY },
    });
    if (!resp.ok) return NextResponse.json({ users: [] });
    const data = await resp.json();
    return NextResponse.json({ users: mapUsers(data.users || []) }, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
    });
  }

  // Text search: Neynar only
  const resp = await fetch(
    `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(q)}&limit=5`,
    { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
  );
  if (!resp.ok) return NextResponse.json({ users: [] });
  const data = await resp.json();

  return NextResponse.json({ users: mapUsers(data.result?.users || []) }, {
    headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
  });
}
