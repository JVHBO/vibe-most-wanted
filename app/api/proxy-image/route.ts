import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// SECURITY: Whitelist of allowed domains to prevent SSRF attacks
const ALLOWED_DOMAINS = [
  'pbs.twimg.com',
  'abs.twimg.com',
  'imagedelivery.net',
  'i.imgur.com',
  'imgur.com',
  'ipfs.io',
  'gateway.pinata.cloud',
  'cloudflare-ipfs.com',
  'nftstorage.link',
  'arweave.net',
  'vibemostwanted.xyz',
  'www.vibemostwanted.xyz',
  'res.cloudinary.com',
  'i.seadn.io',
  'openseauserdata.com',
  'lh3.googleusercontent.com',
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Block private/internal IPs
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') ||
      hostname.endsWith('.local') ||
      hostname === '0.0.0.0'
    ) {
      return false;
    }
    // Check against whitelist
    return ALLOWED_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // SECURITY: Validate URL against whitelist
  if (!isAllowedUrl(imageUrl)) {
    return new NextResponse('URL not allowed', { status: 403 });
  }

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return new NextResponse('Failed to fetch image', { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return new NextResponse('Error fetching image', { status: 500 });
  }
}
