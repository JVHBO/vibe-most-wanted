import { NextRequest, NextResponse } from "next/server";
import { getCastByUrl } from "@/lib/neynar";

/**
 * Validate a cast exists and get its metadata
 * Used before placing a bid to ensure the cast is valid
 * 🚀 BANDWIDTH FIX: Uses lib/neynar.ts which has 1-hour in-memory cache
 */
export async function POST(request: NextRequest) {
  try {
    const { warpcastUrl } = await request.json();

    if (!warpcastUrl) {
      return NextResponse.json(
        { valid: false, error: "Cast URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    const urlMatch = warpcastUrl.match(/(?:warpcast\.com|farcaster\.xyz)\/[^/]+\/(0x[a-f0-9]+)/i);
    if (!urlMatch) {
      return NextResponse.json(
        { valid: false, error: "Invalid cast URL format. Use warpcast.com or farcaster.xyz" },
        { status: 400 }
      );
    }

    const cast = await getCastByUrl(warpcastUrl);

    if (!cast) {
      return NextResponse.json(
        { valid: false, error: "Cast not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      cast: {
        hash: cast.hash,
        text: cast.text?.substring(0, 280) || "",
        author: {
          fid: cast.author?.fid,
          username: cast.author?.username,
          displayName: cast.author?.display_name,
          pfpUrl: cast.author?.pfp_url,
        },
        timestamp: cast.timestamp,
        reactions: {
          likes: cast.reactions?.likes_count || 0,
          recasts: cast.reactions?.recasts_count || 0,
        },
        replies: cast.replies?.count || 0,
        imageUrl:
          cast.embeds?.find((e: any) => e.metadata?.image)?.url ||
          cast.embeds?.find((e: any) => e.url?.match(/\.(jpg|jpeg|png|gif|webp)/i))?.url ||
          null,
      },
    });
  } catch (error) {
    console.error("[ValidateCast] Error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate cast" },
      { status: 500 }
    );
  }
}
