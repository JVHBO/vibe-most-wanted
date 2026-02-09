import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function GET(request: NextRequest) {
  if (!NEYNAR_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const fid = request.nextUrl.searchParams.get("fid");

  if (!fid) {
    return NextResponse.json({ error: "Missing fid" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          api_key: NEYNAR_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Neynar API error");
    }

    const data = await response.json();
    const user = data.users?.[0];

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const score = user.experimental?.neynar_user_score || 0;

    // Calculate rarity from score
    let rarity = "Common";
    if (score >= 0.99) rarity = "Mythic";      // 99%+
    else if (score >= 0.90) rarity = "Legendary"; // 90-98%
    else if (score >= 0.79) rarity = "Epic";      // 79-89%
    else if (score >= 0.70) rarity = "Rare";      // 70-78%

    return NextResponse.json({
      fid: parseInt(fid),
      username: user.username,
      score,
      rarity,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
