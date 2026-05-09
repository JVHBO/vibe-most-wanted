import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "";
const HAATZ = "https://haatz.quilibrium.com/v2";

function getScore(user: any): number | null {
  const raw = user?.experimental?.neynar_user_score ?? user?.neynar_user_score ?? user?.score;
  const score = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(score) ? score : null;
}

function calcRarity(score: number) {
  if (score >= 0.99) return "Mythic";
  if (score >= 0.90) return "Legendary";
  if (score >= 0.79) return "Epic";
  if (score >= 0.70) return "Rare";
  return "Common";
}

export async function GET(request: NextRequest) {
  const fid = request.nextUrl.searchParams.get("fid");
  if (!fid) return NextResponse.json({ error: "Missing fid" }, { status: 400 });

  let user: any = null;

  // Haatz primary (free). Only accept it if it returns a real Neynar score.
  try {
    const r = await fetch(`${HAATZ}/farcaster/user/bulk?fids=${fid}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const haatzUser = ((await r.json()).users || [])[0] ?? null;
      if (getScore(haatzUser) !== null) user = haatzUser;
    }
  } catch {}

  // Fallback: Neynar has the canonical neynar_user_score field.
  if (!user && NEYNAR_API_KEY) {
    const r = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      headers: { api_key: NEYNAR_API_KEY },
    }).catch(() => null);
    if (r?.ok) user = ((await r.json()).users || [])[0] ?? null;
  }

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const score = getScore(user);
  if (score === null) return NextResponse.json({ error: "Neynar score unavailable" }, { status: 502 });

  return NextResponse.json({
    fid: parseInt(fid),
    username: user.username,
    displayName: user.display_name || user.displayName || user.username,
    pfpUrl: user.pfp_url || user.pfpUrl || "",
    bio: user.profile?.bio?.text || "",
    followerCount: user.follower_count || 0,
    followingCount: user.following_count || 0,
    powerBadge: user.power_badge || false,
    verifiedAddresses: user.verified_addresses || { eth_addresses: [] },
    score,
    rarity: calcRarity(score),
  }, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
