/**
 * 🔒 SESSION MANAGEMENT
 *
 * Prevents using the same account on multiple devices simultaneously.
 * When a new device connects, the old session is invalidated.
 *
 * Flow:
 * 1. User connects → registerSession() creates/updates session
 * 2. Other device connects same account → registerSession() invalidates previous
 * 3. Old device receives "session_invalidated" on next heartbeat
 * 4. Old device shows warning modal, requires refresh to reconnect
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Session timeout: 5 minutes without heartbeat = session expired
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Register or update a session for a profile
 * Returns: { success: true, isNewSession: boolean } or { success: false, reason: string }
 */
export const registerSession = mutation({
  args: {
    profileAddress: v.string(),
    sessionId: v.string(),
    deviceInfo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.profileAddress.toLowerCase();
    const now = Date.now();

    // Check for existing session
    const existingSession = await ctx.db
      .query("activeSessions")
      .withIndex("by_profile", (q) => q.eq("profileAddress", normalizedAddress))
      .first();

    // If same session, just update heartbeat
    if (existingSession && existingSession.sessionId === args.sessionId) {
      await ctx.db.patch(existingSession._id, {
        lastHeartbeat: now,
        deviceInfo: args.deviceInfo,
      });
      return { success: true, isNewSession: false };
    }

    // If different session exists, delete it (invalidate old device)
    if (existingSession) {
      await ctx.db.delete(existingSession._id);
    }

    // Create new session
    await ctx.db.insert("activeSessions", {
      profileAddress: normalizedAddress,
      sessionId: args.sessionId,
      deviceInfo: args.deviceInfo,
      connectedAt: now,
      lastHeartbeat: now,
    });

    return { success: true, isNewSession: true };
  },
});

/**
 * Heartbeat: Update session timestamp and check if still valid
 * Returns: { valid: true } or { valid: false, reason: "session_invalidated" }
 */
export const heartbeat = mutation({
  args: {
    profileAddress: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.profileAddress.toLowerCase();
    const now = Date.now();

    // Find the active session for this profile
    const session = await ctx.db
      .query("activeSessions")
      .withIndex("by_profile", (q) => q.eq("profileAddress", normalizedAddress))
      .first();

    // No session = not registered (shouldn't happen normally)
    if (!session) {
      return { valid: false, reason: "no_session" };
    }

    // Different session ID = another device took over
    if (session.sessionId !== args.sessionId) {
      return { valid: false, reason: "session_invalidated" };
    }

    // Session is valid, update heartbeat
    await ctx.db.patch(session._id, {
      lastHeartbeat: now,
    });

    return { valid: true };
  },
});

/**
 * Check if a session is valid (query, no mutation)
 */
export const checkSession = query({
  args: {
    profileAddress: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.profileAddress.toLowerCase();

    const session = await ctx.db
      .query("activeSessions")
      .withIndex("by_profile", (q) => q.eq("profileAddress", normalizedAddress))
      .first();

    if (!session) {
      return { valid: false, reason: "no_session" };
    }

    if (session.sessionId !== args.sessionId) {
      return { valid: false, reason: "session_invalidated" };
    }

    // Check if session expired (no heartbeat in 5 minutes)
    const now = Date.now();
    if (now - session.lastHeartbeat > SESSION_TIMEOUT_MS) {
      return { valid: false, reason: "session_expired" };
    }

    return { valid: true };
  },
});

/**
 * End a session (logout/disconnect)
 */
export const endSession = mutation({
  args: {
    profileAddress: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.profileAddress.toLowerCase();

    const session = await ctx.db
      .query("activeSessions")
      .withIndex("by_profile", (q) => q.eq("profileAddress", normalizedAddress))
      .first();

    // Only delete if it's our session
    if (session && session.sessionId === args.sessionId) {
      await ctx.db.delete(session._id);
      return { success: true };
    }

    return { success: false, reason: "not_your_session" };
  },
});

/**
 * Cleanup expired sessions (called periodically)
 * Internal function for maintenance
 */
export const cleanupExpiredSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredThreshold = now - SESSION_TIMEOUT_MS;

    // Get all sessions
    const allSessions = await ctx.db.query("activeSessions").collect();

    let cleaned = 0;
    for (const session of allSessions) {
      if (session.lastHeartbeat < expiredThreshold) {
        await ctx.db.delete(session._id);
        cleaned++;
      }
    }

    return { cleaned };
  },
});

/**
 * Get active session info for a profile (for debugging/admin)
 */
export const getActiveSession = query({
  args: {
    profileAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.profileAddress.toLowerCase();

    return await ctx.db
      .query("activeSessions")
      .withIndex("by_profile", (q) => q.eq("profileAddress", normalizedAddress))
      .first();
  },
});
