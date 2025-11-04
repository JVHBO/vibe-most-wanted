import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
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
 * Get all notification tokens (for migration/debugging)
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
    const now = Date.now();

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
// BROADCAST NOTIFICATIONS (internal functions)
// ============================================================================

/**
 * Send daily login reminder to all users with notification tokens
 * Called by scheduled function (cron job)
 */
export const sendDailyLoginReminder = internalMutation({
  args: {},
  handler: async (ctx) => {
    try {
      // Get all notification tokens
      const tokens = await ctx.db.query("notificationTokens").collect();

      if (tokens.length === 0) {
        console.log("⚠️ No notification tokens found");
        return { sent: 0, failed: 0, total: 0 };
      }

      console.log(`📬 Sending daily login reminder to ${tokens.length} users...`);

      let sent = 0;
      let failed = 0;

      // Send notification to each user
      for (const tokenData of tokens) {
        try {
          const { token, url, fid } = tokenData;

          // Notification content
          const payload = {
            notificationId: `daily_login_${new Date().toISOString().split('T')[0]}_${fid}`,
            title: "💰 Daily Login Bonus!",
            body: "Claim your free coins! Don't miss today's reward 🎁",
            tokens: [token],
            targetUrl: "https://www.vibemostwanted.xyz",
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

          // Handle invalid tokens
          if (result.invalidTokens?.includes(token)) {
            await ctx.db.delete(tokenData._id);
            console.log(`🗑️ Removed invalid token for FID ${fid}`);
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
          console.log(`✅ Sent to FID ${fid}`);

        } catch (error: any) {
          console.error(`❌ Error sending to FID ${tokenData.fid}:`, error.message);
          failed++;
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
