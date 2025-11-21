import { NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export async function POST() {
  try {
    const client = new ConvexHttpClient(CONVEX_URL);

    // Delete all old VibeFID cards from previous contracts
    const result = await client.mutation(api.farcasterCards.deleteAllOldVibeFIDCards, {});

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} old VibeFID cards from previous contracts`
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
