import { NextRequest, NextResponse } from "next/server";

// Security: Only use environment variable, no fallback
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

// Security: Whitelist of allowed notification endpoints to prevent SSRF
const ALLOWED_NOTIFICATION_URLS = [
  "https://api.farcaster.xyz",
  "https://api.neynar.com",
] as const;

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow HTTPS
    if (parsed.protocol !== "https:") {
      return false;
    }
    // Check if URL starts with any allowed domain
    return ALLOWED_NOTIFICATION_URLS.some(allowed => url.startsWith(allowed));
  } catch {
    return false;
  }
}

interface NotificationPayload {
  fid: string;
  title: string;
  body: string;
  targetUrl?: string;
  token?: string;
  url?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Security: Validate API key is configured
    if (!NEYNAR_API_KEY) {
      console.error("[send-notification] NEYNAR_API_KEY not configured");
      return NextResponse.json(
        { error: "Service not configured" },
        { status: 503 }
      );
    }

    const payload: NotificationPayload = await request.json();
    const { fid, title, body, targetUrl, token, url } = payload;

    // Input validation
    if (!fid || !title || !body) {
      return NextResponse.json(
        { error: "Missing required fields: fid, title, body" },
        { status: 400 }
      );
    }

    // Security: Validate FID is a positive number
    const fidNum = parseInt(fid);
    if (isNaN(fidNum) || fidNum <= 0) {
      return NextResponse.json(
        { error: "Invalid FID" },
        { status: 400 }
      );
    }

    // Security: Sanitize title and body to prevent injection
    const sanitizedTitle = title.slice(0, 100); // Max 100 chars
    const sanitizedBody = body.slice(0, 500); // Max 500 chars

    // If token and url provided, send directly to Farcaster/Warpcast API
    if (token && url) {
      // Security: Validate URL is in whitelist to prevent SSRF
      if (!isAllowedUrl(url)) {
        console.warn(`[send-notification] Blocked SSRF attempt to: ${url}`);
        return NextResponse.json(
          { error: "Invalid notification URL" },
          { status: 400 }
        );
      }

      const isWarpcast = url.includes("api.farcaster.xyz");

      if (isWarpcast) {
        // Send to Warpcast notification API
        const warpcastResponse = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            notificationId: `vibefid-${Date.now()}`,
            title: sanitizedTitle,
            body: sanitizedBody,
            targetUrl: targetUrl || "https://vibefid.xyz",
            tokens: [token],
          }),
        });

        const warpcastResult = await warpcastResponse.json();

        return NextResponse.json({
          success: warpcastResponse.ok,
          platform: "warpcast",
          result: warpcastResult,
        });
      } else {
        // Send to Neynar notification API
        const neynarResponse = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": NEYNAR_API_KEY,
          },
          body: JSON.stringify({
            notification_id: `vibefid-${Date.now()}`,
            title: sanitizedTitle,
            body: sanitizedBody,
            target_url: targetUrl || "https://vibefid.xyz",
            tokens: [token],
          }),
        });

        const neynarResult = await neynarResponse.json();

        return NextResponse.json({
          success: neynarResponse.ok,
          platform: "neynar",
          result: neynarResult,
        });
      }
    }

    // Default: Use Neynar to send notification by FID
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/frame/notify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": NEYNAR_API_KEY,
        },
        body: JSON.stringify({
          target_fids: [fidNum],
          notification: {
            title: sanitizedTitle,
            body: sanitizedBody,
            target_url: targetUrl || "https://vibefid.xyz",
          },
        }),
      }
    );

    const result = await response.json();

    return NextResponse.json({
      success: response.ok,
      result,
    });
  } catch (error: unknown) {
    // Security: Don't expose internal error details
    console.error("[send-notification] Error:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
