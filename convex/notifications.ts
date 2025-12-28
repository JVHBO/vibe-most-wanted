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
 * Get all notification tokens (for internal use only)
 * 🚀 BANDWIDTH FIX: Converted to internalQuery to prevent public abuse
 */
export const getAllTokens = internalQuery({
  args: {},
  handler: async (ctx) => {
    const tokens = await ctx.db.query("notificationTokens").collect();
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
 * 🔧 FIX: Now supports multiple tokens per FID (one per platform)
 * User can receive notifications on BOTH Warpcast and Base App
 */
export const saveToken = mutation({
  args: {
    fid: v.string(),
    token: v.string(),
    url: v.string(),
  },
  handler: async (ctx, { fid, token, url }) => {
    const now = Date.now();
    const platform = getPlatformFromUrl(url);

    // 🔧 FIX: Check if token exists for this FID + PLATFORM combo
    // This allows one token per platform (warpcast + neynar can coexist)
    const existing = await ctx.db
      .query("notificationTokens")
      .withIndex("by_fid_platform", (q) => q.eq("fid", fid).eq("platform", platform))
      .first();

    if (existing) {
      // Update existing token for this platform
      await ctx.db.patch(existing._id, {
        token,
        url,
        platform,
        lastUpdated: now,
      });
      console.log(`✅ Updated ${platform} notification token for FID ${fid}`);
      return existing._id;
    } else {
      // Check if there's an OLD token without platform field (migration)
      const legacyToken = await ctx.db
        .query("notificationTokens")
        .withIndex("by_fid", (q) => q.eq("fid", fid))
        .filter((q) => q.eq(q.field("platform"), undefined))
        .first();

      if (legacyToken) {
        // Migrate legacy token: add platform field
        const legacyPlatform = getPlatformFromUrl(legacyToken.url);
        await ctx.db.patch(legacyToken._id, { platform: legacyPlatform });
        console.log(`🔄 Migrated legacy token for FID ${fid} to platform ${legacyPlatform}`);

        // If same platform, update it
        if (legacyPlatform === platform) {
          await ctx.db.patch(legacyToken._id, {
            token,
            url,
            platform,
            lastUpdated: now,
          });
          console.log(`✅ Updated ${platform} notification token for FID ${fid}`);
          return legacyToken._id;
        }
        // If different platform, create new entry (fall through)
      }

      // Create new token for this platform
      const newId = await ctx.db.insert("notificationTokens", {
        fid,
        token,
        url,
        platform,
        createdAt: now,
        lastUpdated: now,
      });
      console.log(`✅ Created ${platform} notification token for FID ${fid}`);
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
      let skipped = 0; // 👈 FALTOU ESTA LINHA!
      const DELAY_MS = 100;

      for (let i = 0; i < raidDecks.length; i++) {
        const deck = raidDecks[i];

        // Check each card's energy
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

        // Only notify if there are low or expired cards
        if (lowEnergyCards === 0 && expiredCards === 0) continue;

        try {
          // 👇 ADICIONE ESTE BLOCO DE VERIFICAÇÃO DE COOLDOWN
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
          // 👆 FIM DO BLOCO

          // Get player profile to find FID
          const profile = await ctx.runQuery(internal.notifications.getProfileByAddress, {
            address: deck.address,
          });

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

          // Get notification token
          const tokenData = await ctx.runQuery(internal.notifications.getTokenByFidInternal, { fid });

          if (!tokenData) {
            console.log(`⚠️ No notification token for FID ${fid}`);
            continue;
          }

          // 🔴 Skip "Raid Cards Exhausted" notification - use red dot indicator on button instead
          if (expiredCards > 0) {
            console.log(`⏭️ Skipping expired cards notification for ${deck.address} - using UI indicator instead`);
            continue;
          }

          // Build notification message (only for low energy warning now)
          const title = "⚡ Low Energy Warning!";
          const minutes = Math.round(LOW_ENERGY_THRESHOLD / 60000);
          const body = `${lowEnergyCards} card${lowEnergyCards > 1 ? 's' : ''} will run out of energy in less than ${minutes} minutes!`;

          const payload = {
            notificationId: `raid_energy_${deck.address}_${now}`.slice(0, 128),
            title: title.slice(0, 32),
            body: body.slice(0, 128),
            tokens: [tokenData.token],
            targetUrl: "https://www.vibemostwanted.xyz".slice(0, 1024),
          };

          const response = await fetch(tokenData.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

         if (response.ok) {
            const result = await response.json();
            const data = result.result || result;
            if (data.successfulTokens?.includes(tokenData.token) ||
                (!data.invalidTokens?.includes(tokenData.token) && !data.rateLimitedTokens?.includes(tokenData.token))) {
              sent++;

              await ctx.runMutation(internal.notificationsHelpers.updateLowEnergyNotification, {
                address: deck.address,
                lowEnergyCount: lowEnergyCards,
                expiredCount: expiredCards,
              });

              console.log(`✅ Sent low energy notification to FID ${fid}`);
            } else {
              failed++;
            }
          } else {
            failed++;
            console.error(`❌ Failed for FID ${fid}: ${response.status}`);
          }

        } catch (error) {
          console.error(`❌ Exception for ${deck.address}:`, error);
          failed++;
        }

        // Add delay between notifications
        if (i < raidDecks.length - 1) {
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

// ============================================================================
// BROADCAST NOTIFICATIONS (internal functions)
// ============================================================================

/**
 * Send daily login reminder to all users with notification tokens
 * Called by scheduled function (cron job)
 * NOW USING ACTION (not mutation) to allow sleep() delays
 */
/* @ts-ignore */
export const sendDailyLoginReminder = internalAction({
  args: {},
  // @ts-ignore
  handler: async (ctx) => {
    try {
      // Get all notification tokens (use internal since getAllTokens is internalQuery)
      const tokens = await ctx.runQuery(internal.notificationsHelpers.getAllTokens);

      if (tokens.length === 0) {
        console.log("⚠️ No notification tokens found");
      }

      console.log(`📬 Sending daily login reminder to ${tokens.length} users...`);

      // Separate tokens: Neynar (Base App) vs others (Warpcast)
      const neynarTokens = tokens.filter(t => t.url.includes("neynar"));
      const otherTokens = tokens.filter(t => !t.url.includes("neynar"));

      let sent = 0;
      let failed = 0;

      // 1️⃣ NEYNAR TOKENS → Send via Neynar API (Base App)
      if (neynarTokens.length > 0 && process.env.NEYNAR_API_KEY) {
        const neynarFids = neynarTokens.map(t => parseInt(t.fid)).filter(fid => !isNaN(fid));
        console.log(`📱 Sending to ${neynarFids.length} Base App users via Neynar API...`);

        try {
          const neynarPayload = {
            target_fids: neynarFids,
            notification: {
              title: "💰 Daily Login Bonus!",
              body: "Claim your free coins! Don't miss today's reward 🎁",
              target_url: "https://www.vibemostwanted.xyz"
            }
          };

          const neynarResponse = await fetch("https://api.neynar.com/v2/farcaster/frame/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "api_key": process.env.NEYNAR_API_KEY,
              "x-neynar-api-key": process.env.NEYNAR_API_KEY
            },
            body: JSON.stringify(neynarPayload)
          });

          if (neynarResponse.ok) {
            const neynarResult = await neynarResponse.json();
            const neynarSent = neynarResult.notification_deliveries?.filter((d: any) => d.status === "success").length || 0;
            sent += neynarSent;
            console.log(`📱 Neynar: ${neynarSent} sent`);
          } else {
            console.log(`📱 Neynar failed: ${neynarResponse.status}`);
            failed += neynarFids.length;
          }
        } catch (neynarError) {
          console.log(`📱 Neynar error:`, neynarError);
          failed += neynarTokens.length;
        }
      }

      // 2️⃣ OTHER TOKENS → Send via old method (Warpcast)
      if (otherTokens.length > 0) {
        console.log(`📬 Sending to ${otherTokens.length} Warpcast users via token API...`);
        const DELAY_MS = 100;

        for (let i = 0; i < otherTokens.length; i++) {
          const tokenData = otherTokens[i];
          try {
            const payload = {
              notificationId: `daily_login_${new Date().toISOString().split('T')[0]}_${tokenData.fid}`.slice(0, 128),
              title: "💰 Daily Login Bonus!",
              body: "Claim your free coins! Don't miss today's reward 🎁",
              tokens: [tokenData.token],
              targetUrl: "https://www.vibemostwanted.xyz",
            };

            const response = await fetch(tokenData.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (response.ok) {
              const result = await response.json();
              const data = result.result || result;
              if (data.successfulTokens?.includes(tokenData.token)) {
                sent++;
              } else if (data.invalidTokens?.includes(tokenData.token) || data.rateLimitedTokens?.includes(tokenData.token)) {
                failed++;
              } else {
                sent++;
              }
            } else {
              failed++;
            }
          } catch (error) {
            failed++;
          }

          if (i < otherTokens.length - 1) {
            await sleep(DELAY_MS);
          }
        }
      }

      console.log(`📊 Daily login: ${sent} sent, ${failed} failed (${neynarTokens.length} Neynar + ${otherTokens.length} Warpcast)`);
      return { sent, failed, total: tokens.length };

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
      // Use internal query (not api) since getAllTokens is internalQuery
      const tokens = await ctx.runQuery(internal.notificationsHelpers.getAllTokens);

      if (tokens.length === 0) {
        console.log("⚠️ No notification tokens found for featured cast notification");
        return { sent: 0, failed: 0, total: 0 };
      }

      console.log(`🎬 Sending featured cast notification to ${tokens.length} users...`);

      const neynarTokens = tokens.filter(t => t.url.includes("neynar"));
      const otherTokens = tokens.filter(t => !t.url.includes("neynar"));

      let sent = 0;
      let failed = 0;

      const title = "🎯 New Wanted Cast!";
      const body = winnerUsername
        ? `@${winnerUsername} won the auction! @${castAuthor} is now WANTED! Interact to earn VBMS 💰`
        : `@${castAuthor} is now WANTED! Interact to earn VBMS tokens! 💰`;
      // 🔧 FIX: MUST use app domain for targetUrl - Warpcast API requires it to match registered domain
      // The warpcastUrl is the cast URL (farcaster.xyz) which causes "targetUrl does not match domain" error
      const targetUrl = "https://www.vibemostwanted.xyz";

      // 1️⃣ NEYNAR TOKENS → Send via Neynar API (Base App)
      if (neynarTokens.length > 0 && process.env.NEYNAR_API_KEY) {
        const neynarFids = neynarTokens.map(t => parseInt(t.fid)).filter(fid => !isNaN(fid));
        console.log(`📱 Sending to ${neynarFids.length} Base App users via Neynar API...`);

        try {
          // 🔒 SECURITY FIX: Use crypto.randomUUID() instead of Math.random()
          const uuid = crypto.randomUUID();

          const neynarPayload = {
            target_fids: neynarFids,
            notification: {
              title,
              body,
              target_url: targetUrl,
              uuid: uuid
            }
          };

          console.log(`📱 Neynar payload:`, JSON.stringify(neynarPayload));

          const neynarResponse = await fetch("https://api.neynar.com/v2/farcaster/frame/notifications/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.NEYNAR_API_KEY || ""
            },
            body: JSON.stringify(neynarPayload)
          });

          const neynarResult = await neynarResponse.json();
          console.log(`📱 Neynar response (${neynarResponse.status}):`, JSON.stringify(neynarResult));

          if (neynarResponse.ok) {
            const neynarSent = neynarResult.notification_deliveries?.filter((d: any) => d.status === "success").length || 0;
            sent += neynarSent;
            console.log(`📱 Neynar: ${neynarSent} sent successfully`);
          } else {
            console.log(`📱 Neynar failed: ${neynarResponse.status} - ${JSON.stringify(neynarResult)}`);
            failed += neynarFids.length;
          }
        } catch (neynarError: any) {
          console.log(`📱 Neynar error:`, neynarError?.message || neynarError);
          failed += neynarTokens.length;
        }
      }

      // 2️⃣ OTHER TOKENS → Send via old method (Warpcast)
      if (otherTokens.length > 0) {
        console.log(`📬 Sending to ${otherTokens.length} Warpcast users via token API...`);
        const DELAY_MS = 50; // Reduced delay for faster processing

        // Log first 3 sample tokens for debugging
        console.log(`📋 Sample Warpcast URLs:`, otherTokens.slice(0, 3).map(t => t.url));

        let warpcastSent = 0;
        let warpcastFailed = 0;
        let httpErrors = 0;
        let exceptions = 0;

        for (let i = 0; i < otherTokens.length; i++) {
          const tokenData = otherTokens[i];
          try {
            const payload = {
              notificationId: `featured_cast_${Date.now()}_${tokenData.fid}`.slice(0, 128),
              title,
              body,
              tokens: [tokenData.token],
              targetUrl,
            };

            const response = await fetch(tokenData.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (response.ok) {
              const result = await response.json();
              // Log first few responses for debugging
              if (i < 5) {
                console.log(`📨 Response for FID ${tokenData.fid}:`, JSON.stringify(result).slice(0, 200));
              }

              // API returns { result: { successfulTokens, invalidTokens, rateLimitedTokens } }
              const data = result.result || result;

              // Check if token was successful
              const isSuccess = data.successfulTokens?.includes(tokenData.token);
              const isInvalid = data.invalidTokens?.includes(tokenData.token);
              const isRateLimited = data.rateLimitedTokens?.includes(tokenData.token);

              if (isSuccess) {
                sent++;
                warpcastSent++;
              } else if (isInvalid || isRateLimited) {
                failed++;
                warpcastFailed++;
              } else {
                // Not in any list - check if arrays exist and are empty
                if (data.successfulTokens && data.successfulTokens.length === 0) {
                  // Empty success array = failed
                  failed++;
                  warpcastFailed++;
                } else if (!data.successfulTokens && !data.invalidTokens) {
                  // Old API format without result wrapper - assume success if 200 OK
                  sent++;
                  warpcastSent++;
                } else {
                  // Unknown state - count as failed to be safe
                  failed++;
                  warpcastFailed++;
                }
              }
            } else {
              failed++;
              httpErrors++;
              if (httpErrors <= 5) {
                const errorText = await response.text();
                console.log(`❌ HTTP ${response.status} for FID ${tokenData.fid} (URL: ${tokenData.url}): ${errorText.slice(0, 200)}`);
              }
            }
          } catch (error: any) {
            failed++;
            exceptions++;
            if (exceptions <= 3) {
              console.log(`❌ Exception for FID ${tokenData.fid}: ${error?.message || error}`);
            }
          }

          if (i < otherTokens.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
          }
        }

        console.log(`📊 Warpcast breakdown: ${warpcastSent} sent, ${warpcastFailed} failed, ${httpErrors} HTTP errors, ${exceptions} exceptions`);
      }

      console.log(`📊 Featured cast notification: ${sent} sent, ${failed} failed`);
      return { sent, failed, total: tokens.length };

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
    if (!process.env.NEYNAR_API_KEY) {
      console.error("❌ NEYNAR_API_KEY not set for winner notification");
      return { sent: false, error: "NEYNAR_API_KEY not set" };
    }

    // 🔒 SECURITY FIX: Use crypto.randomUUID() instead of Math.random()
    const uuid = crypto.randomUUID();

    const title = "🏆 Your Cast Won!";
    const body = `Congrats @${winnerUsername}! Your bid of ${bidAmount.toLocaleString()} VBMS won! @${castAuthor} is now WANTED!`;

    const payload = {
      target_fids: [winnerFid],
      notification: {
        title,
        body,
        target_url: "https://www.vibemostwanted.xyz",
        uuid
      }
    };

    console.log(`🏆 Sending winner notification to FID ${winnerFid} (@${winnerUsername})...`);

    try {
      const response = await fetch("https://api.neynar.com/v2/farcaster/frame/notifications/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEYNAR_API_KEY
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log(`✅ Winner notification sent to @${winnerUsername}`);
        return { sent: true };
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to send winner notification: ${errorText}`);
        return { sent: false, error: errorText };
      }
    } catch (error: any) {
      console.error("❌ Error sending winner notification:", error);
      return { sent: false, error: error.message };
    }
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
        target_url: "https://www.vibemostwanted.xyz",
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
 * NOW USING ACTION to support delays and avoid rate limiting
 */
/* @ts-ignore */
export const sendPeriodicTip = internalAction({
  args: {},
  // @ts-ignore
  handler: async (ctx) => {
    // Import api here for public queries/mutations (not for internalQuery)
    // @ts-ignore
    const { api } = await import("./_generated/api");

    try {
      console.log("💡 Starting periodic tip notification...");

      // Get all notification tokens (use internal since getAllTokens is internalQuery)
      const tokens = await ctx.runQuery(internal.notificationsHelpers.getAllTokens);

      if (tokens.length === 0) {
        console.log("⚠️ No notification tokens found");
      }

      // Get or create tip rotation state via query
      let tipState = await ctx.runQuery(internal.notificationsHelpers.getTipState);

      // Initialize if needed
      if (!tipState._id) {
        const newId = await ctx.runMutation(api.notificationsHelpers.initTipState);
        tipState = { currentTipIndex: 0, lastSentAt: Date.now(), _id: newId };
      }

      // Get current tip
      const currentTip = GAMING_TIPS[tipState.currentTipIndex % GAMING_TIPS.length];

      // Separate tokens: Neynar (Base App) vs others (Warpcast)
      const neynarTokens = tokens.filter(t => t.url.includes("neynar"));
      const otherTokens = tokens.filter(t => !t.url.includes("neynar"));

      let sent = 0;
      let failed = 0;

      // 1️⃣ NEYNAR TOKENS → Send via Neynar API (Base App)
      if (neynarTokens.length > 0 && process.env.NEYNAR_API_KEY) {
        const neynarFids = neynarTokens.map(t => parseInt(t.fid)).filter(fid => !isNaN(fid));
        console.log(`📱 Sending to ${neynarFids.length} Base App users via Neynar API...`);

        try {
          const neynarPayload = {
            target_fids: neynarFids,
            notification: {
              title: currentTip.title.slice(0, 32),
              body: currentTip.body.slice(0, 128),
              target_url: "https://www.vibemostwanted.xyz"
            }
          };

          const neynarResponse = await fetch("https://api.neynar.com/v2/farcaster/frame/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "api_key": process.env.NEYNAR_API_KEY,
              "x-neynar-api-key": process.env.NEYNAR_API_KEY
            },
            body: JSON.stringify(neynarPayload)
          });

          if (neynarResponse.ok) {
            const neynarResult = await neynarResponse.json();
            const neynarSent = neynarResult.notification_deliveries?.filter((d: any) => d.status === "success").length || 0;
            sent += neynarSent;
            console.log(`📱 Neynar: ${neynarSent} sent`);
          } else {
            console.log(`📱 Neynar failed: ${neynarResponse.status}`);
            failed += neynarFids.length;
          }
        } catch (neynarError) {
          console.log(`📱 Neynar error:`, neynarError);
          failed += neynarTokens.length;
        }
      }

      // 2️⃣ OTHER TOKENS → Send via old method (Warpcast)
      if (otherTokens.length > 0) {
        console.log(`📬 Sending to ${otherTokens.length} Warpcast users via token API...`);
        const DELAY_MS = 100;

        for (let i = 0; i < otherTokens.length; i++) {
          const tokenData = otherTokens[i];
          try {
            const payload = {
              notificationId: `tip_${tipState.currentTipIndex}_${tokenData.fid}_${Date.now()}`.slice(0, 128),
              title: currentTip.title.slice(0, 32),
              body: currentTip.body.slice(0, 128),
              tokens: [tokenData.token],
              targetUrl: "https://www.vibemostwanted.xyz",
            };

            const response = await fetch(tokenData.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (response.ok) {
              const result = await response.json();
              if (!result.invalidTokens?.includes(tokenData.token) && !result.rateLimitedTokens?.includes(tokenData.token)) {
                sent++;
              } else {
                failed++;
              }
            } else {
              failed++;
            }
          } catch (error) {
            failed++;
          }

          if (i < otherTokens.length - 1) {
            await sleep(DELAY_MS);
          }
        }
      }

      // Update tip rotation state
      const nextTipIndex = (tipState.currentTipIndex + 1) % GAMING_TIPS.length;
      await ctx.runMutation(api.notificationsHelpers.updateTipState, {
        tipStateId: tipState._id,
        currentTipIndex: nextTipIndex,
      });

      console.log(`📊 Periodic tip: ${sent} sent, ${failed} failed (${neynarTokens.length} Neynar + ${otherTokens.length} Warpcast)`);
      console.log(`📝 Sent tip ${tipState.currentTipIndex + 1}/${GAMING_TIPS.length}: "${currentTip.title}"`);

      return { sent, failed, total: tokens.length, tipIndex: tipState.currentTipIndex };

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
    try {
      console.log("💡 Starting periodic tip notification (manual trigger)...");

      // 🚀 BANDWIDTH FIX: Limit to 200 tokens per run
      const tokens = await ctx.db.query("notificationTokens").take(200);

      if (tokens.length === 0) {
        console.log("⚠️ No notification tokens found");
      }

      // Get or create tip rotation state
      let tipState = await ctx.db
        .query("tipRotationState")
        .first();

      if (!tipState) {
        // Initialize tip state
        const tipStateId = await ctx.db.insert("tipRotationState", {
          currentTipIndex: 0,
          lastSentAt: Date.now(),
        });
        tipState = await ctx.db.get(tipStateId);
      }

      // Get current tip
      const currentTip = GAMING_TIPS[tipState!.currentTipIndex % GAMING_TIPS.length];

      // Send to all users
      let sent = 0;
      let failed = 0;

      for (const tokenData of tokens) {
        try {
          // Validar tamanhos conforme limites do Farcaster (title: 32, body: 128, notificationId: 128)
          const notificationId = `tip_${tipState!.currentTipIndex}_${tokenData.fid}_${Date.now()}`.slice(0, 128);
          const validatedTitle = currentTip.title.slice(0, 32);
          const validatedBody = currentTip.body.slice(0, 128);

          const payload = {
            notificationId,
            title: validatedTitle,
            body: validatedBody,
            tokens: [tokenData.token],
            targetUrl: "https://www.vibemostwanted.xyz".slice(0, 1024),
          };

          const response = await fetch(tokenData.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const result = await response.json();
            if (!result.invalidTokens?.includes(tokenData.token) &&
                !result.rateLimitedTokens?.includes(tokenData.token)) {
              sent++;
              console.log(`✅ Sent to FID ${tokenData.fid}`);
            } else {
              failed++;
              console.log(`❌ Invalid/rate-limited token for FID ${tokenData.fid}`);
            }
          } else {
            const errorText = await response.text();
            console.error(`❌ Failed for FID ${tokenData.fid}: ${response.status} - ${errorText}`);
            failed++;
          }
        } catch (error) {
          console.error(`❌ Exception for FID ${tokenData.fid}:`, error);
          failed++;
        }
      }

      // Update tip rotation state
      await ctx.db.patch(tipState!._id, {
        currentTipIndex: (tipState!.currentTipIndex + 1) % GAMING_TIPS.length,
        lastSentAt: Date.now(),
      });

      console.log(`📊 Periodic tip sent: ${sent} successful, ${failed} failed out of ${tokens.length} total`);
      console.log(`📝 Sent tip ${tipState!.currentTipIndex + 1}/${GAMING_TIPS.length}: "${currentTip.title}"`);

      return { sent, failed, total: tokens.length, tipIndex: tipState!.currentTipIndex };
    } catch (error: any) {
      console.error("❌ Error in triggerPeriodicTip:", error);
      throw error;
    }
  },
});

/**
 * PUBLIC: Manually trigger daily login reminder
 */
export const triggerDailyLoginReminder = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      console.log("💰 Starting daily login reminder (manual trigger)...");

      // 🚀 BANDWIDTH FIX: Limit to 200 tokens per run
      const tokens = await ctx.db.query("notificationTokens").take(200);

      if (tokens.length === 0) {
        console.log("⚠️ No notification tokens found");
      }

      let sent = 0;
      let failed = 0;

      // Send to all users
      for (const tokenData of tokens) {
        try {
          // Validar tamanhos conforme limites do Farcaster
          const notificationId = `daily_login_${tokenData.fid}_${Date.now()}`.slice(0, 128);
          const validatedTitle = "💰 Daily Login Bonus!".slice(0, 32);
          const validatedBody = "Don't forget to claim your free coins! Log in to Vibe Most Wanted now! 🎮".slice(0, 128);

          const payload = {
            notificationId,
            title: validatedTitle,
            body: validatedBody,
            tokens: [tokenData.token],
            targetUrl: "https://www.vibemostwanted.xyz".slice(0, 1024),
          };

          const response = await fetch(tokenData.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const result = await response.json();
            if (!result.invalidTokens?.includes(tokenData.token) &&
                !result.rateLimitedTokens?.includes(tokenData.token)) {
              sent++;
              console.log(`✅ Sent to FID ${tokenData.fid}`);
            } else {
              failed++;
              console.log(`❌ Invalid/rate-limited token for FID ${tokenData.fid}`);
            }
          } else {
            const errorText = await response.text();
            console.error(`❌ Failed for FID ${tokenData.fid}: ${response.status} - ${errorText}`);
            failed++;
          }
        } catch (error) {
          console.error(`❌ Exception for FID ${tokenData.fid}:`, error);
          failed++;
        }
      }

      console.log(`📊 Daily login reminder sent: ${sent} successful, ${failed} failed out of ${tokens.length} total`);

      return { sent, failed, total: tokens.length };
    } catch (error: any) {
      console.error("❌ Error in triggerDailyLoginReminder:", error);
      throw error;
    }
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
      console.log(`📬 Sending custom notification: "${title}"`);

      // Get all notification tokens using internal query
      const tokens = await ctx.runQuery(internal.notifications.getAllTokens);

      if (tokens.length === 0) {
        console.log("⚠️ No notification tokens found");
      }

      console.log(`📊 Found ${tokens.length} notification tokens`);

      // Send to all users
      let sent = 0;
      let failed = 0;

      for (const tokenData of tokens) {
        try {
          // Validar tamanhos conforme limites do Farcaster
          const notificationId = `custom_${tokenData.fid}_${Date.now()}`.slice(0, 128);
          const validatedTitle = title.slice(0, 32);
          const validatedBody = body.slice(0, 128);

          const payload = {
            notificationId,
            title: validatedTitle,
            body: validatedBody,
            tokens: [tokenData.token],
            targetUrl: "https://www.vibemostwanted.xyz".slice(0, 1024),
          };

          const response = await fetch(tokenData.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const result = await response.json();
            if (!result.invalidTokens?.includes(tokenData.token) &&
                !result.rateLimitedTokens?.includes(tokenData.token)) {
              sent++;
              console.log(`✅ Sent to FID ${tokenData.fid}`);
            } else {
              failed++;
              console.log(`❌ Invalid/rate-limited token for FID ${tokenData.fid}`);
            }
          } else {
            const errorText = await response.text();
            console.error(`❌ Failed for FID ${tokenData.fid}: ${response.status} - ${errorText}`);
            failed++;
          }
        } catch (error) {
          console.error(`❌ Exception for FID ${tokenData.fid}:`, error);
          failed++;
        }
      }

      console.log(`📊 Custom notification sent: ${sent} successful, ${failed} failed out of ${tokens.length} total`);

      return { sent, failed, total: tokens.length };
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
    // Import api here to avoid circular reference
    // @ts-ignore
    const { api } = await import("./_generated/api");

    try {
      console.log("🐉 Sending boss defeated notifications for: " + bossName);

      let sent = 0;
      let failed = 0;
      const DELAY_MS = 100;

      // Send to all contributors
      for (let i = 0; i < contributorAddresses.length; i++) {
        const address = contributorAddresses[i];

        try {
          // Get player profile to find FID
          const profile = await ctx.runQuery(internal.notifications.getProfileByAddress, {
            address,
          });

          if (!profile) {
            console.log("⚠️ No profile found for " + address);
            continue;
          }

          // Get FID (try both fields)
          const fid = profile.fid || (profile.farcasterFid ? profile.farcasterFid.toString() : null);

          if (!fid) {
            console.log("⚠️ No FID found for " + address);
            continue;
          }

          // Get notification token
          const tokenData = await ctx.runQuery(internal.notifications.getTokenByFidInternal, { fid });

          if (!tokenData) {
            console.log("⚠️ No notification token for FID " + fid);
            continue;
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

          const notificationId = "boss_defeated_" + bossName + "_" + Date.now() + "_" + fid;
          const title = "🎉 Boss Defeated!";
          const body = rarityEmoji + " " + bossName + " was slain! Claim your reward now! 💰";

          const payload = {
            notificationId: notificationId.slice(0, 128),
            title: title.slice(0, 32),
            body: body.slice(0, 128),
            tokens: [tokenData.token],
            targetUrl: "https://www.vibemostwanted.xyz".slice(0, 1024),
          };

          const response = await fetch(tokenData.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const result = await response.json();
            if (!result.invalidTokens?.includes(tokenData.token) &&
                !result.rateLimitedTokens?.includes(tokenData.token)) {
              sent++;
            } else {
              failed++;
            }
          } else {
            failed++;
            console.error("❌ Failed for FID " + fid + ": " + response.status);
          }

        } catch (error) {
          console.error("❌ Exception for " + address + ":", error);
          failed++;
        }

        // Add delay between notifications
        if (i < contributorAddresses.length - 1) {
          await sleep(DELAY_MS);
        }
      }

      console.log("📊 Boss defeated notifications: " + sent + " sent, " + failed + " failed out of " + totalContributors + " contributors");
      return { sent, failed, total: totalContributors };

    } catch (error: any) {
      console.error("❌ Error in sendBossDefeatedNotifications:", error);
      throw error;
    }
  },
});
