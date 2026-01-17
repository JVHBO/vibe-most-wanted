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

// Collections to fetch - only the 6 NFT collections used in the game
// (Nothing/Free cards come from Convex, not blockchain)
const COLLECTIONS = [
  { id: "vibe", contract: "0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728", name: "VBMS" },
  { id: "vibefid", contract: "0x60274A138d026E3cB337B40567100FdEC3127565", name: "VibeFID" },
  { id: "gmvbrs", contract: "0xefe512e73ca7356c20a21aa9433bad5fc9342d46", name: "GM VBRS" },
  { id: "viberuto", contract: "0x70b4005a83a0b39325d27cf31bd4a7a30b15069f", name: "Viberuto" },
  { id: "meowverse", contract: "0xF0BF71bcD1F1aeb1bA6BE0AfBc38A1ABe9aa9150", name: "Meowverse" },
  { id: "viberotbangers", contract: "0x120c612d79a3187a3b8b4f4bb924cebe41eb407a", name: "Vibe Rot Bangers" },
];

// RPC endpoints for balance check - 12 RPCs for maximum reliability
const BASE_RPCS = [
  "https://base.llamarpc.com",
  "https://base-mainnet.public.blastapi.io",
  "https://mainnet.base.org",
  "https://base.meowrpc.com",
  "https://1rpc.io/base",
  "https://base.drpc.org",
  "https://base.publicnode.com",
  "https://base-rpc.publicnode.com",
  "https://rpc.ankr.com/base",
  "https://base.gateway.tenderly.co",
  "https://gateway.tenderly.co/public/base",
  "https://base.blockpi.network/v1/rpc/public",
];

// Basescan API (different format)
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "1ZFQ27H4QDE5ESCVWPIJUNTFP3776Y1AJ5";

// Balance cache - avoid re-checking same address/contract combo
const balanceCache = new Map<string, { balance: number; timestamp: number }>();
const BALANCE_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Single RPC attempt with timeout
async function tryRpc(rpc: string, data: string, contract: string, timeout: number): Promise<number | null> {
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
      signal: AbortSignal.timeout(timeout),
    });

    if (!res.ok) return null;
    const json = await res.json();
    if (json.error) return null;

    if (json.result === "0x" || json.result === "0x0" || json.result === "0x00") {
      return 0;
    }

    if (json.result) {
      const balance = parseInt(json.result, 16);
      if (!isNaN(balance) && balance >= 0) {
        return balance;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Try Basescan API (different format - REST API)
async function tryBasescan(owner: string, contract: string): Promise<number | null> {
  const balanceOfSelector = "0x70a08231";
  const ownerPadded = owner.slice(2).toLowerCase().padStart(64, "0");
  const data = balanceOfSelector + ownerPadded;

  try {
    const url = `https://api.basescan.org/api?module=proxy&action=eth_call&to=${contract}&data=${data}&tag=latest&apikey=${BASESCAN_API_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!res.ok) return null;
    const json = await res.json();

    if (json.error || json.message === "NOTOK") return null;

    const result = json.result;
    if (result === "0x" || result === "0x0" || result === "0x00") {
      return 0;
    }

    if (result) {
      const balance = parseInt(result, 16);
      if (!isNaN(balance) && balance >= 0) {
        return balance;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Try all RPCs in parallel, return first success
async function tryAllRpcsParallel(data: string, contract: string, owner: string, timeout: number): Promise<number | null> {
  const rpcPromises = BASE_RPCS.map(rpc => tryRpc(rpc, data, contract, timeout));
  const basescanPromise = tryBasescan(owner, contract);
  const allPromises = [...rpcPromises, basescanPromise];

  return new Promise<number | null>((resolve) => {
    let pending = allPromises.length;
    let resolved = false;

    allPromises.forEach(promise => {
      promise.then(result => {
        if (!resolved && result !== null) {
          resolved = true;
          resolve(result);
        } else {
          pending--;
          if (pending === 0 && !resolved) {
            resolve(null);
          }
        }
      }).catch(() => {
        pending--;
        if (pending === 0 && !resolved) {
          resolve(null);
        }
      });
    });
  });
}

// Check balance via RPC (free) - with cache and retry for 100% reliability
async function checkBalance(owner: string, contract: string): Promise<number> {
  const cacheKey = `${owner.toLowerCase()}_${contract.toLowerCase()}`;

  // Check cache first
  const cached = balanceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < BALANCE_CACHE_TTL) {
    return cached.balance;
  }

  const balanceOfSelector = "0x70a08231";
  const ownerPadded = owner.slice(2).toLowerCase().padStart(64, "0");
  const data = balanceOfSelector + ownerPadded;

  trackStat("rpc_total");

  // First attempt - 5s timeout, all 13 sources in parallel
  let result = await tryAllRpcsParallel(data, contract, owner, 5000);

  if (result !== null) {
    trackStat("rpc_success");
    balanceCache.set(cacheKey, { balance: result, timestamp: Date.now() });
    return result;
  }

  // Retry with longer timeout - 10s
  result = await tryAllRpcsParallel(data, contract, owner, 10000);

  if (result !== null) {
    trackStat("rpc_success");
    balanceCache.set(cacheKey, { balance: result, timestamp: Date.now() });
    return result;
  }

  // All 13 sources failed twice - extremely rare
  trackStat("rpc_failed");
  return -1;
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
