import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { fid } = await request.json();

    if (!fid) {
      return NextResponse.json({ error: 'FID required' }, { status: 400 });
    }

    const response = await fetch('https://graph.cast.k3l.io/scores/global/engagement/fids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([fid]),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'OpenRank API failed' }, { status: 500 });
    }

    const data = await response.json();
    const results = data.result || data;

    if (Array.isArray(results) && results.length > 0 && results[0].rank) {
      return NextResponse.json({
        rank: results[0].rank,
        percentile: results[0].percentile,
        score: results[0].score,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      });
    }

    return NextResponse.json({ error: 'No rank found' }, { status: 404 });
  } catch (error) {
    console.error('OpenRank proxy error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
