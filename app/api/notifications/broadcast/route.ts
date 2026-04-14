import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { listBaseNotificationUsers, sendBaseNotifications } from "@/lib/base-notifications";

/**
 * POST /api/notifications/broadcast
 *
 * Send notifications via Base Notifications API
 *
 * Body:
 * - title: string (max 32 chars)
 * - body: string (max 128 chars)
 * - targetFids?: number[] (optional)
 * - targetAddresses?: string[] (optional)
 * - targetPath?: string (optional, default = /)
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Only internal callers with VMW_INTERNAL_SECRET can broadcast
    const authHeader = request.headers.get('authorization');
    const secret = process.env.VMW_INTERNAL_SECRET;
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, body, targetFids, targetAddresses, targetPath } = await request.json();

    if (!title || !body) {
      return NextResponse.json(
        { error: "title and body are required" },
        { status: 400 }
      );
    }

    console.log(`[Notifications API] Broadcasting via Base: "${title}"`);

    const walletSet = new Set<string>();

    if (Array.isArray(targetAddresses)) {
      for (const address of targetAddresses) {
        if (typeof address === "string" && address.startsWith("0x")) {
          walletSet.add(address.toLowerCase());
        }
      }
    }

    if (Array.isArray(targetFids) && targetFids.length > 0) {
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
      for (const fid of targetFids.slice(0, 1000)) {
        if (!Number.isFinite(fid)) continue;
        const profile = await convex.query(api.profiles.getProfileByFid, { fid: Number(fid) });
        if (profile?.address && typeof profile.address === "string") {
          walletSet.add(profile.address.toLowerCase());
        }
      }
    }

    if (walletSet.size === 0) {
      const users = await listBaseNotificationUsers({ notificationsEnabled: true, limit: 100 });
      for (const address of users) {
        walletSet.add(address.toLowerCase());
      }
    }

    const result = await sendBaseNotifications({
      walletAddresses: [...walletSet],
      title,
      message: body,
      targetPath: typeof targetPath === "string" ? targetPath : "/",
    });

    return NextResponse.json({
      success: result.success,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      results: result.results,
      targetCount: walletSet.size,
    });
  } catch (error) {
    console.error("[Notifications API] Error:", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}
