/**
 * NFT Ownership Tracking System
 *
 * Source of truth for NFT ownership across all collections.
 * Updated via Alchemy Webhooks in real-time.
 *
 * Benefits:
 * - Eliminates Alchemy API calls on page load (44M+ calls/month → ~0)
 * - 100% consistent data (everyone reads same source)
 * - Real-time updates via webhooks
 * - Fast queries (indexed by owner, collection)
 */

import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { COLLECTIONS, type CollectionId } from "../lib/collections";

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES - Read NFT ownership from database
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all NFTs owned by an address (across all collections)
 * This is the primary query for loading player's cards
 */
export const getNFTsByOwner = query({
  args: {
    ownerAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const owner = args.ownerAddress.toLowerCase();

    const nfts = await ctx.db
      .query("nftOwnership")
      .withIndex("by_owner", (q) => q.eq("ownerAddress", owner))
      .collect();

    return nfts;
  },
});

/**
 * Get NFTs owned by address for a specific collection
 */
export const getNFTsByOwnerAndCollection = query({
  args: {
    ownerAddress: v.string(),
    collectionId: v.string(),
  },
  handler: async (ctx, args) => {
    const owner = args.ownerAddress.toLowerCase();

    const nfts = await ctx.db
      .query("nftOwnership")
      .withIndex("by_owner_collection", (q) =>
        q.eq("ownerAddress", owner).eq("collectionId", args.collectionId)
      )
      .collect();

    return nfts;
  },
});

/**
 * Get NFTs for multiple addresses (linked wallets support)
 */
export const getNFTsByOwners = query({
  args: {
    ownerAddresses: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const allNfts = [];

    for (const address of args.ownerAddresses) {
      const owner = address.toLowerCase();
      const nfts = await ctx.db
        .query("nftOwnership")
        .withIndex("by_owner", (q) => q.eq("ownerAddress", owner))
        .collect();

      // Tag with owner for multi-wallet support
      const taggedNfts = nfts.map(nft => ({ ...nft, fetchedFromAddress: owner }));
      allNfts.push(...taggedNfts);
    }

    return allNfts;
  },
});

/**
 * Get a specific NFT by contract and tokenId
 */
export const getNFTByContractAndToken = query({
  args: {
    contractAddress: v.string(),
    tokenId: v.string(),
  },
  handler: async (ctx, args) => {
    const contract = args.contractAddress.toLowerCase();

    const nft = await ctx.db
      .query("nftOwnership")
      .withIndex("by_contract_token", (q) =>
        q.eq("contractAddress", contract).eq("tokenId", args.tokenId)
      )
      .first();

    return nft;
  },
});

/**
 * Get count of NFTs per collection for an owner
 * Useful for dashboard/stats without fetching all data
 */
export const getNFTCountsByOwner = query({
  args: {
    ownerAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const owner = args.ownerAddress.toLowerCase();

    const nfts = await ctx.db
      .query("nftOwnership")
      .withIndex("by_owner", (q) => q.eq("ownerAddress", owner))
      .collect();

    // Group by collection
    const counts: Record<string, number> = {};
    let totalPower = 0;

    for (const nft of nfts) {
      counts[nft.collectionId] = (counts[nft.collectionId] || 0) + 1;
      totalPower += nft.power || 0;
    }

    return {
      totalCount: nfts.length,
      totalPower,
      byCollection: counts,
    };
  },
});

/**
 * Check if database has NFT data for an owner
 * Used to decide if we need initial sync
 */
export const hasNFTDataForOwner = query({
  args: {
    ownerAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const owner = args.ownerAddress.toLowerCase();

    const firstNft = await ctx.db
      .query("nftOwnership")
      .withIndex("by_owner", (q) => q.eq("ownerAddress", owner))
      .first();

    return !!firstNft;
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS - Update NFT ownership (called by webhook handler)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle NFT transfer event from Alchemy webhook
 * Creates new record if mint, updates owner if transfer, deletes if burn
 */
export const handleNFTTransfer = internalMutation({
  args: {
    contractAddress: v.string(),
    tokenId: v.string(),
    fromAddress: v.string(),
    toAddress: v.string(),
    collectionId: v.string(),
    blockNumber: v.number(),
    // Metadata (optional - fetched separately if not provided)
    metadata: v.optional(v.object({
      name: v.string(),
      imageUrl: v.string(),
      rarity: v.string(),
      wear: v.optional(v.string()),
      foil: v.optional(v.string()),
      power: v.number(),
      character: v.optional(v.string()),
      attributes: v.optional(v.any()),
    })),
  },
  handler: async (ctx, args) => {
    const contract = args.contractAddress.toLowerCase();
    const from = args.fromAddress.toLowerCase();
    const to = args.toAddress.toLowerCase();
    const now = Date.now();

    // Zero address = mint or burn
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    const isMint = from === ZERO_ADDRESS;
    const isBurn = to === ZERO_ADDRESS;

    // Find existing record
    const existing = await ctx.db
      .query("nftOwnership")
      .withIndex("by_contract_token", (q) =>
        q.eq("contractAddress", contract).eq("tokenId", args.tokenId)
      )
      .first();

    if (isBurn) {
      // NFT burned - delete record
      if (existing) {
        await ctx.db.delete(existing._id);
        console.log(`🔥 [NFT] Burned: ${contract}#${args.tokenId}`);
      }
      return { action: "burn", tokenId: args.tokenId };
    }

    if (existing) {
      // Transfer - update owner
      await ctx.db.patch(existing._id, {
        ownerAddress: to,
        ownedSince: now,
        lastWebhookAt: now,
      });
      console.log(`📦 [NFT] Transferred: ${contract}#${args.tokenId} → ${to.slice(0,8)}...`);
      return { action: "transfer", tokenId: args.tokenId, newOwner: to };
    }

    // New NFT (mint or first time seeing it)
    if (!args.metadata) {
      // Schedule metadata fetch
      console.log(`⏳ [NFT] New NFT without metadata, scheduling fetch: ${contract}#${args.tokenId}`);
      await ctx.scheduler.runAfter(0, internal.nftOwnership.fetchAndSaveMetadata, {
        contractAddress: contract,
        tokenId: args.tokenId,
        ownerAddress: to,
        collectionId: args.collectionId,
      });
      return { action: "mint_pending", tokenId: args.tokenId };
    }

    // Create new record with metadata
    await ctx.db.insert("nftOwnership", {
      contractAddress: contract,
      tokenId: args.tokenId,
      ownerAddress: to,
      collectionId: args.collectionId,
      name: args.metadata.name,
      imageUrl: args.metadata.imageUrl,
      rarity: args.metadata.rarity,
      wear: args.metadata.wear,
      foil: args.metadata.foil,
      power: args.metadata.power,
      character: args.metadata.character,
      attributes: args.metadata.attributes,
      ownedSince: now,
      metadataFetchedAt: now,
      lastWebhookAt: now,
    });

    console.log(`✨ [NFT] Minted: ${contract}#${args.tokenId} → ${to.slice(0,8)}...`);
    return { action: "mint", tokenId: args.tokenId, owner: to };
  },
});

/**
 * Fetch metadata from Alchemy and save NFT record
 * Called when we receive a transfer without metadata
 */
export const fetchAndSaveMetadata = internalMutation({
  args: {
    contractAddress: v.string(),
    tokenId: v.string(),
    ownerAddress: v.string(),
    collectionId: v.string(),
  },
  handler: async (ctx, args) => {
    // This will be implemented to call Alchemy for metadata
    // For now, create a placeholder record
    const now = Date.now();

    const existing = await ctx.db
      .query("nftOwnership")
      .withIndex("by_contract_token", (q) =>
        q.eq("contractAddress", args.contractAddress).eq("tokenId", args.tokenId)
      )
      .first();

    if (existing) {
      // Already exists, just update owner
      await ctx.db.patch(existing._id, {
        ownerAddress: args.ownerAddress,
        ownedSince: now,
      });
      return;
    }

    // Create placeholder - metadata will be fetched by sync job
    await ctx.db.insert("nftOwnership", {
      contractAddress: args.contractAddress,
      tokenId: args.tokenId,
      ownerAddress: args.ownerAddress,
      collectionId: args.collectionId,
      name: `#${args.tokenId}`,
      imageUrl: "",
      rarity: "Unknown",
      power: 0,
      ownedSince: now,
      metadataFetchedAt: 0, // 0 = needs fetch
    });
  },
});

/**
 * Bulk upsert NFTs (for initial sync)
 * More efficient than individual inserts
 */
export const bulkUpsertNFTs = internalMutation({
  args: {
    nfts: v.array(v.object({
      contractAddress: v.string(),
      tokenId: v.string(),
      ownerAddress: v.string(),
      collectionId: v.string(),
      name: v.string(),
      imageUrl: v.string(),
      rarity: v.string(),
      wear: v.optional(v.string()),
      foil: v.optional(v.string()),
      power: v.number(),
      character: v.optional(v.string()),
      attributes: v.optional(v.any()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let inserted = 0;
    let updated = 0;

    for (const nft of args.nfts) {
      const contract = nft.contractAddress.toLowerCase();
      const owner = nft.ownerAddress.toLowerCase();

      const existing = await ctx.db
        .query("nftOwnership")
        .withIndex("by_contract_token", (q) =>
          q.eq("contractAddress", contract).eq("tokenId", nft.tokenId)
        )
        .first();

      if (existing) {
        // Update existing
        await ctx.db.patch(existing._id, {
          ownerAddress: owner,
          name: nft.name,
          imageUrl: nft.imageUrl,
          rarity: nft.rarity,
          wear: nft.wear,
          foil: nft.foil,
          power: nft.power,
          character: nft.character,
          attributes: nft.attributes,
          metadataFetchedAt: now,
        });
        updated++;
      } else {
        // Insert new
        await ctx.db.insert("nftOwnership", {
          contractAddress: contract,
          tokenId: nft.tokenId,
          ownerAddress: owner,
          collectionId: nft.collectionId,
          name: nft.name,
          imageUrl: nft.imageUrl,
          rarity: nft.rarity,
          wear: nft.wear,
          foil: nft.foil,
          power: nft.power,
          character: nft.character,
          attributes: nft.attributes,
          ownedSince: now,
          metadataFetchedAt: now,
        });
        inserted++;
      }
    }

    console.log(`📦 [NFT Sync] Bulk upsert: ${inserted} inserted, ${updated} updated`);
    return { inserted, updated };
  },
});

/**
 * Update sync status for a contract
 */
export const updateSyncStatus = internalMutation({
  args: {
    contractAddress: v.string(),
    collectionId: v.string(),
    lastProcessedBlock: v.number(),
    totalNftsTracked: v.number(),
  },
  handler: async (ctx, args) => {
    const contract = args.contractAddress.toLowerCase();
    const now = Date.now();

    const existing = await ctx.db
      .query("webhookSyncStatus")
      .withIndex("by_contract", (q) => q.eq("contractAddress", contract))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastProcessedBlock: args.lastProcessedBlock,
        lastSyncAt: now,
        totalNftsTracked: args.totalNftsTracked,
      });
    } else {
      await ctx.db.insert("webhookSyncStatus", {
        contractAddress: contract,
        collectionId: args.collectionId,
        lastProcessedBlock: args.lastProcessedBlock,
        lastSyncAt: now,
        totalNftsTracked: args.totalNftsTracked,
      });
    }
  },
});

/**
 * Delete all NFTs for an owner (used when re-syncing)
 */
export const clearNFTsForOwner = internalMutation({
  args: {
    ownerAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const owner = args.ownerAddress.toLowerCase();

    const nfts = await ctx.db
      .query("nftOwnership")
      .withIndex("by_owner", (q) => q.eq("ownerAddress", owner))
      .collect();

    for (const nft of nfts) {
      await ctx.db.delete(nft._id);
    }

    console.log(`🗑️ [NFT] Cleared ${nfts.length} NFTs for ${owner.slice(0,8)}...`);
    return { deleted: nfts.length };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get sync status for all contracts
 */
export const getSyncStatus = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("webhookSyncStatus").collect();
  },
});

/**
 * Get NFTs that need metadata refresh (metadataFetchedAt = 0)
 */
export const getNFTsNeedingMetadata = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    // Get all NFTs and filter those needing metadata
    // TODO: Add index for metadataFetchedAt if this becomes slow
    const allNfts = await ctx.db.query("nftOwnership").take(10000);
    const needsMetadata = allNfts.filter(nft => nft.metadataFetchedAt === 0);

    return needsMetadata.slice(0, limit);
  },
});
