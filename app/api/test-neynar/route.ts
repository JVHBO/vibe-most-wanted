/**
 * Temporary test endpoint to check Neynar API response fields
 * DELETE THIS FILE after testing!
 *
 * Usage: GET /api/test-neynar?fid=1
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fid = searchParams.get('fid') || '1';

  const apiKey = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'NEYNAR_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          'accept': 'application/json',
          'api_key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Neynar API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const user = data.users?.[0];

    // Return ALL fields to see what's available
    return NextResponse.json({
      success: true,
      fid: parseInt(fid),
      userObject: user || null,
      allFields: user ? Object.keys(user) : [],
      // Specifically check for timestamp fields
      dateFields: {
        registered_at: user?.registered_at || null,
        created_at: user?.created_at || null,
        timestamp: user?.timestamp || null,
      },
      note: 'Using /bulk endpoint (free tier). May not include date fields.',
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Fetch failed', message: error.message },
      { status: 500 }
    );
  }
}
