import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 10000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const last = rateLimitMap.get(key);
  if (last && now - last < RATE_LIMIT_MS) return false;
  rateLimitMap.set(key, now);
  if (rateLimitMap.size > 1000) {
    const cutoff = now - RATE_LIMIT_MS * 2;
    for (const [k, t] of rateLimitMap.entries()) {
      if (t < cutoff) rateLimitMap.delete(k);
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
    const { address } = body as { address?: string };

    if (!address) {
      return NextResponse.json({ error: "address is required" }, { status: 400 });
    }

    if (!ethers.isAddress(address)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    if (!checkRateLimit(address.toLowerCase())) {
      return NextResponse.json({ error: "Too many requests. Please wait 10 seconds." }, { status: 429 });
    }

    const convex = new ConvexHttpClient(convexUrl);
    const profileId = await convex.mutation(api.profiles.upsertProfileFromWallet, {
      adminKey: internalSecret,
      address: address.toLowerCase(),
    });

    return NextResponse.json({ success: true, profileId });
  } catch (error: any) {
    console.error("[wallet/profile-upsert] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create profile" },
      { status: 500 }
    );
  }
}
