import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "";
const HAATZ = "https://haatz.quilibrium.com/v2";

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

  // Haatz primary (free)
  try {
    const r = await fetch(`${HAATZ}/farcaster/user/bulk?fids=${fid}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) user = ((await r.json()).users || [])[0] ?? null;
  } catch {}

  // Fallback: Neynar (has neynar_user_score field)
  if (!user && NEYNAR_API_KEY) {
    const r = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      headers: { api_key: NEYNAR_API_KEY },
    }).catch(() => null);
    if (r?.ok) user = ((await r.json()).users || [])[0] ?? null;
  }

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const score = user.experimental?.neynar_user_score || user.score || 0;

  return NextResponse.json({
    fid: parseInt(fid),
    username: user.username,
    score,
    rarity: calcRarity(score),
  }, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
