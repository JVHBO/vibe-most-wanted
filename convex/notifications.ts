// @ts-nocheck
import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction, internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireInternalAdminKey } from "./adminAuth";

const APP_URL = "https://vibemostwanted.xyz";
const BASE_API = "https://dashboard.base.org/api/v1/notifications";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send notification directly to a single FID via stored Farcaster token URL.
 * Only uses tokens with app="vbms".
 */
async function sendViaFarcasterToken(
  ctx: any,
  fid: string,
  title: string,
  body: string,
  targetUrl: string = APP_URL
): Promise<{ success_count: number; failure_count: number; details: string[] }> {
  const allTokens = await ctx.runQuery(internal.notifications.getAllTokensByFidInternal, { fid });

  // Only VBMS tokens (ignore vibefid tokens)
  const tokens = (allTokens || []).filter((t: any) => !t.app || t.app === "vbms");

  if (tokens.length === 0) {
    return { success_count: 0, failure_count: 0, details: [`No vbms tokens for FID ${fid}`] };
  }

  const uuid = crypto.randomUUID();
  const details: string[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const tokenDoc of tokens) {
    const notifUrl = tokenDoc.url || "https://api.warpcast.com/v1/frame-notifications";
    try {
      const res = await fetch(notifUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Frame-Token": tokenDoc.token },
        body: JSON.stringify({
          title: title.slice(0, 32),
          body: body.slice(0, 128),
          targetUrl: targetUrl.slice(0, 256),
          notificationId: uuid,
          tokens: [tokenDoc.token],
        }),
      });
      if (res.ok) {
        successCount++;
        details.push(`OK ${tokenDoc.platform}/${tokenDoc.app}`);
      } else {
        const err = await res.text();
        failCount++;
        details.push(`FAIL ${tokenDoc.platform}: ${res.status} ${err.slice(0, 80)}`);
      }
    } catch (e: any) {
      failCount++;
      details.push(`ERR ${tokenDoc.platform}: ${e?.message}`);
    }
    await sleep(200);
  }

  return { success_count: successCount, failure_count: failCount, details };
}

/**
 * Broadcast to ALL users with vbms Farcaster tokens.
 */
async function broadcastFarcaster(
  ctx: any,
  title: string,
  body: string,
  targetUrl: string = APP_URL
): Promise<{ success_count: number; failure_count: number; totalTokens: number }> {
  const { api } = await import("./_generated/api");
  const allTokens = await ctx.runQuery(api.notifications.getUniqueTokens, {});

  console.log(`[Farcaster] Broadcasting to ${allTokens.length} tokens`);

  let successCount = 0;
  let failCount = 0;
  const uuid = crypto.randomUUID();

  for (let i = 0; i < allTokens.length; i++) {
    const { fid, token, url } = allTokens[i];
    const notifUrl = url || "https://api.warpcast.com/v1/frame-notifications";
    try {
      const res = await fetch(notifUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Frame-Token": token },
        body: JSON.stringify({
          title: title.slice(0, 32),
          body: body.slice(0, 128),
          targetUrl: targetUrl.slice(0, 256),
          notificationId: uuid,
          tokens: [token],
        }),
      });
      if (res.ok) successCount++;
      else {
        failCount++;
        if (failCount <= 5) console.error(`[Farcaster] FAIL FID:${fid} ${res.status}`);
      }
    } catch (e: any) {
      failCount++;
    }
    if (i < allTokens.length - 1) await sleep(200);
  }

  console.log(`[Farcaster] ✅ ${successCount} sent, ❌ ${failCount} failed`);
  return { success_count: successCount, failure_count: failCount, totalTokens: allTokens.length };
}

/**
 * Broadcast to ALL opted-in Base App users.
 */
async function broadcastBase(
  title: string,
  body: string,
  targetPath: string = "/"
): Promise<{ sentCount: number; failedCount: number }> {
  const apiKey = process.env.BASE_NOTIFICATIONS_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_URL || APP_URL;

  if (!apiKey) {
    console.error("[BaseNotif] BASE_NOTIFICATIONS_API_KEY not set — skipping");
    return { sentCount: 0, failedCount: 0 };
  }

  // Fetch all opted-in wallets (paginated)
  const addresses: string[] = [];
  let cursor: string | undefined;
  do {
    const url = `${BASE_API}/app/users?app_url=${encodeURIComponent(appUrl)}&notification_enabled=true&limit=100${cursor ? `&cursor=${cursor}` : ""}`;
    const res = await fetch(url, { headers: { "x-api-key": apiKey } });
    if (!res.ok) { console.error(`[BaseNotif] users fetch failed: ${res.status}`); break; }
    const data = await res.json();
    for (const u of (data.users || [])) {
      if (u?.address) addresses.push(u.address.toLowerCase());
    }
    cursor = data.nextCursor || undefined;
  } while (cursor && addresses.length < 10000);

  if (addresses.length === 0) {
    console.log("[BaseNotif] No opted-in users found");
    return { sentCount: 0, failedCount: 0 };
  }

  const res = await fetch(`${BASE_API}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      app_url: appUrl,
      wallet_addresses: addresses,
      title: title.slice(0, 30),
      message: body.slice(0, 200),
      ...(targetPath.startsWith("/") ? { target_path: targetPath } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[BaseNotif] send failed: ${res.status} ${err.slice(0, 200)}`);
    return { sentCount: 0, failedCount: addresses.length };
  }

  const result = await res.json();
  console.log(`[BaseNotif] ✅ ${result.sentCount} sent, ❌ ${result.failedCount} failed (${addresses.length} users)`);
  return { sentCount: result.sentCount || 0, failedCount: result.failedCount || 0 };
}

/**
 * Send Base App notification to specific wallet addresses only.
 */
async function sendBaseToAddresses(
  walletAddresses: string[],
  title: string,
  message: string,
  targetPath: string = "/"
): Promise<{ sentCount: number; failedCount: number }> {
  const apiKey = process.env.BASE_NOTIFICATIONS_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_URL || APP_URL;

  if (!apiKey) {
    console.error("[BaseNotif] BASE_NOTIFICATIONS_API_KEY not set — skipping");
    return { sentCount: 0, failedCount: 0 };
  }

  const addresses = [...new Set(walletAddresses.map((w) => w.toLowerCase()))].slice(0, 1000);
  if (addresses.length === 0) return { sentCount: 0, failedCount: 0 };

  const res = await fetch(`${BASE_API}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      app_url: appUrl,
      wallet_addresses: addresses,
      title: title.slice(0, 30),
      message: message.slice(0, 200),
      ...(targetPath.startsWith("/") ? { target_path: targetPath } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[BaseNotif] send failed: ${res.status} ${err.slice(0, 200)}`);
    return { sentCount: 0, failedCount: addresses.length };
  }

  const result = await res.json();
  return { sentCount: result.sentCount || 0, failedCount: result.failedCount || 0 };
}

// ─────────────────────────────────────────────
// TOKEN QUERIES & MUTATIONS
// ─────────────────────────────────────────────

export const getTokenByFid = query({
  args: { fid: v.string(), adminKey: v.optional(v.string()) },
  handler: async (ctx, { fid, adminKey }) => {
    if (adminKey !== undefined) requireInternalAdminKey(adminKey);
    return ctx.db.query("notificationTokens").withIndex("by_fid", (q) => q.eq("fid", fid)).first();
  },
});

export const getAllTokensByFidInternal = internalQuery({
  args: { fid: v.string() },
  handler: async (ctx, { fid }) => {
    return ctx.db.query("notificationTokens").withIndex("by_fid", (q) => q.eq("fid", fid)).take(10);
  },
});

/**
 * Returns unique vbms tokens for broadcast (no vibefid tokens)
 */
export const getUniqueTokens = query({
  args: {},
  handler: async (ctx) => {
    const tokens = await ctx.db.query("notificationTokens").take(5000);
    const seen = new Set<string>();
    const unique: Array<{ fid: string; token: string; url: string }> = [];
    for (const t of tokens) {
      // Skip vibefid-only tokens in VBMS broadcast
      if (t.app === "vibefid") continue;
      if (!seen.has(t.token)) {
        seen.add(t.token);
        unique.push({ fid: t.fid, token: t.token, url: t.url || "https://api.warpcast.com/v1/frame-notifications" });
      }
    }
    return unique;
  },
});

function getPlatformFromUrl(url: string): string {
  if (url.includes("warpcast")) return "warpcast";
  if (url.includes("farcaster.xyz")) return "farcaster";
  return "farcaster";
}

export const saveToken = mutation({
  args: {
    adminKey: v.optional(v.string()),
    fid: v.string(),
    token: v.string(),
    url: v.string(),
    app: v.optional(v.string()),
  },
  handler: async (ctx, { adminKey, fid, token, url, app }) => {
    if (adminKey !== undefined) requireInternalAdminKey(adminKey);
    const now = Date.now();
    const platform = getPlatformFromUrl(url);
    const appName = app || "vbms";

    const allTokens = await ctx.db.query("notificationTokens").withIndex("by_fid", (q) => q.eq("fid", fid)).take(10);
    const existing = allTokens.find((t) => t.platform === platform && t.app === appName);

    if (existing) {
      await ctx.db.patch(existing._id, { token, url, platform, app: appName, lastUpdated: now });
      return existing._id;
    }

    // Migrate legacy token (no app field)
    const legacy = allTokens.find((t) => t.platform === platform && !t.app);
    if (legacy) {
      await ctx.db.patch(legacy._id, { app: appName, token, url, platform, lastUpdated: now });
      return legacy._id;
    }

    return ctx.db.insert("notificationTokens", { fid, token, url, platform, app: appName, createdAt: now, lastUpdated: now });
  },
});

export const removeToken = mutation({
  args: { fid: v.string(), adminKey: v.optional(v.string()) },
  handler: async (ctx, { fid, adminKey }) => {
    if (adminKey !== undefined) requireInternalAdminKey(adminKey);
    const existing = await ctx.db.query("notificationTokens").withIndex("by_fid", (q) => q.eq("fid", fid)).first();
    if (existing) { await ctx.db.delete(existing._id); return true; }
    return false;
  },
});

// ─────────────────────────────────────────────
// DAILY NOTIFICATIONS (CRON TARGETS)
// ─────────────────────────────────────────────

const GAMING_TIPS = [
  { title: "💰 Daily Login Bonus!", body: "Claim your free coins today! Don't let your daily reward expire 🎁" },
  { title: "🎰 Daily Roulette!", body: "Your free spin is waiting! Win VBMS, cards & rare prizes 🍀" },
  { title: "✉️ VibeMail!", body: "Drop a personalized message on the blockchain. Add music & effects! 🎵" },
  { title: "🎯 Attack Mode!", body: "Attack leaderboard players to steal their VBMS! Higher rank = bigger reward 👑" },
  { title: "🛡️ Defense Deck!", body: "Set up your Defense Deck before going offline. Empty deck = easy target! 🃏" },
  { title: "⚡ Aura Level!", body: "Higher Aura level = more bonus roulette spins every day. Keep grinding! 🐉" },
  { title: "🎁 Free Card!", body: "Grab your FREE card from the Shop every day. No VBMS needed — just tap! 🃏" },
  { title: "⚔️ Vibe Clash!", body: "Build your deck and crush opponents in Mecha Arena! Bet VBMS and win big 🤖" },
  { title: "👹 Raid Boss!", body: "Team up to defeat the Raid Boss! VibeFID holders deal bonus damage 💥" },
  { title: "🎴 Baccarat!", body: "Bet VBMS on Player or Banker and double your coins! New round every minute 🃏" },
  { title: "🎰 Tukka Slots!", body: "Spin the reels, collect foils and trigger the Bonus Round for massive VBMS wins! 💰" },
  { title: "🏆 Leaderboard!", body: "Check the leaderboard and see where you stand. Top players get attacked more — stay sharp! 👀" },
];

/**
 * CRON: Daily tip — sends to BOTH Farcaster (Hypersnap) AND Base App
 */
export const sendDailyTip = internalAction({
  args: {},
  handler: async (ctx) => {
    const { api } = await import("./_generated/api");

    let tipState = await ctx.runQuery(internal.notificationsHelpers.getTipState);
    if (!tipState._id) {
      const newId = await ctx.runMutation(api.notificationsHelpers.initTipState);
      tipState = { currentTipIndex: 0, lastSentAt: Date.now(), _id: newId };
    }

    const tip = GAMING_TIPS[tipState.currentTipIndex % GAMING_TIPS.length];
    console.log(`📣 Daily tip #${tipState.currentTipIndex}: "${tip.title}"`);

    // Channel 1: Farcaster / Hypersnap
    const farcasterResult = await broadcastFarcaster(ctx, tip.title, tip.body);

    // Channel 2: Base App
    const baseResult = await broadcastBase(tip.title, tip.body, "/");

    // Advance tip index
    const nextIndex = (tipState.currentTipIndex + 1) % GAMING_TIPS.length;
    await ctx.runMutation(api.notificationsHelpers.updateTipState, {
      tipStateId: tipState._id,
      currentTipIndex: nextIndex,
    });

    console.log(`📊 Farcaster: ${farcasterResult.success_count}✅ ${farcasterResult.failure_count}❌ | Base: ${baseResult.sentCount}✅ ${baseResult.failedCount}❌`);
    return { farcaster: farcasterResult, base: baseResult, tipIndex: tipState.currentTipIndex };
  },
});

// Keep old name as alias so crons.ts doesn't break
export const sendPeriodicTip = internalAction({
  args: {},
  handler: async (ctx) => {
    return ctx.runAction(internal.notifications.sendDailyTip, {});
  },
});

// ─────────────────────────────────────────────
// SPECIFIC NOTIFICATION TYPES
// ─────────────────────────────────────────────

/**
 * Notify player when their defense deck is attacked.
 * Sends via Base App (address known) + Farcaster (if FID known).
 */
export const sendDefenseAttackedNotification = internalAction({
  args: {
    defenderAddress: v.string(),
    defenderFid: v.optional(v.number()),
    attackerUsername: v.string(),
    result: v.union(v.literal("win"), v.literal("lose")),
    defenderUsername: v.string(),
  },
  handler: async (ctx, { defenderAddress, defenderFid, attackerUsername, result, defenderUsername }) => {
    const title = result === "win" ? "🛡️ Defense Win!" : "⚔️ You Were Attacked!";
    const body = result === "win"
      ? `${attackerUsername} attacked but your defense held!`
      : `${attackerUsername} defeated your defense!`;
    const targetPath = `/profile/${encodeURIComponent(defenderUsername)}?scrollTo=match-history`;

    const [baseResult, farcasterResult] = await Promise.all([
      sendBaseToAddresses([defenderAddress], title, body, targetPath),
      defenderFid
        ? sendViaFarcasterToken(ctx, defenderFid.toString(), title, body, APP_URL + targetPath)
        : Promise.resolve({ success_count: 0, failure_count: 0, details: [] }),
    ]);

    console.log(`[DefenseNotif] Base: ${baseResult.sentCount}✅ | Farcaster: ${farcasterResult.success_count}✅`);
    return { base: baseResult, farcaster: farcasterResult };
  },
});

/**
 * Notify when a VibeMail is received.
 */
export const sendVibemailNotification = internalAction({
  args: { recipientFid: v.number(), hasAudio: v.boolean() },
  handler: async (ctx, { recipientFid, hasAudio }) => {
    const title = "💌 New VibeMail!";
    const body = hasAudio ? "Someone sent you a message with a sound! 🎵 Check your inbox" : "Someone sent you an anonymous message! Check your inbox";
    const result = await sendViaFarcasterToken(ctx, recipientFid.toString(), title, body);
    console.log(`[VibeMail] FID ${recipientFid}: ${result.success_count > 0 ? "✅ sent" : "❌ failed"}`);
    return { sent: result.success_count > 0 };
  },
});

/**
 * Notify auction winner.
 */
export const sendWinnerNotification = internalAction({
  args: { winnerFid: v.number(), winnerUsername: v.string(), bidAmount: v.number(), castAuthor: v.string() },
  handler: async (ctx, { winnerFid, winnerUsername, bidAmount, castAuthor }) => {
    const title = "🏆 Your Cast Won!";
    const body = `Congrats @${winnerUsername}! Your bid of ${bidAmount.toLocaleString()} VBMS won! @${castAuthor} is now WANTED!`;
    const result = await sendViaFarcasterToken(ctx, winnerFid.toString(), title, body);
    return { sent: result.success_count > 0 };
  },
});

/**
 * Notify when a featured cast becomes active.
 */
export const sendFeaturedCastNotification = internalAction({
  args: { castAuthor: v.string(), warpcastUrl: v.string(), winnerUsername: v.optional(v.string()) },
  handler: async (ctx, { castAuthor, winnerUsername }) => {
    const title = "🎯 New Wanted Cast!";
    const body = winnerUsername
      ? `@${winnerUsername} won the auction! @${castAuthor} is now WANTED! Interact to earn VBMS 💰`
      : `@${castAuthor} is now WANTED! Interact to earn VBMS tokens! 💰`;
    const result = await broadcastFarcaster(ctx, title, body);
    return { sent: result.success_count, failed: result.failure_count };
  },
});

/**
 * Notify all contributors when a raid boss is defeated.
 */
export const sendBossDefeatedNotifications = internalAction({
  args: {
    bossName: v.string(),
    bossRarity: v.string(),
    totalContributors: v.number(),
    contributorAddresses: v.array(v.string()),
  },
  handler: async (ctx, { bossName, bossRarity, contributorAddresses }) => {
    const rarityEmoji: Record<string, string> = { common: "⚪", rare: "🔵", epic: "🟣", legendary: "🟡", mythic: "🔴" };
    const title = "🎉 Boss Defeated!";
    const body = `${rarityEmoji[bossRarity.toLowerCase()] || "⚫"} ${bossName} was slain! Claim your reward now! 💰`;

    // Load profiles to get FIDs
    const profileMap = await ctx.runQuery(internal.notifications.getProfilesByAddresses, { addresses: contributorAddresses });

    let totalSent = 0;
    let totalFailed = 0;

    for (const address of contributorAddresses) {
      const profile = profileMap[address.toLowerCase()];
      if (!profile) continue;
      const fid = profile.fid || (profile.farcasterFid ? profile.farcasterFid.toString() : null);
      if (!fid) continue;
      const r = await sendViaFarcasterToken(ctx, fid, title, body);
      totalSent += r.success_count;
      totalFailed += r.failure_count;
    }

    // Also send via Base to all contributor addresses
    const baseResult = await sendBaseToAddresses(contributorAddresses, title, body, "/");

    console.log(`[BossDefeated] Farcaster: ${totalSent}✅ | Base: ${baseResult.sentCount}✅`);
    return { sent: totalSent + baseResult.sentCount, failed: totalFailed };
  },
});

// ─────────────────────────────────────────────
// LOW ENERGY NOTIFICATIONS (Raid deck)
// ─────────────────────────────────────────────

const LOW_ENERGY_THRESHOLD = 60 * 60 * 1000; // 1 hour
const NOTIFICATION_COOLDOWN = 6 * 60 * 60 * 1000; // 6 hours

export const sendLowEnergyNotifications = internalAction({
  args: {},
  handler: async (ctx) => {
    const raidDecks = await ctx.runQuery(internal.notifications.getAllRaidDecks);
    const now = Date.now();
    let sent = 0, failed = 0, skipped = 0;

    const decksToNotify: Array<{ address: string; lowEnergyCards: number }> = [];

    for (const deck of raidDecks) {
      let lowEnergy = 0;
      let expired = 0;
      for (const card of deck.cardEnergy) {
        if (card.energyExpiresAt === 0) continue;
        const remaining = card.energyExpiresAt - now;
        if (remaining <= 0) expired++;
        else if (remaining <= LOW_ENERGY_THRESHOLD) lowEnergy++;
      }
      if (lowEnergy > 0 && expired === 0) decksToNotify.push({ address: deck.address, lowEnergyCards: lowEnergy });
    }

    if (decksToNotify.length === 0) return { sent: 0, failed: 0, skipped: 0 };

    const profileMap = await ctx.runQuery(internal.notifications.getProfilesByAddresses, {
      addresses: decksToNotify.map((d) => d.address),
    });

    for (const deck of decksToNotify) {
      const last = await ctx.runQuery(internal.notificationsHelpers.getLastLowEnergyNotification, { address: deck.address });
      if (last && now - last.lastNotifiedAt < NOTIFICATION_COOLDOWN) { skipped++; continue; }

      const profile = profileMap[deck.address.toLowerCase()];
      if (!profile) continue;
      const fid = profile.fid || (profile.farcasterFid ? profile.farcasterFid.toString() : null);
      if (!fid) continue;

      const title = "⚡ Low Energy Warning!";
      const body = `${deck.lowEnergyCards} card${deck.lowEnergyCards > 1 ? "s" : ""} will run out in less than 1 hour!`;

      const r = await sendViaFarcasterToken(ctx, fid, title, body);
      if (r.success_count > 0) {
        sent++;
        await ctx.runMutation(internal.notificationsHelpers.updateLowEnergyNotification, {
          address: deck.address, lowEnergyCount: deck.lowEnergyCards, expiredCount: 0,
        });
      } else {
        failed++;
      }
    }

    console.log(`[LowEnergy] ${sent}✅ ${failed}❌ ${skipped} skipped`);
    return { sent, failed, skipped };
  },
});

// ─────────────────────────────────────────────
// INTERNAL QUERIES
// ─────────────────────────────────────────────

export const getAllRaidDecks = internalQuery({
  args: {},
  handler: async (ctx) => ctx.db.query("raidAttacks").take(200),
});

export const getProfileByAddress = internalQuery({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    return ctx.db.query("profiles").withIndex("by_address", (q) => q.eq("address", address.toLowerCase())).first();
  },
});

export const getProfilesByAddresses = internalQuery({
  args: { addresses: v.array(v.string()) },
  handler: async (ctx, { addresses }) => {
    const unique = [...new Set(addresses.map((a) => a.toLowerCase()))];
    const profiles = await Promise.all(
      unique.map((addr) => ctx.db.query("profiles").withIndex("by_address", (q) => q.eq("address", addr)).first())
    );
    const result: Record<string, { fid: string | undefined; farcasterFid: number | undefined }> = {};
    for (const p of profiles) {
      if (p) result[p.address] = { fid: p.fid, farcasterFid: p.farcasterFid };
    }
    return result;
  },
});

// ─────────────────────────────────────────────
// PUBLIC ADMIN ACTIONS (trigger via CLI / admin panel)
// ─────────────────────────────────────────────

/** Manually trigger the daily tip (both channels) */
export const triggerDailyTip = mutation({
  args: { adminKey: v.string() },
  handler: async (ctx, { adminKey }) => {
    requireInternalAdminKey(adminKey);
    await ctx.scheduler.runAfter(0, internal.notifications.sendDailyTip, {});
    return { scheduled: true };
  },
});

/** Alias kept for backwards compat */
export const triggerPeriodicTip = mutation({
  args: { adminKey: v.string() },
  handler: async (ctx, { adminKey }) => {
    requireInternalAdminKey(adminKey);
    await ctx.scheduler.runAfter(0, internal.notifications.sendDailyTip, {});
    return { scheduled: true };
  },
});

/** Kept for backwards compat */
export const triggerDailyLoginReminder = mutation({
  args: { adminKey: v.string() },
  handler: async (ctx, { adminKey }) => {
    requireInternalAdminKey(adminKey);
    await ctx.scheduler.runAfter(0, internal.notifications.sendDailyTip, {});
    return { scheduled: true };
  },
});

/** Test: send to a single FID via Farcaster token */
export const triggerTestFarcasterNotification = mutation({
  args: {
    adminKey: v.string(),
    fid: v.number(),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (ctx, { adminKey, fid, title, body }) => {
    requireInternalAdminKey(adminKey);
    await ctx.scheduler.runAfter(0, internal.notifications.testFarcasterNotification, {
      fid,
      title: title || "🧪 [FARCASTER-TEST]",
      body: body || "Notificação via Farcaster Hypersnap token - VMW",
    });
    return { scheduled: true, fid };
  },
});

/** Kept for backwards compat */
export const triggerTestDirectNotification = mutation({
  args: {
    adminKey: v.string(),
    fid: v.number(),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (ctx, { adminKey, fid, title, body }) => {
    requireInternalAdminKey(adminKey);
    await ctx.scheduler.runAfter(0, internal.notifications.testFarcasterNotification, {
      fid,
      title: title || "🧪 [FARCASTER-TEST]",
      body: body || "Notificação via Farcaster token - VMW",
    });
    return { scheduled: true, fid };
  },
});

export const testFarcasterNotification = internalAction({
  args: { fid: v.number(), title: v.string(), body: v.string() },
  handler: async (ctx, { fid, title, body }) => {
    const result = await sendViaFarcasterToken(ctx, fid.toString(), title, body);
    console.log(`[TestFarcaster] FID ${fid}:`, JSON.stringify(result));
    return result;
  },
});

/** Send custom broadcast to all users (both channels) */
export const sendCustomNotification = action({
  args: { adminKey: v.string(), title: v.string(), body: v.string() },
  handler: async (ctx, { adminKey, title, body }) => {
    requireInternalAdminKey(adminKey);
    const [farcaster, base] = await Promise.all([
      broadcastFarcaster(ctx, title, body),
      broadcastBase(title, body),
    ]);
    return { farcaster, base };
  },
});

/** Send to Farcaster only — schedules as background job to avoid CLI timeout */
export const sendFarcasterNotification = mutation({
  args: { adminKey: v.string(), title: v.string(), body: v.string(), targetUrl: v.optional(v.string()) },
  handler: async (ctx, { adminKey, title, body, targetUrl }) => {
    requireInternalAdminKey(adminKey);
    await ctx.scheduler.runAfter(0, internal.notifications.sendFarcasterNotificationInternal, { title, body, targetUrl });
    return { scheduled: true };
  },
});

export const sendFarcasterNotificationInternal = internalAction({
  args: { title: v.string(), body: v.string(), targetUrl: v.optional(v.string()) },
  handler: async (ctx, { title, body, targetUrl }) => {
    const result = await broadcastFarcaster(ctx, title, body, targetUrl ?? APP_URL);
    console.log(`[sendFarcasterNotification] ✅${result.success_count} ❌${result.failure_count} / ${result.totalTokens} tokens`);
    return result;
  },
});

/** Get all tokens (internal) */
export const getAllTokens = internalQuery({
  args: {},
  handler: async (ctx) => ctx.db.query("notificationTokens").take(50000),
});

// ─────────────────────────────────────────────
// LEADERBOARD WEEKLY REWARD NOTIFICATION
// ─────────────────────────────────────────────

/**
 * CRON: Notify top leaderboard players every Sunday before reset.
 * Gets top 10 players, sends them a personal notification via Farcaster + Base.
 */
export const sendWeeklyLeaderboardNotification = internalAction({
  args: {},
  handler: async (ctx) => {
    const { api } = await import("./_generated/api");

    // Get top 10 leaderboard profiles (by weeklyAura)
    const top = await ctx.runQuery(internal.notifications.getTopLeaderboardProfiles, { limit: 10 });

    let farcasterSent = 0;
    let baseSent = 0;

    for (let i = 0; i < top.length; i++) {
      const player = top[i];
      const rank = i + 1;
      const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
      const title = `${medal} Weekly Leaderboard!`;
      const body = `You finished ${medal} this week with ${player.weeklyAura.toLocaleString()} Aura XP! Rewards are coming 🎉`;

      // Farcaster
      if (player.fid) {
        const r = await sendViaFarcasterToken(ctx, player.fid, title, body);
        farcasterSent += r.success_count;
      }

      // Base App
      if (player.address) {
        const r = await sendBaseToAddresses([player.address], title, body, "/leaderboard");
        baseSent += r.sentCount;
      }
    }

    console.log(`[WeeklyLB] Farcaster: ${farcasterSent}✅ | Base: ${baseSent}✅ (${top.length} players)`);
    return { farcasterSent, baseSent, playersNotified: top.length };
  },
});

export const getTopLeaderboardProfiles = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_defense_weekly_aura", (q) => q.eq("hasFullDefenseDeck", true))
      .order("desc")
      .take(limit * 3); // overfetch to account for blacklisted/no-fid

    const result: Array<{ fid: string | undefined; address: string; weeklyAura: number }> = [];
    for (const p of profiles) {
      if (result.length >= (limit || 10)) break;
      const weeklyAura = p.stats?.weeklyAura ?? 0;
      if (weeklyAura <= 0) continue;
      result.push({ fid: p.fid || (p.farcasterFid ? p.farcasterFid.toString() : undefined), address: p.address, weeklyAura });
    }
    return result;
  },
});

/** Get active user FIDs */
export const getActiveUserFids = internalQuery({
  args: { daysAgo: v.optional(v.number()) },
  handler: async (ctx, { daysAgo = 7 }) => {
    const cutoff = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
    const profiles = await ctx.db.query("profiles").take(10000);
    const fids = new Set<number>();
    for (const p of profiles) {
      if (!p.fid && !p.farcasterFid) continue;
      const fid = parseInt(p.fid || p.farcasterFid!.toString());
      if (isNaN(fid)) continue;
      const tx = await ctx.db.query("coinTransactions").withIndex("by_address", (q) => q.eq("address", p.address.toLowerCase())).order("desc").take(1);
      if ((tx.length > 0 && tx[0].timestamp > cutoff) || (p.lastUpdated && p.lastUpdated > cutoff)) {
        fids.add(fid);
      }
    }
    return [...fids];
  },
});
