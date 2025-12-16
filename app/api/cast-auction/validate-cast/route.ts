import { NextRequest, NextResponse } from "next/server";

/**
 * Validate a cast exists and get its metadata
 * Used before placing a bid to ensure the cast is valid
 */
export async function POST(request: NextRequest) {
  try {
    const { warpcastUrl } = await request.json();

    if (!warpcastUrl) {
      return NextResponse.json(
        { valid: false, error: "Warpcast URL is required" },
        { status: 400 }
      );
    }

    // Extract cast hash from Warpcast URL
    // URLs look like: https://warpcast.com/username/0x123abc
    const urlMatch = warpcastUrl.match(/warpcast\.com\/[^/]+\/(0x[a-f0-9]+)/i);
    if (!urlMatch) {
      return NextResponse.json(
        { valid: false, error: "Invalid Warpcast URL format" },
        { status: 400 }
      );
    }

    const castHash = urlMatch[1];

    // Fetch cast from Neynar API
    const neynarApiKey = process.env.NEYNAR_API_KEY;
    if (!neynarApiKey) {
      console.error("[ValidateCast] NEYNAR_API_KEY not configured");
      return NextResponse.json(
        { valid: false, error: "API configuration error" },
        { status: 500 }
      );
    }

    const neynarResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/cast?identifier=${castHash}&type=hash`,
      {
        headers: {
          api_key: neynarApiKey,
          accept: "application/json",
        },
      }
    );

    if (!neynarResponse.ok) {
      console.error(
        `[ValidateCast] Neynar API error: ${neynarResponse.status}`
      );
      return NextResponse.json(
        { valid: false, error: "Cast not found" },
        { status: 404 }
      );
    }

    const data = await neynarResponse.json();

    if (!data.cast) {
      return NextResponse.json(
        { valid: false, error: "Cast not found" },
        { status: 404 }
      );
    }

    const cast = data.cast;

    // Return validated cast data
    return NextResponse.json({
      valid: true,
      cast: {
        hash: cast.hash,
        text: cast.text?.substring(0, 280) || "", // Limit text length
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
        // Include embedded image if present
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
