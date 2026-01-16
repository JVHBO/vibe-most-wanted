/**
 * API Route: GET /api/profile-nfts?address=0x...
 *
 * Fetches and caches NFTs for a player profile.
 * Server-side cache prevents duplicate Alchemy calls when multiple users
 * visit the same profile.
 *
 * Cache: 5 minutes per address
 */

import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

// Fire-and-forget stat tracking
function trackStat(key: string) {
  convex.mutation(api.apiStats.increment, { key }).catch(() => {});
}

// Server-side cache
const profileCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Alchemy config
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN || "base-mainnet";

// Collections to fetch (same as profile page)
const COLLECTIONS = [
  { id: "vibe", contract: "0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728", name: "VBMS" },
  { id: "gmvbrs", contract: "0xefe512e73ca7356c20a21aa9433bad5fc9342d46", name: "GM VBRS" },
  { id: "vibefid", contract: "0x60274A138d026E3cB337B40567100FdEC3127565", name: "VibeFID" },
  { id: "viberuto", contract: "0x70b4005a83a0b39325d27cf31bd4a7a30b15069f", name: "Viberuto" },
  { id: "meowverse", contract: "0xF0BF71bcD1F1aeb1bA6BE0AfBc38A1ABe9aa9150", name: "Meowverse" },
  { id: "viberotbangers", contract: "0x120c612d79a3187a3b8b4f4bb924cebe41eb407a", name: "Vibe Rot Bangers" },
  { id: "poorlydrawnpepes", contract: "0x8cb5b730943b25403ccac6d5fd649bd0cbde76d8", name: "Poorly Drawn Pepes" },
  { id: "teampothead", contract: "0x1f16007c7f08bf62ad37f8cfaf87e1c0cf8e2aea", name: "Team Pothead" },
  { id: "tarot", contract: "0x34d639c63384a00a2d25a58f73bea73856aa0550", name: "Tarot" },
  { id: "baseballcabal", contract: "0x3ff41af61d092657189b1d4f7d74d994514724bb", name: "Baseball Cabal" },
  { id: "vibefx", contract: "0xc7f2d8c035b2505f30a5417c0374ac0299d88553", name: "Vibe FX" },
  { id: "historyofcomputer", contract: "0x319b12e8eba0be2eae1112b357ba75c2c178b567", name: "History of Computer" },
  { id: "nothing", contract: "0xfeabae8bdb41b2ae507972180df02e70148b38e1", name: "$CU-MI-OH!" },
];

// RPC endpoints for balance check
const BASE_RPCS = [
  "https://base.llamarpc.com",
  "https://base-mainnet.public.blastapi.io",
  "https://mainnet.base.org",
];

// Check balance via RPC (free)
async function checkBalance(owner: string, contract: string): Promise<number> {
  const balanceOfSelector = "0x70a08231";
  const ownerPadded = owner.slice(2).toLowerCase().padStart(64, "0");
  const data = balanceOfSelector + ownerPadded;

  for (const rpc of BASE_RPCS) {
    trackStat("rpc_total");
    try {
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_call",
          params: [{ to: contract, data }, "latest"],
          id: 1,
        }),
        signal: AbortSignal.timeout(3000),
      });

      if (!res.ok) continue;
      const json = await res.json();
      if (json.error) continue;

      if (json.result === "0x" || json.result === "0x0" || json.result === "0x00") {
        trackStat("rpc_success");
        return 0;
      }

      if (json.result) {
        const balance = parseInt(json.result, 16);
        if (!isNaN(balance) && balance >= 0) {
          trackStat("rpc_success");
          return balance;
        }
      }
    } catch {
      continue;
    }
  }

  trackStat("rpc_failed");
  return -1; // All RPCs failed
}

// Fetch NFTs from Alchemy
async function fetchNFTsFromAlchemy(owner: string, contract: string): Promise<any[]> {
  const url = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${owner}&contractAddresses[]=${contract}&withMetadata=true&pageSize=100`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Alchemy error: ${res.status}`);
  }

  const data = await res.json();
  return data.ownedNfts || [];
}

// Find attribute in NFT
function findAttr(nft: any, name: string): string {
  const attrs = nft?.raw?.metadata?.attributes || nft?.metadata?.attributes || [];
  const attr = attrs.find((a: any) =>
    a.trait_type?.toLowerCase() === name.toLowerCase() ||
    a.name?.toLowerCase() === name.toLowerCase()
  );
  return attr?.value || "";
}

// Calculate power
function calcPower(nft: any, isVibeFID: boolean = false): number {
  if (isVibeFID) {
    const score = nft?.raw?.metadata?.neynarScore || nft?.metadata?.neynarScore;
    if (score) return Math.floor(score * 1000);
  }

  const powerAttr = findAttr(nft, "power") || findAttr(nft, "Power");
  if (powerAttr) return parseInt(powerAttr) || 0;

  return 0;
}

// Check if unopened
function isUnopened(nft: any): boolean {
  const rarity = findAttr(nft, "rarity") || findAttr(nft, "Rarity");
  const status = findAttr(nft, "status") || findAttr(nft, "Status");
  return rarity.toLowerCase() === "unopened" || status.toLowerCase() === "unopened";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const cacheKey = address.toLowerCase();

    // Check cache first
    const cached = profileCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      trackStat("profile_nfts_cache_hit");
      trackStat("profile_nfts_total");
      console.log(`📦 [profile-nfts] Cache hit for ${address.slice(0, 10)}...`);
      return NextResponse.json(cached.data);
    }

    trackStat("profile_nfts_total");
    console.log(`🔄 [profile-nfts] Fetching for ${address.slice(0, 10)}...`);

    // Step 1: Check balances via RPC (free) to avoid unnecessary Alchemy calls
    const balanceChecks = await Promise.all(
      COLLECTIONS.map(async (col) => {
        const balance = await checkBalance(address, col.contract);
        return { ...col, balance };
      })
    );

    // Only fetch from collections with NFTs (or RPC errors)
    const collectionsToFetch = balanceChecks.filter((c) => c.balance > 0 || c.balance === -1);

    const savedCalls = COLLECTIONS.length - collectionsToFetch.length;
    if (savedCalls > 0) {
      console.log(`💰 [profile-nfts] Saved ${savedCalls} Alchemy calls via RPC balance check`);
    }

    // Step 2: Fetch NFTs from Alchemy for collections with balance
    const allNfts: any[] = [];

    for (const col of collectionsToFetch) {
      try {
        trackStat("alchemy_calls");
        const nfts = await fetchNFTsFromAlchemy(address, col.contract);

        // Tag and process NFTs
        for (const nft of nfts) {
          if (isUnopened(nft)) continue;

          const isVibeFID = col.id === "vibefid";

          allNfts.push({
            tokenId: nft.tokenId,
            name: nft?.raw?.metadata?.name || nft?.name || `#${nft.tokenId}`,
            imageUrl: nft?.image?.cachedUrl || nft?.image?.thumbnailUrl || nft?.raw?.metadata?.image || "",
            rarity: findAttr(nft, "rarity"),
            wear: findAttr(nft, "wear"),
            foil: findAttr(nft, "foil"),
            power: calcPower(nft, isVibeFID),
            collection: col.id,
            collectionName: col.name,
          });
        }
      } catch (error) {
        console.error(`[profile-nfts] Error fetching ${col.name}:`, error);
      }
    }

    // Step 3: Get free cards from Convex
    let freeCards: any[] = [];
    try {
      freeCards = await convex.query(api.cardPacks.getPlayerCards, { address });
      if (freeCards && freeCards.length > 0) {
        for (const card of freeCards) {
          allNfts.push({
            tokenId: card.cardId,
            name: card.name || `FREE ${card.rarity} Card`,
            imageUrl: card.imageUrl,
            rarity: card.rarity,
            wear: card.wear,
            foil: card.foil || "None",
            power: card.power,
            collection: "nothing",
            collectionName: "Free Cards",
            isFreeCard: true,
          });
        }
      }
    } catch (error) {
      console.warn("[profile-nfts] Failed to get free cards:", error);
    }

    const responseData = {
      success: true,
      address: cacheKey,
      totalCards: allNfts.length,
      cards: allNfts,
      cached: false,
      timestamp: Date.now(),
    };

    // Save to cache
    profileCache.set(cacheKey, { data: { ...responseData, cached: true }, timestamp: Date.now() });
    console.log(`💾 [profile-nfts] Cached ${allNfts.length} cards for ${address.slice(0, 10)}...`);

    // Cleanup old cache entries
    if (profileCache.size > 500) {
      const now = Date.now();
      for (const [key, value] of profileCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          profileCache.delete(key);
        }
      }
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("[profile-nfts] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch NFTs" },
      { status: 500 }
    );
  }
}
