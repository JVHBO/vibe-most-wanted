import { mutation, query, internalAction } from './_generated/server';
import { internal } from './_generated/api';
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

    await ctx.scheduler.runAfter(0, internal.bugReports.notifyDiscord, {
      description: args.description,
      category: args.category,
      address: args.address,
      fid: args.fid,
      deviceInfo: args.deviceInfo,
      hasImage: args.imageBase64 !== null,
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

const CATEGORY_COLORS: Record<string, number> = {
  bug: 0xe74c3c,        // red
  ux: 0xf39c12,         // orange
  suggestion: 0x2ecc71, // green
  other: 0x95a5a6,      // grey
};

const CATEGORY_EMOJIS: Record<string, string> = {
  bug: '🐛',
  ux: '🎨',
  suggestion: '💡',
  other: '📝',
};

export const notifyDiscord = internalAction({
  args: {
    description: v.string(),
    category: v.string(),
    address: v.union(v.string(), v.null()),
    fid: v.union(v.number(), v.null()),
    deviceInfo: v.string(),
    hasImage: v.boolean(),
  },
  handler: async (_ctx, args) => {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    let device: Record<string, any> = {};
    try { device = JSON.parse(args.deviceInfo); } catch {}

    const emoji = CATEGORY_EMOJIS[args.category] ?? '📝';
    const color = CATEGORY_COLORS[args.category] ?? 0x95a5a6;

    const fields = [
      {
        name: '📋 Category',
        value: `\`${args.category.toUpperCase()}\``,
        inline: true,
      },
      {
        name: '👛 Wallet',
        value: args.address
          ? `\`${args.address.slice(0, 6)}...${args.address.slice(-4)}\``
          : '_not connected_',
        inline: true,
      },
      {
        name: '🔗 FID',
        value: args.fid ? `\`${args.fid}\`` : '_unknown_',
        inline: true,
      },
      {
        name: '📱 Device',
        value: [
          `\`${device.platform ?? 'unknown'}\``,
          `Screen: \`${device.screen ?? '?'}\``,
          `Viewport: \`${device.viewport ?? '?'}\``,
        ].join('\n'),
        inline: true,
      },
      {
        name: '🌐 Browser',
        value: `\`${String(device.userAgent ?? 'unknown').slice(0, 80)}\``,
        inline: false,
      },
      {
        name: '📍 View',
        value: `\`${device.currentView ?? 'unknown'}\``,
        inline: true,
      },
      {
        name: '🖼️ Screenshot',
        value: args.hasImage ? '✅ included' : '❌ none',
        inline: true,
      },
    ];

    const recentErrors: any[] = device.recentLogs ?? [];
    if (recentErrors.length > 0) {
      const errLines = recentErrors
        .filter((l) => l.type === 'error' || l.type === 'unhandled')
        .slice(-5)
        .map((l) => `[${l.type}] ${l.message}`)
        .join('\n');
      if (errLines) {
        fields.push({
          name: '⚠️ Recent Errors',
          value: `\`\`\`\n${errLines.slice(0, 900)}\n\`\`\``,
          inline: false,
        });
      }
    }

    const body = {
      username: 'VMW Bug Reports',
      avatar_url: 'https://i.imgur.com/4M34hi2.png',
      embeds: [
        {
          title: `${emoji} New Report — ${args.category.toUpperCase()}`,
          description: args.description.slice(0, 2048),
          color,
          fields,
          footer: { text: 'Vibe Most Wanted' },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
});
