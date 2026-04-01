import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getUserByFid } from "@/lib/neynar";

const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 10000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(key);

  if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
    return false;
  }

  rateLimitMap.set(key, now);

  if (rateLimitMap.size > 1000) {
    const cutoff = now - RATE_LIMIT_MS * 2;
    for (const [storedKey, time] of rateLimitMap.entries()) {
      if (time < cutoff) {
        rateLimitMap.delete(storedKey);
      }
    }
  }

  return true;
}

export async function POST(request: NextRequest) {
  try {
    const internalSecret = process.env.VMW_INTERNAL_SECRET;
    if (!internalSecret) {
      return NextResponse.json({ error: "VMW_INTERNAL_SECRET not configured" }, { status: 500 });
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { address, fid } = body as {
      address?: string;
      fid?: number | string;
    };

    if (!address || fid === undefined || fid === null) {
      return NextResponse.json({ error: "address and fid are required" }, { status: 400 });
    }

    if (!ethers.isAddress(address)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const parsedFid = Number(fid);

    if (!Number.isInteger(parsedFid) || parsedFid <= 0) {
      return NextResponse.json({ error: "Invalid Farcaster FID" }, { status: 400 });
    }

    if (!checkRateLimit(`${normalizedAddress}:${parsedFid}`)) {
      return NextResponse.json({ error: "Too many requests. Please wait 10 seconds." }, { status: 429 });
    }

    const user = await getUserByFid(parsedFid);
    if (!user) {
      return NextResponse.json({ error: `FID ${parsedFid} not found on Farcaster` }, { status: 404 });
    }

    const verifiedAddresses = (user.verified_addresses?.eth_addresses || []).map((item) => item.toLowerCase());
    if (!verifiedAddresses.includes(normalizedAddress)) {
      return NextResponse.json(
        {
          error: "Connected wallet is not verified on this Farcaster account",
          fid: parsedFid,
          verifiedAddresses: user.verified_addresses?.eth_addresses || [],
        },
        { status: 403 }
      );
    }

    const convex = new ConvexHttpClient(convexUrl);
    const profileId = await convex.mutation(api.profiles.upsertProfileFromFarcaster, {
      adminKey: internalSecret,
      address: normalizedAddress,
      fid: parsedFid,
      username: user.username || `fid${parsedFid}`,
      displayName: user.display_name || undefined,
      pfpUrl: user.pfp_url || undefined,
    });

    return NextResponse.json({ success: true, profileId });
  } catch (error: any) {
    console.error("[farcaster/profile-upsert] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create/update profile" },
      { status: 500 }
    );
  }
}
