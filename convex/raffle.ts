/**
 * Raffle Backend — Convex
 *
 * Manages raffle state from both chains:
 * - Listens to VBMSRaffleBase events on Base (VBMS ticket purchases)
 * - Forwards Base entries to VBMSRaffleARB on Arbitrum
 * - Aggregates buyer rankings for UI
 * - Stores raffle config and current state
 */

import { v } from "convex/values";
import { mutation, query, action, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_RAFFLE_CONTRACT  = () => process.env.RAFFLE_BASE_ADDRESS  || "";
const ARB_RAFFLE_CONTRACT   = () => process.env.RAFFLE_ARB_ADDRESS   || "";
const BASE_RPC              = "https://mainnet.base.org";
const ARB_RPC               = "https://arb1.arbitrum.io/rpc";

// ABI fragments (only what we need)
const RAFFLE_ARB_ABI = [
  "function addBaseEntries(address buyer, uint256 count) external",
  "function totalTickets() view returns (uint256)",
  "function timeRemaining() view returns (uint256)",
  "function raffle() view returns (string,string,uint256,uint256,uint256,bool,bool,bool,bool,uint256,uint256,uint256,address)",
  "function getBuyerCount() view returns (uint256)",
  "function getBuyerAt(uint256) view returns (address,uint256)",
  "function getETHCost(uint256) view returns (uint256,uint256)",
  "function getDrawResult() view returns (address,uint256,uint256,uint256,string)",
];

const RAFFLE_BASE_ABI = [
  "event TicketPurchased(address indexed buyer,uint256 count,uint256 amount,address token,uint256 indexed raffleEpoch)",
  "function totalTicketsSold() view returns (uint256)",
  "function getBuyerCount() view returns (uint256)",
  "function getBuyerAt(uint256) view returns (address,uint256)",
];

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES — for UI
// ═══════════════════════════════════════════════════════════════════════════════

/** Get recent individual purchase entries (for live feed) — resolves usernames live */
export const getRecentEntries = query({
  args: { epoch: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, { epoch, limit }) => {
    const n = Math.min(limit ?? 10, 20);
    const raw = epoch !== undefined
      ? await ctx.db.query("raffleEntries").withIndex("by_epoch", (q: any) => q.eq("epoch", epoch)).order("desc").take(n)
      : await ctx.db.query("raffleEntries").order("desc").take(n);

    // Resolve username fresh from profiles (handles old entries without username)
    return await Promise.all(raw.map(async (entry) => {
      if (entry.username) return entry;
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q: any) => q.eq("address", entry.address))
        .first();
      return { ...entry, username: profile?.username ?? null };
    }));
  },
});

/** Get player's ticket ranges (computed from entry order) */
export const getPlayerTicketInfo = query({
  args: { address: v.string(), epoch: v.optional(v.number()) },
  handler: async (ctx, { address, epoch }) => {
    const ep = epoch ?? 1;
    const allEntries = await ctx.db
      .query("raffleEntries")
      .withIndex("by_epoch", (q: any) => q.eq("epoch", ep))
      .collect();

    // Sort by blockNumber = order entries appear on-chain
    allEntries.sort((a, b) => a.blockNumber - b.blockNumber);

    let running = 0;
    const playerRanges: Array<{ start: number; end: number; chain: string; token: string }> = [];
    let playerTotal = 0;

    for (const entry of allEntries) {
      const start = running + 1;
      const end   = running + entry.tickets;
      if (entry.address.toLowerCase() === address.toLowerCase()) {
        playerRanges.push({ start, end, chain: entry.chain, token: entry.token });
        playerTotal += entry.tickets;
      }
      running += entry.tickets;
    }

    return { totalTickets: running, playerTotal, playerRanges };
  },
});

/** Get current raffle config (static, set by admin) */
export const getRaffleConfig = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("raffleConfig").order("desc").first();
  },
});

/** Get all buyers with ticket counts — for leaderboard/ranking */
export const getRaffleBuyers = query({
  args: { epoch: v.optional(v.number()) },
  handler: async (ctx, { epoch }) => {
    const q = ctx.db.query("raffleEntries");
    const entries = await (epoch !== undefined
      ? q.withIndex("by_epoch", (i: any) => i.eq("epoch", epoch))
      : q
    ).collect();

    // Aggregate by address
    const map: Record<string, { address: string; username: string | null; tickets: number; chain: string }> = {};
    for (const e of entries) {
      if (!map[e.address]) {
        map[e.address] = { address: e.address, username: e.username ?? null, tickets: 0, chain: e.chain };
      }
      map[e.address].tickets += e.tickets;
      // Update username if we have one
      if (e.username && !map[e.address].username) map[e.address].username = e.username;
    }

    return Object.values(map).sort((a, b) => b.tickets - a.tickets);
  },
});

/** Get live on-chain raffle state from ARB contract */
export const getLiveRaffleState = action({
  args: {},
  handler: async (_ctx): Promise<{
    totalTickets: number;
    timeRemaining: number;
    winner: string | null;
    vrfRandomWord: string | null;
    winnerIndex: number | null;
    totalEntries: number | null;
    active: boolean;
  }> => {
    const arbAddr = ARB_RAFFLE_CONTRACT();
    if (!arbAddr) return { totalTickets: 0, timeRemaining: 0, winner: null, vrfRandomWord: null, winnerIndex: null, totalEntries: null, active: false };

    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.JsonRpcProvider(ARB_RPC);
      const contract = new ethers.Contract(arbAddr, RAFFLE_ARB_ABI, provider);

      const [totalTickets, timeRemaining, drawResult] = await Promise.all([
        contract.totalTickets(),
        contract.timeRemaining(),
        contract.getDrawResult(),
      ]);

      const [winner, winnerIndex, vrfRandomWord, totalEntries] = drawResult;
      const hasWinner = winner !== "0x0000000000000000000000000000000000000000";

      return {
        totalTickets:  Number(totalTickets),
        timeRemaining: Number(timeRemaining),
        winner:        hasWinner ? winner : null,
        vrfRandomWord: hasWinner ? vrfRandomWord.toString() : null,
        winnerIndex:   hasWinner ? Number(winnerIndex) : null,
        totalEntries:  hasWinner ? Number(totalEntries) : null,
        active:        !hasWinner && Number(timeRemaining) > 0,
      };
    } catch (e) {
      console.error("[Raffle] getLiveRaffleState error:", e);
      return { totalTickets: 0, timeRemaining: 0, winner: null, vrfRandomWord: null, winnerIndex: null, totalEntries: null, active: false };
    }
  },
});

/** Get ETH ticket price quote from ARB contract */
export const getETHTicketPrice = action({
  args: { count: v.number() },
  handler: async (_ctx, { count }): Promise<{ ethWei: string; ethPriceUSD: string } | null> => {
    const arbAddr = ARB_RAFFLE_CONTRACT();
    if (!arbAddr) return null;
    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.JsonRpcProvider(ARB_RPC);
      const contract = new ethers.Contract(arbAddr, RAFFLE_ARB_ABI, provider);
      const [ethWei, ethPriceUSD8] = await contract.getETHCost(count);
      return {
        ethWei:      ethWei.toString(),
        ethPriceUSD: (Number(ethPriceUSD8) / 1e8).toFixed(2),
      };
    } catch {
      return null;
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

/** Admin: save raffle display config (card info, prize value, etc.) */
export const adminSetRaffleConfig = mutation({
  args: {
    adminKey: v.string(),
    prizeDescription: v.string(),
    prizeImageUrl: v.string(),
    cardValueUSD: v.number(),
    cardValueVBMS: v.number(),
    ticketPriceVBMS: v.number(),
    ticketPriceUSD: v.number(),
    maxTickets: v.number(),
    durationDays: v.number(),
    epoch: v.number(),
    visible: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (args.adminKey !== process.env.VMW_INTERNAL_SECRET) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("raffleConfig")
      .withIndex("by_epoch", (q: any) => q.eq("epoch", args.epoch))
      .first();

    const data = {
      prizeDescription: args.prizeDescription,
      prizeImageUrl:    args.prizeImageUrl,
      cardValueUSD:     args.cardValueUSD,
      cardValueVBMS:    args.cardValueVBMS,
      ticketPriceVBMS:  args.ticketPriceVBMS,
      ticketPriceUSD:   args.ticketPriceUSD,
      maxTickets:       args.maxTickets,
      durationDays:     args.durationDays,
      epoch:            args.epoch,
      visible:          args.visible,
      updatedAt:        Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("raffleConfig", data);
    }

    return { ok: true };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// BASE CHAIN EVENT SYNC — Convex detects TicketPurchased, submits to ARB
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Called by API route /api/raffle/sync-base when it detects a TicketPurchased
 * event on Base. Records the entry in Convex and submits to ARB contract.
 */
export const processBaseTicketPurchase = internalAction({
  args: {
    buyer:       v.string(),
    count:       v.number(),
    txHash:      v.string(),
    epoch:       v.number(),
    blockNumber: v.number(),
  },
  handler: async (ctx, { buyer, count, txHash, epoch, blockNumber }) => {
    // 1. Check not already processed
    await ctx.runMutation(internal.raffle.recordBaseEntry, { buyer, count, txHash, epoch, blockNumber });

    // 2. Submit to ARB contract
    await ctx.runAction(internal.raffle.submitBaseEntriesToARB, { buyer, count, txHash });
  },
});

export const recordBaseEntry = internalMutation({
  args: {
    buyer:       v.string(),
    count:       v.number(),
    txHash:      v.string(),
    epoch:       v.number(),
    blockNumber: v.number(),
    token:       v.optional(v.string()), // "VBMS" | "USDC" | "ETH"
  },
  handler: async (ctx, { buyer, count, txHash, epoch, blockNumber, token }) => {
    // Idempotent: skip if already recorded
    const existing = await ctx.db
      .query("raffleEntries")
      .withIndex("by_txHash", (q: any) => q.eq("txHash", txHash))
      .first();
    if (existing) {
      // Backfill token if it was missing or wrong
      if (token && existing.token === "VBMS" && token !== "VBMS") {
        await ctx.db.patch(existing._id, { token });
      }
      return existing.synced; // true = already submitted to ARB, skip re-submit
    }

    // Resolve username from profiles
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", buyer.toLowerCase()))
      .first();

    await ctx.db.insert("raffleEntries", {
      address:     buyer.toLowerCase(),
      username:    profile?.username,
      tickets:     count,
      chain:       "base",
      token:       token ?? "VBMS",
      txHash,
      epoch,
      blockNumber,
      timestamp:   Date.now(),
      synced:      false,
    });
  },
});

export const submitBaseEntriesToARB = internalAction({
  args: { buyer: v.string(), count: v.number(), txHash: v.string() },
  handler: async (ctx, { buyer, count, txHash }) => {
    const arbAddr    = ARB_RAFFLE_CONTRACT();
    const privateKey = process.env.VBMS_SIGNER_PRIVATE_KEY; // owner key
    if (!arbAddr || !privateKey) {
      console.warn("[Raffle] ARB contract or signer not configured");
      return;
    }

    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.JsonRpcProvider(ARB_RPC);
      const signer   = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(arbAddr, RAFFLE_ARB_ABI, signer);

      const tx = await contract.addBaseEntries(buyer, count);
      await tx.wait(1);

      console.log(`[Raffle] Base entry submitted to ARB: ${buyer} × ${count} (tx: ${tx.hash})`);

      // Mark as synced
      await ctx.runMutation(internal.raffle.markEntrySynced, { txHash, arbTxHash: tx.hash });
    } catch (e) {
      console.error("[Raffle] submitBaseEntriesToARB failed:", e);
    }
  },
});

export const markEntrySynced = internalMutation({
  args: { txHash: v.string(), arbTxHash: v.string() },
  handler: async (ctx, { txHash, arbTxHash }) => {
    const entry = await ctx.db
      .query("raffleEntries")
      .withIndex("by_txHash", (q: any) => q.eq("txHash", txHash))
      .first();
    if (entry) await ctx.db.patch(entry._id, { synced: true, arbTxHash });
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// ARB ENTRY RECORDING (USND/ETH purchases detected on-chain by API)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Public mutation called by /api/raffle/sync-base webhook.
 * Validates VMW_INTERNAL_SECRET, records idempotently, schedules ARB sync.
 */
export const recordBaseEntryPublic = mutation({
  args: {
    adminKey:    v.string(),
    buyer:       v.string(),
    count:       v.number(),
    txHash:      v.string(),
    epoch:       v.number(),
    blockNumber: v.number(),
    token:       v.optional(v.string()), // "VBMS" | "ETH" | "USDC"
  },
  handler: async (ctx, { adminKey, buyer, count, txHash, epoch, blockNumber, token }) => {
    if (adminKey !== process.env.VMW_INTERNAL_SECRET) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("raffleEntries")
      .withIndex("by_txHash", (q: any) => q.eq("txHash", txHash))
      .first();
    if (existing) return { skipped: true };

    // Resolve username from profiles
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", buyer.toLowerCase()))
      .first();

    await ctx.db.insert("raffleEntries", {
      address:     buyer.toLowerCase(),
      username:    profile?.username,
      tickets:     count,
      chain:       "base",
      token:       token ?? "VBMS",
      txHash,
      epoch,
      blockNumber,
      timestamp:   Date.now(),
      synced:      false,
    });

    // Schedule ARB sync — all Base entries count in ARB contract regardless of payment token
    await ctx.scheduler.runAfter(0, internal.raffle.submitBaseEntriesToARB, { buyer, count, txHash });

    return { recorded: true };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// CRON — Poll Base chain every 2 min for TicketPurchased events
// Replaces Alchemy webhook — fully self-contained
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Internal action: polls Base RPC for TicketPurchased events in the last ~3 min.
 * Idempotent — skips already-recorded txHashes via by_txHash index.
 */
export const pollBaseEvents = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const contractAddr = BASE_RAFFLE_CONTRACT().toLowerCase();
    if (!contractAddr) return;

    const TICKET_PURCHASED_TOPIC =
      "0x3c21b9b2d77366bb49d2e24d368d043e15a59329cb5f15eccdc99ac5ffaa2b6f";
    const VBMS_ERC20 = "0xb03439567cd22f278b21e1ffcdfb8e1696763827";
    const USDC_ADDR  = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

    try {
      // Get latest block
      const blockResp = await fetch(BASE_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
      });
      const { result: latestHex } = await blockResp.json() as any;
      const latest = parseInt(latestHex, 16);
      // ~2 min of blocks on Base (2s block time → 60 blocks), search 90 to be safe
      const fromBlock = "0x" + (latest - 90).toString(16);
      const toBlock   = latestHex;

      const logsResp = await fetch(BASE_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 2,
          method: "eth_getLogs",
          params: [{ address: contractAddr, topics: [TICKET_PURCHASED_TOPIC], fromBlock, toBlock }],
        }),
      });
      const { result: logs } = await logsResp.json() as any;
      if (!Array.isArray(logs) || logs.length === 0) return;

      for (const log of logs) {
        const txHash = log.transactionHash as string;
        if (!txHash) continue;

        // Decode: topics[1]=buyer (indexed), topics[2]=raffleEpoch (indexed)
        // data = abi.encode(count uint256, amount uint256, token address)
        const buyer = ("0x" + (log.topics[1] as string).slice(26)).toLowerCase();
        const epoch = parseInt((log.topics[2] as string) ?? "0x1", 16);
        const data  = (log.data as string).startsWith("0x")
          ? (log.data as string).slice(2) : (log.data as string);
        const count = parseInt(data.slice(0, 64), 16);
        if (!buyer || isNaN(count) || count <= 0) continue;

        const tokenHex = data.length >= 192
          ? ("0x" + data.slice(152, 192)).toLowerCase() : null;
        let token = "VBMS";
        if (tokenHex === "0x0000000000000000000000000000000000000000") token = "ETH";
        else if (tokenHex === USDC_ADDR) token = "USDC";
        else if (tokenHex === VBMS_ERC20) token = "VBMS";

        const blockNumber = parseInt(log.blockNumber as string, 16);

        // Record entry (idempotent) — returns true if already synced to ARB
        const alreadySynced = await ctx.runMutation(internal.raffle.recordBaseEntry, {
          buyer, count, txHash, epoch, blockNumber, token,
        });
        if (!alreadySynced) {
          await ctx.runAction(internal.raffle.submitBaseEntriesToARB, { buyer, count, txHash });
        }
        console.log(`[raffle/poll] ${token} ${buyer} ×${count} block=${blockNumber} synced=${!!alreadySynced}`);
      }
    } catch (e) {
      console.error("[raffle/poll] Error:", e);
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// DRAW — Trigger VRF draw (onlyOwner via signer wallet)
// ═══════════════════════════════════════════════════════════════════════════════

export const triggerDraw = action({
  args: { adminKey: v.string() },
  handler: async (_ctx, { adminKey }): Promise<{ ok: boolean; txHash?: string; error?: string }> => {
    if (adminKey !== process.env.VMW_INTERNAL_SECRET) throw new Error("Unauthorized");

    const arbAddr    = ARB_RAFFLE_CONTRACT();
    const privateKey = process.env.VBMS_SIGNER_PRIVATE_KEY;
    if (!arbAddr || !privateKey) return { ok: false, error: "Contract or signer not configured" };

    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.JsonRpcProvider(ARB_RPC);
      const signer   = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(arbAddr, [
        "function requestDraw() external",
        "function timeRemaining() view returns (uint256)",
        "function raffle() view returns (string,string,uint256,uint256,uint256,bool,bool,bool,bool,uint256,uint256,uint256,address)",
      ], signer);

      // Check if draw is possible
      const timeLeft = await contract.timeRemaining();
      console.log(`[Raffle] timeRemaining = ${timeLeft}s`);

      const tx = await contract.requestDraw();
      console.log(`[Raffle] requestDraw tx: ${tx.hash}`);
      await tx.wait(1);
      console.log(`[Raffle] Draw requested! tx: ${tx.hash}`);
      return { ok: true, txHash: tx.hash };
    } catch (e: any) {
      console.error("[Raffle] triggerDraw error:", e?.message ?? e);
      return { ok: false, error: e?.message ?? String(e) };
    }
  },
});

export const recordARBEntry = mutation({
  args: {
    adminKey:    v.string(),
    buyer:       v.string(),
    count:       v.number(),
    token:       v.string(), // "USND" | "ETH"
    txHash:      v.string(),
    epoch:       v.number(),
    blockNumber: v.number(),
  },
  handler: async (ctx, { adminKey, buyer, count, token, txHash, epoch, blockNumber }) => {
    if (adminKey !== process.env.VMW_INTERNAL_SECRET) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("raffleEntries")
      .withIndex("by_txHash", (q: any) => q.eq("txHash", txHash))
      .first();
    if (existing) return { skipped: true };

    // Resolve username from profiles
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", buyer.toLowerCase()))
      .first();

    await ctx.db.insert("raffleEntries", {
      address:     buyer.toLowerCase(),
      username:    profile?.username,
      tickets:     count,
      chain:       "arb",
      token,
      txHash,
      epoch,
      blockNumber,
      timestamp:   Date.now(),
      synced:      true, // already on ARB contract
    });

    return { recorded: true };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// DRAW RESULT — Record & Query winner
// ═══════════════════════════════════════════════════════════════════════════════

/** Admin: patch drawTxHash on existing result */
export const setDrawTxHash = mutation({
  args: { adminKey: v.string(), epoch: v.number(), drawTxHash: v.string() },
  handler: async (ctx, { adminKey, epoch, drawTxHash }) => {
    if (adminKey !== process.env.VMW_INTERNAL_SECRET) throw new Error("Unauthorized");
    const rec = await ctx.db.query("raffleResults").withIndex("by_epoch", (q: any) => q.eq("epoch", epoch)).first();
    if (!rec) throw new Error("No result for epoch " + epoch);
    await ctx.db.patch(rec._id, { drawTxHash });
    return { ok: true };
  },
});

/** Get recorded draw result for an epoch */
export const getRaffleResult = query({
  args: { epoch: v.optional(v.number()) },
  handler: async (ctx, { epoch }) => {
    const ep = epoch ?? 1;
    return await ctx.db
      .query("raffleResults")
      .withIndex("by_epoch", (q: any) => q.eq("epoch", ep))
      .first();
  },
});

/** Internal: record draw result once VRF fulfilled */
export const recordDrawResult = internalMutation({
  args: {
    epoch:          v.number(),
    winner:         v.string(),
    winnerTicket:   v.number(),
    winnerIndex:    v.number(),
    vrfRandomWord:  v.string(),
    totalEntries:   v.number(),
    prizeDescription: v.string(),
    drawTxHash:     v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Idempotent: skip if already recorded for this epoch
    const existing = await ctx.db
      .query("raffleResults")
      .withIndex("by_epoch", (q: any) => q.eq("epoch", args.epoch))
      .first();
    if (existing) return { skipped: true };

    // Resolve winner username from profiles
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", args.winner.toLowerCase()))
      .first();

    await ctx.db.insert("raffleResults", {
      ...args,
      winner:    args.winner.toLowerCase(),
      username:  profile?.username,
      timestamp: Date.now(),
    });
    return { recorded: true };
  },
});

/**
 * Action: poll ARB contract for draw result, store if winner found.
 * Safe to call repeatedly — idempotent via by_epoch index.
 */
export const checkAndRecordDraw = action({
  args: { epoch: v.optional(v.number()) },
  handler: async (ctx, { epoch }): Promise<{ hasWinner: boolean; winner?: string; winnerTicket?: number }> => {
    const arbAddr = ARB_RAFFLE_CONTRACT();
    if (!arbAddr) return { hasWinner: false };

    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.JsonRpcProvider(ARB_RPC);
      const contract = new ethers.Contract(arbAddr, [
        "function getDrawResult() view returns (address,uint256,uint256,uint256,string)",
      ], provider);

      const [winner, winnerIndex, vrfRandomWord, totalEntries, prizeDescription] = await contract.getDrawResult();
      const ZERO = "0x0000000000000000000000000000000000000000";
      if (!winner || winner === ZERO) return { hasWinner: false };

      const ep = epoch ?? 1;
      const winnerTicket = Number(winnerIndex) + 1; // 1-based
      await ctx.runMutation(internal.raffle.recordDrawResult, {
        epoch:           ep,
        winner:          winner.toLowerCase(),
        winnerTicket,
        winnerIndex:     Number(winnerIndex),
        vrfRandomWord:   vrfRandomWord.toString(),
        totalEntries:    Number(totalEntries),
        prizeDescription: prizeDescription || "Goofy Romero – Queen of Diamonds",
      });

      return { hasWinner: true, winner: winner.toLowerCase(), winnerTicket };
    } catch (e) {
      console.error("[Raffle] checkAndRecordDraw error:", e);
      return { hasWinner: false };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// REDEPLOY ARB — Deploy new VBMSRaffleARB with correct keyHash, re-add entries,
// then call requestDraw. Called after discovering original keyHash was invalid.
// ═══════════════════════════════════════════════════════════════════════════════

export const redeployARB = action({
  args: { adminKey: v.string() },
  handler: async (ctx, { adminKey }): Promise<{
    ok: boolean; newAddress?: string; requestDrawTx?: string; error?: string;
  }> => {
    if (adminKey !== process.env.VMW_INTERNAL_SECRET) throw new Error("Unauthorized");

    const privateKey = process.env.VBMS_SIGNER_PRIVATE_KEY;
    if (!privateKey) return { ok: false, error: "VBMS_SIGNER_PRIVATE_KEY not set" };

    // VRF subscription ID (from storage slot 3 of old contract)
    const VRF_SUB_ID   = 1617999602672790485923587783825558200181355821866801878070639539839664660800n;
    const VRF_COORD    = "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e";
    const VRF_KEYHASH  = "0xe9f223d7d83ec85c4f78042a4845af3a1c8df7757b4997b815ce4b8d07aca68c"; // VALID
    const ETH_USD_FEED = "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612";
    const USND_ADDR    = "0x4ecf61a6c2fab8a047ceb3b3b263b401763e9d49";

    // Confirmed 4 entries from Convex DB (epoch 1)
    const BUYER   = "0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52";
    const ENTRIES = [BUYER, BUYER, BUYER, BUYER]; // 4 tickets × 1 each

    try {
      const { ethers } = await import("ethers");
      const { RAFFLE_ARB_BYTECODE, RAFFLE_ARB_ABI_FULL } = await import("./raffleArbArtifact.js");

      const provider = new ethers.JsonRpcProvider(ARB_RPC);
      const signer   = new ethers.Wallet(privateKey, provider);
      console.log("[redeployARB] Deployer:", signer.address);

      // 1. Deploy
      const factory  = new ethers.ContractFactory(RAFFLE_ARB_ABI_FULL, RAFFLE_ARB_BYTECODE, signer);
      const contract = await factory.deploy(VRF_COORD, VRF_KEYHASH, VRF_SUB_ID, ETH_USD_FEED, USND_ADDR);
      await contract.waitForDeployment();
      const newAddress = await contract.getAddress();
      console.log("[redeployARB] Deployed:", newAddress);

      // 2. createRaffle — maxTickets=4 so requestDraw unlocks after all entries added
      const tx2 = await contract.createRaffle(
        "Goofy Romero \u2013 Queen of Diamonds",
        "",
        ethers.parseUnits("23", 18),
        4,    // maxTickets = exact entry count
        3600, // 1h minimum — maxTickets triggers first
      );
      await tx2.wait(1);
      console.log("[redeployARB] createRaffle:", tx2.hash);

      // 3. addBaseEntries — one per ticket
      for (const buyer of ENTRIES) {
        const tx = await contract.addBaseEntries(buyer, 1);
        await tx.wait(1);
        console.log("[redeployARB] addBaseEntries:", buyer, "tx:", tx.hash);
      }

      // requestDraw NOT called here — consumer must be added to VRF subscription first.
      // After getting newAddress:
      //   1. Add newAddress as consumer at vrf.chain.link
      //   2. npx convex env set RAFFLE_ARB_ADDRESS <newAddress> --prod
      //   3. Call triggerDraw action

      return { ok: true, newAddress, requestDrawTx: undefined };
    } catch (e: any) {
      console.error("[redeployARB] error:", e);
      return { ok: false, error: e.shortMessage || e.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// RESET + NEW RAFFLE — confirmPrizeDelivered → resetRaffle → createRaffle
// Clears Convex epoch data and opens next epoch on-chain.
// ═══════════════════════════════════════════════════════════════════════════════

export const resetAndOpenNewRaffle = action({
  args: {
    adminKey:         v.string(),
    newEpoch:         v.number(),
    prizeDescription: v.string(),
    prizeImageUrl:    v.optional(v.string()),
    ticketPriceUSD:   v.number(),   // e.g. 23
    maxTickets:       v.number(),   // e.g. 100
    durationSeconds:  v.number(),   // e.g. 600 = 10 min
    cardValueUSD:     v.optional(v.number()),
    cardValueVBMS:    v.optional(v.number()),
    ticketPriceVBMS:  v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; error?: string }> => {
    if (args.adminKey !== process.env.VMW_INTERNAL_SECRET) throw new Error("Unauthorized");

    const privateKey = process.env.VBMS_SIGNER_PRIVATE_KEY;
    const arbAddr    = ARB_RAFFLE_CONTRACT();
    if (!privateKey || !arbAddr) return { ok: false, error: "Signer or contract not configured" };

    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.JsonRpcProvider(ARB_RPC);
      const signer   = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(arbAddr, [
        "function confirmPrizeDelivered() external",
        "function resetRaffle() external",
        "function createRaffle(string,string,uint256,uint256,uint256) external",
      ], signer);

      // 1. confirmPrizeDelivered (releases funds to owner)
      console.log("[resetRaffle] confirmPrizeDelivered...");
      const tx1 = await contract.confirmPrizeDelivered();
      await tx1.wait(1);
      console.log("[resetRaffle] confirmPrizeDelivered:", tx1.hash);

      // 2. resetRaffle (clears entries on-chain)
      console.log("[resetRaffle] resetRaffle...");
      const tx2 = await contract.resetRaffle();
      await tx2.wait(1);
      console.log("[resetRaffle] resetRaffle:", tx2.hash);

      // 3. createRaffle (opens new epoch on-chain)
      console.log("[resetRaffle] createRaffle epoch", args.newEpoch, "...");
      const tx3 = await contract.createRaffle(
        args.prizeDescription,
        args.prizeImageUrl ?? "",
        ethers.parseUnits(String(args.ticketPriceUSD), 18),
        args.maxTickets,
        args.durationSeconds,
      );
      await tx3.wait(1);
      console.log("[resetRaffle] createRaffle:", tx3.hash);

      // 4. Clear old raffleEntries from Convex
      await ctx.runMutation(internal.raffle.clearEpochData, { epoch: args.newEpoch - 1 });

      // 5. Set new raffleConfig in Convex
      await ctx.runMutation(internal.raffle.upsertRaffleConfig, {
        epoch:            args.newEpoch,
        prizeDescription: args.prizeDescription,
        prizeImageUrl:    args.prizeImageUrl ?? "",
        cardValueUSD:     args.cardValueUSD ?? args.ticketPriceUSD,
        cardValueVBMS:    args.cardValueVBMS ?? 10000,
        ticketPriceVBMS:  args.ticketPriceVBMS ?? 10000,
        ticketPriceUSD:   args.ticketPriceUSD,
        maxTickets:       args.maxTickets,
        durationDays:     args.durationSeconds / 86400,
      });

      return { ok: true };
    } catch (e: any) {
      console.error("[resetRaffle] error:", e);
      return { ok: false, error: e.shortMessage || e.message };
    }
  },
});

export const clearEpochData = internalMutation({
  args: { epoch: v.number() },
  handler: async (ctx, { epoch }) => {
    // Delete raffleEntries for this epoch
    const entries = await ctx.db.query("raffleEntries")
      .withIndex("by_epoch", (q: any) => q.eq("epoch", epoch)).collect();
    for (const e of entries) await ctx.db.delete(e._id);
    // Delete raffleResults for this epoch
    const results = await ctx.db.query("raffleResults")
      .withIndex("by_epoch", (q: any) => q.eq("epoch", epoch)).collect();
    for (const r of results) await ctx.db.delete(r._id);
    console.log(`[clearEpochData] Cleared ${entries.length} entries, ${results.length} results for epoch ${epoch}`);
  },
});

export const upsertRaffleConfig = internalMutation({
  args: {
    epoch: v.number(), prizeDescription: v.string(), prizeImageUrl: v.string(),
    cardValueUSD: v.number(), cardValueVBMS: v.number(), ticketPriceVBMS: v.number(),
    ticketPriceUSD: v.number(), maxTickets: v.number(), durationDays: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("raffleConfig")
      .withIndex("by_epoch", (q: any) => q.eq("epoch", args.epoch)).first();
    const data = { ...args, visible: true, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, data);
    else await ctx.db.insert("raffleConfig", data);
  },
});
