import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Create client lazily to avoid build-time initialization errors
function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not defined");
  }
  return new ConvexHttpClient(url);
}

export async function POST() {
  try {
    const convex = getConvexClient();
    // Get all active poker rooms
    const allRooms = await convex.query(api.pokerBattle.getPokerRooms, {});

    let totalDeleted = 0;
    const roomIds = new Set<string>();

    // Collect all room IDs
    for (const room of allRooms) {
      roomIds.add(room.roomId);
    }

    // Clean voice for each room
    for (const roomId of roomIds) {
      try {
        const result = await convex.mutation(api.voiceChat.cleanupRoomVoice, {
          roomId,
        });
        totalDeleted += result.deleted || 0;
      } catch (e) {
        console.error(`Failed to clean room ${roomId}:`, e);
      }
    }

    // Also clean stale voice participants (if the function exists)
    try {
      const staleResult = await convex.mutation(api.voiceChat.cleanupStaleVoiceParticipants, {});
      totalDeleted += staleResult.deleted || 0;
    } catch (e) {
      // Function might not be deployed yet
      console.log("cleanupStaleVoiceParticipants not available");
    }

    return NextResponse.json({
      success: true,
      deleted: totalDeleted,
      roomsCleaned: roomIds.size,
      message: `Cleaned ${totalDeleted} voice participants from ${roomIds.size} rooms`
    });
  } catch (error) {
    console.error("Voice cleanup error:", error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
}
