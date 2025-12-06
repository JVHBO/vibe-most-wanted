import { NextRequest, NextResponse } from "next/server";
import { checkCastInteractions } from "@/lib/neynar";

export async function POST(request: NextRequest) {
  try {
    const { castHash, warpcastUrl, viewerFid, interactionType } = await request.json();

    // Accept either warpcastUrl or castHash (prefer warpcastUrl for better lookup)
    const castIdentifier = warpcastUrl || castHash;

    if (!castIdentifier || !viewerFid || !interactionType) {
      return NextResponse.json(
        { error: "castHash/warpcastUrl, viewerFid, and interactionType are required" },
        { status: 400 }
      );
    }

    if (!["like", "recast", "reply"].includes(interactionType)) {
      return NextResponse.json(
        { error: "interactionType must be 'like', 'recast', or 'reply'" },
        { status: 400 }
      );
    }

    console.log(`Verifying cast interaction: identifier=${castIdentifier}, viewerFid=${viewerFid}, type=${interactionType}`);

    const interactions = await checkCastInteractions(castIdentifier, viewerFid);
    console.log(`Neynar response:`, interactions);

    let verified = false;
    switch (interactionType) {
      case "like":
        verified = interactions.liked;
        break;
      case "recast":
        verified = interactions.recasted;
        break;
      case "reply":
        verified = interactions.replied;
        break;
    }

    return NextResponse.json({
      verified,
      interactionType,
      castHash,
      viewerFid,
    });
  } catch (error) {
    console.error("Error verifying cast interaction:", error);
    return NextResponse.json(
      { error: "Failed to verify interaction" },
      { status: 500 }
    );
  }
}
