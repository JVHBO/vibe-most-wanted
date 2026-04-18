import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function normalizeUsername(username: string) {
  const trimmed = username.trim().replace(/^@+/, "");
  return trimmed.slice(0, 64);
}

function isFallbackUsername(username: string) {
  return username === "unknown" || /^fid\d+$/i.test(username);
}

// Save or update a player's quiz result (returns attempts count)
export const saveResult = mutation({
  args: { fid: v.number(), username: v.string() },
  handler: async (ctx, { fid, username }) => {
    const normalizedUsername = normalizeUsername(username);
    const existing = await ctx.db.query("gayQuizResults")
      .withIndex("by_fid", q => q.eq("fid", fid))
      .first();

    if (existing) {
      const attempts = existing.attempts + 1;
      const nextUsername =
        !isFallbackUsername(normalizedUsername) || !existing.username
          ? normalizedUsername
          : existing.username;
      await ctx.db.patch(existing._id, { attempts, username: nextUsername, timestamp: Date.now() });
      return { attempts };
    } else {
      await ctx.db.insert("gayQuizResults", {
        fid,
        username: normalizedUsername || `fid${fid}`,
        attempts: 1,
        timestamp: Date.now(),
      });
      return { attempts: 1 };
    }
  },
});

// Get player's previous attempts (0 = first time)
export const getPlayerAttempts = query({
  args: { fid: v.number() },
  handler: async (ctx, { fid }) => {
    const r = await ctx.db.query("gayQuizResults")
      .withIndex("by_fid", q => q.eq("fid", fid))
      .first();
    return r?.attempts ?? 0;
  },
});

// Get top players ordered by attempts, then most recent activity.
export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const results = await ctx.db.query("gayQuizResults")
      .withIndex("by_attempts_and_timestamp")
      .order("desc")
      .take(16);
    return results.map(r => ({
      fid: r.fid,
      username: r.username,
      attempts: r.attempts,
    }));
  },
});
