/**
 * API Route: GET /api/nfts/[address]
 *
 * Unified NFT fetching endpoint with Convex caching.
 * Reduces Alchemy calls by ~90% using server-side cache.
 *
 * Flow:
 * 1. Check Convex cache for each collection
 * 2. If fresh (< 10 min), return cached data
 * 3. If stale/miss, fetch from Alchemy
 * 4. Save to Convex cache
 * 5. Return combined results
 *
 * Query params:
 * - collections: comma-separated collection IDs (optional, defaults to all)
 * - refresh: "true" to force refresh (bypass cache)
 */

import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

// Alchemy config
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN || "base-mainnet";

// Cache TTL
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Collections config
const COLLECTIONS: Record<string, { contract: string; name: string }> = {
  vibe: { contract: "0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728", name: "VBMS" },
  vibefid: { contract: "0x60274A138d026E3cB337B40567100FdEC3127565", name: "VibeFID" },
  gmvbrs: { contract: "0xefe512e73ca7356c20a21aa9433bad5fc9342d46", name: "GM VBRS" },
  viberuto: { contract: "0x70b4005a83a0b39325d27cf31bd4a7a30b15069f", name: "Viberuto" },
  meowverse: { contract: "0xF0BF71bcD1F1aeb1bA6BE0AfBc38A1ABe9aa9150", name: "Meowverse" },
  viberotbangers: { contract: "0x120c612d79a3187a3b8b4f4bb924cebe41eb407a", name: "Vibe Rot Bangers" },
  poorlydrawnpepes: { contract: "0x8cb5b730943b25403ccac6d5fd649bd0cbde76d8", name: "Poorly Drawn Pepes" },
  teampothead: { contract: "0x1f16007c7f08bf62ad37f8cfaf87e1c0cf8e2aea", name: "Team Pothead" },
  tarot: { contract: "0x34d639c63384a00a2d25a58f73bea73856aa0550", name: "Tarot" },
  baseballcabal: { contract: "0x3ff41af61d092657189b1d4f7d74d994514724bb", name: "Baseball Cabal" },
  vibefx: { contract: "0xc7f2d8c035b2505f30a5417c0374ac0299d88553", name: "Vibe FX" },
  historyofcomputer: { contract: "0x319b12e8eba0be2eae1112b357ba75c2c178b567", name: "History of Computer" },
  cumioh: { contract: "0xfeabae8bdb41b2ae507972180df02e70148b38e1", name: "$CU-MI-OH!" },
};

// Fire-and-forget stat tracking
function trackStat(key: string) {
  convex.mutation(api.apiStats.increment, { key }).catch(() => {});
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

// Fetch from Alchemy
async function fetchFromAlchemy(owner: string, contract: string): Promise<any[]> {
  const url = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${owner}&contractAddresses[]=${contract}&withMetadata=true&pageSize=100`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Alchemy error: ${res.status}`);
  }

  const data = await res.json();
  return data.ownedNfts || [];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const { searchParams } = new URL(request.url);

    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const owner = address.toLowerCase();
    const forceRefresh = searchParams.get("refresh") === "true";
    const requestedCollections = searchParams.get("collections")?.split(",") || Object.keys(COLLECTIONS);

    trackStat("nfts_api_total");

    const allNfts: any[] = [];
    const stats = {
      cacheHits: 0,
      cacheMisses: 0,
      alchemyCalls: 0,
      savedToCache: 0,
    };

    // Process each collection
    for (const collectionId of requestedCollections) {
      const collection = COLLECTIONS[collectionId];
      if (!collection) continue;

      // 1. Check Convex cache first (unless force refresh)
      if (!forceRefresh) {
        try {
          const cached = await convex.query(api.nftCache.getNftsByCollection, {
            ownerAddress: owner,
            collectionId,
            maxAgeMs: CACHE_TTL_MS,
          });

          if (cached && cached.fresh) {
            stats.cacheHits++;
            trackStat("nfts_cache_hit");
            console.log(`📦 [nfts] Cache HIT for ${collectionId}: ${cached.nfts.length} NFTs`);
            allNfts.push(...cached.nfts);
            continue;
          }
        } catch (error) {
          console.warn(`⚠️ [nfts] Cache check failed for ${collectionId}:`, error);
        }
      }

      // 2. Cache miss or stale - fetch from Alchemy
      stats.cacheMisses++;
      stats.alchemyCalls++;
      trackStat("alchemy_calls");

      try {
        console.log(`🔄 [nfts] Fetching ${collectionId} from Alchemy...`);
        const rawNfts = await fetchFromAlchemy(owner, collection.contract);

        // Process NFTs
        const isVibeFID = collectionId === "vibefid";
        const processedNfts: any[] = [];

        for (const nft of rawNfts) {
          if (isUnopened(nft)) continue;

          const processed = {
            tokenId: nft.tokenId,
            name: nft?.raw?.metadata?.name || nft?.name || `#${nft.tokenId}`,
            imageUrl: nft?.image?.cachedUrl || nft?.image?.originalUrl || nft?.raw?.metadata?.image || "",
            rarity: findAttr(nft, "rarity"),
            wear: findAttr(nft, "wear"),
            foil: findAttr(nft, "foil"),
            power: calcPower(nft, isVibeFID),
            collection: collectionId,
            character: findAttr(nft, "character"),
          };
          processedNfts.push(processed);
        }

        // 3. Save to Convex cache
        if (processedNfts.length > 0) {
          try {
            await convex.mutation(api.nftCache.saveNftsForOwner, {
              ownerAddress: owner,
              collectionId,
              contractAddress: collection.contract,
              nfts: processedNfts,
            });
            stats.savedToCache += processedNfts.length;
            console.log(`💾 [nfts] Cached ${processedNfts.length} ${collectionId} NFTs`);
          } catch (error) {
            console.warn(`⚠️ [nfts] Failed to cache ${collectionId}:`, error);
          }
        } else {
          // Mark empty collection
          try {
            await convex.mutation(api.nftCache.markEmptyCollection, {
              ownerAddress: owner,
              collectionId,
            });
          } catch (error) {
            // Ignore
          }
        }

        allNfts.push(...processedNfts);

      } catch (error) {
        console.error(`❌ [nfts] Error fetching ${collectionId}:`, error);
        // Continue with other collections
      }
    }

    // Get free cards from Convex
    try {
      const freeCards = await convex.query(api.cardPacks.getPlayerCards, { address: owner });
      if (freeCards && freeCards.length > 0) {
        for (const card of freeCards) {
          allNfts.push({
            tokenId: card.cardId,
            name: `${card.rank} of ${card.suit}`,
            imageUrl: card.imageUrl,
            rarity: card.rarity,
            wear: card.wear,
            foil: card.foil || "None",
            power: card.power,
            collection: "nothing",
            isFreeCard: true,
          });
        }
      }
    } catch (error) {
      console.warn("[nfts] Failed to get free cards:", error);
    }

    const response = {
      success: true,
      address: owner,
      totalNfts: allNfts.length,
      nfts: allNfts,
      stats,
      timestamp: Date.now(),
    };

    console.log(`✅ [nfts] ${owner.slice(0, 10)}...: ${allNfts.length} NFTs (${stats.cacheHits} cache, ${stats.alchemyCalls} alchemy)`);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error("[nfts] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch NFTs" },
      { status: 500 }
    );
  }
}
