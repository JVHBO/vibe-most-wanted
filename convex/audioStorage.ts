import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Generate an upload URL for audio files
 * Client uploads directly to Convex storage
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get a URL to access a stored audio file
 */
export const getAudioUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

/**
 * Save audio metadata after upload
 * Links the storage ID to a user for tracking
 */
export const saveAudioMetadata = mutation({
  args: {
    storageId: v.id("_storage"),
    senderFid: v.number(),
    durationSeconds: v.number(),
  },
  handler: async (ctx, { storageId, senderFid, durationSeconds }) => {
    // Optional: Save metadata for analytics/cleanup
    // For now, just return the storage ID as the audio identifier
    return {
      audioStorageId: storageId,
      success: true,
    };
  },
});

/**
 * Delete an audio file from storage
 * Used when user cancels or re-records
 */
export const deleteAudio = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await ctx.storage.delete(storageId);
    return { success: true };
  },
});
