import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Profile';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  // For now, just redirect to the API
  // We'll generate inline later if needed
  const imageUrl = `https://www.vibemostwanted.xyz/api/og-profile?username=${encodeURIComponent(username)}&totalPower=0&wins=0&losses=0&nftCount=0`;

  // Fetch and return the image
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();

  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, immutable',
    },
  });
}
