/**
 * Raid Boss Convex Functions
 *
 * Backend logic for the global cooperative Raid Boss mode
 */

import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery, QueryCtx, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentBoss, getNextBoss, getBossRotationInfo, BOSS_HP_BY_RARITY, BOSS_REWARDS_BY_RARITY } from "../lib/raid-boss";
import type { CardRarity } from "../lib/types/card";

/**
 * 🔗 MULTI-WALLET: Resolve primary address for linked wallets
 * Returns the primary address if this address is linked, otherwise returns the address itself
 */
async function resolvePrimaryAddress(ctx: QueryCtx | MutationCtx, address: string): Promise<string> {
  const normalizedAddress = address.toLowerCase();

  // Check if this address is linked to another profile
  const link = await ctx.db
    .query("addressLinks")
    .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
    .first();

  if (link) {
    // This is a linked address - return the primary
    return link.primaryAddress;
  }

  // Not a linked address - return as-is
  return normalizedAddress;
}

/**
 * 🔒 SECURITY FIX: Crypto-secure random for critical hits
 */
function cryptoRandomFloat(): number {
  const randomBytes = new Uint32Array(1);
  crypto.getRandomValues(randomBytes);
  return randomBytes[0] / (0xFFFFFFFF + 1);
}

// Constants
const ENTRY_FEE = 5; // 5 VBMS to set raid deck (5 regular + 1 VibeFID special)
const REFUEL_COST_PER_CARD = 1; // 1 VBMS per card
const REFUEL_COST_ALL = 4; // 4 VBMS for all 5 cards (discount)
const ATTACK_INTERVAL = 5 * 60 * 1000; // Cards attack every 5 minutes

// Card replacement cost by rarity (cost to swap a new card in)
const REPLACE_COST_BY_RARITY: Record<string, number> = {
  common: 1,      // 1 VBMS
  rare: 3,        // 3 VBMS
  epic: 5,        // 5 VBMS
  legendary: 10,  // 10 VBMS
  mythic: 15,     // 15 VBMS
  vibefid: 50,    // 50 VBMS (infinite energy)
};

// Energy duration by rarity (how long the card can attack before needing refuel)
const ENERGY_DURATION_BY_RARITY: Record<string, number> = {
  common: 12 * 60 * 60 * 1000,      // 12 hours
  rare: 1 * 24 * 60 * 60 * 1000,    // 1 day
  epic: 2 * 24 * 60 * 60 * 1000,    // 2 days
  legendary: 4 * 24 * 60 * 60 * 1000, // 4 days
  mythic: 5 * 24 * 60 * 60 * 1000,  // 5 days
  vibefid: 0,                         // Infinite (never expires)
};

// VibeFID special slot bonus
const VIBEFID_DECK_BONUS = 0.10; // +10% power to entire deck

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get current active raid boss
 * Also returns transitioning/defeated boss to prevent re-initialization during transition
 */
export const getCurrentRaidBoss = query({
  handler: async (ctx) => {
    // First try to get active boss
    let boss = await ctx.db
      .query("raidBoss")
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    // If no active boss, check for transitioning (being processed after defeat)
    if (!boss) {
      boss = await ctx.db
        .query("raidBoss")
        .filter((q) => q.eq(q.field("status"), "transitioning"))
        .first();
    }

    // If no transitioning boss, check for defeated (waiting to be processed)
    if (!boss) {
      boss = await ctx.db
        .query("raidBoss")
        .filter((q) => q.eq(q.field("status"), "defeated"))
        .first();
    }

    return boss;
  },
});

/**
 * Initialize the raid boss system (creates first boss if none exists)
 */
export const initializeRaidBoss = mutation({
  handler: async (ctx) => {
    // Check if there's ANY boss (active, transitioning, or defeated)
    // This prevents re-initialization during boss transition period
    const existingBoss = await ctx.db
      .query("raidBoss")
      .first();

    if (existingBoss) {
      return existingBoss; // Boss exists (in some state)
    }

    // Create the first boss (index 0)
    const bossIndex = 0;
    const bossData = getCurrentBoss(bossIndex);

    if (!bossData) {
      throw new Error("Failed to get boss data for index 0");
    }

    const newBoss = await ctx.db.insert("raidBoss", {
      bossIndex,
      tokenId: bossData.tokenId,
      name: bossData.name,
      collection: bossData.collection!,
      rarity: bossData.rarity as CardRarity,
      imageUrl: bossData.imageUrl,
      power: bossData.power,
      maxHp: bossData.hp,
      currentHp: bossData.hp,
      status: "active",
      spawnedAt: Date.now(),
      defeatedAt: undefined,
    });

    console.log(`🐉 First Raid Boss spawned: ${bossData.name} (${bossData.rarity})`);

    return await ctx.db.get(newBoss);
  },
});

/**
 * Get player's raid deck and energy status
 * 🔗 MULTI-WALLET: Uses primary address for linked wallets
 */
export const getPlayerRaidDeck = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    // 🔗 Resolve to primary address if this is a linked wallet
    const primaryAddress = await resolvePrimaryAddress(ctx, args.address);

    const raidDeck = await ctx.db
      .query("raidAttacks")
      .withIndex("by_address", (q) => q.eq("address", primaryAddress))
      .first();

    return raidDeck;
  },
});

/**
 * Get player's contribution to current boss
 * 🔗 MULTI-WALLET: Uses primary address for linked wallets
 */
export const getPlayerContribution = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    // 🔗 Resolve to primary address if this is a linked wallet
    const primaryAddress = await resolvePrimaryAddress(ctx, args.address);

    const boss = await ctx.db
      .query("raidBoss")
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!boss) return null;

    const contribution = await ctx.db
      .query("raidContributions")
      .withIndex("by_boss_player", (q) =>
        q.eq("bossIndex", boss.bossIndex).eq("address", primaryAddress)
      )
      .first();

    return contribution;
  },
});

/**
 * Get top contributors for current boss (leaderboard)
 */
export const getTopContributors = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const boss = await ctx.db
      .query("raidBoss")
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!boss) return [];

    const limit = args.limit || 100; // Show all contributors (up to 100)

    // 🚀 BANDWIDTH FIX: Use by_boss index (includes damageDealt) with order desc
    // Avoids fetching all contributors and sorting in memory
    const topContributors = await ctx.db
      .query("raidContributions")
      .withIndex("by_boss", (q) => q.eq("bossIndex", boss.bossIndex))
      .order("desc") // Order by damageDealt descending (from index)
      .take(limit);

    return topContributors;
  },
});

/**
 * Get raid boss history
 */
export const getRaidHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const history = await ctx.db
      .query("raidHistory")
      .withIndex("by_defeated_at")
      .order("desc")
      .take(limit);

    return history;
  },
});

/**
 * Get leaderboard for a specific boss by index
 */
export const getBossLeaderboard = query({
  args: {
    bossIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("raidHistory")
      .withIndex("by_boss_index", (q) => q.eq("bossIndex", args.bossIndex))
      .first();

    return history;
  },
});

/**
 * Get raid boss leaderboard (ordered by totalDamageDealt)
 * Returns all players with raid decks, enriched with profile data
 */
/**
 * 🚀 OPTIMIZED: Get raid boss leaderboard with minimal fields
 *
 * OLD VERSION: Returns full profile data (~10KB per entry)
 * NEW VERSION: Returns only display fields (~500 bytes per entry)
 *
 * Bandwidth savings: ~95% reduction
 */
export const getRaidBossLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 100 }) => {
    // Get raid attacks ordered by total damage dealt
    const raidAttacks = await ctx.db
      .query("raidAttacks")
      .withIndex("by_total_damage")
      .order("desc")
      .take(limit); // OPTIMIZATION: Only fetch what we need

    // 🚀 BANDWIDTH OPTIMIZATION: Use cached username from raid deck
    // Eliminates N+1 profile lookups (saves 80% bandwidth)
    const leaderboard = raidAttacks.map((raid) => ({
      address: raid.address,
      username: raid.username || raid.address.slice(0, 8), // Use cached username
      stats: {
        raidBossDamage: raid.totalDamageDealt,
        bossesKilled: raid.bossesKilled,
        aura: 500, // Default aura (not critical for raid leaderboard)
        totalPower: raid.deckPower || 0, // Use deck power instead of profile power
      },
      userIndex: 0, // Not needed for raid leaderboard
    }));

    return leaderboard;
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Replace a card in the raid deck (costs VBMS based on new card rarity)
 * Common: 1 VBMS, Rare: 3, Epic: 5, Legendary: 10, Mythic: 15, VibeFID: 50
 * 🔗 MULTI-WALLET: Uses primary address for linked wallets
 */
export const replaceCard = mutation({
  args: {
    address: v.string(),
    oldCardTokenId: v.string(), // Card to remove
    newCard: v.object({
      tokenId: v.string(),
      collection: v.optional(v.string()),
      power: v.number(),
      imageUrl: v.string(),
      name: v.string(),
      rarity: v.string(),
      foil: v.optional(v.string()),
      isFreeCard: v.optional(v.boolean()),
    }),
    txHash: v.string(), // VBMS payment transaction hash
    isVibeFID: v.optional(v.boolean()), // If true, replacing VibeFID card
  },
  handler: async (ctx, args) => {
    // 🔗 Resolve to primary address if this is a linked wallet
    const address = await resolvePrimaryAddress(ctx, args.address);

    // Get player's raid deck
    const raidDeck = await ctx.db
      .query("raidAttacks")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();

    if (!raidDeck) {
      throw new Error("Player has no raid deck");
    }

    // Handle VibeFID replacement separately
    if (args.isVibeFID) {
      if (!raidDeck.vibefidCard) {
        throw new Error("No VibeFID card in deck to replace");
      }

      // Check new card is actually a VibeFID
      if (args.newCard.collection !== 'vibefid') {
        throw new Error("Can only replace VibeFID with another VibeFID card");
      }

      // Check for duplicates in regular deck
      const isDuplicateInDeck = raidDeck.deck.some(
        (c) => c.tokenId === args.newCard.tokenId
      );
      if (isDuplicateInDeck) {
        throw new Error("This VibeFID is already in your raid deck.");
      }

      const now = Date.now();
      const oldVibefidTokenId = raidDeck.vibefidCard.tokenId;

      // Update VibeFID card
      const newVibefidCard = {
        ...args.newCard,
        collection: 'vibefid',
      };

      // Update VibeFID energy (infinite)
      const updatedCardEnergy = raidDeck.cardEnergy.map(ce => {
        if (ce.tokenId === oldVibefidTokenId) {
          return {
            tokenId: args.newCard.tokenId,
            energyExpiresAt: 0, // Infinite energy
            lastAttackAt: undefined,
            nextAttackAt: now, // Can attack immediately
          };
        }
        return ce;
      });

      // Recalculate deck power with new VibeFID (2x power)
      const basePower = raidDeck.deck.reduce((sum, card) => sum + card.power, 0);
      const newDeckPower = Math.floor((basePower + args.newCard.power * 2) * 1.10); // +10% bonus

      await ctx.db.patch(raidDeck._id, {
        vibefidCard: newVibefidCard,
        cardEnergy: updatedCardEnergy,
        deckPower: newDeckPower,
        lastUpdated: now,
      });

      console.log(`🎴 VibeFID replaced: ${oldVibefidTokenId} → ${args.newCard.tokenId} (power: ${newDeckPower})`);

      return {
        success: true,
        newDeckPower,
        cost: 50,
      };
    }



    // Find the card to replace
    const cardIndex = raidDeck.deck.findIndex((c) => c.tokenId === args.oldCardTokenId);
    if (cardIndex === -1) {
      throw new Error("Card not found in deck");
    }

    // 🔒 SECURITY: Check if new card is already in the deck (prevent duplicates)
    const isDuplicateInDeck = raidDeck.deck.some(
      (c, idx) => c.tokenId === args.newCard.tokenId && idx !== cardIndex
    );
    if (isDuplicateInDeck) {
      throw new Error("This card is already in your raid deck. Cannot have duplicate cards.");
    }

    // Also check VibeFID slot for duplicates
    if (raidDeck.vibefidCard && raidDeck.vibefidCard.tokenId === args.newCard.tokenId) {
      throw new Error("This card is already in your raid deck (VibeFID slot). Cannot have duplicate cards.");
    }

    const now = Date.now();

    // Calculate cost based on new card rarity
    const rarity = args.newCard.rarity.toLowerCase();
    const cost = REPLACE_COST_BY_RARITY[rarity] || REPLACE_COST_BY_RARITY.common;

    // Replace card in deck
    const updatedDeck = [...raidDeck.deck];
    updatedDeck[cardIndex] = args.newCard;

    // Calculate new deck power
    const newDeckPower = updatedDeck.reduce((sum, card) => sum + card.power, 0);

    // Replace card energy
    const updatedCardEnergy = [...raidDeck.cardEnergy];
    const duration = ENERGY_DURATION_BY_RARITY[rarity] || ENERGY_DURATION_BY_RARITY.common;

    updatedCardEnergy[cardIndex] = {
      tokenId: args.newCard.tokenId,
      energyExpiresAt: duration === 0 ? 0 : now + duration, // 0 = infinite (VibeFID)
      lastAttackAt: undefined,
      nextAttackAt: now, // Can attack immediately
    };

    // Update raid deck
    await ctx.db.patch(raidDeck._id, {
      deck: updatedDeck,
      deckPower: newDeckPower,
      cardEnergy: updatedCardEnergy,
      lastUpdated: now,
    });

    console.log(`🔄 Card replaced: ${args.oldCardTokenId} → ${args.newCard.tokenId} for ${address} (cost: ${cost} VBMS)`);

    return {
      success: true,
      oldCard: args.oldCardTokenId,
      newCard: args.newCard.tokenId,
      newDeckPower,
      cost,
    };
  },
});

/**
 * Set player's raid deck
 * Cost = sum of card rarities (Common:1, Rare:3, Epic:5, Legendary:10, Mythic:15, VibeFID:50)
 * Can have 5 regular cards OR 5 regular + 1 VibeFID (6th slot)
 */
/**
 * Set raid deck for a player
 * 🔗 MULTI-WALLET: Uses primary address for linked wallets
 */
export const setRaidDeck = mutation({
  args: {
    address: v.string(),
    deck: v.array(v.object({
      tokenId: v.string(),
      collection: v.optional(v.string()),
      power: v.number(),
      imageUrl: v.string(),
      name: v.string(),
      rarity: v.string(),
      foil: v.optional(v.string()),
      isFreeCard: v.optional(v.boolean()),
    })),
    vibefidCard: v.optional(v.object({
      tokenId: v.string(),
      collection: v.optional(v.string()),
      power: v.number(),
      imageUrl: v.string(),
      name: v.string(),
      rarity: v.string(),
      foil: v.optional(v.string()),
    })),
    txHash: v.string(), // VBMS payment transaction hash
  },
  handler: async (ctx, args) => {
    // 🔗 Resolve to primary address if this is a linked wallet
    const address = await resolvePrimaryAddress(ctx, args.address);

    // 🚀 Fetch username for caching (avoids N+1 in leaderboard)
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();
    const username = profile?.username;

    // Validate deck size (5 regular, optionally +1 VibeFID)
    if (args.deck.length !== 5) {
      throw new Error("Raid deck must contain exactly 5 cards");
    }

    // 🔒 SECURITY: Check for duplicate cards in deck
    const tokenIds = args.deck.map(c => c.tokenId);
    const uniqueTokenIds = new Set(tokenIds);
    if (uniqueTokenIds.size !== tokenIds.length) {
      throw new Error("Deck cannot contain duplicate cards");
    }

    // Check if VibeFID card is duplicate of any deck card
    if (args.vibefidCard && tokenIds.includes(args.vibefidCard.tokenId)) {
      throw new Error("VibeFID card cannot be duplicate of deck cards");
    }

    const now = Date.now();

    // Calculate total cost based on card rarities
    let totalCost = 0;
    for (const card of args.deck) {
      const rarity = card.rarity.toLowerCase();
      totalCost += REPLACE_COST_BY_RARITY[rarity] || REPLACE_COST_BY_RARITY.common;
    }

    // Add VibeFID cost if included
    if (args.vibefidCard) {
      totalCost += REPLACE_COST_BY_RARITY.vibefid; // +50 VBMS
    }

    // Calculate total deck power (including VibeFID if present)
    let deckPower = args.deck.reduce((sum, card) => sum + card.power, 0);
    if (args.vibefidCard) {
      deckPower += args.vibefidCard.power * 2;  // VibeFID gets 2x power (same as collection buff)
      // Apply +10% deck bonus for having VibeFID
      deckPower = Math.floor(deckPower * (1 + VIBEFID_DECK_BONUS));
    }

    // Initialize card energy based on rarity (energy expires after duration)
    const cardEnergy = args.deck.map((card) => {
      const rarity = card.rarity.toLowerCase();
      const duration = ENERGY_DURATION_BY_RARITY[rarity] || ENERGY_DURATION_BY_RARITY.common;

      return {
        tokenId: card.tokenId,
        energyExpiresAt: duration === 0 ? 0 : now + duration, // 0 = infinite (VibeFID)
        lastAttackAt: undefined,
        nextAttackAt: now, // Can attack immediately
      };
    });

    // Add VibeFID energy if included (infinite energy)
    if (args.vibefidCard) {
      cardEnergy.push({
        tokenId: args.vibefidCard.tokenId,
        energyExpiresAt: 0, // Infinite energy
        lastAttackAt: undefined,
        nextAttackAt: now,
      });
    }

    // Check if player already has a raid deck
    const existingDeck = await ctx.db
      .query("raidAttacks")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();

    if (existingDeck) {
      // Update existing deck
      await ctx.db.patch(existingDeck._id, {
        deck: args.deck,
        vibefidCard: args.vibefidCard ? {
          ...args.vibefidCard,
          collection: 'vibefid', // 🔧 FIX: Always force 'vibefid' collection
        } : undefined,
        deckPower,
        cardEnergy,
        entryFeePaid: true,
        entryTxHash: args.txHash,
        entryPaidAt: Date.now(),
        lastUpdated: Date.now(),
        username, // 🚀 Cache username
      });
    } else {
      // Create new raid deck
      await ctx.db.insert("raidAttacks", {
        address,
        username, // 🚀 Cache username
        deck: args.deck,
        vibefidCard: args.vibefidCard ? {
          ...args.vibefidCard,
          collection: 'vibefid', // 🔧 FIX: Always force 'vibefid' collection
        } : undefined,
        deckPower,
        cardEnergy,
        entryFeePaid: true,
        entryTxHash: args.txHash,
        entryPaidAt: Date.now(),
        totalDamageDealt: 0,
        bossesKilled: 0,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
      });
    }

    console.log(`🎴 Raid deck set for ${address}: ${args.deck.length} cards${args.vibefidCard ? ' + VibeFID' : ''} (cost: ${totalCost} VBMS, power: ${deckPower})`);

    return {
      success: true,
      deckPower,
      totalCost,
      hasVibeFID: !!args.vibefidCard,
    };
  },
});

/**
 * Clear raid deck but keep damage stats
 * Player can remove all cards from raid to use them elsewhere
 * Damage dealt and bosses killed are preserved
 * 🔗 MULTI-WALLET: Uses primary address for linked wallets
 */
export const clearRaidDeck = mutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    // 🔗 Resolve to primary address if this is a linked wallet
    const address = await resolvePrimaryAddress(ctx, args.address);

    // Get player's raid deck
    const raidDeck = await ctx.db
      .query("raidAttacks")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();

    if (!raidDeck) {
      throw new Error("Player has no raid deck");
    }

    // Clear deck but preserve damage stats
    await ctx.db.patch(raidDeck._id, {
      deck: [],
      vibefidCard: undefined,
      deckPower: 0,
      cardEnergy: [],
      entryFeePaid: false, // Allow new entry (will need to pay again)
      lastUpdated: Date.now(),
      // NOTE: totalDamageDealt and bossesKilled are NOT cleared
    });

    console.log(`🗑️ Raid deck cleared for ${address} (damage preserved: ${raidDeck.totalDamageDealt})`);

    return {
      success: true,
      damagePreserved: raidDeck.totalDamageDealt,
      bossesKilledPreserved: raidDeck.bossesKilled,
    };
  },
});

/**
 * Refuel card energy (costs 1 VBMS per card, or 4 VBMS for all 5)
 * 🔗 MULTI-WALLET: Uses primary address for linked wallets
 */
export const refuelCards = mutation({
  args: {
    address: v.string(),
    cardTokenIds: v.array(v.string()), // Which cards to refuel
    txHash: v.string(), // VBMS payment transaction hash
  },
  handler: async (ctx, args) => {
    // 🔗 Resolve to primary address if this is a linked wallet
    const address = await resolvePrimaryAddress(ctx, args.address);

    // Get player's raid deck
    const raidDeck = await ctx.db
      .query("raidAttacks")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();

    if (!raidDeck) {
      throw new Error("Player has no raid deck");
    }

    // Calculate cost
    const numCards = args.cardTokenIds.length;
    const expectedCost = numCards === 5 ? REFUEL_COST_ALL : numCards * REFUEL_COST_PER_CARD;

    const now = Date.now();

    // Update card energy - reset energy expiry based on rarity
    const updatedCardEnergy = raidDeck.cardEnergy.map((cardEnergy) => {
      if (args.cardTokenIds.includes(cardEnergy.tokenId)) {
        // Find card in deck to get rarity
        const deckCard = raidDeck.deck.find((c) => c.tokenId === cardEnergy.tokenId);
        if (!deckCard) return cardEnergy;

        const rarity = deckCard.rarity.toLowerCase();
        const duration = ENERGY_DURATION_BY_RARITY[rarity] || ENERGY_DURATION_BY_RARITY.common;

        return {
          ...cardEnergy,
          energyExpiresAt: duration === 0 ? 0 : now + duration, // 0 = infinite (VibeFID)
          nextAttackAt: now, // Can attack immediately after refuel
        };
      }
      return cardEnergy;
    });

    // Update raid deck
    await ctx.db.patch(raidDeck._id, {
      cardEnergy: updatedCardEnergy,
      lastUpdated: Date.now(),
    });

    // Log refuel transaction
    await ctx.db.insert("raidRefuels", {
      address,
      cardsRefueled: args.cardTokenIds,
      amount: expectedCost,
      txHash: args.txHash,
      timestamp: Date.now(),
    });

    return { success: true, cardsRefueled: args.cardTokenIds.length, cost: expectedCost };
  },
});

/**
 * Process automatic attacks (called by cron job every 5 minutes)
 * All cards with energy attack the boss automatically
 * 🚀 BANDWIDTH FIX: Changed to internalMutation (only called by cron)
 */
export const processAutoAttacks = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Get current active boss
    const boss = await ctx.db
      .query("raidBoss")
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!boss) {
      console.log("No active boss found");
      return { success: false, message: "No active boss" };
    }

    // 🚀 BANDWIDTH OPTIMIZATION: Only fetch decks updated in last 2 hours
    // This filters out inactive players who haven't refueled/attacked recently
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;
    const allDecks = await ctx.db
      .query("raidAttacks")
      .withIndex("by_last_updated", (q) => q.gt("lastUpdated", twoHoursAgo))
      .collect();

    // 🚀 BANDWIDTH FIX: Batch-load all profiles BEFORE the loop
    // This reduces N queries (one per deck) to just one batch query
    const uniqueAddresses = [...new Set(allDecks.map(d => d.address))];
    const profilePromises = uniqueAddresses.map(addr =>
      ctx.db.query("profiles").withIndex("by_address", q => q.eq("address", addr)).first()
    );
    const profiles = await Promise.all(profilePromises);
    const profileMap = new Map(
      profiles.filter(Boolean).map(p => [p!.address, p])
    );
    console.log(`🚀 Batch-loaded ${profileMap.size} profiles for ${allDecks.length} decks`);

    let totalDamage = 0;
    let attackingPlayers = 0;

    // Process each player's deck
    for (const deck of allDecks) {
      const updatedCardEnergy = [];
      let playerDamage = 0;

      // Check if deck has VibeFID card (for team buff) - check both regular deck AND VibeFID slot
      const hasVibeFIDInDeck = deck.deck.some((c) => c.collection === 'vibefid') || !!deck.vibefidCard;

      // Check each card's energy and attack if ready
      for (const cardEnergy of deck.cardEnergy) {
        // Check if energy has expired (0 = infinite for VibeFID)
        const hasEnergy = cardEnergy.energyExpiresAt === 0 || now < cardEnergy.energyExpiresAt;
        const isReady = !cardEnergy.nextAttackAt || cardEnergy.nextAttackAt <= now;

        if (hasEnergy && isReady) {
          // Card has energy and is ready to attack - ATTACK!
          // 🔧 FIX: Also check vibefidCard slot, not just regular deck
          const deckCard = deck.deck.find((c) => c.tokenId === cardEnergy.tokenId) ||
                          (deck.vibefidCard?.tokenId === cardEnergy.tokenId ? deck.vibefidCard : undefined);
          let cardPower = deckCard?.power || 0;

          // Apply buff system (only for NFTs, not free cards)
          // 🔧 FIX: Check BOTH collection AND vibefidCard slot (fallback for legacy data)
          const isVibeFID = deckCard?.collection === 'vibefid' || deck.vibefidCard?.tokenId === cardEnergy.tokenId;
          // VibeFID cards don't have isFreeCard property, so use optional chaining
          if (deckCard && !('isFreeCard' in deckCard && deckCard.isFreeCard)) {
            // VibeFID cards get 2x power (same as collection buff)
            if (isVibeFID) {
              cardPower = Math.floor(cardPower * 2.0);
            }
            // Cards matching boss collection get 2x power (100% bonus)
            else if (deckCard.collection === boss.collection) {
              cardPower = Math.floor(cardPower * 2.0);
            }

            // 🌟 VIBEFID TEAM BUFF: All cards get +50% when VibeFID is in deck
            if (hasVibeFIDInDeck && !isVibeFID) {
              cardPower = Math.floor(cardPower * 1.5);
            }
          }

          // 🎯 CRITICAL HIT SYSTEM (VibeFID: 30% chance, Others: 15% chance)
          const criticalHitChance = isVibeFID ? 0.30 : 0.15; // VibeFID has 2x crit chance!
          const isCriticalHit = cryptoRandomFloat() < criticalHitChance;
          if (isCriticalHit) {
            cardPower = Math.floor(cardPower * 2); // 2x damage on crit
            console.log(`💥 CRITICAL HIT! Card ${cardEnergy.tokenId} dealt ${cardPower} damage (2x multiplier)`);
          }

          playerDamage += cardPower;

          // Update next attack time (card attacks again in 5 minutes)
          updatedCardEnergy.push({
            ...cardEnergy,
            lastAttackAt: now,
            nextAttackAt: now + ATTACK_INTERVAL, // Next attack in 5 minutes
          });
        } else {
          // Card not ready to attack or energy expired
          updatedCardEnergy.push(cardEnergy);
        }
      }

      if (playerDamage > 0) {
        // Update deck with depleted energy
        await ctx.db.patch(deck._id, {
          cardEnergy: updatedCardEnergy,
          totalDamageDealt: deck.totalDamageDealt + playerDamage,
          lastUpdated: now,
        });

        // Update or create contribution record
        const contribution = await ctx.db
          .query("raidContributions")
          .withIndex("by_boss_player", (q) =>
            q.eq("bossIndex", boss.bossIndex).eq("address", deck.address)
          )
          .first();

        // 🚀 BANDWIDTH FIX: Use pre-loaded profile from Map (no query!)
        const profile = profileMap.get(deck.address);
        const username = profile?.username || deck.address.slice(0, 8);

        if (contribution) {
          await ctx.db.patch(contribution._id, {
            damageDealt: contribution.damageDealt + playerDamage,
            attackCount: contribution.attackCount + 1,
            lastAttackAt: now,
          });
        } else {
          await ctx.db.insert("raidContributions", {
            bossIndex: boss.bossIndex,
            address: deck.address,
            username,
            damageDealt: playerDamage,
            attackCount: 1,
            rewardEarned: 0, // Calculated when boss is defeated
            rewardClaimed: false,
            firstAttackAt: now,
            lastAttackAt: now,
          });
        }

        totalDamage += playerDamage;
        attackingPlayers++;
      }
    }

    // Update boss HP
    const newHp = Math.max(0, boss.currentHp - totalDamage);

    await ctx.db.patch(boss._id, {
      currentHp: newHp,
      lastAttackAt: now,
    });

    // Check if boss is defeated
    if (newHp <= 0 && boss.status === "active") {
      // 🔒 SECURITY: Mark boss as "transitioning" FIRST to prevent race conditions
      // This prevents multiple defeat processing if cron runs again quickly
      await ctx.db.patch(boss._id, {
        status: "transitioning", // Intermediate status to prevent double-processing
        defeatedAt: now,
      });

      console.log(`🐉 Boss ${boss.name} defeated! Transitioning to next boss...`);

      // Trigger boss transition (will spawn next boss and change status to "defeated")
      // Schedule immediate processing of rewards and next boss spawn
    }

    return {
      success: true,
      totalDamage,
      attackingPlayers,
      bossHpRemaining: newHp,
      bossDefeated: newHp <= 0,
    };
  },
});

/**
 * Defeat current boss and spawn next one
 * Distributes rewards based on contribution
 * 🚀 BANDWIDTH FIX: Changed to internalMutation (only called by cron)
 */
export const defeatBossAndSpawnNext = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Get transitioning or defeated boss
    let defeatedBoss = await ctx.db
      .query("raidBoss")
      .filter((q) => q.eq(q.field("status"), "transitioning"))
      .first();

    // Fallback to "defeated" status for backward compatibility
    if (!defeatedBoss) {
      defeatedBoss = await ctx.db
        .query("raidBoss")
        .filter((q) => q.eq(q.field("status"), "defeated"))
        .first();
    }

    if (!defeatedBoss) {
      return { success: false, message: "No defeated boss found" };
    }

    // Get all contributions for this boss
    const contributions = await ctx.db
      .query("raidContributions")
      .withIndex("by_boss", (q) => q.eq("bossIndex", defeatedBoss.bossIndex))
      .collect();

    // Calculate total damage
    const totalDamage = contributions.reduce((sum, c) => sum + c.damageDealt, 0);

    // Distribute rewards based on contribution percentage
    // Reward pool scales with boss rarity/difficulty
    const bossRarity = defeatedBoss.rarity.toLowerCase() as Lowercase<CardRarity>;
    const REWARD_POOL = BOSS_REWARDS_BY_RARITY[bossRarity];

    for (const contribution of contributions) {
      const contributionPercent = totalDamage > 0 ? contribution.damageDealt / totalDamage : 0;
      // Minimum 1 coin for anyone who participated
      const reward = Math.max(1, Math.floor(REWARD_POOL * contributionPercent));

      await ctx.db.patch(contribution._id, {
        rewardEarned: reward,
      });

      // Mark reward as earned but NOT claimed - player must click claim button
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", contribution.address))
        .first();

      // Reward saved in contribution, player must claim via UI
    }

    // Get top 10 contributors for history
    const topContributors = contributions
      .sort((a, b) => b.damageDealt - a.damageDealt)
      .slice(0, 10)
      .map((c) => ({
        address: c.address,
        username: c.username,
        damage: c.damageDealt,
        reward: c.rewardEarned,
      }));

    // Save to history
    const duration = Math.floor((defeatedBoss.defeatedAt! - defeatedBoss.spawnedAt) / 1000);

    await ctx.db.insert("raidHistory", {
      bossIndex: defeatedBoss.bossIndex,
      collection: defeatedBoss.collection!,
      rarity: defeatedBoss.rarity,
      name: defeatedBoss.name,
      imageUrl: defeatedBoss.imageUrl,
      maxHp: defeatedBoss.maxHp,
      totalDamage,
      totalPlayers: contributions.length,
      totalAttacks: contributions.reduce((sum, c) => sum + c.attackCount, 0),
      topContributors,
      spawnedAt: defeatedBoss.spawnedAt,
      defeatedAt: defeatedBoss.defeatedAt!,
      duration,
    });

    // Update player boss kill counts
    for (const contribution of contributions) {
      const raidDeck = await ctx.db
        .query("raidAttacks")
        .withIndex("by_address", (q) => q.eq("address", contribution.address))
        .first();

      if (raidDeck) {
        await ctx.db.patch(raidDeck._id, {
          bossesKilled: raidDeck.bossesKilled + 1,
        });
      }
    }

    // Delete old boss
    await ctx.db.delete(defeatedBoss._id);

    // Spawn next boss
    const nextBossIndex = (defeatedBoss.bossIndex + 1) % 50; // Loop through 50 bosses
    const nextBossCard = getCurrentBoss(nextBossIndex);

    if (!nextBossCard) {
      throw new Error("Failed to get next boss card");
    }

    const rarity = nextBossCard.rarity.toLowerCase() as Lowercase<CardRarity>;
    const maxHp = BOSS_HP_BY_RARITY[rarity];

    await ctx.db.insert("raidBoss", {
      bossIndex: nextBossIndex,
      collection: nextBossCard.collection!,
      rarity: nextBossCard.rarity,
      tokenId: nextBossCard.tokenId,
      name: nextBossCard.name,
      imageUrl: nextBossCard.imageUrl,
      power: nextBossCard.power,
      maxHp,
      currentHp: maxHp,
      status: "active",
      spawnedAt: now,
    });

    // Schedule notifications to all contributors
    try {
      await ctx.scheduler.runAfter(0, internal.notifications.sendBossDefeatedNotifications, {
        bossName: defeatedBoss.name,
        bossRarity: defeatedBoss.rarity,
        totalContributors: contributions.length,
        contributorAddresses: contributions.map(c => c.address),
      });
      console.log(`📢 Scheduled boss defeated notifications for ${contributions.length} contributors`);
    } catch (error) {
      console.error("Failed to schedule boss notifications:", error);
    }

    return {
      success: true,
      defeatedBoss: defeatedBoss.name,
      nextBoss: nextBossCard.name,
      totalContributors: contributions.length,
      totalDamage,
    };
  },
});

/**
 * Get player's unclaimed raid boss rewards
 */
export const getUnclaimedRewards = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();

    // Get all unclaimed contributions with rewards
    const unclaimedContributions = await ctx.db
      .query("raidContributions")
      .withIndex("by_player", (q) => q.eq("address", normalizedAddress))
      .filter((q) =>
        q.and(
          q.eq(q.field("rewardClaimed"), false),
          q.gt(q.field("rewardEarned"), 0)
        )
      )
      .collect();

    const totalUnclaimed = unclaimedContributions.reduce(
      (sum, c) => sum + c.rewardEarned,
      0
    );

    return {
      contributions: unclaimedContributions,
      totalUnclaimed,
      count: unclaimedContributions.length,
    };
  },
});

/**
 * Claim all pending raid boss rewards
 */
export const claimRaidRewards = mutation({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();

    // Get all unclaimed contributions
    const unclaimedContributions = await ctx.db
      .query("raidContributions")
      .withIndex("by_player", (q) => q.eq("address", normalizedAddress))
      .filter((q) =>
        q.and(
          q.eq(q.field("rewardClaimed"), false),
          q.gt(q.field("rewardEarned"), 0)
        )
      )
      .collect();

    if (unclaimedContributions.length === 0) {
      return {
        success: false,
        message: "No unclaimed rewards",
        totalClaimed: 0,
      };
    }

    const totalReward = unclaimedContributions.reduce(
      (sum, c) => sum + c.rewardEarned,
      0
    );

    // Get player profile to add coins
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      return { success: false, message: "Profile not found", totalClaimed: 0 };
    }

    // Mark all as claimed
    for (const contribution of unclaimedContributions) {
      await ctx.db.patch(contribution._id, {
        rewardClaimed: true,
      });
    }

    // Add total reward to player COINS
    await ctx.db.patch(profile._id, {
      coins: (profile.coins || 0) + totalReward,
      lifetimeEarned: (profile.lifetimeEarned || 0) + totalReward,
    });

    console.log("Claimed " + totalReward + " coins for " + normalizedAddress);

    return {
      success: true,
      totalClaimed: totalReward,
      claimedCount: unclaimedContributions.length,
      newBalance: (profile.coins || 0) + totalReward,
    };
  },
});

/**
 * Get ALL raid contributions (admin function)
 * 🚀 BANDWIDTH FIX: Converted to internalQuery to prevent public abuse
 * 🚀 BANDWIDTH FIX: Limited to 500 contributions max
 */
export const getAllContributions = internalQuery({
  handler: async (ctx) => {
    // 🚀 BANDWIDTH FIX: Limit to 500 contributions max
    const allContributions = await ctx.db.query("raidContributions").take(500);
    return allContributions;
  },
});

/**
 * Manually distribute rewards for a boss (admin function)
 * Use this when boss was defeated but rewards weren't distributed
 */
export const manualDistributeRewards = internalMutation({
  args: { bossIndex: v.number() },
  handler: async (ctx, { bossIndex }) => {
    // Get all contributions for this boss
    const contributions = await ctx.db
      .query("raidContributions")
      .withIndex("by_boss_player", (q) => q.eq("bossIndex", bossIndex))
      .collect();

    if (contributions.length === 0) {
      return { success: false, message: "No contributions found for this boss" };
    }

    // Calculate total damage
    const totalDamage = contributions.reduce((sum, c) => sum + c.damageDealt, 0);

    // Get boss rarity (default to common if not found)
    const boss = await ctx.db
      .query("raidBoss")
      .filter((q) => q.eq(q.field("bossIndex"), bossIndex))
      .first();

    const bossRarity = (boss?.rarity?.toLowerCase() || "common") as Lowercase<CardRarity>;
    const REWARD_POOL = BOSS_REWARDS_BY_RARITY[bossRarity];

    let totalDistributed = 0;
    const rewards: { address: string; reward: number }[] = [];

    for (const contribution of contributions) {
      const contributionPercent = totalDamage > 0 ? contribution.damageDealt / totalDamage : 0;
      const reward = Math.max(1, Math.floor(REWARD_POOL * contributionPercent));

      // Update contribution with reward
      await ctx.db.patch(contribution._id, {
        rewardEarned: reward,
      });

      // Add reward to player's inbox
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", contribution.address))
        .first();

      if (profile) {
        // Reward saved in contribution, player must claim via UI
        totalDistributed += reward;
        rewards.push({ address: contribution.address, reward });
      }
    }

    console.log("Manually distributed " + totalDistributed + " TESTVBMS to " + contributions.length + " players for boss #" + bossIndex);

    return {
      success: true,
      totalDistributed,
      contributors: contributions.length,
      rewards,
    };
  },
});

/**
 * Get any player's raid deck by address (for viewing from leaderboard)
 * 🔗 MULTI-WALLET: Uses primary address for linked wallets
 */
export const getPlayerRaidDeckByAddress = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    // 🔗 Resolve to primary address if this is a linked wallet
    const primaryAddress = await resolvePrimaryAddress(ctx, args.address);

    const raidDeck = await ctx.db
      .query("raidAttacks")
      .withIndex("by_address", (q) => q.eq("address", primaryAddress))
      .first();

    if (!raidDeck) return null;

    // Get player profile for username
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", primaryAddress))
      .first();

    return {
      address: raidDeck.address,
      username: profile?.username || raidDeck.address.slice(0, 8),
      deck: raidDeck.deck,
      vibefidCard: raidDeck.vibefidCard,
      deckPower: raidDeck.deckPower,
      totalDamageDealt: raidDeck.totalDamageDealt,
      bossesKilled: raidDeck.bossesKilled,
      cardEnergy: raidDeck.cardEnergy,
    };
  },
});

/**
 * 🧹 CLEANUP: Delete raid data for a wallet being linked/merged
 * Called when a wallet is linked to a primary profile
 * INTERNAL: Called from profiles.ts during link/merge operations
 */
export const cleanupLinkedWalletRaidData = internalMutation({
  args: {
    linkedAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const address = args.linkedAddress.toLowerCase();

    // Find and delete raid deck for this address
    const raidDeck = await ctx.db
      .query("raidAttacks")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();

    if (raidDeck) {
      await ctx.db.delete(raidDeck._id);
      console.log(`🧹 Deleted raid deck for linked wallet: ${address}`);
    }

    // Find and delete all contributions for this address
    const contributions = await ctx.db
      .query("raidContributions")
      .filter((q) => q.eq(q.field("address"), address))
      .collect();

    for (const contribution of contributions) {
      await ctx.db.delete(contribution._id);
    }

    if (contributions.length > 0) {
      console.log(`🧹 Deleted ${contributions.length} contributions for linked wallet: ${address}`);
    }

    return {
      deletedRaidDeck: !!raidDeck,
      deletedContributions: contributions.length,
    };
  },
});
