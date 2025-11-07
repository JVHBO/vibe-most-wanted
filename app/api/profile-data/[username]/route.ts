import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL_PROD || process.env.NEXT_PUBLIC_CONVEX_URL!;
    const response = await fetch(`${convexUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'profiles:getProfileByUsername',
        args: { username: username.toLowerCase() },
        format: 'json',
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const data = await response.json();

    if (!data.value) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profile = data.value;
    const totalWins = (profile.stats?.pveWins || 0) + (profile.stats?.pvpWins || 0);
    const totalLosses = (profile.stats?.pveLosses || 0) + (profile.stats?.pvpLosses || 0);
    const totalMatches = totalWins + totalLosses;
    const winRate = totalMatches > 0 ? ((totalWins / totalMatches) * 100).toFixed(1) : '0';

    return NextResponse.json({
      pfpUrl: profile.twitterProfileImageUrl || '',
      totalPower: profile.stats?.totalPower || 0,
      totalWins,
      totalLosses,
      winRate,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
