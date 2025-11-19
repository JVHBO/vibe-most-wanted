import { query } from "./_generated/server";

/**
 * Test function to check if farcasterCards table exists
 */
export const checkTableExists = query({
  args: {},
  handler: async (ctx) => {
    try {
      const count = await ctx.db
        .query("farcasterCards")
        .take(1);

      return {
        exists: true,
        message: "farcasterCards table exists!",
        sampleCount: count.length,
      };
    } catch (error: any) {
      return {
        exists: false,
        message: "farcasterCards table does not exist",
        error: error.message,
      };
    }
  },
});
