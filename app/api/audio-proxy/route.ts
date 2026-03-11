import { NextRequest, NextResponse } from 'next/server';

// Proxy audio files to bypass CORS restrictions in the miniapp
// Only allows specific audio domains for security
const ALLOWED_DOMAINS = [
  'myinstants.com',
  'www.myinstants.com',
];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url') || '';

  if (!url) return new NextResponse('Missing url', { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  if (!ALLOWED_DOMAINS.includes(parsed.hostname)) {
    return new NextResponse('Domain not allowed', { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.myinstants.com/',
      },
    });

    if (!res.ok) return new NextResponse('Fetch failed', { status: res.status });

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('Proxy error', { status: 500 });
  }
}
