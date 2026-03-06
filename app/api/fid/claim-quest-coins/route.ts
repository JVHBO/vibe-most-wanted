import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const VMW_CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://agile-orca-761.convex.cloud";

const convex = new ConvexHttpClient(VMW_CONVEX_URL);

export async function POST(request: NextRequest) {
  try {
    const { address, vibemailId } = await request.json();

    if (!address || !vibemailId) {
      return NextResponse.json({ error: "Missing address or vibemailId" }, { status: 400 });
    }

    const result = await convex.mutation(api.farcasterCards.claimVibeMailQuestCoins, {
      address,
      vibemailId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[claim-quest-coins] Error:", error);
    return NextResponse.json({ error: "Failed to claim" }, { status: 500 });
  }
}
