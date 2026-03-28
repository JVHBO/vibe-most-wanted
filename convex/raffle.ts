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
  "event TicketPurchased(address indexed buyer,uint256 count,uint256 totalVBMS,uint256 indexed raffleEpoch)",
  "function totalTicketsSold() view returns (uint256)",
  "function getBuyerCount() view returns (uint256)",
  "function getBuyerAt(uint256) view returns (address,uint256)",
];

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES — for UI
// ═══════════════════════════════════════════════════════════════════════════════

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
    const map: Record<string, { address: string; tickets: number; chain: string }> = {};
    for (const e of entries) {
      if (!map[e.address]) map[e.address] = { address: e.address, tickets: 0, chain: e.chain };
      map[e.address].tickets += e.tickets;
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
  },
  handler: async (ctx, { buyer, count, txHash, epoch, blockNumber }) => {
    // Idempotent: skip if already recorded
    const existing = await ctx.db
      .query("raffleEntries")
      .withIndex("by_txHash", (q: any) => q.eq("txHash", txHash))
      .first();
    if (existing) return;

    await ctx.db.insert("raffleEntries", {
      address:     buyer.toLowerCase(),
      tickets:     count,
      chain:       "base",
      token:       "VBMS",
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

    await ctx.db.insert("raffleEntries", {
      address:     buyer.toLowerCase(),
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
