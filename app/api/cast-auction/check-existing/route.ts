import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL not defined");
  return new ConvexHttpClient(url);
}

/**
 * Check if a cast is already in an active auction
 * If it exists, return pool info so user can add to it
 */
export async function POST(request: NextRequest) {
  try {
    const convex = getConvexClient();
    const { castHash } = await request.json();

    if (!castHash) {
      return NextResponse.json(
        { exists: false, error: "Cast hash is required" },
        { status: 400 }
      );
    }

    // Check if cast exists in active auctions
    const existingCast = await convex.query(api.castAuctions.checkExistingCast, {
      castHash,
    });

    if (!existingCast) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      auctionId: existingCast.auctionId,
      slotNumber: existingCast.slotNumber,
      totalPool: existingCast.totalPool,
      contributorCount: existingCast.contributorCount,
      contributors: existingCast.contributors,
      topBidder: existingCast.topBidder,
      auctionEndsAt: existingCast.auctionEndsAt,
      castAuthorUsername: existingCast.castAuthorUsername,
    });
  } catch (error) {
    console.error("[CheckExisting] Error:", error);
    return NextResponse.json(
      { exists: false, error: "Failed to check existing cast" },
      { status: 500 }
    );
  }
}
