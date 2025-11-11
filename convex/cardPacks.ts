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
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════════════════
// PACK DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const PACK_TYPES = {
  starter: {
    name: "Starter Pack",
    description: "Welcome pack for new players",
    cards: 3,
    price: 0, // Free
    rarityOdds: { Common: 70, Rare: 25, Epic: 4, Legendary: 1 },
  },
  basic: {
    name: "Basic Pack",
    description: "Standard card pack",
    cards: 5,
    price: 500, // 500 coins
    rarityOdds: { Common: 60, Rare: 30, Epic: 8, Legendary: 2 },
  },
  premium: {
    name: "Premium Pack",
    description: "Higher chance of rare cards",
    cards: 5,
    price: 1200, // 1200 coins
    rarityOdds: { Common: 40, Rare: 40, Epic: 15, Legendary: 5 },
  },
  elite: {
    name: "Elite Pack",
    description: "Guaranteed epic or legendary",
    cards: 5,
    price: 2500, // 2500 coins
    rarityOdds: { Common: 30, Rare: 30, Epic: 30, Legendary: 10 },
  },
  mission: {
    name: "Mission Reward",
    description: "Earned from completing missions",
    cards: 3,
    price: 0, // Earned, not bought
    rarityOdds: { Common: 65, Rare: 27, Epic: 6, Legendary: 2 },
  },
  achievement: {
    name: "Achievement Pack",
    description: "Special achievement reward",
    cards: 5,
    price: 0, // Earned, not bought
    rarityOdds: { Common: 50, Rare: 35, Epic: 12, Legendary: 3 },
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
  let roll = Math.random() * total;

  for (const [rarity, chance] of Object.entries(odds)) {
    roll -= chance;
    if (roll <= 0) return rarity;
  }

  return "common"; // Fallback
}

// Available card images per rarity
const CARD_IMAGES = {
  common: 10,    // item-58 to item-62, proxy to proxy(4)
  rare: 4,       // item-37, 38, 40, 42
  epic: 6,       // item-43, 44, 46, 47, 49, proxy
  legendary: 6,  // item-39, 50, 52, 55, 56, 57
};

// Foil types (EXACTLY like NFTs)
const FOIL_TYPES = ["None", "Standard", "Prize"];
const FOIL_ODDS = { None: 70, Standard: 25, Prize: 5 };

// Wear levels (EXACTLY like NFTs)
const WEAR_LEVELS = ["Pristine", "Mint", "Lightly Played", "Moderately Played", "Heavily Played"];
const WEAR_ODDS = { Pristine: 5, Mint: 20, "Lightly Played": 40, "Moderately Played": 25, "Heavily Played": 10 };

/**
 * Calculate card power (EXACTLY same as NFT cards)
 * Formula: power = rarity_base × wear_multiplier × foil_multiplier
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

  return Math.max(1, Math.round(base * wearMult * foilMult));
}

/**
 * Generate random card based on rarity
 */
function generateRandomCard(rarity: string) {
  // Pick random card image from the rarity pool
  const imageCount = CARD_IMAGES[rarity as keyof typeof CARD_IMAGES] || 1;
  const imageIndex = Math.floor(Math.random() * imageCount);

  // Roll foil type
  const foil = rollRarity(FOIL_ODDS);

  // Roll wear level
  const wear = rollRarity(WEAR_ODDS);

  // Generate unique card ID with traits
  const cardId = `${rarity}_${imageIndex}_${foil}_${wear}_${Date.now()}`;
  const imageUrl = `/cards/${rarity}/`;

  // Map image files
  const imageFiles: Record<string, string[]> = {
    common: ["item-58.png", "item-59.png", "item-60.png", "item-61.png", "item-62.png", "proxy.png", "proxy (1).png", "proxy (2).png", "proxy (3).png", "proxy (4).png"],
    rare: ["item-37.png", "item-38.png", "item-40.png", "item-42.png"],
    epic: ["item-43.png", "item-44.png", "item-46.png", "item-47.png", "item-49.png", "proxy.png"],
    legendary: ["item-39.png", "item-50.png", "item-52.png", "item-55.png", "item-56.png", "item-57.png"],
  };

  const fileName = imageFiles[rarity as keyof typeof imageFiles]?.[imageIndex] || "proxy.png";

  // Calculate power (EXACTLY same as NFT cards)
  const power = calculateCardPower(rarity, wear, foil !== "None" ? foil : undefined);

  return {
    cardId,
    suit: rarity, // Using rarity as identifier
    rank: fileName.replace('.png', ''), // Image name as rank
    variant: "default",
    rarity,
    imageUrl: `${imageUrl}${fileName}`,
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
 */
export const getShopPacks = query({
  args: {},
  handler: async () => {
    return [
      { type: "basic", ...PACK_TYPES.basic },
      { type: "premium", ...PACK_TYPES.premium },
      { type: "elite", ...PACK_TYPES.elite },
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
    const existingPack = await ctx.db
      .query("cardPacks")
      .withIndex("by_address", (q) => q.eq("address", address))
      .filter((q) => q.eq(q.field("packType"), args.packType))
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
        revealedCards.push({ ...card, isDuplicate: true, quantity: existingCard.quantity + 1 });
      } else {
        // Add new card to inventory
        await ctx.db.insert("cardInventory", {
          address,
          ...card,
          quantity: 1,
          equipped: false,
          obtainedAt: Date.now(),
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
    const existingPack = await ctx.db
      .query("cardPacks")
      .withIndex("by_address", (q) => q.eq("address", address))
      .filter((q) => q.eq(q.field("packType"), args.packType))
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
    const existingStarter = await ctx.db
      .query("cardPacks")
      .withIndex("by_address", (q) => q.eq("address", address))
      .filter((q) => q.eq(q.field("packType"), "starter"))
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
