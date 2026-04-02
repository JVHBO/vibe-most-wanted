import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const VMW_CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const convex = new ConvexHttpClient(VMW_CONVEX_URL);

/**
 * GET /api/fid/quests?fid=123
 * Returns active quests eligible for the given completer FID.
 */
export async function GET(request: NextRequest) {
  const fid = request.nextUrl.searchParams.get("fid");
  if (!fid) {
    return NextResponse.json({ error: "Missing fid" }, { status: 400 });
  }

  try {
    const quests = await convex.query(api.playerQuests.getQuestsForCompleter, {
      completerFid: parseInt(fid),
      limit: 20,
    });
    return NextResponse.json({ quests }, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
