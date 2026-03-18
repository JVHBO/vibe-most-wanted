import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const submitBugReport = mutation({
  args: {
    description: v.string(),
    category: v.string(),
    deviceInfo: v.string(),
    address: v.union(v.string(), v.null()),
    fid: v.union(v.number(), v.null()),
    imageBase64: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('bugReports', {
      description: args.description,
      category: args.category,
      deviceInfo: args.deviceInfo,
      address: args.address ?? undefined,
      fid: args.fid ?? undefined,
      imageBase64: args.imageBase64 ?? undefined,
      status: 'open',
      createdAt: Date.now(),
    });
  },
});

export const listBugReports = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const q = ctx.db.query('bugReports').withIndex('by_created');
    const reports = await q.order('desc').take(100);
    if (args.status) return reports.filter((r) => r.status === args.status);
    return reports;
  },
});
