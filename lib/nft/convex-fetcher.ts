/**
 * Convex-First NFT Fetcher
 *
 * Primary source of truth for NFT ownership.
 * Falls back to Alchemy only for initial sync.
 *
 * Flow:
 * 1. Query Convex for user's NFTs
 * 2. If found, return immediately (no Alchemy call)
 * 3. If not found, trigger sync from Alchemy
 * 4. Return Convex data after sync
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { CardWithMetadata } from "@/lib/types/card";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";

// Singleton Convex client for non-React contexts
let convexClient: ConvexHttpClient | null = null;

function getConvexClient(): ConvexHttpClient {
  if (!convexClient) {
    convexClient = new ConvexHttpClient(convexUrl);
  }
  return convexClient;
}

/**
 * Convert Convex NFT record to CardWithMetadata format
 */
function convexNftToCard(nft: any): CardWithMetadata {
  return {
    tokenId: nft.tokenId,
    name: nft.name,
    imageUrl: nft.imageUrl,
    rarity: nft.rarity,
    wear: nft.wear,
    foil: nft.foil,
    power: nft.power,
    character: nft.character,
    collection: nft.collectionId,
    ownerAddress: nft.ownerAddress,
    contractAddress: nft.contractAddress,
  };
}

/**
 * Fetch NFTs from Convex database
 * Returns null if no data exists (needs initial sync)
 */
export async function fetchNFTsFromConvex(
  ownerAddress: string
): Promise<CardWithMetadata[] | null> {
  try {
    const convex = getConvexClient();
    const owner = ownerAddress.toLowerCase();

    // Check if we have any data for this owner
    const hasData = await convex.query(api.nftOwnership.hasNFTDataForOwner, {
      ownerAddress: owner,
    });

    if (!hasData) {
      console.log(`[Convex] No NFT data for ${owner.slice(0, 8)}... - needs sync`);
      return null; // Signal that sync is needed
    }

    // Fetch all NFTs from Convex
    const nfts = await convex.query(api.nftOwnership.getNFTsByOwner, {
      ownerAddress: owner,
    });

    console.log(`[Convex] Found ${nfts.length} NFTs for ${owner.slice(0, 8)}...`);

    // Convert to Card format
    return nfts.map(convexNftToCard);

  } catch (error) {
    console.error("[Convex] Error fetching NFTs:", error);
    return null;
  }
}

/**
 * Fetch NFTs from Convex for multiple addresses (linked wallets)
 */
export async function fetchNFTsFromConvexMultiple(
  ownerAddresses: string[]
): Promise<CardWithMetadata[] | null> {
  try {
    const convex = getConvexClient();
    const addresses = ownerAddresses.map(a => a.toLowerCase());

    // Check if we have data for any address
    let hasAnyData = false;
    for (const addr of addresses) {
      const hasData = await convex.query(api.nftOwnership.hasNFTDataForOwner, {
        ownerAddress: addr,
      });
      if (hasData) {
        hasAnyData = true;
        break;
      }
    }

    if (!hasAnyData) {
      console.log(`[Convex] No NFT data for any linked wallet - needs sync`);
      return null;
    }

    // Fetch all NFTs
    const nfts = await convex.query(api.nftOwnership.getNFTsByOwners, {
      ownerAddresses: addresses,
    });

    console.log(`[Convex] Found ${nfts.length} NFTs across ${addresses.length} wallets`);

    return nfts.map(convexNftToCard);

  } catch (error) {
    console.error("[Convex] Error fetching NFTs for multiple addresses:", error);
    return null;
  }
}

/**
 * Get NFT counts from Convex (for quick stats)
 */
export async function getNFTCountsFromConvex(
  ownerAddress: string
): Promise<{ totalCount: number; totalPower: number; byCollection: Record<string, number> } | null> {
  try {
    const convex = getConvexClient();
    const owner = ownerAddress.toLowerCase();

    const counts = await convex.query(api.nftOwnership.getNFTCountsByOwner, {
      ownerAddress: owner,
    });

    return counts;

  } catch (error) {
    console.error("[Convex] Error fetching NFT counts:", error);
    return null;
  }
}

/**
 * Sync NFTs from Alchemy to Convex for a specific owner
 * Called when Convex has no data for the owner
 */
export async function syncNFTsToConvex(
  ownerAddress: string,
  nfts: any[],
  collectionId: string
): Promise<boolean> {
  try {
    const convex = getConvexClient();
    const owner = ownerAddress.toLowerCase();

    // Transform NFTs to Convex format
    const nftsToSync = nfts.map(nft => ({
      contractAddress: nft.contract?.address?.toLowerCase() || "",
      tokenId: nft.tokenId,
      ownerAddress: owner,
      collectionId,
      name: nft.raw?.metadata?.name || nft.name || `#${nft.tokenId}`,
      imageUrl: nft.imageUrl || nft.image?.cachedUrl || nft.raw?.metadata?.image || "",
      rarity: findAttrInNft(nft, "rarity") || "Common",
      wear: findAttrInNft(nft, "wear"),
      foil: findAttrInNft(nft, "foil"),
      power: nft.power || 0,
      character: findAttrInNft(nft, "character"),
      attributes: nft.raw?.metadata?.attributes,
    }));

    // Bulk upsert to Convex
    await convex.mutation(api.nftOwnership.bulkUpsertNFTs, {
      nfts: nftsToSync,
    });

    console.log(`[Convex] Synced ${nftsToSync.length} NFTs for ${owner.slice(0, 8)}...`);
    return true;

  } catch (error) {
    console.error("[Convex] Error syncing NFTs:", error);
    return false;
  }
}

/**
 * Helper to find attribute in NFT metadata
 */
function findAttrInNft(nft: any, key: string): string | undefined {
  const attrs = nft.raw?.metadata?.attributes || nft.attributes || [];
  if (!Array.isArray(attrs)) return undefined;

  const keyLower = key.toLowerCase();
  const attr = attrs.find((a: any) => {
    const traitType = (a.trait_type || a.traitType || "").toLowerCase();
    return traitType === keyLower;
  });

  return attr?.value;
}

/**
 * Clear Convex cache for an owner (for debugging/testing)
 */
export async function clearConvexCacheForOwner(ownerAddress: string): Promise<boolean> {
  try {
    const convex = getConvexClient();
    const owner = ownerAddress.toLowerCase();

    await convex.mutation(api.nftOwnership.clearNFTsForOwner, {
      ownerAddress: owner,
    });

    console.log(`[Convex] Cleared cache for ${owner.slice(0, 8)}...`);
    return true;

  } catch (error) {
    console.error("[Convex] Error clearing cache:", error);
    return false;
  }
}
