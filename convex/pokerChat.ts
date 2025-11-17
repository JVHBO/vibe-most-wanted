import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Send a chat message
export const sendMessage = mutation({
  args: {
    roomId: v.string(),
    sender: v.string(), // address
    senderUsername: v.string(),
    message: v.string(),
    type: v.optional(v.union(v.literal("text"), v.literal("sound"))), // Message type
    soundUrl: v.optional(v.string()), // URL of the sound file (for sound messages)
    emoji: v.optional(v.string()), // Emoji for floating animation (for sound messages)
  },
  handler: async (ctx, args) => {
    // Validate message length
    if (args.message.length > 500) {
      throw new Error("Message too long (max 500 characters)");
    }

    if (args.message.trim().length === 0) {
      throw new Error("Message cannot be empty");
    }

    await ctx.db.insert("pokerChatMessages", {
      roomId: args.roomId,
      sender: args.sender.toLowerCase(),
      senderUsername: args.senderUsername,
      message: args.message.trim(),
      timestamp: Date.now(),
      type: args.type,
      soundUrl: args.soundUrl,
      emoji: args.emoji,
    });

    return { success: true };
  },
});

// Get chat messages for a room
export const getMessages = query({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("pokerChatMessages")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(50); // Last 50 messages

    return messages.reverse(); // Show oldest first
  },
});
