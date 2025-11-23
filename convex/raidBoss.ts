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
 * Initialize the raid boss system (creates first boss if none exists)
 */
export const initializeRaidBoss = mutation({
  handler: async (ctx) => {
    // Check if there's already an active boss
    const existingBoss = await ctx.db
      .query("raidBoss")
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (existingBoss) {
      return existingBoss; // Boss already exists
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
 * Replace a card in the raid deck (costs VBMS based on new card rarity)
 * Common: 1 VBMS, Rare: 3, Epic: 5, Legendary: 10, Mythic: 15, VibeFID: 50
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

    // Find the card to replace
    const cardIndex = raidDeck.deck.findIndex((c) => c.tokenId === args.oldCardTokenId);
    if (cardIndex === -1) {
      throw new Error("Card not found in deck");
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
    const address = args.address.toLowerCase();

    // Validate deck size (5 regular, optionally +1 VibeFID)
    if (args.deck.length !== 5) {
      throw new Error("Raid deck must contain exactly 5 cards");
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
      deckPower += args.vibefidCard.power;
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
        vibefidCard: args.vibefidCard,
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
        vibefidCard: args.vibefidCard,
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
      for (const cardEnergy of deck.cardEnergy) {
        // Check if energy has expired (0 = infinite for VibeFID)
        const hasEnergy = cardEnergy.energyExpiresAt === 0 || now < cardEnergy.energyExpiresAt;
        const isReady = !cardEnergy.nextAttackAt || cardEnergy.nextAttackAt <= now;

        if (hasEnergy && isReady) {
          // Card has energy and is ready to attack - ATTACK!
          const deckCard = deck.deck.find((c) => c.tokenId === cardEnergy.tokenId);
          let cardPower = deckCard?.power || 0;

          // Apply buff system (only for NFTs, not free cards)
          if (deckCard && !deckCard.isFreeCard) {
            // VibeFID cards get +50% power against all bosses
            if (deckCard.collection === 'vibefid') {
              cardPower = Math.floor(cardPower * 1.5);
            }
            // Cards matching boss collection get +20% power
            else if (deckCard.collection === boss.collection) {
              cardPower = Math.floor(cardPower * 1.2);
            }
          }

          // 🎯 CRITICAL HIT SYSTEM (15% chance, 2x damage)
          const criticalHitChance = 0.15; // 15% chance
          const isCriticalHit = Math.random() < criticalHitChance;
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

    // Mark all as claimed
    for (const contribution of unclaimedContributions) {
      await ctx.db.patch(contribution._id, {
        rewardClaimed: true,
      });
    }

    console.log(
      `🎁 ${normalizedAddress} claimed ${totalReward} TESTVBMS from ${unclaimedContributions.length} raid boss battles`
    );

    return {
      success: true,
      totalClaimed: totalReward,
      claimedCount: unclaimedContributions.length,
    };
  },
});
