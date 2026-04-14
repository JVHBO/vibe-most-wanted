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
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { address, username, signature, message } = body as {
      address?: string;
      username?: string;
      signature?: string;
      message?: string;
    };

    if (!address) {
      return NextResponse.json({ error: "address is required" }, { status: 400 });
    }

    if (!ethers.isAddress(address)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    if (!signature || !message) {
      return NextResponse.json({ error: "Missing signature or message" }, { status: 401 });
    }

    const normalizedAddress = address.toLowerCase();
    const recovered = ethers.verifyMessage(message, signature).toLowerCase();
    if (recovered !== normalizedAddress) {
      return NextResponse.json({ error: "Signature does not match wallet address" }, { status: 401 });
    }

    if (!message.toLowerCase().includes(normalizedAddress)) {
      return NextResponse.json({ error: "Signed message address mismatch" }, { status: 401 });
    }

    const nonceMatch = message.match(/nonce:(\d+)/);
    if (!nonceMatch) {
      return NextResponse.json({ error: "Missing nonce in signed message" }, { status: 401 });
    }
    const signedNonce = Number(nonceMatch[1]);
    if (!Number.isInteger(signedNonce) || signedNonce < 0) {
      return NextResponse.json({ error: "Invalid signed nonce" }, { status: 401 });
    }

    const timestampMatch = message.match(/at (\d+)/);
    if (!timestampMatch) {
      return NextResponse.json({ error: "Missing timestamp in signed message" }, { status: 401 });
    }
    const signedAt = Number(timestampMatch[1]);
    if (!Number.isFinite(signedAt) || Math.abs(Date.now() - signedAt) > 5 * 60 * 1000) {
      return NextResponse.json({ error: "Expired signed message" }, { status: 401 });
    }

    if (!checkRateLimit(address.toLowerCase())) {
      return NextResponse.json({ error: "Too many requests. Please wait 10 seconds." }, { status: 429 });
    }

    const convex = new ConvexHttpClient(convexUrl);
    const currentNonce = await convex.query(api.auth.getNonce, { address: normalizedAddress });
    if (signedNonce !== currentNonce) {
      return NextResponse.json({ error: `Invalid nonce (expected ${currentNonce}, got ${signedNonce})` }, { status: 401 });
    }

    const profileId = await convex.mutation(api.profiles.upsertProfile, {
      address: normalizedAddress,
      username: (username || "").trim() || `user_${normalizedAddress.slice(2, 6)}${normalizedAddress.slice(-4)}`,
    });
    await convex.mutation(api.auth.consumeNonce, { address: normalizedAddress, nonce: signedNonce });

    return NextResponse.json({ success: true, profileId });
  } catch (error: any) {
    console.error("[wallet/profile-upsert] Error:", error, "data:", error?.data, "cause:", error?.cause);
    const message = String(error?.data || error?.message || "Failed to create profile");
    const status =
      message.includes("Too many requests") ? 429 :
      message.includes("Unauthorized") ? 401 :
      message.includes("Invalid") ? 400 :
      500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
