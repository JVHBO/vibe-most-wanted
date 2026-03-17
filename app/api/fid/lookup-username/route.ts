import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "";
const cache = new Map<string, { data: any; expiresAt: number }>();

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.toLowerCase().replace(/^@/, "");
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  const cached = cache.get(username);
  if (cached && cached.expiresAt > Date.now()) return NextResponse.json(cached.data);

  const resp = await fetch(
    `https://api.neynar.com/v2/farcaster/user/by_username?username=${encodeURIComponent(username)}`,
    { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
  );
  if (!resp.ok) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const data = await resp.json();
  const u = data.user;
  if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const result = {
    fid: u.fid,
    username: u.username,
    pfp_url: u.pfp_url,
    banner_url: u.profile?.banner?.url || u.profile?.banner_image_url || u.banner_url || null,
  };

  cache.set(username, { data: result, expiresAt: Date.now() + 60 * 60 * 1000 });
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
  });
}
