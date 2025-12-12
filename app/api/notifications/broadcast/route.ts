import { NextRequest, NextResponse } from "next/server";
import { broadcastNeynarNotification, sendNeynarNotification } from "@/lib/neynar";

/**
 * POST /api/notifications/broadcast
 *
 * Send notifications via Neynar API
 *
 * Body:
 * - title: string (max 32 chars)
 * - body: string (max 128 chars)
 * - targetFids?: number[] (optional, empty = all users)
 * - targetUrl?: string (optional, default = https://www.vibemostwanted.xyz)
 */
export async function POST(request: NextRequest) {
  try {
    const { title, body, targetFids, targetUrl } = await request.json();

    if (!title || !body) {
      return NextResponse.json(
        { error: "title and body are required" },
        { status: 400 }
      );
    }

    console.log(`[Notifications API] Broadcasting: "${title}"`);

    // If specific FIDs provided, use sendNeynarNotification
    // Otherwise use broadcastNeynarNotification for all users
    if (targetFids && Array.isArray(targetFids) && targetFids.length > 0) {
      const result = await sendNeynarNotification(
        title,
        body,
        targetFids,
        targetUrl || "https://www.vibemostwanted.xyz"
      );

      return NextResponse.json({
        success: result.success,
        deliveries: result.deliveries,
        error: result.error,
      });
    } else {
      const result = await broadcastNeynarNotification(
        title,
        body,
        targetUrl || "https://www.vibemostwanted.xyz"
      );

      return NextResponse.json({
        success: result.success,
        successCount: result.successCount,
        failedCount: result.failedCount,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("[Notifications API] Error:", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}
