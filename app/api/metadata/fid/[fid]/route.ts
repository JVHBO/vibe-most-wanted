import { NextRequest, NextResponse } from 'next/server';

/**
 * Compatibility route for on-chain tokenURI
 * The VibeFID contract tokenURI points to /api/metadata/fid/{fid}
 * Proxies to the actual metadata route at /api/fid/metadata/fid/{fid}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  const { fid } = await params;
  const res = await fetch(`https://vibemostwanted.xyz/api/fid/metadata/fid/${fid}`, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 3600 },
  });

  const data = await res.json();

  return NextResponse.json(data, {
    status: res.status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600, s-maxage=300',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}
