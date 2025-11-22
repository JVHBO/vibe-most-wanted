/**
 * Raid Boss Convex Functions
 *
 * Backend logic for the global cooperative Raid Boss mode
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentBoss, getNextBoss, getBossRotationInfo, BOSS_HP_BY_RARITY } from "../lib/raid-boss";
import type { CardRarity } from "../lib/types/card";

// Constants
const ENTRY_FEE = 5; // 5 VBMS to set raid deck
const REFUEL_COST_PER_CARD = 1; // 1 VBMS per card
const REFUEL_COST_ALL = 4; // 4 VBMS for all 5 cards (discount)
const ATTACK_COOLDOWN = 5 * 60 * 1000; // 5 minutes in milliseconds
const INITIAL_ENERGY = 100; // 100% energy when deck is set
const ENERGY_DEPLETION = 100; // Energy depletes to 0 after attack

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get current active raid boss
 */
export const getCurrentRaidBoss = query({
  handler: async (ctx) => {
    const boss = await ctx.db
      .query("raidBoss")
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    return boss;
  },
});

/**
 * Get player's raid deck and energy status
 */
export const getPlayerRaidDeck = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const raidDeck = await ctx.db
      .query("raidAttacks")
      .withIndex("by_address", (q) => q.eq("address", args.address.toLowerCase()))
      .first();

    return raidDeck;
  },
});

/**
 * Get player's contribution to current boss
 */
export const getPlayerContribution = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const boss = await ctx.db
      .query("raidBoss")
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!boss) return null;

    const contribution = await ctx.db
      .query("raidContributions")
      .withIndex("by_boss_player", (q) =>
        q.eq("bossIndex", boss.bossIndex).eq("address", args.address.toLowerCase())
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

    const limit = args.limit || 10;

    const contributors = await ctx.db
      .query("raidContributions")
      .withIndex("by_boss", (q) => q.eq("bossIndex", boss.bossIndex))
      .order("desc")
      .take(limit);

    return contributors;
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

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize the first raid boss (called once on deployment)
 */
export const initializeRaidBoss = mutation({
  handler: async (ctx) => {
    // Check if boss already exists
    const existingBoss = await ctx.db
      .query("raidBoss")
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (existingBoss) {
      return { success: false, message: "Raid boss already initialized" };
    }

    // Get first boss (index 0)
    const bossCard = getCurrentBoss(0);

    if (!bossCard) {
      throw new Error("Failed to get first boss card");
    }

    const rarity = bossCard.rarity.toLowerCase() as Lowercase<CardRarity>;
    const maxHp = BOSS_HP_BY_RARITY[rarity];

    // Create first boss
    await ctx.db.insert("raidBoss", {
      bossIndex: 0,
      collection: bossCard.collection!,
      rarity: bossCard.rarity,
      tokenId: bossCard.tokenId,
      name: bossCard.name,
      imageUrl: bossCard.imageUrl,
      power: bossCard.power,
      maxHp,
      currentHp: maxHp,
      status: "active",
      spawnedAt: Date.now(),
    });

    return { success: true, message: "Raid boss initialized", boss: bossCard };
  },
});

/**
 * Set player's raid deck (costs 5 VBMS entry fee)
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
    })),
    txHash: v.string(), // VBMS entry fee transaction hash
  },
  handler: async (ctx, args) => {
    const address = args.address.toLowerCase();

    // Validate deck size
    if (args.deck.length !== 5) {
      throw new Error("Raid deck must contain exactly 5 cards");
    }

    // Calculate total deck power
    const deckPower = args.deck.reduce((sum, card) => sum + card.power, 0);

    // Initialize card energy (all cards start at 100% energy)
    const cardEnergy = args.deck.map((card) => ({
      tokenId: card.tokenId,
      energy: INITIAL_ENERGY,
      lastAttackAt: undefined,
      nextAttackAt: Date.now(), // Can attack immediately
    }));

    // Check if player already has a raid deck
    const existingDeck = await ctx.db
      .query("raidAttacks")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();

    if (existingDeck) {
      // Update existing deck
      await ctx.db.patch(existingDeck._id, {
        deck: args.deck,
        deckPower,
        cardEnergy,
        entryFeePaid: true,
        entryTxHash: args.txHash,
        entryPaidAt: Date.now(),
        lastUpdated: Date.now(),
      });
    } else {
      // Create new raid deck
      await ctx.db.insert("raidAttacks", {
        address,
        deck: args.deck,
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

    return { success: true, deckPower };
  },
});

/**
 * Refuel card energy (costs 1 VBMS per card, or 4 VBMS for all 5)
 */
export const refuelCards = mutation({
  args: {
    address: v.string(),
    cardTokenIds: v.array(v.string()), // Which cards to refuel
    txHash: v.string(), // VBMS payment transaction hash
  },
  handler: async (ctx, args) => {
    const address = args.address.toLowerCase();

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

    // Update card energy
    const updatedCardEnergy = raidDeck.cardEnergy.map((card) => {
      if (args.cardTokenIds.includes(card.tokenId)) {
        return {
          ...card,
          energy: INITIAL_ENERGY,
          nextAttackAt: Date.now(), // Can attack immediately after refuel
        };
      }
      return card;
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
 */
export const processAutoAttacks = mutation({
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

    // Get all raid decks
    const allDecks = await ctx.db.query("raidAttacks").collect();

    let totalDamage = 0;
    let attackingPlayers = 0;

    // Process each player's deck
    for (const deck of allDecks) {
      const updatedCardEnergy = [];
      let playerDamage = 0;

      // Check each card's energy and attack if ready
      for (const card of deck.cardEnergy) {
        if (card.energy > 0 && (!card.nextAttackAt || card.nextAttackAt <= now)) {
          // Card has energy and cooldown is ready - ATTACK!
          const cardPower = deck.deck.find((c) => c.tokenId === card.tokenId)?.power || 0;
          playerDamage += cardPower;

          // Deplete energy and set cooldown
          updatedCardEnergy.push({
            tokenId: card.tokenId,
            energy: 0, // Energy depleted
            lastAttackAt: now,
            nextAttackAt: now + ATTACK_COOLDOWN, // 5 min cooldown
          });
        } else {
          // Card not ready to attack
          updatedCardEnergy.push(card);
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

        // Get player username
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_address", (q) => q.eq("address", deck.address))
          .first();

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
    if (newHp <= 0) {
      // Mark boss as defeated
      await ctx.db.patch(boss._id, {
        status: "defeated",
        defeatedAt: now,
      });

      // Trigger boss transition (will spawn next boss)
      // This will be handled by a separate function
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
 */
export const defeatBossAndSpawnNext = mutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Get defeated boss
    const defeatedBoss = await ctx.db
      .query("raidBoss")
      .filter((q) => q.eq(q.field("status"), "defeated"))
      .first();

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
    // Total reward pool: 1000 $TESTVBMS (example, can be adjusted)
    const REWARD_POOL = 1000;

    for (const contribution of contributions) {
      const contributionPercent = totalDamage > 0 ? contribution.damageDealt / totalDamage : 0;
      const reward = Math.floor(REWARD_POOL * contributionPercent);

      await ctx.db.patch(contribution._id, {
        rewardEarned: reward,
      });

      // Add reward to player's coins
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", contribution.address))
        .first();

      if (profile) {
        await ctx.db.patch(profile._id, {
          coins: (profile.coins || 0) + reward,
          lifetimeEarned: (profile.lifetimeEarned || 0) + reward,
        });
      }
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
      collection: defeatedBoss.collection,
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
    const nextBossIndex = (defeatedBoss.bossIndex + 1) % 20; // Loop through 20 bosses
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

    return {
      success: true,
      defeatedBoss: defeatedBoss.name,
      nextBoss: nextBossCard.name,
      totalContributors: contributions.length,
      totalDamage,
    };
  },
});
