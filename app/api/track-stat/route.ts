/**
 * API Route: POST /api/track-stat
 *
 * Fire-and-forget stat tracking from client-side code
 * Used by lib/nft/fetcher.ts to track Alchemy usage
 */

import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

let convex: ConvexHttpClient | null = null;

function getConvex() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;
  if (!convex) convex = new ConvexHttpClient(convexUrl);
  return convex;
}

// Valid stat keys (prevent spam)
const VALID_KEYS = [
  "alchemy_calls",
  "alchemy_cache_hit",
  "rpc_total",
  "rpc_success",
  "rpc_failed",
  "fetch_nfts_total",
  "balance_check_total",
  "balance_check_cached",
  "wield_enrich_attempt",
  "wield_enrich_success",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entries =
      body?.stats && typeof body.stats === "object"
        ? Object.entries(body.stats).map(([key, amount]) => ({ key, amount }))
        : [{ key: body?.key, amount: body?.amount ?? 1 }];

    const validEntries = entries
      .filter(({ key, amount }) =>
        typeof key === "string" &&
        VALID_KEYS.includes(key) &&
        typeof amount === "number" &&
        Number.isFinite(amount) &&
        amount > 0
      )
      .map(({ key, amount }) => ({ key: key as string, amount: Math.min(Math.floor(amount as number), 1000) }));

    if (validEntries.length === 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const client = getConvex();
    if (!client) {
      return NextResponse.json({ error: "Convex not configured" }, { status: 500 });
    }

    for (const { key, amount } of validEntries) {
      client.mutation(api.apiStats.increment, { key, amount }).catch(() => {});
    }

    return NextResponse.json({ ok: true, count: validEntries.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
