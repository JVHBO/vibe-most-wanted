import { mutation, internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const generateImageUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const submitBugReport = mutation({
  args: {
    description: v.string(),
    category: v.string(),
    deviceInfo: v.string(),
    address: v.union(v.string(), v.null()),
    fid: v.union(v.number(), v.null()),
    username: v.union(v.string(), v.null()),
    farcasterDisplayName: v.union(v.string(), v.null()),
    imageStorageId: v.union(v.id('_storage'), v.null()),
  },
  handler: async (ctx, args) => {
    // Daily limit: 1 report per address per 24h
    if (args.address) {
      const since = Date.now() - ONE_DAY_MS;
      const recent = await ctx.db
        .query('bugReports')
        .withIndex('by_address', (q) => q.eq('address', args.address as string))
        .filter((q) => q.gt(q.field('createdAt'), since))
        .take(2);
      if (recent.length >= 2) return { limited: true };
    }

    await ctx.db.insert('bugReports', {
      description: args.description,
      category: args.category,
      deviceInfo: args.deviceInfo,
      address: args.address ?? undefined,
      fid: args.fid ?? undefined,
      username: args.username ?? undefined,
      farcasterDisplayName: args.farcasterDisplayName ?? undefined,
      imageStorageId: args.imageStorageId ?? undefined,
      status: 'open',
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.bugReports.notifyDiscord, {
      description: args.description,
      category: args.category,
      address: args.address,
      fid: args.fid,
      username: args.username,
      farcasterDisplayName: args.farcasterDisplayName,
      deviceInfo: args.deviceInfo,
      imageStorageId: args.imageStorageId ?? null,
    });

    return { limited: false };
  },
});

const CATEGORY_COLORS: Record<string, number> = {
  bug: 0xe74c3c,
  ux: 0xf39c12,
  suggestion: 0x2ecc71,
  other: 0x95a5a6,
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
    username: v.union(v.string(), v.null()),
    farcasterDisplayName: v.union(v.string(), v.null()),
    deviceInfo: v.string(),
    imageStorageId: v.union(v.id('_storage'), v.null()),
  },
  handler: async (ctx, args) => {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    let device: Record<string, any> = {};
    try { device = JSON.parse(args.deviceInfo); } catch {}

    // Get image URL from storage if present
    let imageUrl: string | null = null;
    if (args.imageStorageId) {
      try { imageUrl = await ctx.storage.getUrl(args.imageStorageId); } catch {}
    }

    const emoji = CATEGORY_EMOJIS[args.category] ?? '📝';
    const color = CATEGORY_COLORS[args.category] ?? 0x95a5a6;

    const usernameStr = args.username ? `**${args.username}**` : '_unknown_';
    const farcasterStr = args.farcasterDisplayName
      ? `**${args.farcasterDisplayName}** (fid: ${args.fid ?? '?'})`
      : args.fid ? `fid: ${args.fid}` : '_unknown_';
    const walletStr = args.address
      ? `\`${args.address.slice(0, 6)}...${args.address.slice(-4)}\``
      : '_not connected_';

    const fields = [
      { name: '👤 Account', value: usernameStr, inline: true },
      { name: '🟣 Farcaster', value: farcasterStr, inline: true },
      { name: '📋 Category', value: `\`${args.category.toUpperCase()}\``, inline: true },
      { name: '👛 Wallet', value: walletStr, inline: true },
      { name: '🔗 FID', value: args.fid ? `\`${args.fid}\`` : '_unknown_', inline: true },
      { name: '📍 View', value: `\`${device.currentView ?? 'unknown'}\``, inline: true },
      {
        name: '📱 Device',
        value: [`\`${device.platform ?? 'unknown'}\``, `Screen: \`${device.screen ?? '?'}\``, `Viewport: \`${device.viewport ?? '?'}\``].join('\n'),
        inline: true,
      },
      { name: '🌐 Browser', value: `\`${String(device.userAgent ?? 'unknown').slice(0, 80)}\``, inline: false },
      { name: '🖼️ Screenshot', value: imageUrl ? `[Ver imagem](${imageUrl})` : '❌ none', inline: true },
    ];

    const recentErrors: any[] = device.recentLogs ?? [];
    const errLines = recentErrors
      .filter((l) => l.type === 'error' || l.type === 'unhandled')
      .slice(-5)
      .map((l) => `[${l.type}] ${l.message}`)
      .join('\n');
    if (errLines) {
      fields.push({ name: '⚠️ Recent Errors', value: `\`\`\`\n${errLines.slice(0, 900)}\n\`\`\``, inline: false });
    }

    const embed: any = {
      title: `${emoji} New Report — ${args.category.toUpperCase()}`,
      description: args.description.slice(0, 2048),
      color,
      fields,
      footer: { text: 'Vibe Most Wanted' },
      timestamp: new Date().toISOString(),
    };

    // Attach screenshot as embed image if available
    if (imageUrl) embed.image = { url: imageUrl };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'VMW Bug Reports', embeds: [embed] }),
    });
  },
});
