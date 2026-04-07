import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * TEMP: Direct notification test (zero Neynar credits)
 * POST /api/test-direct-notification
 * Body: { fid: number, title?: string, body?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { fid, title, body } = await request.json();

    if (!fid) {
      return NextResponse.json({ error: "fid is required" }, { status: 400 });
    }

    const adminKey = process.env.VMW_INTERNAL_SECRET;
    if (!adminKey) {
      return NextResponse.json({ error: "VMW_INTERNAL_SECRET not configured" }, { status: 500 });
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    const result = await convex.mutation(
      api.notifications.triggerTestDirectNotification,
      {
        adminKey,
        fid: Number(fid),
        title: title || "🧪 Test Notification",
        body: body || "This was sent directly to Warpcast — zero Neynar credits used!",
      }
    );

    return NextResponse.json({
      success: true,
      fid,
      result,
      message: `Scheduling direct notification to FID ${fid}`,
    });
  } catch (error: any) {
    console.error("[TestDirectNotification] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed", data: error.data },
      { status: 500 }
    );
  }
}
