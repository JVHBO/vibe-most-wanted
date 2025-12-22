import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY || '7805aa61f1a04c90ab1e4a274af51617';
const VIBEFID_CONTRACT = '0x60274A138d026E3cB337B40567100FdEC3127565';

/**
 * Refresh NFT metadata on OpenSea
 * POST /api/opensea/refresh-metadata
 * Body: { tokenId: number } or { fid: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tokenId = body.tokenId || body.fid; // tokenId = fid for VibeFID

    if (!tokenId) {
      return NextResponse.json(
        { error: 'tokenId or fid is required' },
        { status: 400 }
      );
    }

    // Call OpenSea API to refresh metadata
    const response = await fetch(
      `https://api.opensea.io/api/v2/chain/base/contract/${VIBEFID_CONTRACT}/nfts/${tokenId}/refresh`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': OPENSEA_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenSea refresh error:', response.status, errorText);

      // OpenSea returns 202 for success, but sometimes 429 for rate limit
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Rate limited by OpenSea. Try again later.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: `OpenSea API error: ${response.status}` },
        { status: response.status }
      );
    }

    console.log(`✅ OpenSea metadata refresh requested for VibeFID #${tokenId}`);

    return NextResponse.json({
      success: true,
      message: `Metadata refresh requested for VibeFID #${tokenId}`,
      tokenId,
    });

  } catch (error: any) {
    console.error('Error refreshing OpenSea metadata:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
