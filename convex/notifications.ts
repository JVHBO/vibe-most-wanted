// @ts-nocheck - Dynamic imports in actions cause circular reference type errors
import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction, internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireInternalAdminKey } from "./adminAuth";

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
  args: { fid: v.string(), adminKey: v.optional(v.string()) },
  handler: async (ctx, { fid, adminKey }) => {
    if (adminKey !== undefined) {
      requireInternalAdminKey(adminKey);
    }

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
    adminKey: v.optional(v.string()),
    fid: v.string(),
    token: v.string(),
    url: v.string(),
    app: v.optional(v.string()), // "vbms" or "vibefid"
  },
  handler: async (ctx, { adminKey, fid, token, url, app }) => {
    if (adminKey !== undefined) {
      requireInternalAdminKey(adminKey);
    }

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
  args: { fid: v.string(), adminKey: v.optional(v.string()) },
  handler: async (ctx, { fid, adminKey }) => {
    if (adminKey !== undefined) {
      requireInternalAdminKey(adminKey);
    }

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
    adminKey: v.optional(v.string()),
    tokens: v.array(
      v.object({
        fid: v.string(),
        token: v.string(),
        url: v.string(),
        createdAt: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, { adminKey, tokens }) => {
    if (adminKey !== undefined) {
      requireInternalAdminKey(adminKey);
    }

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
// BASE NOTIFICATIONS HELPER (Base App users by wallet address)
// ============================================================================

/**
 * Send Base Notifications to all opted-in Base App users
 * Called from cron alongside Farcaster broadcast
 */
async function sendBaseNotificationsBroadcast(
  title: string,
  body: string,
  targetPath: string = "/"
): Promise<{ sentCount: number; failedCount: number }> {
  const appUrl = process.env.NEXT_PUBLIC_URL || "https://vibemostwanted.xyz";
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://vibemostwanted.xyz";
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("❌ CRON_SECRET not configured — skipping Base notifications");
    return { sentCount: 0, failedCount: 0 };
  }

  try {
    const response = await fetch(`${baseUrl}/api/notifications/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({ title, body, targetPath }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ Base notifications broadcast failed: ${response.status} ${errText.slice(0, 200)}`);
      return { sentCount: 0, failedCount: 0 };
    }

    const result = await response.json();
    console.log(`[BaseNotif] ✅ ${result.sentCount} sent, ❌ ${result.failedCount} failed`);
    return { sentCount: result.sentCount || 0, failedCount: result.failedCount || 0 };
  } catch (error: any) {
    console.error(`❌ Base notifications fetch error: ${error.message}`);
    return { sentCount: 0, failedCount: 0 };
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

          // Send via direct Warpcast API (zero credits)
          const result = await sendViaDirectUrl(ctx, fidNumber.toString(), title, body, "https://vibemostwanted.xyz");

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
 * Get all notification tokens (public query for use by broadcast action)
 * Returns unique tokens only (deduped) to avoid sending duplicates to same user/app
 * 🚀 BANDWIDTH FIX: Limited to 5000 tokens max
 */
export const getUniqueTokens = query({
  args: {},
  handler: async (ctx) => {
    const tokens = await ctx.db.query("notificationTokens").take(5000);
    // Return unique token strings (dedup by token value)
    const seen = new Set<string>();
    const unique: Array<{ fid: string; token: string; url: string }> = [];
    for (const t of tokens) {
      if (!seen.has(t.token)) {
        seen.add(t.token);
        unique.push({ fid: t.fid, token: t.token, url: t.url || "https://api.warpcast.com/v1/frame-notifications" });
      }
    }
    return unique;
  },
});

/**
 * Send notifications to ALL users directly (bypasses Neynar, zero credits)
 * Used by broadcast functions like daily login, featured cast, custom notifications
 */
async function sendBroadcastDirectUrl(
  ctx: any,
  title: string,
  body: string,
  targetUrl: string = "https://vibemostwanted.xyz"
): Promise<{ success_count: number; failure_count: number; details: string[]; totalTokens: number }> {
  const { api } = await import("./_generated/api");

  const allTokens = await ctx.runQuery(api.notifications.getUniqueTokens, {});
  console.log(`[BroadcastDirect] Found ${allTokens.length} unique tokens to send`);

  const details: string[] = [];
  let successCount = 0;
  let failCount = 0;
  const DELAY_MS = 200;

  for (let i = 0; i < allTokens.length; i++) {
    const { fid, token, url } = allTokens[i];
    const uuid = crypto.randomUUID();

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Frame-Token": token,
        },
        body: JSON.stringify({
          title: title.slice(0, 32),
          body: body.slice(0, 128),
          targetUrl: targetUrl.slice(0, 256),
          notificationId: uuid,
          tokens: [token],
        }),
      });

      if (response.ok) {
        successCount++;
      } else {
        const errText = await response.text();
        failCount++;
        if (failCount <= 10) {
          details.push(`FAIL FID:${fid} ${response.status} ${errText.slice(0, 100)}`);
        }
      }
    } catch (error: any) {
      failCount++;
      if (failCount <= 10) {
        details.push(`ERR FID:${fid} ${error?.message || "unknown"}`);
      }
    }

    // Delay between sends to avoid rate limiting
    if (i < allTokens.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`[BroadcastDirect] ✅ ${successCount} sent, ❌ ${failCount} failed out of ${allTokens.length} tokens`);
  return { success_count: successCount, failure_count: failCount, details, totalTokens: allTokens.length };
}

/**
 * Send notification directly to a specific FID (bypasses Neynar, zero credits)
 * Uses sendViaDirectUrl helper which POSTs directly to saved Warpcast URLs
 */
async function sendViaDirectUrlWithFidNumber(
  ctx: any,
  fidNumber: number,
  title: string,
  body: string,
  targetUrl: string = "https://vibemostwanted.xyz"
): Promise<{ success_count: number; failure_count: number; details: string[] }> {
  return sendViaDirectUrl(ctx, fidNumber.toString(), title, body, targetUrl);
}

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
      console.log("📬 Sending daily login reminder via direct Warpcast...");

      const title = "💰 Daily Login Bonus!";
      const body = "Claim your free coins! Don't miss today's reward 🎁";
      const result = await sendBroadcastDirectUrl(ctx, title, body, "https://vibemostwanted.xyz");
      console.log(`📊 Daily login: ${result.success_count} sent, ${result.failure_count} failed`);
      return { sent: result.success_count, failed: result.failure_count, total: result.totalTokens };

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
      console.log("🎬 Sending featured cast notification via direct Warpcast...");

      const title = "🎯 New Wanted Cast!";
      const body = winnerUsername
        ? `@${winnerUsername} won the auction! @${castAuthor} is now WANTED! Interact to earn VBMS 💰`
        : `@${castAuthor} is now WANTED! Interact to earn VBMS tokens! 💰`;

      const result = await sendBroadcastDirectUrl(ctx, title, body, "https://vibemostwanted.xyz");

      console.log(`📊 Featured cast notification: ${result.success_count} sent, ${result.failure_count} failed`);
      return { sent: result.success_count, failed: result.failure_count, total: result.totalTokens };

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

    const result = await sendViaDirectUrlWithFidNumber(ctx, winnerFid, title, body, "https://vibemostwanted.xyz");

    const sent = result.success_count > 0;
    console.log(`🏆 Winner notification: ${sent ? "sent" : "failed"}`);
    return { sent, directSent: sent };
  },
});

/**
 * Send notification directly to saved Farcaster notification URLs
 * BYPASSES Neynar - POSTs directly to Warpcast/Base App endpoints
 * Uses the token + url saved in notificationTokens table
 */
async function sendViaDirectUrl(
  ctx: any,
  fid: string,
  title: string,
  body: string,
  targetUrl: string = "https://vibemostwanted.xyz"
): Promise<{ success_count: number; failure_count: number; details: string[] }> {
  try {
    const { api } = await import("./_generated/api");

    // Get ALL tokens for this FID (warpcast, base app, etc.)
    const tokens = await ctx.runQuery(internal.notifications.getAllTokensByFidInternal, { fid });

    if (!tokens || tokens.length === 0) {
      console.log(`[DirectSend] No notification tokens found for FID ${fid}`);
      return { success_count: 0, failure_count: 0, details: [`No tokens for FID ${fid}`] };
    }

    const details: string[] = [];
    let successCount = 0;
    let failCount = 0;

    // 🔒 SECURITY FIX: Use crypto.randomUUID() for idempotency
    const uuid = crypto.randomUUID();

    for (const tokenDoc of tokens) {
      const { token, url, platform, app } = tokenDoc;
      const notifUrl = url || "https://api.warpcast.com/v1/frame-notifications";

      try {
        const response = await fetch(notifUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Frame-Token": token,
          },
          body: JSON.stringify({
            title: title.slice(0, 32),
            body: body.slice(0, 128),
            targetUrl: targetUrl.slice(0, 256),
            notificationId: uuid,
            tokens: [token],
          }),
        });

        if (response.ok) {
          successCount++;
          details.push(`OK ${platform || "unknown"}/${app || "unknown"}`);
          console.log(`[DirectSend] ✅ Sent to FID ${fid} via ${platform}/${app}`);
        } else {
          const errText = await response.text();
          failCount++;
          details.push(`FAIL ${platform}/${app}: ${response.status} ${errText.slice(0, 100)}`);
          console.error(`[DirectSend] ❌ ${platform}/${app} failed: ${response.status}`, errText.slice(0, 200));
        }
      } catch (error: any) {
        failCount++;
        details.push(`ERR ${platform}/${app}: ${error?.message || "unknown"}`);
        console.error(`[DirectSend] ❌ ${platform}/${app} fetch error:`, error?.message);
      }

      // Small delay between sends
      await sleep(200);
    }

    return { success_count: successCount, failure_count: failCount, details };
  } catch (error: any) {
    console.error("[DirectSend] Error:", error?.message || error);
    return { success_count: 0, failure_count: 1, details: [`Error: ${error?.message || "unknown"}`] };
  }
}

/**
 * TEST: Send notification to a SINGLE FID directly (bypasses Neynar, zero credits)
 * Use this for testing notification delivery to Warpcast/Base App
 */
export const testDirectNotification = internalAction({
  args: {
    fid: v.number(),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { fid, title, body }) => {
    const fidStr = fid.toString();
    console.log(`🧪 TEST: Sending direct notification to FID ${fid}...`);

    const result = await sendViaDirectUrl(ctx, fidStr, title, body, "https://vibemostwanted.xyz");

    console.log(`🧪 Result:`, JSON.stringify(result));
    return result;
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
  // Daily login / coins
  {
    title: "💰 Daily Login Bonus!",
    body: "Claim your free coins today! Don't let your daily reward expire 🎁"
  },
  // Roulette
  {
    title: "🎰 Free Spin Waiting!",
    body: "Your Daily Roulette spin is ready! Win VBMS, cards & rare prizes. Spin now! 🍀"
  },
  // VibeMail
  {
    title: "✉️ Send a VibeMail!",
    body: "Drop a personalized message on the blockchain. Add music, colors & effects! 🎵"
  },
  // Arena
  {
    title: "🎯 Attack & Steal Coins!",
    body: "Attack leaderboard players to steal their VBMS! Higher rank = bigger reward! 👑"
  },
  // Roulette ARB
  {
    title: "🎰 Double Spins on ARB!",
    body: "Switch to Arbitrum for 2x daily roulette spins! More spins = more chances to win 🔥"
  },
  // VibeMail
  {
    title: "✉️ Got VibeMail?",
    body: "Check your inbox! Someone may have sent you VBMS coins with a message 👀"
  },
  // Defense
  {
    title: "🛡️ Protect Your Coins!",
    body: "Set up your Defense Deck before going offline. Leave it empty = easy target! 🃏"
  },
  // Roulette + Aura
  {
    title: "⚡ Level Up for More Spins!",
    body: "Higher Aura level = more bonus roulette spins every day. Keep grinding! 🐉"
  },
  // Free card
  {
    title: "🎁 Free Card Today!",
    body: "Grab your FREE card from the Shop every day. No VBMS needed — just tap! 🃏"
  },
  // Arena
  {
    title: "🤖 Mecha Arena is Live!",
    body: "Build your deck and crush opponents in the Arena! Bet VBMS and win big ⚔️"
  },
  // Raid Boss
  {
    title: "👹 Raid Boss is Waiting!",
    body: "Team up to defeat the Raid Boss! VibeFID holders deal bonus damage 💥"
  },
  // Baccarat
  {
    title: "🃏 Baccarat is Live!",
    body: "Bet VBMS on Player or Banker and double your coins! New round every minute 🎴"
  },
];

/**
 * Get FIDs of recently active users (used for notification targeting)
 * 🚀 BANDWIDTH FIX: Only notify users who played in last N days
 */
export const getActiveUserFids = internalQuery({
  args: {
    daysAgo: v.optional(v.number()), // Default: 7 days
  },
  handler: async (ctx, { daysAgo = 7 }) => {
    const cutoff = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

    // Get profiles that are active (have lastUpdated > cutoff)
    // Also check coinTransactions for any activity
    const activeProfiles = await ctx.db
      .query("profiles")
      .take(10000);

    const fids = new Set<number>();

    for (const profile of activeProfiles) {
      // Check if profile has a FID and was recently active
      if (profile.fid || profile.farcasterFid) {
        const fidValue = parseInt(profile.fid || profile.farcasterFid!.toString());
        if (!isNaN(fidValue)) {
          // Check if user has any recent coin transaction
          const recentTx = await ctx.db
            .query("coinTransactions")
            .withIndex("by_address", (q) => q.eq("address", profile.address.toLowerCase()))
            .order("desc")
            .take(1);

          if (recentTx.length > 0 && recentTx[0].timestamp > cutoff) {
            fids.add(fidValue);
          } else if (profile.lastUpdated && profile.lastUpdated > cutoff) {
            // Fallback: use lastUpdated on profile
            fids.add(fidValue);
          }
        }
      }
    }

    return [...fids];
  },
});

/**
 * Send a periodic gaming tip to active users only (called by cron job)
 * Rotates through tips to keep them fresh
 * 🚀 BANDWIDTH FIX: Targets only users active in last 7 days instead of broadcast to all
 */
/* @ts-ignore */
export const sendPeriodicTip = internalAction({
  args: {},
  // @ts-ignore
  handler: async (ctx) => {
    // @ts-ignore
    const { api } = await import("./_generated/api");

    try {
      console.log("💡 Starting periodic tip notification via direct Warpcast...");

      let tipState = await ctx.runQuery(internal.notificationsHelpers.getTipState);
      if (!tipState._id) {
        const newId = await ctx.runMutation(api.notificationsHelpers.initTipState);
        tipState = { currentTipIndex: 0, lastSentAt: Date.now(), _id: newId };
      }

      const currentTip = GAMING_TIPS[tipState.currentTipIndex % GAMING_TIPS.length];

      console.log("📣 Broadcasting to ALL users with Farcaster tokens...");

      // Channel 1: Farcaster (Hypersnap-compatible direct URL protocol)
      const farcasterResult = await sendBroadcastDirectUrl(ctx, currentTip.title, currentTip.body, "https://vibemostwanted.xyz");

      // Channel 2: Base App (Base Notifications API by wallet address)
      const baseResult = await sendBaseNotificationsBroadcast(currentTip.title, currentTip.body, "/");

      // Update tip rotation state
      const nextTipIndex = (tipState.currentTipIndex + 1) % GAMING_TIPS.length;
      await ctx.runMutation(api.notificationsHelpers.updateTipState, {
        tipStateId: tipState._id,
        currentTipIndex: nextTipIndex,
      });

      console.log(`📊 Periodic tip — Farcaster: ${farcasterResult.success_count} sent, ${farcasterResult.failure_count} failed | Base: ${baseResult.sentCount} sent, ${baseResult.failedCount} failed`);
      console.log(`📝 Sent tip ${tipState.currentTipIndex + 1}/${GAMING_TIPS.length}: "${currentTip.title}"`);

      return {
        farcaster: { sent: farcasterResult.success_count, failed: farcasterResult.failure_count, total: farcasterResult.totalTokens },
        base: { sent: baseResult.sentCount, failed: baseResult.failedCount },
        tipIndex: tipState.currentTipIndex,
      };

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
  args: { adminKey: v.string() },
  handler: async (ctx, { adminKey }) => {
    requireInternalAdminKey(adminKey);

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
  args: { adminKey: v.string() },
  handler: async (ctx, { adminKey }) => {
    requireInternalAdminKey(adminKey);

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
    adminKey: v.string(),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { adminKey, title, body }) => {
    requireInternalAdminKey(adminKey);

    try {
      console.log(`📬 Sending custom notification via direct Warpcast: "${title}"`);

      const result = await sendBroadcastDirectUrl(ctx, title, body, "https://vibemostwanted.xyz");

      console.log(`📊 Custom notification: ${result.success_count} sent, ${result.failure_count} failed`);
      return { sent: result.success_count, failed: result.failure_count, total: result.totalTokens };
    } catch (error: any) {
      console.error("❌ Error in sendCustomNotification:", error);
      throw error;
    }
  },
});

/**
 * PUBLIC API: Test direct notification (zero Neynar credits) to a single FID
 * Sends directly to saved Warpcast/Base App notification URLs
 */
export const triggerTestDirectNotification = mutation({
  args: {
    adminKey: v.string(),
    fid: v.number(),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (ctx, { adminKey, fid, title, body }) => {
    requireInternalAdminKey(adminKey);

    const finalTitle = title || "🧪 Test Notification";
    const finalBody = body || "This is a test notification sent directly to Warpcast — zero Neynar credits used!";

    console.log(`🧪 Scheduling direct test notification to FID ${fid}...`);
    await ctx.scheduler.runAfter(0, internal.notifications.testDirectNotification, {
      fid,
      title: finalTitle,
      body: finalBody,
    });
    return { scheduled: true, fid };
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

      // Send to all contributors via direct Warpcast
      let totalSent = 0;
      let totalFailed = 0;
      for (const fid of contributorFids) {
        const r = await sendViaDirectUrlWithFidNumber(ctx, fid, title, body, "https://vibemostwanted.xyz");
        totalSent += r.success_count;
        totalFailed += r.failure_count;
      }

      console.log("📊 Boss defeated notifications: " + totalSent + " sent, " + totalFailed + " failed out of " + totalContributors + " contributors");
      return { sent: totalSent, failed: totalFailed, total: totalContributors };

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
 * Uses direct Farcaster notification URL (Hypersnap-compatible, zero credits)
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

    const result = await sendViaDirectUrl(ctx, recipientFid.toString(), title, body, "https://vibemostwanted.xyz");
    const sent = result.success_count > 0;
    console.log(`${sent ? "✅" : "❌"} VibeMail notification to FID ${recipientFid}: ${sent ? "sent" : "failed"}`);
    return { sent };
  },
});
