/**
 * WEBRTC VOICE CHAT SIGNALING
 *
 * Manages peer-to-peer voice chat signaling for poker battles
 * Handles SDP offers/answers and ICE candidates
 * Also tracks voice channel participants for incoming call notifications
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

/**
 * Voice participant - represents someone in the voice channel
 */
interface VoiceParticipant {
  address: string;
  username: string;
  joinedAt: number;
}

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
    let processed = 0;
    for (const id of signalIds) {
      try {
        await ctx.db.patch(id, { processed: true });
        processed++;
      } catch (err) {
        console.error(`[VoiceChat] Failed to mark signal ${id} as processed:`, err);
      }
    }

    console.log(`[VoiceChat] Marked ${processed}/${signalIds.length} signals as processed`);
    return { success: true, processed };
  },
});

/**
 * Clean up old signals (older than 5 minutes)
 * Call this periodically to avoid database bloat
 */
export const cleanupOldSignals = internalMutation({
  args: {},
  handler: async (ctx) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    // Find all signals older than 5 minutes
    const oldSignals = await ctx.db
      .query("voiceSignaling")
      .filter((q) => q.lt(q.field("timestamp"), fiveMinutesAgo))
      .collect();

    // Delete them
    let deleted = 0;
    for (const signal of oldSignals) {
      try {
        await ctx.db.delete(signal._id);
        deleted++;
      } catch (err) {
        console.error(`[VoiceChat] Failed to delete signal ${signal._id}:`, err);
      }
    }

    console.log(`[VoiceChat] Cleaned up ${deleted}/${oldSignals.length} old signals`);
    return { deleted };
  },
});

/**
 * Join voice channel - track that a user is now in voice
 */
export const joinVoiceChannel = mutation({
  args: {
    roomId: v.string(),
    address: v.string(),
    username: v.string(),
  },
  handler: async (ctx, { roomId, address, username }) => {
    const normalizedAddress = address.toLowerCase();
    const normalizedUsername = username.toLowerCase();

    // BLOCK: Never allow CPUs/Mechas to join voice
    // CPUs have fake addresses starting with "cpu_" or usernames starting with "MECHA "
    if (
      normalizedAddress.startsWith("cpu_") ||
      normalizedAddress.startsWith("mecha_") ||
      normalizedUsername.startsWith("mecha ") ||
      normalizedUsername.startsWith("cpu ")
    ) {
      console.log(`[VoiceChat] BLOCKED: CPU/Mecha ${username} cannot join voice`);
      return { success: false, blocked: true, reason: "CPUs cannot join voice" };
    }

    // FIRST: Clean up any stale entries for this user in ANY room
    // This prevents ghost entries if user didn't leave properly before
    const staleEntries = await ctx.db
      .query("voiceParticipants")
      .filter((q) => q.eq(q.field("address"), normalizedAddress))
      .collect();

    for (const entry of staleEntries) {
      await ctx.db.delete(entry._id);
      console.log(`[VoiceChat] Cleaned stale entry for ${normalizedAddress} in room ${entry.roomId}`);
    }

    // Add to voice channel
    await ctx.db.insert("voiceParticipants", {
      roomId,
      address: normalizedAddress,
      username,
      joinedAt: Date.now(),
    });

    console.log(`[VoiceChat] ${username} joined voice in room ${roomId}`);
    return { success: true };
  },
});

/**
 * Leave voice channel - remove user from voice tracking
 * Also cleans up any stale entries in other rooms for safety
 */
export const leaveVoiceChannel = mutation({
  args: {
    roomId: v.string(),
    address: v.string(),
  },
  handler: async (ctx, { roomId, address }) => {
    const normalizedAddress = address.toLowerCase();

    // Clean up ALL entries for this user (not just the current room)
    // This ensures no ghost entries remain
    const allEntries = await ctx.db
      .query("voiceParticipants")
      .filter((q) => q.eq(q.field("address"), normalizedAddress))
      .collect();

    let deleted = 0;
    for (const entry of allEntries) {
      await ctx.db.delete(entry._id);
      deleted++;
    }

    if (deleted > 0) {
      console.log(`[VoiceChat] ${normalizedAddress} left voice (cleaned ${deleted} entries)`);
    }

    return { success: true, deleted };
  },
});

/**
 * Get voice participants for a room
 * This is used to show incoming call notifications
 */
export const getVoiceParticipants = query({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, { roomId }) => {
    const participants = await ctx.db
      .query("voiceParticipants")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();

    return participants.map(p => ({
      address: p.address,
      username: p.username,
      joinedAt: p.joinedAt,
    }));
  },
});

/**
 * Clean up voice participants when room is deleted
 * Note: Called from API route for admin cleanup
 */
export const cleanupRoomVoice = mutation({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, { roomId }) => {
    const participants = await ctx.db
      .query("voiceParticipants")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();

    let deleted = 0;
    for (const p of participants) {
      try {
        await ctx.db.delete(p._id);
        deleted++;
      } catch (err) {
        console.error(`[VoiceChat] Failed to delete participant ${p._id}:`, err);
      }
    }

    console.log(`[VoiceChat] Cleaned up ${deleted}/${participants.length} voice participants for room ${roomId}`);
    return { deleted };
  },
});

/**
 * Clean up stale voice participants (older than 30 minutes)
 * Call this periodically to avoid showing ghost participants
 * Note: Called from API route for admin cleanup
 */
export const cleanupStaleVoiceParticipants = mutation({
  args: {},
  handler: async (ctx) => {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

    // Find all participants older than 30 minutes
    const staleParticipants = await ctx.db
      .query("voiceParticipants")
      .filter((q) => q.lt(q.field("joinedAt"), thirtyMinutesAgo))
      .collect();

    // Delete them
    let deleted = 0;
    for (const p of staleParticipants) {
      try {
        await ctx.db.delete(p._id);
        deleted++;
      } catch (err) {
        console.error(`[VoiceChat] Failed to delete stale participant ${p._id}:`, err);
      }
    }

    console.log(`[VoiceChat] Cleaned up ${deleted}/${staleParticipants.length} stale voice participants`);
    return { deleted };
  },
});

/**
 * Clean ALL voice participants - emergency cleanup
 */
export const cleanupAllVoiceParticipants = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allParticipants = await ctx.db
      .query("voiceParticipants")
      .collect();

    let deleted = 0;
    for (const p of allParticipants) {
      try {
        await ctx.db.delete(p._id);
        deleted++;
      } catch (err) {
        console.error(`[VoiceChat] Failed to delete participant ${p._id}:`, err);
      }
    }

    console.log(`[VoiceChat] Emergency cleanup: removed ${deleted}/${allParticipants.length} voice participants`);
    return { deleted };
  },
});
