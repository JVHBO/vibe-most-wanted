/**
 * API Route: GET /api/vibefid-metadata/[tokenId]
 *
 * Fetches VibeFID metadata from vibefid.xyz to get the original video URL
 * This avoids CORS issues when fetching from the browser
 */

import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await params;

    if (!tokenId) {
      return NextResponse.json({ error: "Token ID required" }, { status: 400 });
    }

    // Fetch from vibefid.xyz API
    const metadataUrl = `https://vibefid.xyz/api/metadata/fid/${tokenId}`;
    const res = await fetch(metadataUrl, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch metadata: ${res.status}` },
        { status: res.status }
      );
    }

    const metadata = await res.json();

    // Extract video URL (VibeFID stores video in "image" field)
    const videoUrl = metadata.animation_url || metadata.image || null;

    return NextResponse.json({
      success: true,
      tokenId,
      videoUrl,
      name: metadata.name,
      // Also include power/rarity for validation
      attributes: metadata.attributes,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });

  } catch (error: any) {
    console.error("[vibefid-metadata] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}
