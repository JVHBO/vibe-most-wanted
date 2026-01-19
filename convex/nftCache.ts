/**
 * NFT Cache System
 *
 * Server-side cache for NFT ownership data.
 * Reduces Alchemy API calls by caching NFT data in Convex.
 *
 * Flow:
 * 1. Frontend calls getNftsForOwner
 * 2. If cache fresh (< 10 min), return from Convex
 * 3. If cache stale/miss, frontend fetches from Alchemy
 * 4. Frontend calls saveNftsForOwner to update cache
 *
 * Benefits:
 * - Works server-side (unlike localStorage)
 * - Shared across all users viewing same profile
 * - Survives browser restarts/different devices
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// NFT data shape for caching
const nftDataValidator = v.object({
  tokenId: v.string(),
  name: v.string(),
  imageUrl: v.string(),
  rarity: v.string(),
  wear: v.optional(v.string()),
  foil: v.optional(v.string()),
  power: v.number(),
  collection: v.string(),
  character: v.optional(v.string()),
});

/**
 * Get cached NFTs for an owner
 * Returns null if cache doesn't exist or is stale
 */
export const getNftsForOwner = query({
  args: {
    ownerAddress: v.string(),
    maxAgeMs: v.optional(v.number()), // Optional custom TTL
  },
  handler: async (ctx, args) => {
    const owner = args.ownerAddress.toLowerCase();
    const maxAge = args.maxAgeMs || CACHE_TTL_MS;
    const now = Date.now();

    // Get all NFTs owned by this address
    const nfts = await ctx.db
      .query("nftOwnership")
      .withIndex("by_owner", (q) => q.eq("ownerAddress", owner))
      .collect();

    if (nfts.length === 0) {
      // Check if we have a "no NFTs" marker
      // This is stored as a special entry with tokenId = "__EMPTY__"
      const emptyMarker = await ctx.db
        .query("nftOwnership")
        .withIndex("by_contract_token", (q) =>
          q.eq("contractAddress", "__CACHE_MARKER__").eq("tokenId", owner)
        )
        .first();

      if (emptyMarker && (now - emptyMarker.metadataFetchedAt) < maxAge) {
        // User genuinely has 0 NFTs (cached recently)
        return { nfts: [], cached: true, fresh: true, cachedAt: emptyMarker.metadataFetchedAt };
      }

      return null; // No cache, needs fetch
    }

    // Check if cache is fresh (use oldest metadataFetchedAt)
    const oldestFetch = Math.min(...nfts.map(n => n.metadataFetchedAt));
    const isFresh = (now - oldestFetch) < maxAge;

    // Transform to frontend format
    const transformed = nfts.map(nft => ({
      tokenId: nft.tokenId,
      name: nft.name,
      imageUrl: nft.imageUrl,
      rarity: nft.rarity,
      wear: nft.wear,
      foil: nft.foil,
      power: nft.power,
      collection: nft.collectionId,
      character: nft.character,
    }));

    return {
      nfts: transformed,
      cached: true,
      fresh: isFresh,
      cachedAt: oldestFetch,
      count: nfts.length,
    };
  },
});

/**
 * Get cached NFTs for a specific collection
 */
export const getNftsByCollection = query({
  args: {
    ownerAddress: v.string(),
    collectionId: v.string(),
    maxAgeMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const owner = args.ownerAddress.toLowerCase();
    const maxAge = args.maxAgeMs || CACHE_TTL_MS;
    const now = Date.now();

    const nfts = await ctx.db
      .query("nftOwnership")
      .withIndex("by_owner_collection", (q) =>
        q.eq("ownerAddress", owner).eq("collectionId", args.collectionId)
      )
      .collect();

    if (nfts.length === 0) {
      return null; // No cache for this collection
    }

    const oldestFetch = Math.min(...nfts.map(n => n.metadataFetchedAt));
    const isFresh = (now - oldestFetch) < maxAge;

    const transformed = nfts.map(nft => ({
      tokenId: nft.tokenId,
      name: nft.name,
      imageUrl: nft.imageUrl,
      rarity: nft.rarity,
      wear: nft.wear,
      foil: nft.foil,
      power: nft.power,
      collection: nft.collectionId,
      character: nft.character,
    }));

    return {
      nfts: transformed,
      cached: true,
      fresh: isFresh,
      cachedAt: oldestFetch,
    };
  },
});

/**
 * Save NFTs to cache after Alchemy fetch
 * Handles upsert - updates existing or inserts new
 */
export const saveNftsForOwner = mutation({
  args: {
    ownerAddress: v.string(),
    collectionId: v.string(),
    contractAddress: v.string(),
    nfts: v.array(nftDataValidator),
  },
  handler: async (ctx, args) => {
    const owner = args.ownerAddress.toLowerCase();
    const contract = args.contractAddress.toLowerCase();
    const now = Date.now();

    // Get existing NFTs for this owner+collection to handle removals
    const existing = await ctx.db
      .query("nftOwnership")
      .withIndex("by_owner_collection", (q) =>
        q.eq("ownerAddress", owner).eq("collectionId", args.collectionId)
      )
      .collect();

    const existingMap = new Map(existing.map(e => [e.tokenId, e]));
    const newTokenIds = new Set(args.nfts.map(n => n.tokenId));

    // Delete NFTs no longer owned (transferred out)
    for (const old of existing) {
      if (!newTokenIds.has(old.tokenId)) {
        await ctx.db.delete(old._id);
      }
    }

    // Upsert NFTs
    for (const nft of args.nfts) {
      const existingNft = existingMap.get(nft.tokenId);

      if (existingNft) {
        // Update existing
        await ctx.db.patch(existingNft._id, {
          name: nft.name,
          imageUrl: nft.imageUrl,
          rarity: nft.rarity,
          wear: nft.wear,
          foil: nft.foil,
          power: nft.power,
          character: nft.character,
          metadataFetchedAt: now,
        });
      } else {
        // Insert new
        await ctx.db.insert("nftOwnership", {
          contractAddress: contract,
          tokenId: nft.tokenId,
          ownerAddress: owner,
          collectionId: args.collectionId,
          name: nft.name,
          imageUrl: nft.imageUrl,
          rarity: nft.rarity,
          wear: nft.wear,
          foil: nft.foil,
          power: nft.power,
          character: nft.character,
          ownedSince: now,
          metadataFetchedAt: now,
        });
      }
    }

    return { saved: args.nfts.length, deleted: existing.length - newTokenIds.size };
  },
});

/**
 * Mark that a user has 0 NFTs in a collection
 * This prevents re-fetching when user genuinely has no NFTs
 */
export const markEmptyCollection = mutation({
  args: {
    ownerAddress: v.string(),
    collectionId: v.string(),
  },
  handler: async (ctx, args) => {
    const owner = args.ownerAddress.toLowerCase();
    const now = Date.now();

    // Use special marker entry
    const markerKey = `${owner}_${args.collectionId}`;

    const existing = await ctx.db
      .query("nftOwnership")
      .withIndex("by_contract_token", (q) =>
        q.eq("contractAddress", "__CACHE_MARKER__").eq("tokenId", markerKey)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { metadataFetchedAt: now });
    } else {
      await ctx.db.insert("nftOwnership", {
        contractAddress: "__CACHE_MARKER__",
        tokenId: markerKey,
        ownerAddress: owner,
        collectionId: args.collectionId,
        name: "__EMPTY__",
        imageUrl: "",
        rarity: "",
        power: 0,
        ownedSince: now,
        metadataFetchedAt: now,
      });
    }

    return { marked: true };
  },
});

/**
 * Clear cache for an owner (used when they buy/sell NFTs)
 */
export const clearOwnerCache = mutation({
  args: {
    ownerAddress: v.string(),
    collectionId: v.optional(v.string()), // If provided, only clear this collection
  },
  handler: async (ctx, args) => {
    const owner = args.ownerAddress.toLowerCase();
    const collectionId = args.collectionId;

    let toDelete;
    if (collectionId) {
      toDelete = await ctx.db
        .query("nftOwnership")
        .withIndex("by_owner_collection", (q) =>
          q.eq("ownerAddress", owner).eq("collectionId", collectionId)
        )
        .collect();
    } else {
      toDelete = await ctx.db
        .query("nftOwnership")
        .withIndex("by_owner", (q) => q.eq("ownerAddress", owner))
        .collect();
    }

    for (const nft of toDelete) {
      await ctx.db.delete(nft._id);
    }

    // Also clear empty markers
    const markers = await ctx.db
      .query("nftOwnership")
      .withIndex("by_owner", (q) => q.eq("ownerAddress", owner))
      .filter((q) => q.eq(q.field("contractAddress"), "__CACHE_MARKER__"))
      .collect();

    for (const marker of markers) {
      if (!collectionId || marker.collectionId === collectionId) {
        await ctx.db.delete(marker._id);
      }
    }

    return { deleted: toDelete.length + markers.length };
  },
});

/**
 * Get cache stats for debugging
 */
export const getCacheStats = query({
  args: {},
  handler: async (ctx) => {
    const allNfts = await ctx.db.query("nftOwnership").collect();

    const byCollection: Record<string, number> = {};
    const uniqueOwners = new Set<string>();
    let totalMarkers = 0;

    for (const nft of allNfts) {
      if (nft.contractAddress === "__CACHE_MARKER__") {
        totalMarkers++;
        continue;
      }
      uniqueOwners.add(nft.ownerAddress);
      byCollection[nft.collectionId] = (byCollection[nft.collectionId] || 0) + 1;
    }

    return {
      totalNfts: allNfts.length - totalMarkers,
      totalMarkers,
      uniqueOwners: uniqueOwners.size,
      byCollection,
    };
  },
});
