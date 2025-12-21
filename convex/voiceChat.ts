/**
 * WEBRTC VOICE CHAT SIGNALING
 *
 * Manages peer-to-peer voice chat signaling for poker battles
 * Handles SDP offers/answers and ICE candidates
 * Also tracks voice channel participants for incoming call notifications
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

    // Check if already in voice
    const existing = await ctx.db
      .query("voiceParticipants")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .filter((q) => q.eq(q.field("address"), normalizedAddress))
      .first();

    if (existing) {
      return { success: true, alreadyJoined: true };
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
 */
export const leaveVoiceChannel = mutation({
  args: {
    roomId: v.string(),
    address: v.string(),
  },
  handler: async (ctx, { roomId, address }) => {
    const normalizedAddress = address.toLowerCase();

    // Find and delete participant
    const participant = await ctx.db
      .query("voiceParticipants")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .filter((q) => q.eq(q.field("address"), normalizedAddress))
      .first();

    if (participant) {
      await ctx.db.delete(participant._id);
      console.log(`[VoiceChat] ${normalizedAddress} left voice in room ${roomId}`);
    }

    return { success: true };
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

    for (const p of participants) {
      await ctx.db.delete(p._id);
    }

    console.log(`[VoiceChat] Cleaned up ${participants.length} voice participants for room ${roomId}`);
    return { deleted: participants.length };
  },
});

/**
 * Clean up stale voice participants (older than 30 minutes)
 * Call this periodically to avoid showing ghost participants
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
    for (const p of staleParticipants) {
      await ctx.db.delete(p._id);
    }

    console.log(`[VoiceChat] Cleaned up ${staleParticipants.length} stale voice participants`);
    return { deleted: staleParticipants.length };
  },
});

/**
 * Clean ALL voice participants - emergency cleanup
 */
export const cleanupAllVoiceParticipants = mutation({
  args: {},
  handler: async (ctx) => {
    const allParticipants = await ctx.db
      .query("voiceParticipants")
      .collect();

    for (const p of allParticipants) {
      await ctx.db.delete(p._id);
    }

    console.log(`[VoiceChat] Emergency cleanup: removed ${allParticipants.length} voice participants`);
    return { deleted: allParticipants.length };
  },
});
