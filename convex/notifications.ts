// @ts-nocheck - Dynamic imports in actions cause circular reference type errors
import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction, internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * NOTIFICATION TOKENS - QUERIES & MUTATIONS
 *
 * Manages Farcaster notification tokens for push notifications
 */

// ============================================================================
// QUERIES (read data)
// ============================================================================

/**
 * Get notification token by FID (Farcaster ID)
 */
export const getTokenByFid = query({
  args: { fid: v.string() },
  handler: async (ctx, { fid }) => {
    const token = await ctx.db
      .query("notificationTokens")
      .withIndex("by_fid", (q) => q.eq("fid", fid))
      .first();

    return token;
  },
});

/**
 * Get notification token by FID (internal version)
 * 🚀 BANDWIDTH FIX: For use by internalActions only
 */
export const getTokenByFidInternal = internalQuery({
  args: { fid: v.string() },
  handler: async (ctx, { fid }) => {
    const token = await ctx.db
      .query("notificationTokens")
      .withIndex("by_fid", (q) => q.eq("fid", fid))
      .first();

    return token;
  },
});

/**
 * Get ALL notification tokens by FID (internal version)
 * Returns all tokens (VBMS + VibeFID + Neynar) for a user
 * 🚀 BANDWIDTH FIX: Limited to 10 tokens per FID (covers all platform/app combos)
 */
export const getAllTokensByFidInternal = internalQuery({
  args: { fid: v.string() },
  handler: async (ctx, { fid }) => {
    const tokens = await ctx.db
      .query("notificationTokens")
      .withIndex("by_fid", (q) => q.eq("fid", fid))
      .take(10); // Max 10 tokens per FID (2 platforms × 2 apps × 2 buffer)

    return tokens;
  },
});

/**
 * Get all notification tokens (for internal use only)
 * 🚀 BANDWIDTH FIX: Added limit to prevent loading entire table
 */
export const getAllTokens = internalQuery({
  args: {},
  handler: async (ctx) => {
    const tokens = await ctx.db.query("notificationTokens").take(50000);
    return tokens;
  },
});

// ============================================================================
// MUTATIONS (write data)
// ============================================================================

/**
 * Determine platform from notification URL
 */
function getPlatformFromUrl(url: string): string {
  if (url.includes("neynar")) return "neynar";
  return "warpcast";
}

/**
 * Save or update notification token for a user
 * 🔧 FIX: Now supports multiple tokens per FID (one per platform + app)
 * User can receive notifications on BOTH Warpcast and Base App
 * User can have separate tokens for VBMS and VibeFID apps
 */
export const saveToken = mutation({
  args: {
    fid: v.string(),
    token: v.string(),
    url: v.string(),
    app: v.optional(v.string()), // "vbms" or "vibefid"
  },
  handler: async (ctx, { fid, token, url, app }) => {
    const now = Date.now();
    const platform = getPlatformFromUrl(url);
    const appName = app || "vbms"; // Default to vbms for backward compatibility

    // 🔧 FIX: Check if token exists for this FID + PLATFORM + APP combo
    // This allows separate tokens for each app (vbms + vibefid can coexist)
    // 🚀 BANDWIDTH FIX: Limited to 10 tokens per FID
    const allTokens = await ctx.db
      .query("notificationTokens")
      .withIndex("by_fid", (q) => q.eq("fid", fid))
      .take(10);

    // Find existing token for this platform + app combo
    const existing = allTokens.find(t => t.platform === platform && t.app === appName);

    if (existing) {
      // Update existing token for this platform + app
      await ctx.db.patch(existing._id, {
        token,
        url,
        platform,
        app: appName,
        lastUpdated: now,
      });
      console.log(`✅ Updated ${platform}/${appName} notification token for FID ${fid}`);
      return existing._id;
    } else {
      // Check if there's an OLD token without app field (migration)
      const legacyToken = allTokens.find(t => t.platform === platform && !t.app);

      if (legacyToken) {
        // Migrate legacy token: add app field
        await ctx.db.patch(legacyToken._id, {
          app: appName,
          token,
          url,
          platform,
          lastUpdated: now,
        });
        console.log(`🔄 Migrated legacy token for FID ${fid} to ${platform}/${appName}`);
        return legacyToken._id;
      }

      // Create new token for this platform + app
      const newId = await ctx.db.insert("notificationTokens", {
        fid,
        token,
        url,
        platform,
        app: appName,
        createdAt: now,
        lastUpdated: now,
      });
      console.log(`✅ Created ${platform}/${appName} notification token for FID ${fid}`);
      return newId;
    }
  },
});

/**
 * Remove notification token for a user
 */
export const removeToken = mutation({
  args: { fid: v.string() },
  handler: async (ctx, { fid }) => {
    const existing = await ctx.db
      .query("notificationTokens")
      .withIndex("by_fid", (q) => q.eq("fid", fid))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      console.log(`❌ Removed notification token for FID ${fid}`);
      return true;
    }

    console.log(`⚠️ No token found for FID ${fid}`);
    return false;
  },
});

/**
 * Batch import notification tokens (for migration from Firebase)
 */
export const importTokens = mutation({
  args: {
    tokens: v.array(
      v.object({
        fid: v.string(),
        token: v.string(),
        url: v.string(),
        createdAt: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, { tokens }) => {
    let imported = 0;
    let updated = 0;

    for (const tokenData of tokens) {
      const now = Date.now();

      // Check if exists
      const existing = await ctx.db
        .query("notificationTokens")
        .withIndex("by_fid", (q) => q.eq("fid", tokenData.fid))
        .first();

      if (existing) {
        // Update
        await ctx.db.patch(existing._id, {
          token: tokenData.token,
          url: tokenData.url,
          lastUpdated: now,
        });
        updated++;
      } else {
        // Insert
        await ctx.db.insert("notificationTokens", {
          fid: tokenData.fid,
          token: tokenData.token,
          url: tokenData.url,
          createdAt: tokenData.createdAt || now,
          lastUpdated: now,
        });
        imported++;
      }
    }

    console.log(`✅ Imported ${imported} tokens, updated ${updated} tokens`);
    return { imported, updated };
  },
});

// ============================================================================
// NEYNAR NOTIFICATION HELPER
// ============================================================================

/**
 * Send notification via Neynar API
 * @param targetFids - Array of FIDs to notify (empty = all users with notifications enabled)
 * @param title - Notification title (max 32 chars)
 * @param body - Notification body (max 128 chars)
 * @param targetUrl - URL to open when clicked
 * @returns { success_count, failure_count, not_attempted_count }
 */
async function sendViaNeynar(
  targetFids: number[],
  title: string,
  body: string,
  targetUrl: string = "https://vibemostwanted.xyz"
): Promise<{ success_count: number; failure_count: number; not_attempted_count: number }> {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    console.error("❌ NEYNAR_API_KEY not configured");
    return { success_count: 0, failure_count: targetFids.length || 0, not_attempted_count: 0 };
  }

  try {
    const payload = {
      target_fids: targetFids,
      notification: {
        title: title.slice(0, 32),
        body: body.slice(0, 128),
        target_url: targetUrl,
        uuid: crypto.randomUUID(),
      },
    };

    const response = await fetch("https://api.neynar.com/v2/farcaster/frame/notifications/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Neynar API error: ${response.status} - ${errorText}`);
      return { success_count: 0, failure_count: targetFids.length || 0, not_attempted_count: 0 };
    }

    const result = await response.json();
    return {
      success_count: result.success_count || 0,
      failure_count: result.failure_count || 0,
      not_attempted_count: result.not_attempted_count || 0,
    };
  } catch (error: any) {
    console.error(`❌ Neynar fetch error: ${error.message}`);
    return { success_count: 0, failure_count: targetFids.length || 0, not_attempted_count: 0 };
  }
}

// ============================================================================
// RAID BOSS LOW ENERGY NOTIFICATIONS
// ============================================================================

// Energy duration by rarity (same as backend constants)
const ENERGY_DURATION_BY_RARITY: Record<string, number> = {
  common: 12 * 60 * 60 * 1000,      // 12 hours
  rare: 1 * 24 * 60 * 60 * 1000,    // 1 day
  epic: 2 * 24 * 60 * 60 * 1000,    // 2 days
  legendary: 4 * 24 * 60 * 60 * 1000, // 4 days
  mythic: 5 * 24 * 60 * 60 * 1000,  // 5 days
  vibefid: 0,                         // Infinite
};

// Low energy threshold (notify when less than 1 hour remaining)
const LOW_ENERGY_THRESHOLD = 1 * 60 * 60 * 1000; // 1 hour
// 👇 ADICIONE ESTA LINHA
const NOTIFICATION_COOLDOWN = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Check all raid decks and send notifications to players with low energy cards
 * Called by scheduled function (cron job) every hour
 */
/* @ts-ignore */
export const sendLowEnergyNotifications = internalAction({
  args: {},
  // @ts-ignore
  handler: async (ctx) => {


    // Import api here to avoid circular reference
    // @ts-ignore
    const { api } = await import("./_generated/api");

    try {
      console.log("⚡ Checking for low energy raid decks...");

      // Get all raid decks
      const raidDecks = await ctx.runQuery(internal.notifications.getAllRaidDecks);

      if (!raidDecks || raidDecks.length === 0) {
        console.log("⚠️ No raid decks found");
      }

      console.log(`📊 Found ${raidDecks.length} raid decks to check`);

      const now = Date.now();
      let sent = 0;
      let failed = 0;
      let skipped = 0;
      const DELAY_MS = 100;

      // 🚀 BANDWIDTH FIX: Pre-filter decks with low energy cards, then batch load profiles
      // Phase 1: Identify decks needing notifications (low energy cards only, no expired)
      interface DeckWithEnergy {
        address: string;
        lowEnergyCards: number;
        expiredCards: number;
      }
      const decksNeedingNotification: DeckWithEnergy[] = [];

      for (const deck of raidDecks) {
        let lowEnergyCards = 0;
        let expiredCards = 0;

        for (const cardEnergy of deck.cardEnergy) {
          // Skip VibeFID cards (infinite energy)
          if (cardEnergy.energyExpiresAt === 0) continue;

          const remaining = cardEnergy.energyExpiresAt - now;

          if (remaining <= 0) {
            expiredCards++;
          } else if (remaining <= LOW_ENERGY_THRESHOLD) {
            lowEnergyCards++;
          }
        }

        // Only include decks with low energy cards (not expired - those use UI indicator)
        if (lowEnergyCards > 0 && expiredCards === 0) {
          decksNeedingNotification.push({ address: deck.address, lowEnergyCards, expiredCards });
        }
      }

      if (decksNeedingNotification.length === 0) {
        console.log("✅ No decks need low energy notifications");
        return { sent: 0, failed: 0, skipped: 0, total: raidDecks.length };
      }

      console.log(`📊 ${decksNeedingNotification.length} decks have low energy cards`);

      // 🚀 BANDWIDTH FIX: Batch load all profiles at once instead of N queries
      const addressesToFetch = decksNeedingNotification.map(d => d.address);
      const profileMap = await ctx.runQuery(internal.notifications.getProfilesByAddresses, {
        addresses: addressesToFetch,
      });

      // Phase 2: Process filtered decks with batch-loaded profiles
      for (let i = 0; i < decksNeedingNotification.length; i++) {
        const deck = decksNeedingNotification[i];

        try {
          // Check cooldown
          const lastNotification = await ctx.runQuery(
            internal.notificationsHelpers.getLastLowEnergyNotification,
            { address: deck.address }
          );

          if (lastNotification && (now - lastNotification.lastNotifiedAt < NOTIFICATION_COOLDOWN)) {
            const hoursLeft = Math.round((NOTIFICATION_COOLDOWN - (now - lastNotification.lastNotifiedAt)) / (60 * 60 * 1000));
            console.log(`⏭️ Skipping ${deck.address} - notified ${hoursLeft}h ago (cooldown: 6h)`);
            skipped++;
            continue;
          }

          // Get profile from batch-loaded map
          const profile = profileMap[deck.address.toLowerCase()];

          if (!profile) {
            console.log(`⚠️ No profile found for ${deck.address}`);
            continue;
          }

          // Get FID (try both fields)
          const fid = profile.fid || (profile.farcasterFid ? profile.farcasterFid.toString() : null);

          if (!fid) {
            console.log(`⚠️ No FID found for ${deck.address}`);
            continue;
          }

          const fidNumber = parseInt(fid);
          if (isNaN(fidNumber)) {
            console.log(`⚠️ Invalid FID for ${deck.address}: ${fid}`);
            continue;
          }

          // Build notification message (only for low energy warning now)
          const title = "⚡ Low Energy Warning!";
          const minutes = Math.round(LOW_ENERGY_THRESHOLD / 60000);
          const body = `${deck.lowEnergyCards} card${deck.lowEnergyCards > 1 ? 's' : ''} will run out of energy in less than ${minutes} minutes!`;

          // Send via Neynar API (no need to fetch tokens from Convex)
          const result = await sendViaNeynar([fidNumber], title, body, "https://vibemostwanted.xyz");

          if (result.success_count > 0) {
            sent++;
            await ctx.runMutation(internal.notificationsHelpers.updateLowEnergyNotification, {
              address: deck.address,
              lowEnergyCount: deck.lowEnergyCards,
              expiredCount: deck.expiredCards,
            });
            console.log(`✅ Sent low energy notification to FID ${fid}`);
          } else {
            failed++;
            console.log(`❌ Failed for FID ${fid}`);
          }

        } catch (error) {
          console.error(`❌ Exception for ${deck.address}:`, error);
          failed++;
        }

        // Add delay between notifications
        if (i < decksNeedingNotification.length - 1) {
          await sleep(DELAY_MS);
        }
      }

      console.log(`📊 Low energy notifications: ${sent} sent, ${failed} failed, ${skipped} skipped (cooldown), ${raidDecks.length} total`);
      return { sent, failed, skipped, total: raidDecks.length };

    } catch (error: any) {
      console.error("❌ Error in sendLowEnergyNotifications:", error);
      throw error;
    }
  },
});

/**
 * Get all raid decks (internal query for low energy check)
 * 🚀 BANDWIDTH FIX: Converted to internalQuery to prevent public abuse
 * 🚀 BANDWIDTH FIX: Limited to 200 decks max
 */
export const getAllRaidDecks = internalQuery({
  args: {},
  handler: async (ctx) => {
    // 🚀 BANDWIDTH FIX: Limit to 200 decks max
    const decks = await ctx.db.query("raidAttacks").take(200);
    return decks;
  },
});

/**
 * Get profile by address (for FID lookup)
 * 🚀 BANDWIDTH FIX: Converted to internalQuery (only used by internalActions)
 */
export const getProfileByAddress = internalQuery({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();
    return profile;
  },
});

/**
 * 🚀 BANDWIDTH FIX: Batch get profiles by addresses
 * Fixes N+1 query pattern - single query instead of N queries
 * Returns a map of address -> { fid, farcasterFid } for FID lookups
 */
export const getProfilesByAddresses = internalQuery({
  args: { addresses: v.array(v.string()) },
  handler: async (ctx, { addresses }) => {
    // Normalize and dedupe addresses
    const uniqueAddresses = [...new Set(addresses.map(a => a.toLowerCase()))];

    // Batch load all profiles in parallel
    const profilePromises = uniqueAddresses.map(addr =>
      ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", addr))
        .first()
    );
    const profiles = await Promise.all(profilePromises);

    // Build map of address -> { fid, farcasterFid }
    const result: Record<string, { fid: string | undefined; farcasterFid: number | undefined }> = {};
    for (const profile of profiles) {
      if (profile) {
        result[profile.address] = {
          fid: profile.fid,
          farcasterFid: profile.farcasterFid,
        };
      }
    }
    return result;
  },
});

// ============================================================================
// BROADCAST NOTIFICATIONS (internal functions)
// ============================================================================

/**
 * Send daily login reminder to all users with notification tokens
 * Called by scheduled function (cron job)
 */
/* @ts-ignore */
export const sendDailyLoginReminder = internalAction({
  args: {},
  // @ts-ignore
  handler: async (ctx) => {
    try {
      console.log("📬 Sending daily login reminder via Neynar...");

      const title = "💰 Daily Login Bonus!";
      const body = "Claim your free coins! Don't miss today's reward 🎁";

      // Send to ALL users with notifications enabled (empty array = broadcast)
      const result = await sendViaNeynar([], title, body, "https://vibemostwanted.xyz");

      console.log(`📊 Daily login: ${result.success_count} sent, ${result.failure_count} failed`);
      return { sent: result.success_count, failed: result.failure_count, total: result.success_count + result.failure_count + result.not_attempted_count };

    } catch (error: any) {
      console.error("❌ Error in sendDailyLoginReminder:", error);
      throw error;
    }
  },
});

// ============================================================================
// FEATURED CAST NOTIFICATION
// ============================================================================

/**
 * Send notification when a featured cast becomes active
 * Notifies all users to interact with the cast and earn tokens
 */
export const sendFeaturedCastNotification = internalAction({
  args: {
    castAuthor: v.string(),
    warpcastUrl: v.string(),
    winnerUsername: v.optional(v.string()),
  },
  // @ts-ignore
  handler: async (ctx, { castAuthor, warpcastUrl, winnerUsername }) => {
    try {
      console.log("🎬 Sending featured cast notification via Neynar...");

      const title = "🎯 New Wanted Cast!";
      const body = winnerUsername
        ? `@${winnerUsername} won the auction! @${castAuthor} is now WANTED! Interact to earn VBMS 💰`
        : `@${castAuthor} is now WANTED! Interact to earn VBMS tokens! 💰`;

      // Send to ALL users with notifications enabled (empty array = broadcast)
      const result = await sendViaNeynar([], title, body, "https://vibemostwanted.xyz");

      console.log(`📊 Featured cast notification: ${result.success_count} sent, ${result.failure_count} failed`);
      return { sent: result.success_count, failed: result.failure_count, total: result.success_count + result.failure_count + result.not_attempted_count };

    } catch (error: any) {
      console.error("❌ Error in sendFeaturedCastNotification:", error);
      throw error;
    }
  },
});

/**
 * 🏆 Send notification to the WINNER of a cast auction
 */
export const sendWinnerNotification = internalAction({
  args: {
    winnerFid: v.number(),
    winnerUsername: v.string(),
    bidAmount: v.number(),
    castAuthor: v.string(),
  },
  handler: async (ctx, { winnerFid, winnerUsername, bidAmount, castAuthor }) => {
    const title = "🏆 Your Cast Won!";
    const body = `Congrats @${winnerUsername}! Your bid of ${bidAmount.toLocaleString()} VBMS won! @${castAuthor} is now WANTED!`;

    console.log(`🏆 Sending winner notification to FID ${winnerFid} (@${winnerUsername})...`);

    const result = await sendViaNeynar([winnerFid], title, body, "https://vibemostwanted.xyz");

    const sent = result.success_count > 0;
    console.log(`🏆 Winner notification: ${sent ? "sent" : "failed"}`);
    return { sent, neynarSent: sent, warpcastSent: false };
  },
});

/**
 * TEST: Send notification to a SINGLE FID via Neynar only (for debugging Base App)
 */
export const testNeynarNotification = internalAction({
  args: {
    fid: v.number(),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { fid, title, body }) => {
    if (!process.env.NEYNAR_API_KEY) {
      return { error: "NEYNAR_API_KEY not set" };
    }

    // 🔒 SECURITY FIX: Use crypto.randomUUID() instead of Math.random()
    const uuid = crypto.randomUUID();

    const payload = {
      target_fids: [fid],
      notification: {
        title,
        body,
        target_url: "https://vibemostwanted.xyz",
        uuid
      }
    };

    console.log(`🧪 TEST: Sending to FID ${fid} via Neynar...`);
    console.log(`🧪 Payload:`, JSON.stringify(payload));

    try {
      const response = await fetch("https://api.neynar.com/v2/farcaster/frame/notifications/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEYNAR_API_KEY
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      console.log(`🧪 Response (${response.status}):`, JSON.stringify(result));

      return { status: response.status, result };
    } catch (error: any) {
      console.log(`🧪 Error:`, error?.message || error);
      return { error: error?.message || "Unknown error" };
    }
  },
});

// ============================================================================
// PERIODIC GAMING TIPS
// ============================================================================

// Array of gaming tips to rotate through
// Helper function for delays in actions (NOT available in mutations!)
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const GAMING_TIPS = [
  {
    title: "🎯 Pro Tip",
    body: "Attack players from the leaderboard to steal their coins! The higher their rank, the bigger the reward! 👑"
  },
  {
    title: "🛡️ Defense Strategy",
    body: "Set up your Defense Deck to protect your coins when offline! Choose your 5 best cards wisely! 🃏"
  },
  {
    title: "⚡ Power Boost Tip",
    body: "Open more packs to get stronger cards! Higher power = more wins = more coins! 💰"
  },
  {
    title: "🤖 Mecha Arena Tip",
    body: "Build your Mecha and battle in the Arena! Bet $VBMS and crush your opponents with powerful combos! ⚔️"
  },
  {
    title: "🎁 Daily Free Card!",
    body: "Visit the Shop to claim your FREE card every day! No VBMS needed - just tap and collect! 🃏"
  },
];

/**
 * Send a periodic gaming tip to all users (called by cron job)
 * Rotates through tips to keep them fresh
 */
/* @ts-ignore */
export const sendPeriodicTip = internalAction({
  args: {},
  // @ts-ignore
  handler: async (ctx) => {
    // @ts-ignore
    const { api } = await import("./_generated/api");

    try {
      console.log("💡 Starting periodic tip notification via Neynar...");

      let tipState = await ctx.runQuery(internal.notificationsHelpers.getTipState);
      if (!tipState._id) {
        const newId = await ctx.runMutation(api.notificationsHelpers.initTipState);
        tipState = { currentTipIndex: 0, lastSentAt: Date.now(), _id: newId };
      }

      const currentTip = GAMING_TIPS[tipState.currentTipIndex % GAMING_TIPS.length];

      // Send to ALL users with notifications enabled (empty array = broadcast)
      const result = await sendViaNeynar([], currentTip.title, currentTip.body, "https://vibemostwanted.xyz");

      // Update tip rotation state
      const nextTipIndex = (tipState.currentTipIndex + 1) % GAMING_TIPS.length;
      await ctx.runMutation(api.notificationsHelpers.updateTipState, {
        tipStateId: tipState._id,
        currentTipIndex: nextTipIndex,
      });

      console.log(`📊 Periodic tip: ${result.success_count} sent, ${result.failure_count} failed`);
      console.log(`📝 Sent tip ${tipState.currentTipIndex + 1}/${GAMING_TIPS.length}: "${currentTip.title}"`);

      return { sent: result.success_count, failed: result.failure_count, total: result.success_count + result.failure_count + result.not_attempted_count, tipIndex: tipState.currentTipIndex };

    } catch (error: any) {
      console.error("❌ Error in sendPeriodicTip:", error);
      throw error;
    }
  },
});

// ============================================================================
// PUBLIC MUTATIONS (for external scripts/testing)
// ============================================================================

/**
 * PUBLIC: Manually trigger periodic tip notification
 */
export const triggerPeriodicTip = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("💡 Scheduling periodic tip notification...");
    // Schedule the action (actions can use fetch, mutations cannot)
    await ctx.scheduler.runAfter(0, internal.notifications.sendPeriodicTip, {});
    return { scheduled: true };
  },
});

/**
 * PUBLIC: Manually trigger daily login reminder
 */
export const triggerDailyLoginReminder = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("💰 Scheduling daily login reminder...");
    await ctx.scheduler.runAfter(0, internal.notifications.sendDailyLoginReminder, {});
    return { scheduled: true };
  },
});

/**
 * PUBLIC: Send custom notification to all users
 */
export const sendCustomNotification = action({
  args: {
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { title, body }) => {
    try {
      console.log(`📬 Sending custom notification via Neynar: "${title}"`);

      // Send to ALL users with notifications enabled (empty array = broadcast)
      const result = await sendViaNeynar([], title, body, "https://vibemostwanted.xyz");

      console.log(`📊 Custom notification: ${result.success_count} sent, ${result.failure_count} failed`);
      return { sent: result.success_count, failed: result.failure_count, total: result.success_count + result.failure_count + result.not_attempted_count };
    } catch (error: any) {
      console.error("❌ Error in sendCustomNotification:", error);
      throw error;
    }
  },
});

// ============================================================================
// RAID BOSS DEFEATED NOTIFICATIONS
// ============================================================================

/**
 * Send notification to all contributors when a boss is defeated
 * Called by defeatBossAndSpawnNext via scheduler
 */
/* @ts-ignore */
export const sendBossDefeatedNotifications = internalAction({
  args: {
    bossName: v.string(),
    bossRarity: v.string(),
    totalContributors: v.number(),
    contributorAddresses: v.array(v.string()),
  },
  // @ts-ignore
  handler: async (ctx, { bossName, bossRarity, totalContributors, contributorAddresses }) => {
    try {
      console.log("🐉 Sending boss defeated notifications for: " + bossName);

      // 🚀 BANDWIDTH FIX: Batch load all profiles at once instead of N queries
      const profileMap = await ctx.runQuery(internal.notifications.getProfilesByAddresses, {
        addresses: contributorAddresses,
      });

      // Collect all contributor FIDs from batch result
      const contributorFids: number[] = [];

      for (const address of contributorAddresses) {
        const profile = profileMap[address.toLowerCase()];
        if (!profile) continue;

        const fid = profile.fid || (profile.farcasterFid ? profile.farcasterFid.toString() : null);
        if (!fid) continue;

        const fidNumber = parseInt(fid);
        if (!isNaN(fidNumber)) {
          contributorFids.push(fidNumber);
        }
      }

      if (contributorFids.length === 0) {
        console.log("⚠️ No contributor FIDs found");
        return { sent: 0, failed: 0, total: totalContributors };
      }

      // Build notification message
      const rarityEmojis: Record<string, string> = {
        common: "⚪",
        rare: "🔵",
        epic: "🟣",
        legendary: "🟡",
        mythic: "🔴",
      };
      const rarityEmoji = rarityEmojis[bossRarity.toLowerCase()] || "⚫";

      const title = "🎉 Boss Defeated!";
      const body = rarityEmoji + " " + bossName + " was slain! Claim your reward now! 💰";

      // Send to all contributors via Neynar
      const result = await sendViaNeynar(contributorFids, title, body, "https://vibemostwanted.xyz");

      console.log("📊 Boss defeated notifications: " + result.success_count + " sent, " + result.failure_count + " failed out of " + totalContributors + " contributors");
      return { sent: result.success_count, failed: result.failure_count, total: totalContributors };

    } catch (error: any) {
      console.error("❌ Error in sendBossDefeatedNotifications:", error);
      throw error;
    }
  },
});


// ============================================================================
// VIBEMAIL NOTIFICATIONS
// ============================================================================

/**
 * Send notification when someone receives a VibeMail (anonymous message with vote)
 * 🔧 Uses VibeFID's Neynar API key so notifications show in VibeFID's base.dev panel
 */
export const sendVibemailNotification = internalAction({
  args: {
    recipientFid: v.number(),
    hasAudio: v.boolean(),
  },
  handler: async (ctx, { recipientFid, hasAudio }) => {
    const title = "💌 New VibeMail!";
    const body = hasAudio
      ? "Someone sent you a message with a sound! 🎵 Check your inbox"
      : "Someone sent you an anonymous message! Check your inbox";

    // Use VibeFID's API key for VibeMail notifications
    const apiKey = process.env.NEYNAR_API_KEY_VIBEFID || process.env.NEYNAR_API_KEY;

    if (!apiKey) {
      console.log("📱 No NEYNAR_API_KEY_VIBEFID configured");
      return { sent: false };
    }

    try {
      const uuid = crypto.randomUUID();
      const payload = {
        target_fids: [recipientFid],
        notification: { title, body, target_url: "https://vibemostwanted.xyz/fid", uuid }
      };

      const response = await fetch("https://api.neynar.com/v2/farcaster/frame/notifications/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log(`✅ VibeMail notification sent to FID ${recipientFid}`);
        return { sent: true };
      } else {
        const errorText = await response.text();
        console.log(`❌ VibeMail notification failed: ${errorText}`);
        return { sent: false };
      }
    } catch (error: any) {
      console.log(`❌ VibeMail notification error: ${error.message}`);
      return { sent: false };
    }
  },
});
