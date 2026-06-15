import { NextRequest, NextResponse } from "next/server";
export async function POST(request: NextRequest) {
  try {
    await request.json().catch(() => null);
    return NextResponse.json({
      success: false,
      reason: "vibemail_quest_rewards_disabled",
      coinsAwarded: 0,
    });
  } catch (error: any) {
    console.error("[claim-quest-coins] Error:", error);
    return NextResponse.json({ error: "Failed to claim" }, { status: 500 });
  }
}
