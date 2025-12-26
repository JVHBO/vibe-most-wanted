/**
 * CARD PACKS SYSTEM
 *
 * Free gacha system for non-NFT cards
 * - Players earn packs from missions/achievements
 * - Players can BUY packs with $VBMS tokens
 * - Opening packs gives random cards with rarity system
 * - All cards have "FREE CARD" badge
 */

import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * 🔒 SECURITY FIX: Crypto-secure random functions
 * Math.random() is predictable and can be exploited
 */
function cryptoRandomFloat(): number {
  const randomBytes = new Uint32Array(1);
  crypto.getRandomValues(randomBytes);
  return randomBytes[0] / (0xFFFFFFFF + 1);
}

function cryptoRandomInt(max: number): number {
  const randomBytes = new Uint32Array(1);
  crypto.getRandomValues(randomBytes);
  return randomBytes[0] % max;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PACK DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const PACK_TYPES = {
  starter: {
    name: "Starter Pack",
    description: "Welcome pack for new players",
    cards: 3,
    price: 0, // Free
    rarityOdds: { Common: 93, Rare: 6, Epic: 0.8, Legendary: 0.2 },
  },
  basic: {
    name: "Basic Pack",
    description: "1 card per pack",
    cards: 1,
    price: 1000, // 1k coins = 1 card
    rarityOdds: { Common: 93, Rare: 6, Epic: 0.8, Legendary: 0.2 },
  },
  premium: {
    name: "Premium Pack",
    description: "Better odds for rare and epic",
    cards: 5,
    price: 10000, // 10k coins - 5x mais caro
    rarityOdds: { Common: 93, Rare: 6, Epic: 0.8, Legendary: 0.2 },
  },
  elite: {
    name: "Elite Pack",
    description: "Best odds - Guaranteed rare or better",
    cards: 5,
    price: 100000, // 100k coins - EQUIVALENTE A 1 PACK NFT REAL!
    rarityOdds: { Common: 93, Rare: 6, Epic: 0.8, Legendary: 0.2 },
  },
  boosted: {
    name: "Luck Boost Pack",
    description: "1 card with better odds",
    cards: 1,
    price: 5000, // 5x basic price for better odds on 1 card
    // BALANCED: 74/19/6/1 gives ~0% PnL (break-even)
    rarityOdds: { Common: 74, Rare: 19, Epic: 6, Legendary: 1 },
  },
  mission: {
    name: "Mission Reward",
    description: "Earned from completing missions",
    cards: 2,
    price: 0, // Earned, not bought
    rarityOdds: { Common: 93, Rare: 6, Epic: 0.8, Legendary: 0.2 },
  },
  achievement: {
    name: "Achievement Pack",
    description: "Special achievement reward",
    cards: 3,
    price: 0, // Earned, not bought
    rarityOdds: { Common: 93, Rare: 6, Epic: 0.8, Legendary: 0.2 },
  },
  dailyFree: {
    name: "Daily Free Pack",
    description: "Free daily shot - claim once per day!",
    cards: 1,
    price: 0, // FREE!
    rarityOdds: { Common: 93, Rare: 6, Epic: 0.8, Legendary: 0.2 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARD DEFINITIONS (52-card deck + variants)
// ═══════════════════════════════════════════════════════════════════════════════

const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const VARIANTS = {
  default: { rarity: "common", suffix: "" },
  gold: { rarity: "rare", suffix: "_gold" },
  neon: { rarity: "epic", suffix: "_neon" },
  cosmic: { rarity: "legendary", suffix: "_cosmic" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Roll rarity based on odds
 */
function rollRarity(odds: Record<string, number>): string {
  const total = Object.values(odds).reduce((a, b) => a + b, 0);
  let roll = cryptoRandomFloat() * total;

  for (const [rarity, chance] of Object.entries(odds)) {
    roll -= chance;
    if (roll <= 0) return rarity;
  }

  return "common"; // Fallback
}

// Available card images per rarity (ONLY from Desktop/images/Unknown)
const CARD_IMAGES = {
  common: 3,      // proxy (5), (6), (7)
  rare: 3,        // proxy, proxy (1), (8)
  epic: 3,        // proxy (1), (2), (3)
  legendary: 2,   // proxy, proxy (4)
};

// Foil types (NERFED for FREE cards - much harder to get foil)
const FOIL_TYPES = ["None", "Standard", "Prize"];
const FOIL_ODDS = { None: 92, Standard: 7, Prize: 1 }; // Only 8% foil chance (was 30%)

// Wear levels (NERFED for FREE cards - harder to get good wear)
const WEAR_LEVELS = ["Pristine", "Mint", "Lightly Played", "Moderately Played", "Heavily Played"];
const WEAR_ODDS = { Pristine: 2, Mint: 10, "Lightly Played": 33, "Moderately Played": 35, "Heavily Played": 20 }; // More bad wear

/**
 * Calculate card power (FREE cards have 20% less power than NFTs)
 * Formula: power = rarity_base × wear_multiplier × foil_multiplier × 0.8 (FREE penalty)
 */
function calculateCardPower(rarity: string, wear: string, foil?: string): number {
  // Base power by rarity (exact NFT values)
  const rarityBase: Record<string, number> = {
    Common: 5,
    Rare: 20,
    Epic: 80,
    Legendary: 240,
    Mythic: 800,
  };

  // Wear multiplier (exact NFT values)
  const wearMultiplier: Record<string, number> = {
    Pristine: 1.8,
    Mint: 1.4,
    "Lightly Played": 1.0,
    "Moderately Played": 1.0,
    "Heavily Played": 1.0,
  };

  // Foil multiplier (exact NFT values)
  const foilMultiplier: Record<string, number> = {
    Prize: 15.0,
    Standard: 2.5,
    None: 1.0,
  };

  const base = rarityBase[rarity] || 5;
  const wearMult = wearMultiplier[wear] || 1.0;
  const foilMult = foil ? (foilMultiplier[foil] || 1.0) : 1.0;

  // FREE cards have 20% less power (×0.8)
  const power = base * wearMult * foilMult * 0.8;

  return Math.max(1, Math.round(power));
}

/**
 * Generate random card based on rarity
 */
function generateRandomCard(rarity: string) {
  // Pick random card image from the rarity pool
  const rarityLower = rarity.toLowerCase();
  const imageCount = CARD_IMAGES[rarityLower as keyof typeof CARD_IMAGES] || 1;
  const imageIndex = cryptoRandomInt(imageCount);

  // Roll foil type
  const foil = rollRarity(FOIL_ODDS);

  // Roll wear level
  const wear = rollRarity(WEAR_ODDS);

  // Generate unique card ID with traits
  const cardId = `${rarity}_${imageIndex}_${foil}_${wear}_${Date.now()}`;
  const imageUrl = `/cards/${rarity.toLowerCase()}/`; // Lowercase folder names

  // Map image files (ONLY images from Desktop/images/Unknown folder)
  const imageFiles: Record<string, string[]> = {
    common: ["proxy (5).png", "proxy (6).png", "proxy (7).png"],
    rare: ["proxy.png", "proxy (1).png", "proxy (8).png"],
    epic: ["proxy (1).png", "proxy (2).png", "proxy (3).png"],
    legendary: ["proxy.png", "proxy (4).png"],
  };

  const fileName = imageFiles[rarityLower as keyof typeof imageFiles]?.[imageIndex] || imageFiles[rarityLower as keyof typeof imageFiles]?.[0] || "proxy (5).png";

  // Calculate power (EXACTLY same as NFT cards)
  const power = calculateCardPower(rarity, wear, foil !== "None" ? foil : undefined);

  return {
    cardId,
    suit: rarity, // Using rarity as identifier
    rank: fileName.replace('.png', ''), // Image name as rank
    variant: "default",
    rarity,
    imageUrl: `${imageUrl}${encodeURIComponent(fileName)}`,
    badgeType: "FREE_CARD" as const,
    foil: foil !== "None" ? foil : undefined, // Only include if special
    wear,
    power, // Power calculated EXACTLY same as NFT
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get player's unopened packs
 */
export const getPlayerPacks = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const packs = await ctx.db
      .query("cardPacks")
      .withIndex("by_address", (q) => q.eq("address", args.address.toLowerCase()))
      .filter((q) => q.gt(q.field("unopened"), 0))
      .collect();

    return packs.map(pack => ({
      ...pack,
      packInfo: PACK_TYPES[pack.packType as keyof typeof PACK_TYPES],
    }));
  },
});

/**
 * Get shop packs available for purchase
 * SIMPLIFIED: Only basic pack available now
 */
export const getShopPacks = query({
  args: {},
  handler: async () => {
    return [
      { type: "basic", ...PACK_TYPES.basic },
    ];
  },
});

/**
 * Get player's card inventory
 */
export const getPlayerCards = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("cardInventory")
      .withIndex("by_address", (q) => q.eq("address", args.address.toLowerCase()))
      .collect();

    return cards;
  },
});

/**
 * Get locked FREE card IDs (cards in defense deck or active raid)
 * These cards cannot be burned
 */
export const getLockedFreeCardIds = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const normalizedAddress = args.address.toLowerCase();
    const lockedIds: string[] = [];

    // Check defense deck for FREE cards
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (profile?.defenseDeck) {
      for (const card of profile.defenseDeck) {
        if (typeof card === 'object' && card !== null && 'tokenId' in card) {
          // FREE cards have collection='free' or isFreeCard flag
          // Their tokenId is the cardInventory _id
          if (card.collection === 'free') {
            lockedIds.push(card.tokenId);
          }
        }
      }
    }

    // Check raid deck for FREE cards
    const raidDeck = await ctx.db
      .query("raidAttacks")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (raidDeck?.deck) {
      for (const card of raidDeck.deck) {
        if (card.isFreeCard && card.tokenId) {
          // Don't add duplicates
          if (!lockedIds.includes(card.tokenId)) {
            lockedIds.push(card.tokenId);
          }
        }
      }
    }

    return lockedIds;
  },
});

/**
 * Get total FREE cards statistics
 * 🚀 PERF: Changed to internalQuery - full table scan should not be public
 */
export const getFreeCardsStats = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allCards = await ctx.db.query("cardInventory").collect();

    const totalCards = allCards.reduce((sum, card) => sum + card.quantity, 0);
    const uniquePlayers = new Set(allCards.map(c => c.address)).size;
    const byRarity = {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    };

    allCards.forEach(card => {
      const rarity = card.rarity.toLowerCase();
      if (rarity in byRarity) {
        byRarity[rarity as keyof typeof byRarity] += card.quantity;
      }
    });

    return {
      totalCards,
      uniqueCards: allCards.length,
      uniquePlayers,
      byRarity,
    };
  },
});

/**
 * DEBUG: Get sample cards with full details
 * 🚀 BANDWIDTH FIX: Changed to internalQuery and use .take() not .collect()
 * Use via: npx convex run cardPacks:debugAllCards --env-file .env.prod
 */
export const debugAllCards = internalQuery({
  args: {},
  handler: async (ctx) => {
    // 🚀 BANDWIDTH FIX: Only fetch 20 cards directly, not ALL then slice
    const sampleCards = await ctx.db.query("cardInventory").take(20);
    return {
      sampleSize: sampleCards.length,
      note: "This is a sample. Use admin tools for full counts.",
      cards: sampleCards.map(card => ({
        id: card._id,
        address: card.address,
        cardId: card.cardId,
        rarity: card.rarity,
        imageUrl: card.imageUrl,
        quantity: card.quantity,
        power: card.power,
      })),
    };
  },
});

/**
 * MIGRATION: Normalize all addresses to lowercase in cardInventory
 */
export const normalizeCardAddresses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allCards = await ctx.db.query("cardInventory").collect();
    let updatedCount = 0;

    for (const card of allCards) {
      const lowercaseAddress = card.address.toLowerCase();

      // Only update if address is not already lowercase
      if (card.address !== lowercaseAddress) {
        await ctx.db.patch(card._id, {
          address: lowercaseAddress,
        });
        updatedCount++;
      }
    }

    return {
      success: true,
      totalCards: allCards.length,
      updatedCards: updatedCount,
      message: `Normalized ${updatedCount} card addresses to lowercase!`,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * BUY pack with $VBMS tokens
 * Player spends VBMS from their inbox/balance to buy packs
 */
export const buyPack = mutation({
  args: {
    address: v.string(),
    packType: v.union(v.literal("basic"), v.literal("premium"), v.literal("elite")),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const address = args.address.toLowerCase();

    // Get pack info
    const packInfo = PACK_TYPES[args.packType];
    if (!packInfo || packInfo.price === 0) {
      throw new Error("This pack type cannot be purchased");
    }

    // Calculate total cost
    const totalCost = packInfo.price * args.quantity;

    // Get player profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Check if player has enough coins
    const coins = profile.coins || 0;
    if (coins < totalCost) {
      throw new Error(`Not enough coins. Need ${totalCost} coins, have ${coins} coins`);
    }

    // Deduct coins
    await ctx.db.patch(profile._id, {
      coins: coins - totalCost,
      lifetimeSpent: (profile.lifetimeSpent || 0) + totalCost,
    });

    // Give packs to player
    // 🚀 PERF: Use compound index instead of filter
    const existingPack = await ctx.db
      .query("cardPacks")
      .withIndex("by_address_packType", (q) => q.eq("address", address).eq("packType", args.packType))
      .first();

    if (existingPack) {
      // Add to existing pack count
      await ctx.db.patch(existingPack._id, {
        unopened: existingPack.unopened + args.quantity,
      });
    } else {
      // Create new pack entry
      await ctx.db.insert("cardPacks", {
        address,
        packType: args.packType,
        unopened: args.quantity,
        earnedAt: Date.now(),
      });
    }

    return {
      success: true,
      packsReceived: args.quantity,
      coinsSpent: totalCost,
      remainingCoins: coins - totalCost,
    };
  },
});

/**
 * BUY pack with VBMS from blockchain
 * Called by API after VBMS transfer is confirmed on-chain
 */
export const buyPackWithVBMS = mutation({
  args: {
    address: v.string(),
    packType: v.union(v.literal("basic"), v.literal("premium"), v.literal("elite"), v.literal("boosted")),
    quantity: v.number(),
    txHash: v.string(), // Transaction hash for verification
  },
  handler: async (ctx, args) => {
    const address = args.address.toLowerCase();

    // Use pack type directly - "boosted" now has its own definition with 1 card + elite odds
    const actualPackType = args.packType;

    // Get pack info
    const packInfo = PACK_TYPES[actualPackType];
    if (!packInfo || packInfo.price === 0) {
      throw new Error("This pack type cannot be purchased");
    }

    // Get player profile (create if doesn't exist)
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Give packs to player (stored as actualPackType for correct odds)
    // 🚀 PERF: Use compound index instead of filter
    const existingPack = await ctx.db
      .query("cardPacks")
      .withIndex("by_address_packType", (q) => q.eq("address", address).eq("packType", actualPackType))
      .first();

    if (existingPack) {
      // Add to existing pack count
      await ctx.db.patch(existingPack._id, {
        unopened: existingPack.unopened + args.quantity,
      });
    } else {
      // Create new pack entry
      await ctx.db.insert("cardPacks", {
        address,
        packType: actualPackType,
        unopened: args.quantity,
        earnedAt: Date.now(),
      });
    }

    console.log(`💎 VBMS Purchase: ${address} bought ${args.quantity}x ${args.packType} (stored as ${actualPackType}) packs (tx: ${args.txHash.slice(0, 10)}...)`);

    return {
      success: true,
      packsReceived: args.quantity,
      txHash: args.txHash,
    };
  },
});

/**
 * OPEN pack and reveal cards
 */
export const openPack = mutation({
  args: {
    address: v.string(),
    packId: v.id("cardPacks"),
  },
  handler: async (ctx, args) => {
    const address = args.address.toLowerCase();

    // Get pack
    const pack = await ctx.db.get(args.packId);
    if (!pack) {
      throw new Error("Pack not found");
    }

    if (pack.address !== address) {
      throw new Error("Not your pack");
    }

    if (pack.unopened <= 0) {
      throw new Error("No unopened packs");
    }

    // Get pack type info
    const packInfo = PACK_TYPES[pack.packType as keyof typeof PACK_TYPES];
    if (!packInfo) {
      throw new Error("Invalid pack type");
    }

    // Generate cards based on pack rarity odds
    const revealedCards = [];
    for (let i = 0; i < packInfo.cards; i++) {
      const rarity = rollRarity(packInfo.rarityOdds);
      const card = generateRandomCard(rarity);

      // Check if player already has this card
      const existingCard = await ctx.db
        .query("cardInventory")
        .withIndex("by_address", (q) => q.eq("address", address))
        .filter((q) => q.eq(q.field("cardId"), card.cardId))
        .first();

      if (existingCard) {
        // Increment quantity (duplicate)
        await ctx.db.patch(existingCard._id, {
          quantity: existingCard.quantity + 1,
        });
        // Show as individual card in animation (isDuplicate only affects "NEW!" badge)
        revealedCards.push({ ...card, isDuplicate: true, quantity: 1 });
      } else {
        // Add new card to inventory
        await ctx.db.insert("cardInventory", {
          address,
          ...card,
          quantity: 1,
          equipped: false,
          obtainedAt: Date.now(),
          sourcePackType: pack.packType, // Track pack origin for burn value
        });
        revealedCards.push({ ...card, isDuplicate: false, quantity: 1 });
      }
    }

    // Decrement unopened count
    await ctx.db.patch(args.packId, {
      unopened: pack.unopened - 1,
    });

    return {
      success: true,
      cards: revealedCards,
      packType: pack.packType,
      packsRemaining: pack.unopened - 1,
    };
  },
});

/**
 * Open ALL packs at once (for batch opening)
 */
export const openAllPacks = mutation({
  args: {
    address: v.string(),
    packId: v.id("cardPacks"),
  },
  handler: async (ctx, args) => {
    const address = args.address.toLowerCase();

    // Get pack
    const pack = await ctx.db.get(args.packId);
    if (!pack) {
      throw new Error("Pack not found");
    }

    if (pack.address !== address) {
      throw new Error("Not your pack");
    }

    if (pack.unopened <= 0) {
      throw new Error("No unopened packs");
    }

    // Get pack type info
    const packInfo = PACK_TYPES[pack.packType as keyof typeof PACK_TYPES];
    if (!packInfo) {
      throw new Error("Invalid pack type");
    }

    // Open ALL packs at once
    const allRevealedCards = [];
    const totalPacks = pack.unopened;
    
    for (let p = 0; p < totalPacks; p++) {
      // Generate cards for this pack
      for (let i = 0; i < packInfo.cards; i++) {
        const rarity = rollRarity(packInfo.rarityOdds);
        const card = generateRandomCard(rarity);

        // Check if player already has this card
        const existingCard = await ctx.db
          .query("cardInventory")
          .withIndex("by_address", (q) => q.eq("address", address))
          .filter((q) => q.eq(q.field("cardId"), card.cardId))
          .first();

        if (existingCard) {
          // Increment quantity (duplicate)
          await ctx.db.patch(existingCard._id, {
            quantity: existingCard.quantity + 1,
          });
          // Show as individual card in animation (isDuplicate only affects "NEW!" badge)
          allRevealedCards.push({ ...card, isDuplicate: true, quantity: 1 });
        } else {
          // Add new card to inventory
          await ctx.db.insert("cardInventory", {
            address,
            ...card,
            quantity: 1,
            equipped: false,
            obtainedAt: Date.now(),
            sourcePackType: pack.packType, // Track pack origin for burn value
          });
          allRevealedCards.push({ ...card, isDuplicate: false, quantity: 1 });
        }
      }
    }

    // Set unopened to 0
    await ctx.db.patch(args.packId, {
      unopened: 0,
    });

    return {
      success: true,
      cards: allRevealedCards,
      packType: pack.packType,
      packsOpened: totalPacks,
      packsRemaining: 0,
    };
  },
});

/**
 * AWARD pack to player (for missions/achievements)
 */
export const awardPack = mutation({
  args: {
    address: v.string(),
    packType: v.string(),
    quantity: v.number(),
    sourceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const address = args.address.toLowerCase();

    // Check if pack type exists
    if (!(args.packType in PACK_TYPES)) {
      throw new Error("Invalid pack type");
    }

    // Find existing pack
    // 🚀 PERF: Use compound index
    const existingPack = await ctx.db
      .query("cardPacks")
      .withIndex("by_address_packType", (q) => q.eq("address", address).eq("packType", args.packType))
      .first();

    if (existingPack) {
      // Add to existing
      await ctx.db.patch(existingPack._id, {
        unopened: existingPack.unopened + args.quantity,
      });
    } else {
      // Create new
      await ctx.db.insert("cardPacks", {
        address,
        packType: args.packType,
        unopened: args.quantity,
        sourceId: args.sourceId,
        earnedAt: Date.now(),
      });
    }

    return {
      success: true,
      packsAwarded: args.quantity,
    };
  },
});

/**
 * Give starter pack to new players
 */
export const giveStarterPack = mutation({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const address = args.address.toLowerCase();

    // Check if player already got starter pack
    // 🚀 PERF: Use compound index
    const existingStarter = await ctx.db
      .query("cardPacks")
      .withIndex("by_address_packType", (q) => q.eq("address", address).eq("packType", "starter"))
      .first();

    if (existingStarter) {
      return { success: false, message: "Starter pack already claimed" };
    }

    // Give starter pack
    await ctx.db.insert("cardPacks", {
      address,
      packType: "starter",
      unopened: 1,
      earnedAt: Date.now(),
    });

    return { success: true, message: "Starter pack awarded!" };
  },
});

/**
 * Give FREE pack reward for sharing profile (ONE-TIME ONLY)
 * - First time sharing your profile = 1 FREE pack
 * - Can only be claimed once per account
 * - Daily shares give tokens instead (see economy.ts)
 */
export const rewardProfileShare = mutation({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const address = args.address.toLowerCase();
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Get profile to check last share date
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();

    if (!profile) {
      return { success: false, message: "Profile not found" };
    }

    // Check if already claimed FREE pack
    if (profile.hasClaimedSharePack) {
      return {
        success: false,
        message: "You already claimed your FREE pack for sharing! Daily shares give tokens instead."
      };
    }

    // Award FREE pack
    // 🚀 PERF: Use compound index
    const existingPack = await ctx.db
      .query("cardPacks")
      .withIndex("by_address_packType", (q) => q.eq("address", address).eq("packType", "basic"))
      .first();

    if (existingPack) {
      // Increment existing pack
      await ctx.db.patch(existingPack._id, {
        unopened: existingPack.unopened + 1,
      });
    } else {
      // Create new pack
      await ctx.db.insert("cardPacks", {
        address,
        packType: "basic",
        unopened: 1,
        earnedAt: now,
      });
    }

    // Update profile - mark pack as claimed
    // NOTE: Don't set lastShareDate here! That's for daily token rewards only.
    // This allows user to get pack + daily tokens on the same day.
    await ctx.db.patch(profile._id, {
      hasClaimedSharePack: true,
      hasSharedProfile: true,
    });

    return {
      success: true,
      message: "FREE pack awarded for sharing! Open it in the Shop. Daily shares give tokens."
    };
  },
});

/**
 * ADMIN: Fix existing FREE card image URLs with proper encoding
 * Corrects old URLs without %20 encoding to properly encoded URLs
 */
export const updateAllCardImages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const newImageMapping: Record<string, string[]> = {
      common: ["proxy (5).png", "proxy (6).png", "proxy (7).png"],
      rare: ["proxy.png", "proxy (1).png", "proxy (8).png"],
      epic: ["proxy (1).png", "proxy (2).png", "proxy (3).png"],
      legendary: ["proxy.png", "proxy (4).png"],
    };

    const allCards = await ctx.db.query("cardInventory").collect();
    let updatedCount = 0;
    const updates: string[] = [];

    for (const card of allCards) {
      const rarity = card.rarity.toLowerCase();
      const newImages = newImageMapping[rarity as keyof typeof newImageMapping];

      if (newImages && newImages.length > 0) {
        // Check if URL needs fixing (unencoded spaces or old proxy- format)
        // Correct URLs should have %20, not literal spaces
        const hasUnencodedSpace = card.imageUrl.includes(' ');
        const hasOldFormat = card.imageUrl.includes('proxy-');
        const needsUpdate = hasUnencodedSpace || hasOldFormat;

        if (needsUpdate) {
          // Pick a random new image for this rarity
          const randomIndex = cryptoRandomInt(newImages.length);
          const newImageFile = newImages[randomIndex];
          const newImageUrl = `/cards/${rarity}/${encodeURIComponent(newImageFile)}`;

          await ctx.db.patch(card._id, {
            imageUrl: newImageUrl,
          });
          updates.push(`${card.cardId}: ${card.imageUrl} -> ${newImageUrl}`);
          updatedCount++;
        }
      }
    }

    return {
      success: true,
      updatedCards: updatedCount,
      totalCards: allCards.length,
      updates: updates.slice(0, 10), // First 10 updates for logging
      message: updatedCount > 0
        ? `Updated ${updatedCount} cards with corrected image URLs!`
        : `All ${allCards.length} cards already have correct URLs!`,
    };
  },
});

/**
 * ADMIN: Delete FREE cards for a specific username and give compensation pack
 */
export const resetUserFreeCards = internalMutation({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    // Find user profile by username
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", username.toLowerCase()))
      .first();

    if (!profile) {
      return {
        success: false,
        error: `Profile not found for username: ${username}`,
      };
    }

    const address = profile.address;
    console.log("🔍 Found profile:", { username, address });

    // Get user's cards
    const userCards = await ctx.db
      .query("cardInventory")
      .withIndex("by_address", (q) => q.eq("address", address))
      .collect();

    console.log("🎴 User has", userCards.length, "cards");

    // Delete all user's cards
    let deletedCount = 0;
    for (const card of userCards) {
      await ctx.db.delete(card._id);
      deletedCount++;
    }
    console.log("🗑️ Deleted", deletedCount, "cards");

    // Give compensation pack
    // 🚀 PERF: Use compound index
    const existingPack = await ctx.db
      .query("cardPacks")
      .withIndex("by_address_packType", (q) => q.eq("address", address).eq("packType", "basic"))
      .first();

    if (existingPack) {
      await ctx.db.patch(existingPack._id, {
        unopened: existingPack.unopened + 1,
      });
      console.log("🎁 Added 1 pack to existing pack (total:", existingPack.unopened + 1, ")");
    } else {
      await ctx.db.insert("cardPacks", {
        address,
        packType: "basic",
        unopened: 1,
        sourceId: "reset_compensation",
        earnedAt: Date.now(),
      });
      console.log("🎁 Created new pack with 1 unopened");
    }

    return {
      success: true,
      username,
      address,
      cardsDeleted: deletedCount,
      packGiven: true,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// BURN SYSTEM - Convert cards back to TESTVBMS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Burn values based on PACK PRICE (not just rarity!)
 * Cards from more expensive packs burn for more!
 *
 * Formula: burnValue = packPrice * rarityMultiplier * foilMultiplier
 *
 * Rarity multipliers (relative to pack price):
 * - Common: 0.2x (20% of pack price)
 * - Rare: 1.1x (110% of pack price)
 * - Epic: 4x (400% of pack price)
 * - Legendary: 40x (4000% of pack price)
 *
 * Example with Boosted pack (5000 VBMS) vs Basic (1000 VBMS):
 * - Common Basic: 1000 * 0.2 = 200 VBMS
 * - Common Boosted: 5000 * 0.2 = 1000 VBMS (5x more!)
 */

// Rarity multipliers (relative to pack price)
const BURN_RARITY_MULTIPLIER: Record<string, number> = {
  Common: 0.2,      // 20% of pack price
  Rare: 1.1,        // 110% of pack price
  Epic: 4.0,        // 4x pack price
  Legendary: 40.0,  // 40x pack price
};

// Foil burn multipliers - foil cards are worth more when burned!
const BURN_FOIL_MULTIPLIER: Record<string, number> = {
  Prize: 5.0,     // 5x burn value for Prize foil (nerfed from 10x)
  Standard: 1.5,  // 1.5x burn value for Standard foil (nerfed from 2x)
  None: 1.0,      // Normal burn value
};

// Default pack price for cards without sourcePackType (legacy cards)
const DEFAULT_PACK_PRICE = 1000; // Basic pack price

// Helper function to get pack price
function getPackPrice(packType?: string): number {
  if (!packType) return DEFAULT_PACK_PRICE;
  const pack = PACK_TYPES[packType as keyof typeof PACK_TYPES];
  // For free packs (price 0), use basic pack price as minimum
  return pack ? (pack.price > 0 ? pack.price : DEFAULT_PACK_PRICE) : DEFAULT_PACK_PRICE;
}

// Legacy BURN_VALUES for backwards compatibility (getBurnValues query)
const BURN_VALUES: Record<string, number> = {
  Common: 200,      // 20% of basic pack price (1000)
  Rare: 1100,       // 110% of basic pack price
  Epic: 4000,       // 4x basic pack price
  Legendary: 40000, // 40x basic pack price
};

// Helper function to calculate burn value based on pack price
function calculateBurnValue(rarity: string, foil?: string, sourcePackType?: string): number {
  const packPrice = getPackPrice(sourcePackType);
  const rarityMult = BURN_RARITY_MULTIPLIER[rarity] || 0.2;
  const foilMult = foil && foil !== "None" ? (BURN_FOIL_MULTIPLIER[foil] || 1.0) : 1.0;
  return Math.round(packPrice * rarityMult * foilMult);
}

/**
 * BURN card to get TESTVBMS back
 * Destroys the card and adds VBMS to player's coin balance
 */
export const burnCard = mutation({
  args: {
    address: v.string(),
    cardId: v.id("cardInventory"),
  },
  handler: async (ctx, args) => {
    const address = args.address.toLowerCase();

    // Get the card
    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    // Verify ownership
    if (card.address !== address) {
      throw new Error("Not your card");
    }

    // Get burn value based on rarity, foil, and pack origin
    const burnValue = calculateBurnValue(card.rarity, card.foil, card.sourcePackType);

    // Get player profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // If card has quantity > 1, decrement instead of delete
    if (card.quantity > 1) {
      await ctx.db.patch(args.cardId, {
        quantity: card.quantity - 1,
      });
    } else {
      // Delete the card completely
      await ctx.db.delete(args.cardId);
    }

    // Add VBMS to player's coins
    const currentCoins = profile.coins || 0;
    await ctx.db.patch(profile._id, {
      coins: currentCoins + burnValue,
    });

    console.log(`🔥 BURN: ${address} burned ${card.rarity} card for ${burnValue} VBMS`);

    return {
      success: true,
      burnedRarity: card.rarity,
      vbmsReceived: burnValue,
      newBalance: currentCoins + burnValue,
    };
  },
});

/**
 * Burn multiple cards at once
 */
export const burnMultipleCards = mutation({
  args: {
    address: v.string(),
    cardIds: v.array(v.id("cardInventory")),
  },
  handler: async (ctx, args) => {
    const address = args.address.toLowerCase();

    if (args.cardIds.length === 0) {
      throw new Error("No cards selected");
    }

    if (args.cardIds.length > 50) {
      throw new Error("Maximum 50 cards per burn");
    }

    // Get player profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    let totalVBMS = 0;
    const burnedCards: { rarity: string; count: number; vbms: number; packType?: string }[] = [];
    // Track by rarity + foil + packType for accurate summary
    const burnTracker: Record<string, { count: number; vbms: number; packType?: string }> = {};

    // Process each card
    for (const cardId of args.cardIds) {
      const card = await ctx.db.get(cardId);
      if (!card) continue;

      // Verify ownership
      if (card.address !== address) continue;

      // Calculate burn value with pack price
      const burnValue = calculateBurnValue(card.rarity, card.foil, card.sourcePackType);
      totalVBMS += burnValue;

      // Track by rarity + foil + packType for accurate summary
      const foilPart = card.foil && card.foil !== "None" ? `_${card.foil}` : "";
      const packPart = card.sourcePackType ? `_${card.sourcePackType}` : "";
      const trackKey = `${card.rarity}${foilPart}${packPart}`;

      if (!burnTracker[trackKey]) {
        burnTracker[trackKey] = { count: 0, vbms: 0, packType: card.sourcePackType };
      }
      burnTracker[trackKey].count += 1;
      burnTracker[trackKey].vbms += burnValue;

      // If card has quantity > 1, decrement instead of delete
      if (card.quantity > 1) {
        await ctx.db.patch(cardId, {
          quantity: card.quantity - 1,
        });
      } else {
        await ctx.db.delete(cardId);
      }
    }

    // Build summary from tracker
    for (const [trackKey, data] of Object.entries(burnTracker)) {
      // Extract just the rarity + foil part for display (without pack type)
      const parts = trackKey.split("_");
      const displayKey = parts.slice(0, parts[1] === "Prize" || parts[1] === "Standard" ? 2 : 1).join("_");

      burnedCards.push({
        rarity: displayKey,
        count: data.count,
        vbms: data.vbms,
        packType: data.packType,
      });
    }

    // Add VBMS to player's coins
    const currentCoins = profile.coins || 0;
    await ctx.db.patch(profile._id, {
      coins: currentCoins + totalVBMS,
    });

    console.log(`🔥 MASS BURN: ${address} burned ${args.cardIds.length} cards for ${totalVBMS} VBMS`);

    return {
      success: true,
      cardsBurned: args.cardIds.length,
      totalVBMS,
      burnedCards,
      newBalance: currentCoins + totalVBMS,
    };
  },
});

/**
 * Get burn values for UI display
 */
export const getBurnValues = query({
  args: {},
  handler: async () => {
    return BURN_VALUES;
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// LUCK BOOST - Elite odds for higher price
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * BUY pack with LUCK BOOST (pays more for elite odds)
 * Normal pack: 1000 VBMS, odds 93/6/0.8/0.2
 * Boosted pack: 5000 VBMS, odds 30/55/12/3 (elite odds!)
 */
export const buyPackWithLuckBoost = mutation({
  args: {
    address: v.string(),
    quantity: v.number(),
    boosted: v.boolean(), // true = elite odds for 5x price
  },
  handler: async (ctx, args) => {
    const address = args.address.toLowerCase();

    // Prices and odds
    const normalPrice = 1000;
    const boostedPrice = 5000; // 5x price for elite odds

    const price = args.boosted ? boostedPrice : normalPrice;
    const totalCost = price * args.quantity;

    // Get player profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Check coins
    const coins = profile.coins || 0;
    if (coins < totalCost) {
      throw new Error(`Not enough coins. Need ${totalCost}, have ${coins}`);
    }

    // Deduct coins
    await ctx.db.patch(profile._id, {
      coins: coins - totalCost,
      lifetimeSpent: (profile.lifetimeSpent || 0) + totalCost,
    });

    // Create packs with special type for boosted
    const packType = args.boosted ? "elite" : "basic";

    // 🚀 PERF: Use compound index
    const existingPack = await ctx.db
      .query("cardPacks")
      .withIndex("by_address_packType", (q) => q.eq("address", address).eq("packType", packType))
      .first();

    if (existingPack) {
      await ctx.db.patch(existingPack._id, {
        unopened: existingPack.unopened + args.quantity,
      });
    } else {
      await ctx.db.insert("cardPacks", {
        address,
        packType,
        unopened: args.quantity,
        earnedAt: Date.now(),
      });
    }

    console.log(`💰 Pack Purchase: ${address} bought ${args.quantity}x ${packType} pack(s) for ${totalCost} VBMS`);

    return {
      success: true,
      packsReceived: args.quantity,
      packType,
      coinsSpent: totalCost,
      remainingCoins: coins - totalCost,
      boosted: args.boosted,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY FREE PACK SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if player can claim daily free pack
 */
export const canClaimDailyFree = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const address = args.address.toLowerCase();

    // Get last claim record
    const lastClaim = await ctx.db
      .query("dailyFreeClaims")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();

    if (!lastClaim) {
      return { canClaim: true, nextClaimAt: null };
    }

    // Check if 24 hours have passed
    const now = Date.now();
    const lastClaimTime = lastClaim.claimedAt;
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const nextClaimAt = lastClaimTime + twentyFourHours;

    if (now >= nextClaimAt) {
      return { canClaim: true, nextClaimAt: null };
    }

    return {
      canClaim: false,
      nextClaimAt,
      timeRemaining: nextClaimAt - now,
    };
  },
});

/**
 * Claim daily free pack - gives a pack to open like normal packs
 */
export const claimDailyFreePack = mutation({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const address = args.address.toLowerCase();

    // Check if can claim
    const lastClaim = await ctx.db
      .query("dailyFreeClaims")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();

    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (lastClaim && now < lastClaim.claimedAt + twentyFourHours) {
      throw new Error("Already claimed today! Come back tomorrow.");
    }

    // Give pack to player (uses basic pack type for opening)
    // 🚀 PERF: Use compound index
    const existingPack = await ctx.db
      .query("cardPacks")
      .withIndex("by_address_packType", (q) => q.eq("address", address).eq("packType", "basic"))
      .first();

    if (existingPack) {
      await ctx.db.patch(existingPack._id, {
        unopened: existingPack.unopened + 1,
      });
    } else {
      await ctx.db.insert("cardPacks", {
        address,
        packType: "basic",
        unopened: 1,
        sourceId: "daily_free",
        earnedAt: now,
      });
    }

    // Update or create claim record
    if (lastClaim) {
      await ctx.db.patch(lastClaim._id, {
        claimedAt: now,
        totalClaims: (lastClaim.totalClaims || 0) + 1,
      });
    } else {
      await ctx.db.insert("dailyFreeClaims", {
        address,
        claimedAt: now,
        totalClaims: 1,
      });
    }

    console.log(`🎁 Daily Free: ${address} claimed a free pack!`);

    return {
      success: true,
      packsAwarded: 1,
    };
  },
});

/**
 * ADMIN: Reset all daily free claims so everyone can claim again
 */
export const adminResetDailyFreeClaims = internalMutation({
  args: {},
  handler: async (ctx) => {
    const claims = await ctx.db.query("dailyFreeClaims").collect();
    for (const claim of claims) {
      await ctx.db.delete(claim._id);
    }
    return { deleted: claims.length };
  },
});

/**
 * ADMIN: Restore cards from backup data
 * Used to restore cards with normalized addresses and proper URLs
 */
export const restoreCards = internalMutation({
  args: {
    cards: v.array(v.object({
      address: v.string(),
      cardId: v.string(),
      suit: v.string(),
      rank: v.string(),
      variant: v.string(),
      rarity: v.string(),
      imageUrl: v.string(),
      badgeType: v.string(),
      foil: v.optional(v.string()),
      wear: v.string(),
      power: v.number(),
      quantity: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    let restoredCount = 0;
    const restored: any[] = [];

    for (const cardData of args.cards) {
      // Normalize address to lowercase
      const address = cardData.address.toLowerCase();

      // Ensure imageUrl is properly encoded
      const imageUrl = cardData.imageUrl.includes('%20')
        ? cardData.imageUrl
        : cardData.imageUrl.replace(/ /g, '%20');

      // Insert card into inventory
      const cardId = await ctx.db.insert("cardInventory", {
        address,
        cardId: cardData.cardId,
        suit: cardData.suit,
        rank: cardData.rank,
        variant: cardData.variant,
        rarity: cardData.rarity,
        imageUrl,
        badgeType: cardData.badgeType as "FREE_CARD",
        foil: cardData.foil,
        wear: cardData.wear,
        power: cardData.power,
        quantity: cardData.quantity,
        equipped: false,
        obtainedAt: Date.now(),
      });

      restored.push({
        cardId,
        rarity: cardData.rarity,
        power: cardData.power,
        address
      });
      restoredCount++;
    }

    return {
      success: true,
      restoredCount,
      cards: restored,
      message: `Successfully restored ${restoredCount} cards!`,
    };
  },
});

