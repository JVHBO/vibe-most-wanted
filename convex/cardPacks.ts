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
    rarityOdds: { Common: 90, Rare: 9, Epic: 1, Legendary: 0 },
  },
  basic: {
    name: "Basic Pack",
    description: "Cheapest pack with mostly commons",
    cards: 5,
    price: 1000, // 1k coins - muito acessível
    rarityOdds: { Common: 88, Rare: 10, Epic: 1.5, Legendary: 0.5 },
  },
  premium: {
    name: "Premium Pack",
    description: "Better odds for rare and epic",
    cards: 5,
    price: 10000, // 10k coins - 5x mais caro
    rarityOdds: { Common: 70, Rare: 25, Epic: 4, Legendary: 1 },
  },
  elite: {
    name: "Elite Pack",
    description: "Best odds - Guaranteed rare or better",
    cards: 5,
    price: 100000, // 100k coins - EQUIVALENTE A 1 PACK NFT REAL!
    rarityOdds: { Common: 0, Rare: 70, Epic: 25, Legendary: 5 },
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

// Available card images per rarity (ONLY from Desktop/images/Unknown)
const CARD_IMAGES = {
  common: 3,      // proxy (5), (6), (7)
  rare: 3,        // proxy, proxy (1), (8)
  epic: 3,        // proxy (1), (2), (3)
  legendary: 2,   // proxy, proxy (4)
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
  const rarityLower = rarity.toLowerCase();
  const imageCount = CARD_IMAGES[rarityLower as keyof typeof CARD_IMAGES] || 1;
  const imageIndex = Math.floor(Math.random() * imageCount);

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

/**
 * Get total FREE cards statistics
 */
export const getFreeCardsStats = query({
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
    const existingPack = await ctx.db
      .query("cardPacks")
      .withIndex("by_address", (q) => q.eq("address", address))
      .filter((q) => q.eq(q.field("packType"), "basic"))
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
    await ctx.db.patch(profile._id, {
      hasClaimedSharePack: true,
      hasSharedProfile: true,
      lastShareDate: today,
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
export const updateAllCardImages = mutation({
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
          const randomIndex = Math.floor(Math.random() * newImages.length);
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
export const resetUserFreeCards = mutation({
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
    const existingPack = await ctx.db
      .query("cardPacks")
      .withIndex("by_address", (q) => q.eq("address", address))
      .filter((q) => q.eq(q.field("packType"), "basic"))
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
