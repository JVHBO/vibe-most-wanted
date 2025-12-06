import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get("address");
    const castHash = request.nextUrl.searchParams.get("castHash");

    if (!address || !castHash) {
      return NextResponse.json(
        { error: "address and castHash are required" },
        { status: 400 }
      );
    }

    const progress = await convex.query(api.featuredCasts.getCastInteractionProgress, {
      address,
      castHash,
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error("Error fetching cast interaction progress:", error);
    return NextResponse.json(
      { liked: false, recasted: false, replied: false }
    );
  }
}
