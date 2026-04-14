import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { sendBaseNotifications } from "@/lib/base-notifications";

/**
 * POST /api/test-notifications
 * Send one test notification via each channel (Farcaster direct + Base Notifications)
 *
 * Body:
 * - fid?: number   (Farcaster FID — for Farcaster channel)
 * - address?: string (wallet address — for Base channel)
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const secret = process.env.VMW_INTERNAL_SECRET;
  const authHeader = request.headers.get("authorization");
  const bodyKey: string | undefined = typeof body.adminKey === "string" ? body.adminKey : undefined;
  const authorized = secret && (authHeader === `Bearer ${secret}` || bodyKey === secret);

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fid: number | undefined = typeof body.fid === "number" ? body.fid : undefined;
  const address: string | undefined = typeof body.address === "string" ? body.address : undefined;

  const title = "🧪 Test Notification";
  const notifBody = "This is a test — Farcaster + Base channels working!";
  const targetUrl = "https://vibemostwanted.xyz";

  const results: Record<string, any> = {};

  // ── Channel 1: Farcaster (direct URL — Hypersnap-compatible) ──────────────
  if (fid) {
    try {
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
      const adminKey = process.env.VMW_INTERNAL_SECRET!;
      const token = await convex.query(api.notifications.getTokenByFid, { fid: String(fid), adminKey });

      if (token && token.url && token.token) {
        const uuid = crypto.randomUUID();
        const response = await fetch(token.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Frame-Token": token.token },
          body: JSON.stringify({
            title: title.slice(0, 32),
            body: notifBody.slice(0, 128),
            targetUrl,
            notificationId: uuid,
            tokens: [token.token],
          }),
        });
        const text = await response.text();
        results.farcaster = { status: response.status, ok: response.ok, response: text.slice(0, 200) };
      } else {
        results.farcaster = { error: `No Farcaster notification token found for FID ${fid}` };
      }
    } catch (err: any) {
      results.farcaster = { error: err.message };
    }
  } else {
    results.farcaster = { skipped: "No fid provided" };
  }

  // ── Channel 2: Base Notifications API ────────────────────────────────────
  if (address) {
    try {
      const baseResult = await sendBaseNotifications({
        walletAddresses: [address],
        title,
        message: notifBody,
        targetPath: "/",
      });
      results.base = baseResult;
    } catch (err: any) {
      results.base = { error: err.message };
    }
  } else {
    results.base = { skipped: "No address provided" };
  }

  return NextResponse.json({ success: true, results });
}
