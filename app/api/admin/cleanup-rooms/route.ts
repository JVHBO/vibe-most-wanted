import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.CRON_SECRET;

    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const client = new ConvexHttpClient(CONVEX_URL);

    // Delete all old/expired rooms
    const result = await client.mutation(api.pokerBattle.cleanupOldRooms, {});

    // List remaining rooms
    const rooms = await client.query(api.pokerBattle.listAllRooms, {});

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      remainingRooms: rooms.length,
      rooms: rooms.map((r: any) => ({
        roomId: r.roomId,
        status: r.status,
        host: r.hostAddress,
        guest: r.guestAddress || 'waiting'
      }))
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
