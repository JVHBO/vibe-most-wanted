import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "";
const HAATZ = "https://haatz.quilibrium.com/v2";

// GET /api/fid/quest-images?fids=1,2,3&channels=vibe-most-wanted,fidmfers
export async function GET(request: NextRequest) {
  const fidsParam = request.nextUrl.searchParams.get("fids");
  const channelsParam = request.nextUrl.searchParams.get("channels");

  const result: Record<string, { pfp_url: string; display_name: string; username: string }> = {};

  // Fetch user pfps by FID — Haatz primary
  if (fidsParam) {
    try {
      let users: any[] = [];
      const haatzRes = await fetch(`${HAATZ}/farcaster/user/bulk?fids=${fidsParam}`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);
      if (haatzRes?.ok) users = (await haatzRes.json()).users || [];

      // Fallback: Neynar
      if (!users.length) {
        const res = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fidsParam}`, {
          headers: { accept: "application/json", api_key: NEYNAR_API_KEY },
        }).catch(() => null);
        if (res?.ok) users = (await res.json()).users || [];
      }

      for (const user of users) {
        result[`fid_${user.fid}`] = {
          pfp_url: user.pfp_url || "",
          display_name: user.display_name || user.username || "",
          username: user.username || "",
        };
      }
    } catch (e) {
      console.error("[quest-images] Error fetching users:", e);
    }
  }

  // Fetch channel images — Haatz primary
  if (channelsParam) {
    const channelIds = channelsParam.split(",").filter(Boolean);
    await Promise.all(
      channelIds.map(async (channelId) => {
        try {
          let ch: any = null;
          const haatzRes = await fetch(`${HAATZ}/farcaster/channel?id=${channelId}`, {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(5000),
          }).catch(() => null);
          if (haatzRes?.ok) ch = (await haatzRes.json()).channel;

          // Fallback: Neynar
          if (!ch) {
            const res = await fetch(`https://api.neynar.com/v2/farcaster/channel?id=${channelId}`, {
              headers: { accept: "application/json", api_key: NEYNAR_API_KEY },
            }).catch(() => null);
            if (res?.ok) ch = (await res.json()).channel;
          }

          if (ch) {
            result[`channel_${channelId}`] = {
              pfp_url: ch.image_url || ch.icon_url || "",
              display_name: ch.name || channelId,
              username: channelId,
            };
          }
        } catch (e) {
          console.error(`[quest-images] Error fetching channel ${channelId}:`, e);
        }
      })
    );
  }

  return NextResponse.json(result);
}
