/**
 * WEBRTC VOICE CHAT SIGNALING
 *
 * Manages peer-to-peer voice chat signaling for poker battles
 * Handles SDP offers/answers and ICE candidates
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Send WebRTC signaling data (offer, answer, or ICE candidate)
 */
export const sendSignal = mutation({
  args: {
    roomId: v.string(),
    sender: v.string(),
    recipient: v.string(),
    type: v.union(v.literal("offer"), v.literal("answer"), v.literal("ice-candidate")),
    data: v.any(), // SDP or ICE candidate
  },
  handler: async (ctx, { roomId, sender, recipient, type, data }) => {
    const normalizedSender = sender.toLowerCase();
    const normalizedRecipient = recipient.toLowerCase();

    // Insert signaling message
    await ctx.db.insert("voiceSignaling", {
      roomId,
      sender: normalizedSender,
      recipient: normalizedRecipient,
      type,
      data,
      timestamp: Date.now(),
      processed: false,
    });

    console.log(`[VoiceChat] ${type} sent from ${normalizedSender} to ${normalizedRecipient} in room ${roomId}`);
    return { success: true };
  },
});

/**
 * Get unprocessed signals for a recipient
 */
export const getSignals = query({
  args: {
    recipient: v.string(),
    roomId: v.string(),
  },
  handler: async (ctx, { recipient, roomId }) => {
    const normalizedRecipient = recipient.toLowerCase();

    // Get all unprocessed signals for this recipient in this room
    // 🚀 BANDWIDTH FIX: Use index properly + filter (was using double withIndex which doesn't work)
    const signals = await ctx.db
      .query("voiceSignaling")
      .withIndex("by_recipient", (q) =>
        q.eq("recipient", normalizedRecipient).eq("processed", false)
      )
      .filter((q) => q.eq(q.field("roomId"), roomId))
      .order("asc")
      .collect();

    return signals;
  },
});

/**
 * Mark signals as processed
 */
export const markSignalsProcessed = mutation({
  args: {
    signalIds: v.array(v.id("voiceSignaling")),
  },
  handler: async (ctx, { signalIds }) => {
    // Mark all signals as processed
    for (const id of signalIds) {
      await ctx.db.patch(id, { processed: true });
    }

    console.log(`[VoiceChat] Marked ${signalIds.length} signals as processed`);
    return { success: true };
  },
});

/**
 * Clean up old signals (older than 5 minutes)
 * Call this periodically to avoid database bloat
 */
export const cleanupOldSignals = mutation({
  args: {},
  handler: async (ctx) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    // Find all signals older than 5 minutes
    const oldSignals = await ctx.db
      .query("voiceSignaling")
      .filter((q) => q.lt(q.field("timestamp"), fiveMinutesAgo))
      .collect();

    // Delete them
    for (const signal of oldSignals) {
      await ctx.db.delete(signal._id);
    }

    console.log(`[VoiceChat] Cleaned up ${oldSignals.length} old signals`);
    return { deleted: oldSignals.length };
  },
});
