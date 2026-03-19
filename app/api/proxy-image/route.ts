import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB

const ALLOWED_HOSTS = [
  'ipfs.filebase.io',
  'ipfs.io',
  'cloudflare-ipfs.com',
  'gateway.pinata.cloud',
  'pbs.twimg.com',
  'abs.twimg.com',
  'res.cloudinary.com',
  'imagedelivery.net',
  'i.imgur.com',
  'avatars.githubusercontent.com',
  'lh3.googleusercontent.com',
  'cdn.warpcast.com',
  'wrpcd.net',
  'vibemostwanted.xyz',
  'vibe-most-wanted.vercel.app',
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return new NextResponse('Domain not allowed', { status: 403 });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) {
      return new NextResponse('Failed to fetch image', { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
      return new NextResponse('Not an image', { status: 415 });
    }

    // Stream with size guard
    const reader = response.body?.getReader();
    if (!reader) return new NextResponse('No body', { status: 502 });

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_SIZE) {
        reader.cancel();
        return new NextResponse('Image too large', { status: 413 });
      }
      chunks.push(value);
    }

    const imageBuffer = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      imageBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Error fetching image', { status: 500 });
  }
}
