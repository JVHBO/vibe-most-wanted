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
 * Get all notification tokens (for migration/debugging and internal use)
 * Used by Actions and API routes
 */
export const getAllTokens = query({
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
 * Save or update notification token for a user
 */
export const saveToken = mutation({
  args: {
    fid: v.string(),
    token: v.string(),
    url: v.string(),
  },
  handler: async (ctx, { fid, token, url }) => {
    // Validate inputs
    if (!fid || !token || !url) {
      throw new Error(`Invalid input: fid=${fid}, token=${token ? 'present' : 'missing'}, url=${url ? 'present' : 'missing'}`);
    }

    const now = Date.now();

    try {
      // Check if token already exists
      const existing = await ctx.db
        .query("notificationTokens")
        .withIndex("by_fid", (q) => q.eq("fid", fid))
        .first();

      if (existing) {
        // Update existing token
        await ctx.db.patch(existing._id, {
          token,
          url,
          lastUpdated: now,
        });
        console.log(`✅ Updated notification token for FID ${fid}`);
        return existing._id;
      } else {
        // Create new token
        const newId = await ctx.db.insert("notificationTokens", {
          fid,
          token,
          url,
          createdAt: now,
          lastUpdated: now,
        });
        console.log(`✅ Created notification token for FID ${fid}`);
        return newId;
      }
    } catch (error: any) {
      console.error(`❌ Error saving notification token for FID ${fid}:`, error);
      throw new Error(`Failed to save notification token: ${error.message}`);
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

// ============================================================================
// TIP ROTATION STATE HELPERS (for Actions)
// ============================================================================

/**
 * Get or create tip rotation state (query for Actions)
 */
export const getTipState = query({
  args: {},
  handler: async (ctx) => {
    let tipState = await ctx.db.query("tipRotationState").first();

    if (!tipState) {
      // Return default state if doesn't exist
      return { currentTipIndex: 0, lastSentAt: Date.now(), _id: null };
    }

    return tipState;
  },
});

/**
 * Initialize tip state if doesn't exist (mutation)
 */
export const initTipState = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("tipRotationState").first();
    if (existing) return existing._id;

    const newId = await ctx.db.insert("tipRotationState", {
      currentTipIndex: 0,
      lastSentAt: Date.now(),
    });
    return newId;
  },
});

/**
 * Update tip rotation state (mutation for Actions)
 */
export const updateTipState = mutation({
  args: {
    tipStateId: v.id("tipRotationState"),
    currentTipIndex: v.number(),
  },
  handler: async (ctx, { tipStateId, currentTipIndex }) => {
    await ctx.db.patch(tipStateId, {
      currentTipIndex,
      lastSentAt: Date.now(),
    });
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
    // Import api here to avoid circular reference
    // @ts-ignore
    const { api } = await import("./_generated/api");

    try {
      // Get all notification tokens
      const tokens = await ctx.runQuery(api.notificationsHelpers.getAllTokens);

      if (tokens.length === 0) {
        console.log("⚠️ No notification tokens found");
        return { sent: 0, failed: 0, total: 0 };
      }

      console.log(`📬 Sending daily login reminder to ${tokens.length} users...`);

      let sent = 0;
      let failed = 0;
      const DELAY_MS = 100; // 100ms delay between each notification

      // Send notification to each user WITH DELAY
      for (let i = 0; i < tokens.length; i++) {
        const tokenData = tokens[i];

        try {
          const { token, url, fid } = tokenData;

          // Notification content with size validation
          const payload = {
            notificationId: `daily_login_${new Date().toISOString().split('T')[0]}_${fid}`.slice(0, 128),
            title: "💰 Daily Login Bonus!".slice(0, 32),
            body: "Claim your free coins! Don't miss today's reward 🎁".slice(0, 128),
            tokens: [token],
            targetUrl: "https://www.vibemostwanted.xyz".slice(0, 1024),
          };

          // Send notification via Farcaster API
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            console.error(`❌ Failed to send to FID ${fid}:`, response.statusText);
            failed++;
            continue;
          }

          const result = await response.json();

          // Handle invalid tokens (note: can't delete from Action, just mark as failed)
          if (result.invalidTokens?.includes(token)) {
            console.log(`❌ Invalid token for FID ${fid}`);
            failed++;
            continue;
          }

          // Handle rate limits
          if (result.rateLimitedTokens?.includes(token)) {
            console.log(`⏱️ Rate limited for FID ${fid}`);
            failed++;
            continue;
          }

          sent++;
          if (i % 10 === 0) {
            console.log(`✅ Progress: ${sent}/${tokens.length} sent`);
          }

        } catch (error: any) {
          console.error(`❌ Error sending to FID ${tokenData.fid}:`, error.message);
          failed++;
        }

        // Add delay between notifications to avoid rate limiting
        if (i < tokens.length - 1) {
          await sleep(DELAY_MS);
        }
      }

      console.log(`📊 Daily login reminder: ${sent} sent, ${failed} failed, ${tokens.length} total`);
      return { sent, failed, total: tokens.length };

    } catch (error: any) {
      console.error("❌ Error in sendDailyLoginReminder:", error);
      throw error;
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
    title: "🚀 Coming Soon: Real $VBMS!",
    body: "Get ready! Real $VBMS tokens are coming to Vibe Most Wanted! Keep playing to maximize your rewards! 💰"
  },
  {
    title: "💡 VIBE Most Wanted Tip",
    body: "Did you know? Playing in Chinese (中文) gives you more coins AND changes the music! Try it now! 🎵"
  },
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
    title: "🎮 PvP Master Tip",
    body: "Challenge other players in PvP rooms for epic battles! Win or lose, you always earn coins! 🏆"
  },
  {
    title: "💎 Daily Rewards",
    body: "Log in every day to claim your daily coins! The more you play, the more you earn! 🎁"
  },
  {
    title: "🃏 Card Collection Tip",
    body: "Collect all rare cards to dominate battles! Each card has unique power - find your favorites! ✨"
  },
  {
    title: "🎵 Music Easter Egg",
    body: "Switch languages to discover different music tracks! Each language has its own vibe! 🌍"
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
    // Import api here to avoid circular reference
    // @ts-ignore
    const { api } = await import("./_generated/api");

    try {
      console.log("💡 Starting periodic tip notification...");

      // Get all notification tokens via query
      const tokens = await ctx.runQuery(api.notificationsHelpers.getAllTokens);

      if (tokens.length === 0) {
        console.log("⚠️ No notification tokens found");
        return { sent: 0, failed: 0, total: 0 };
      }

      // Get or create tip rotation state via query
      let tipState = await ctx.runQuery(api.notificationsHelpers.getTipState);

      // Initialize if needed
      if (!tipState._id) {
        const newId = await ctx.runMutation(api.notificationsHelpers.initTipState);
        tipState = { currentTipIndex: 0, lastSentAt: Date.now(), _id: newId };
      }

      // Get current tip
      const currentTip = GAMING_TIPS[tipState.currentTipIndex % GAMING_TIPS.length];

      // Send to all users WITH DELAYS
      let sent = 0;
      let failed = 0;
      const DELAY_MS = 100; // 100ms delay between notifications

      for (let i = 0; i < tokens.length; i++) {
        const tokenData = tokens[i];
        try {
          // Validar tamanhos conforme limites do Farcaster (title: 32, body: 128, notificationId: 128)
          const notificationId = `tip_${tipState.currentTipIndex}_${tokenData.fid}_${Date.now()}`.slice(0, 128);
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

        // Progress logging
        if (i % 10 === 0) {
          console.log(`✅ Progress: ${sent}/${tokens.length} sent`);
        }

        // Add delay between notifications to avoid rate limiting
        if (i < tokens.length - 1) {
          await sleep(DELAY_MS);
        }
      }

      // Update tip rotation state via mutation
      const nextTipIndex = (tipState.currentTipIndex + 1) % GAMING_TIPS.length;
      await ctx.runMutation(api.notificationsHelpers.updateTipState, {
        tipStateId: tipState._id,
        currentTipIndex: nextTipIndex,
      });

      console.log(`📊 Periodic tip sent: ${sent} successful, ${failed} failed out of ${tokens.length} total`);
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

      // Get all notification tokens
      const tokens = await ctx.db.query("notificationTokens").collect();

      if (tokens.length === 0) {
        console.log("⚠️ No notification tokens found");
        return { sent: 0, failed: 0, total: 0 };
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

      // Get all notification tokens
      const tokens = await ctx.db.query("notificationTokens").collect();

      if (tokens.length === 0) {
        console.log("⚠️ No notification tokens found");
        return { sent: 0, failed: 0, total: 0 };
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
        return { sent: 0, failed: 0, total: 0 };
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
