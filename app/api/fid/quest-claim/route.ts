import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const VMW_CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "";
const NEYNAR_BASE = "https://api.neynar.com/v2";
const VMW_SECRET = process.env.VMW_INTERNAL_SECRET || "";

const convex = new ConvexHttpClient(VMW_CONVEX_URL);

async function verifyFollowMe(creatorFid: number, completerFid: number): Promise<boolean> {
  // Check if completer follows creator
  const resp = await fetch(
    `${NEYNAR_BASE}/farcaster/user/bulk?fids=${creatorFid}&viewer_fid=${completerFid}`,
    { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
  );
  if (!resp.ok) return false;
  const data = await resp.json();
  return data.users?.[0]?.viewer_context?.following === true;
}

async function verifyJoinChannel(channelId: string, completerFid: number): Promise<boolean> {
  // Check channel membership
  const resp = await fetch(
    `${NEYNAR_BASE}/farcaster/channel/member/list?channel_id=${encodeURIComponent(channelId)}&fid=${completerFid}&limit=1`,
    { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
  );
  if (!resp.ok) return false;
  const data = await resp.json();
  return Array.isArray(data.members) && data.members.length > 0;
}

async function verifyRtCast(castUrl: string, completerFid: number): Promise<boolean> {
  // Check if completer recasted the cast
  const isUrl = castUrl.startsWith("http");
  const identifierType = isUrl ? "url" : "hash";
  const encoded = isUrl ? encodeURIComponent(castUrl) : castUrl;
  const resp = await fetch(
    `${NEYNAR_BASE}/farcaster/cast?identifier=${encoded}&type=${identifierType}&viewer_fid=${completerFid}`,
    { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
  );
  if (!resp.ok) return false;
  const data = await resp.json();
  return data.cast?.viewer_context?.recasted === true;
}

async function verifyUseMiniapp(completerAddress: string): Promise<boolean> {
  // Check if completer has recent activity (last 7 days) in VMW
  const profile = await convex.query(api.profiles.getProfile, { address: completerAddress });
  if (!profile) return false;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return (profile.lastActiveDate || 0) > weekAgo;
}

/**
 * POST /api/fid/quest-claim
 * Body: { questId, completerAddress, completerFid, questType, targetUrl }
 * Verifies action via Neynar and pays reward.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questId, completerAddress, completerFid, questType, targetUrl } = body;

    if (!questId || !completerAddress || !completerFid || !questType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!NEYNAR_API_KEY) {
      return NextResponse.json({ error: "Neynar API not configured" }, { status: 500 });
    }

    // Get quest details first to validate
    const quests = await convex.query(api.playerQuests.getActiveQuests, { limit: 1 });
    // We'll just proceed — payQuestReward will validate everything server-side

    // Verify the action via Neynar
    let verified = false;
    let verificationError = "";

    try {
      switch (questType) {
        case "follow_me": {
          // targetUrl is the creator's FID as string or profile URL
          // Extract FID from targetUrl or use creatorFid from quest
          // Get quest to get creatorFid
          const activeQuests = await convex.query(api.playerQuests.getQuestsForCompleter, {
            completerFid,
            limit: 50,
          });
          const quest = activeQuests.find((q: any) => q._id === questId);
          if (!quest) {
            return NextResponse.json({ error: "Quest not found or not eligible" }, { status: 404 });
          }
          verified = await verifyFollowMe(quest.creatorFid, completerFid);
          if (!verified) verificationError = "You haven't followed this user yet";
          break;
        }
        case "join_channel": {
          // targetUrl is the channel ID (e.g. "vibe-most-wanted")
          const channelId = targetUrl.replace(/^\//, "").split("/").pop() || targetUrl;
          verified = await verifyJoinChannel(channelId, completerFid);
          if (!verified) verificationError = "You haven't joined this channel yet";
          break;
        }
        case "rt_cast": {
          verified = await verifyRtCast(targetUrl, completerFid);
          if (!verified) verificationError = "You haven't recasted this cast yet";
          break;
        }
        case "use_miniapp": {
          verified = await verifyUseMiniapp(completerAddress);
          if (!verified) verificationError = "No recent activity in the miniapp (last 7 days)";
          break;
        }
        default:
          return NextResponse.json({ error: "Unknown quest type" }, { status: 400 });
      }
    } catch (verifyErr: any) {
      console.error("[quest-claim] Verification error:", verifyErr);
      return NextResponse.json({ error: "Verification failed: " + verifyErr.message }, { status: 500 });
    }

    if (!verified) {
      return NextResponse.json({ success: false, error: verificationError }, { status: 400 });
    }

    // Pay the reward via secured Convex mutation
    const result = await convex.mutation(api.playerQuests.payQuestReward, {
      secret: VMW_SECRET,
      questId: questId as Id<"playerQuests">,
      completerAddress,
      completerFid,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[quest-claim] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
