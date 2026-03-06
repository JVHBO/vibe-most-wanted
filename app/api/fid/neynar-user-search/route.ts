import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ users: [] });

  const resp = await fetch(
    `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(q)}&limit=5`,
    { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
  );
  if (!resp.ok) return NextResponse.json({ users: [] });

  const data = await resp.json();
  const users = (data.result?.users || []).map((u: any) => ({
    fid: u.fid,
    username: u.username,
    display_name: u.display_name,
    pfp_url: u.pfp_url,
    follower_count: u.follower_count,
  }));

  return NextResponse.json({ users }, {
    headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
  });
}
