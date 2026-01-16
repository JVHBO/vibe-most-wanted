/**
 * API Route: GET /api/gift-nfts?address=0x...
 *
 * Fetches user's NFTs from giftable collections (LTC collections).
 * Excludes: AFCL, VibeFID, Nothing, Custom
 *
 * 🚀 OPTIMIZATION (Jan 2026): Added server-side caching + logging
 * - Cache results for 5 minutes per address
 * - Log requests to track usage patterns
 */

import { NextResponse } from "next/server";
import { fetchNFTs, getImage } from "@/lib/nft/fetcher";
import { findAttr } from "@/lib/nft/attributes";
import { COLLECTIONS, type CollectionId } from "@/lib/collections";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Convex client for stats tracking
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

// Fire-and-forget stat tracking (don't await, don't block response)
function trackStat(key: string) {
  convex.mutation(api.apiStats.increment, { key }).catch(() => {});
}

// Collections that can be gifted via VibeMail (only active collections)
const GIFTABLE_COLLECTIONS: CollectionId[] = [
  'vibe',           // $VBMS
  'gmvbrs',         // GM VBRS
  'viberuto',       // Viberuto
  'meowverse',      // Meowverse
  'viberotbangers', // Vibe Rot Bangers
];

// 🚀 SERVER-SIDE CACHE (5 min TTL)
const serverCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// 📊 REQUEST TRACKING (for debugging Alchemy usage)
let requestCount = 0;
let lastResetTime = Date.now();

function logRequest(address: string, cached: boolean) {
  requestCount++;
  const now = Date.now();
  const hoursSinceReset = (now - lastResetTime) / (1000 * 60 * 60);

  // Reset counter every hour
  if (hoursSinceReset >= 1) {
    console.log(`📊 [gift-nfts] HOURLY STATS: ${requestCount} requests in last hour`);
    requestCount = 1;
    lastResetTime = now;
  }

  console.log(`📡 [gift-nfts] Request #${requestCount} for ${address.slice(0, 10)}... (${cached ? 'CACHE HIT' : 'ALCHEMY CALL'})`);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    const cacheKey = address.toLowerCase();

    // 🚀 CHECK SERVER CACHE FIRST
    const cached = serverCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      logRequest(address, true);
      trackStat("gift_nfts_total");
      trackStat("gift_nfts_cache_hit");
      return NextResponse.json(cached.data);
    }

    logRequest(address, false);
    trackStat("gift_nfts_total");
    trackStat("alchemy_calls");

    // Fetch NFTs from each giftable collection
    const allNfts: any[] = [];

    for (const collectionId of GIFTABLE_COLLECTIONS) {
      const collection = COLLECTIONS[collectionId];
      if (!collection || !collection.enabled || !collection.contractAddress) {
        continue;
      }

      try {
        const nfts = await fetchNFTs(address, collection.contractAddress);

        // Tag each NFT with collection info
        const taggedNfts = nfts.map(nft => ({
          ...nft,
          collectionId,
          collectionName: collection.displayName,
          contractAddress: collection.contractAddress,
        }));

        allNfts.push(...taggedNfts);
      } catch (error) {
        console.error(`Error fetching ${collectionId}:`, error);
        // Continue with other collections
      }
    }

    // Process NFTs to get image URLs and filter out unopened
    const processed = await Promise.all(
      allNfts.map(async (nft) => {
        try {
          const rarity = findAttr(nft, 'rarity') || findAttr(nft, 'Rarity') || '';
          const status = findAttr(nft, 'status') || findAttr(nft, 'Status') || '';

          // Skip unopened cards
          if (rarity.toLowerCase() === 'unopened' || status.toLowerCase() === 'unopened') {
            return null;
          }

          const imageUrl = await getImage(nft, nft.collectionId);
          const name = nft?.raw?.metadata?.name || nft?.name || `#${nft.tokenId}`;

          return {
            tokenId: nft.tokenId,
            name,
            imageUrl,
            rarity,
            collectionId: nft.collectionId,
            collectionName: nft.collectionName,
            contractAddress: nft.contractAddress,
          };
        } catch (error) {
          console.error(`Error processing NFT ${nft.tokenId}:`, error);
          return null;
        }
      })
    );

    // Filter out null values and sort by collection
    const validNfts = processed.filter(Boolean);

    // Group by collection
    const groupedByCollection: Record<string, typeof validNfts> = {};
    for (const nft of validNfts) {
      if (!nft) continue;
      const collectionId = nft.collectionId;
      if (!groupedByCollection[collectionId]) {
        groupedByCollection[collectionId] = [];
      }
      groupedByCollection[collectionId].push(nft);
    }

    // Build response
    const responseData = {
      success: true,
      totalNfts: validNfts.length,
      collections: groupedByCollection,
      collectionsInfo: GIFTABLE_COLLECTIONS.map(id => ({
        id,
        name: COLLECTIONS[id].displayName,
        count: groupedByCollection[id]?.length || 0,
      })).filter(c => c.count > 0),
    };

    // 🚀 SAVE TO SERVER CACHE
    serverCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
    console.log(`💾 [gift-nfts] Cached ${validNfts.length} NFTs for ${address.slice(0, 10)}...`);

    // Clean old cache entries (prevent memory leak)
    if (serverCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of serverCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          serverCache.delete(key);
        }
      }
    }

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error("Error fetching gift NFTs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch NFTs" },
      { status: 500 }
    );
  }
}
