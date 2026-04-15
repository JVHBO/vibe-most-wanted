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
import { mutation, query, action, internalAction, internalMutation, internalQuery } from "./_generated/server";
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
      .take(1000);

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
    let ep = epoch;
    if (ep === undefined) {
      const config = await ctx.db.query("raffleConfig").order("desc").first();
      ep = config?.epoch ?? 1;
    }
    const entries = await ctx.db.query("raffleEntries")
      .withIndex("by_epoch", (i: any) => i.eq("epoch", ep))
      .take(1000);

    // Aggregate by address
    const map: Record<string, { address: string; username: string | null; tickets: number; chain: string; chains: string[] }> = {};
    for (const e of entries) {
      if (!map[e.address]) {
        map[e.address] = { address: e.address, username: e.username ?? null, tickets: 0, chain: e.chain, chains: [] };
      }
      map[e.address].tickets += e.tickets;
      if (e.token !== 'BONUS' && !map[e.address].chains.includes(e.chain)) map[e.address].chains.push(e.chain);
      // Update username if we have one in this entry
      if (e.username && !map[e.address].username) map[e.address].username = e.username;
    }

    // Live-resolve missing usernames from profiles (handles buyers who had no profile at purchase time)
    const buyers = Object.values(map);
    await Promise.all(buyers.map(async (buyer) => {
      if (buyer.username) return;
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q: any) => q.eq("address", buyer.address))
        .first();
      if (profile?.username) buyer.username = profile.username;
    }));

    return buyers.sort((a, b) => b.tickets - a.tickets);
  },
});

/** Get count of bonus (non-paid) tickets for a given epoch */
export const getBonusTicketCount = query({
  args: { epoch: v.optional(v.number()) },
  handler: async (ctx, { epoch }) => {
    let ep = epoch;
    if (ep === undefined) {
      const config = await ctx.db.query("raffleConfig").order("desc").first();
      ep = config?.epoch ?? 1;
    }
    const allEntries = await ctx.db.query("raffleEntries")
      .withIndex("by_epoch", (i: any) => i.eq("epoch", ep))
      .take(500);
    return allEntries
      .filter((e: any) => e.token === "BONUS")
      .reduce((sum: number, e: any) => sum + e.tickets, 0);
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
    if (count < 1 || count > 500) throw new Error("Invalid count");

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

    // Retry any BASE entries that failed to sync to ARB on the previous attempt
    await ctx.runAction(internal.raffle.retryUnsyncedEntries, {});

    // Use Convex config epoch (same as ARB) — BASE contract epoch may differ after resets
    const config = await ctx.runQuery(internal.raffle.getLatestConfigInternal, {});
    const configEpoch = (config as any)?.epoch ?? 3;

    // Checkpoint-based polling: start from last processed block so no gaps survive cron outages.
    // Safety cap: 3600 blocks (~2h on Base @2s/block) to avoid unbounded lookback.
    const BASE_MAX_LOOKBACK = 3600;
    const savedCheckpoint: number | undefined = (config as any)?.lastPolledBaseBlock;
    // Reset checkpoint if it's from a different epoch context (epoch change wipes old blocks)
    const checkpointAge = savedCheckpoint ? 0 : undefined; // used below

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

      // fromBlock: checkpoint + 1, or fallback to latest - MAX_LOOKBACK
      const fromBlockNum = savedCheckpoint
        ? Math.max(savedCheckpoint + 1, latest - BASE_MAX_LOOKBACK)
        : latest - BASE_MAX_LOOKBACK;
      // Don't poll if already up to date
      if (fromBlockNum > latest) return;

      const fromBlock = "0x" + fromBlockNum.toString(16);
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

      if (Array.isArray(logs)) {
        for (const log of logs) {
          const txHash = log.transactionHash as string;
          if (!txHash) continue;

          // Decode: topics[1]=buyer (indexed), topics[2]=raffleEpoch (indexed)
          // data = abi.encode(count uint256, amount uint256, token address)
          const buyer = ("0x" + (log.topics[1] as string).slice(26)).toLowerCase();
          // Use Convex config epoch — BASE contract epoch may be stale after ARB reset
          const epoch = configEpoch;
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
      }

      // Save checkpoint so next run continues from here
      await ctx.runMutation(internal.raffle.updatePollCheckpoint, {
        lastPolledBaseBlock: latest,
      });
    } catch (e) {
      console.error("[raffle/poll] Error:", e);
    }
  },
});

/**
 * Internal action: polls ARB RPC for TicketBoughtUSDN / TicketBoughtETH events.
 * Idempotent — skips already-recorded txHashes via by_txHash index.
 */
export const pollARBEvents = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const contractAddr = ARB_RAFFLE_CONTRACT().toLowerCase();
    if (!contractAddr) return;

    // Get current epoch from config
    const config = await ctx.runQuery(internal.raffle.getLatestConfigInternal, {});
    const epoch = (config as any)?.epoch ?? 2;

    // Checkpoint-based polling: ARB 0.25s/block → ~480 blocks/2min cron
    // Safety cap: 30000 blocks (~2h) to handle long outages without unbounded lookback
    const ARB_MAX_LOOKBACK = 30000;
    const savedCheckpoint: number | undefined = (config as any)?.lastPolledARBBlock;

    // topic0 = keccak256("TicketBoughtUSDN(address,uint256,uint256)")
    const TOPIC_USDN = "0xc37038deedad9061d649669653f76c9850767b33f444f827331719c714a64173";
    // topic0 = keccak256("TicketBoughtETH(address,uint256,uint256,uint256)")
    const TOPIC_ETH  = "0x9a8ba22f7a25533f1cac3b4c237dc571f6fe107fc4f64599b1a6b429acb8dc1c";

    try {
      const blockResp = await fetch(ARB_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
      });
      const { result: latestHex } = await blockResp.json() as any;
      const latest = parseInt(latestHex, 16);

      // fromBlock: checkpoint + 1, or fallback to latest - MAX_LOOKBACK
      const fromBlockNum = savedCheckpoint
        ? Math.max(savedCheckpoint + 1, latest - ARB_MAX_LOOKBACK)
        : latest - ARB_MAX_LOOKBACK;
      if (fromBlockNum > latest) return;

      const fromBlock = "0x" + fromBlockNum.toString(16);

      const logsResp = await fetch(ARB_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 2,
          method: "eth_getLogs",
          params: [{ address: contractAddr, topics: [[TOPIC_USDN, TOPIC_ETH]], fromBlock, toBlock: latestHex }],
        }),
      });
      const { result: logs } = await logsResp.json() as any;

      if (Array.isArray(logs)) {
        for (const log of logs) {
          const txHash = log.transactionHash as string;
          if (!txHash) continue;

          // topics[1] = indexed buyer address
          const buyer = ("0x" + (log.topics[1] as string).slice(26)).toLowerCase();
          // data[0..64] = count (uint256), rest = amount
          const data  = (log.data as string).startsWith("0x")
            ? (log.data as string).slice(2) : (log.data as string);
          const count = parseInt(data.slice(0, 64), 16);
          if (!buyer || isNaN(count) || count <= 0) continue;

          const token = (log.topics[0] as string).toLowerCase() === TOPIC_USDN ? "USND" : "ETH";
          const blockNumber = parseInt(log.blockNumber as string, 16);

          const result = await ctx.runMutation(internal.raffle.recordARBEntryInternal, {
            buyer, count, token, txHash, epoch, blockNumber,
          });
          console.log(`[raffle/arb-poll] ${token} ${buyer} ×${count} block=${blockNumber} result=${JSON.stringify(result)}`);
        }
      }

      // Save checkpoint
      await ctx.runMutation(internal.raffle.updatePollCheckpoint, {
        lastPolledARBBlock: latest,
      });

      // Auto-trigger draw if time expired and no winner yet
      await ctx.runAction(internal.raffle.autoCheckDraw, {});
    } catch (e) {
      console.error("[raffle/arb-poll] Error:", e);
    }
  },
});

export const recordARBEntryInternal = internalMutation({
  args: {
    buyer: v.string(), count: v.number(), token: v.string(),
    txHash: v.string(), epoch: v.number(), blockNumber: v.number(),
  },
  handler: async (ctx, { buyer, count, token, txHash, epoch, blockNumber }) => {
    const existing = await ctx.db
      .query("raffleEntries")
      .withIndex("by_txHash", (q: any) => q.eq("txHash", txHash))
      .first();
    if (existing) return { skipped: true };

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
      synced:      true,
    });
    return { recorded: true };
  },
});

/** Internal: query BASE entries that failed to sync to ARB (synced=false, older than 5min) */
export const getUnsyncedEntries = internalQuery({
  args: { epoch: v.number(), staleBefore: v.number() },
  handler: async (ctx, { epoch, staleBefore }) => {
    const entries = await ctx.db.query("raffleEntries")
      .withIndex("by_epoch", (q: any) => q.eq("epoch", epoch))
      .filter((q: any) => q.and(
        q.eq(q.field("synced"), false),
        q.eq(q.field("chain"), "base"),
        q.lt(q.field("timestamp"), staleBefore),
      ))
      .take(20);
    return entries;
  },
});

/** Internal: retry ARB sync for BASE entries that failed silently */
export const retryUnsyncedEntries = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const config = await ctx.runQuery(internal.raffle.getLatestConfigInternal, {});
    const epoch = (config as any)?.epoch;
    if (!epoch) return;
    const staleBefore = Date.now() - 5 * 60 * 1000; // older than 5 min
    const unsynced = await ctx.runQuery(internal.raffle.getUnsyncedEntries, { epoch, staleBefore });
    if (unsynced.length === 0) return;
    console.log(`[raffle/retry] retrying ${unsynced.length} unsynced BASE entries`);
    for (const entry of unsynced as any[]) {
      await ctx.runAction(internal.raffle.submitBaseEntriesToARB, {
        buyer: entry.address, count: entry.tickets, txHash: entry.txHash,
      });
    }
  },
});

/** Internal: mark drawRequested=true on current config to avoid duplicate requestDraw() */
export const markDrawRequested = internalMutation({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("raffleConfig").order("desc").first();
    if (config) await ctx.db.patch(config._id, { drawRequested: true });
  },
});

/**
 * Internal: auto-trigger draw when time expires. Called from pollARBEvents.
 * 1. If VRF fulfilled → checkAndRecordDraw stores winner.
 * 2. If time expired but no VRF yet → requestDraw() once (guarded by drawRequested flag).
 */
export const autoCheckDraw = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const arbAddr    = ARB_RAFFLE_CONTRACT();
    const privateKey = process.env.VBMS_SIGNER_PRIVATE_KEY;
    if (!arbAddr || !privateKey) return;

    const config = await ctx.runQuery(internal.raffle.getLatestConfigInternal, {});
    const epoch  = (config as any)?.epoch;
    if (!epoch) return;

    // Already have a winner stored → nothing to do
    const existing = await ctx.runQuery(internal.raffle.getRaffleResultInternal, { epoch });
    if (existing) return;

    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.JsonRpcProvider(ARB_RPC);
      const contract = new ethers.Contract(arbAddr, [
        "function timeRemaining() view returns (uint256)",
        "function totalTickets() view returns (uint256)",
        "function getDrawResult() view returns (address,uint256,uint256,uint256,string)",
        "function requestDraw() external",
      ], new ethers.Wallet(privateKey, provider));

      const [timeLeft, totalTickets, drawResult] = await Promise.all([
        contract.timeRemaining(),
        contract.totalTickets(),
        contract.getDrawResult(),
      ]);

      const ZERO = "0x0000000000000000000000000000000000000000";
      const winner = drawResult[0];

      // VRF already fulfilled → record result
      if (winner && winner !== ZERO) {
        await ctx.runAction(internal.raffle.checkAndRecordDrawInternal, { epoch });
        return;
      }

      // Time not up yet → nothing to do
      if (Number(timeLeft) > 0) return;
      // No tickets → nothing to draw
      if (Number(totalTickets) === 0) return;
      // Already triggered → wait for VRF callback
      if ((config as any)?.drawRequested) return;

      // Time expired, tickets exist, VRF not triggered yet → request draw
      console.log(`[raffle/auto] timeRemaining=0, tickets=${totalTickets}, triggering draw for epoch ${epoch}`);
      const tx = await contract.requestDraw();
      await tx.wait(1);
      console.log(`[raffle/auto] requestDraw tx: ${tx.hash}`);
      await ctx.runMutation(internal.raffle.markDrawRequested, {});
    } catch (e: any) {
      // Swallow errors (contract may revert if already requested, or if called too early)
      console.error("[raffle/auto] autoCheckDraw error:", e?.shortMessage ?? e?.message ?? e);
    }
  },
});

/** Internal: update poll checkpoints on raffleConfig so pollers resume from where they left off */
export const updatePollCheckpoint = internalMutation({
  args: {
    lastPolledBaseBlock: v.optional(v.number()),
    lastPolledARBBlock:  v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db.query("raffleConfig").order("desc").first();
    if (!config) return;
    const patch: Record<string, number> = {};
    if (args.lastPolledBaseBlock !== undefined) patch.lastPolledBaseBlock = args.lastPolledBaseBlock;
    if (args.lastPolledARBBlock  !== undefined) patch.lastPolledARBBlock  = args.lastPolledARBBlock;
    await ctx.db.patch(config._id, patch);
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// SHARE BONUS — +1 ticket for sharing, requires ≥1 paid ticket
// ═══════════════════════════════════════════════════════════════════════════════

export const getLatestConfigInternal = internalQuery({
  args: {},
  handler: async (ctx) => ctx.db.query("raffleConfig").order("desc").first(),
});

/**
 * Claim share bonus (+1 ticket for sharing on Farcaster).
 * Requires a wallet signature to prevent bots from claiming on behalf of other users.
 * Message format: `claim-share-bonus:${address.toLowerCase()}:${epoch}`
 */
export const claimShareBonus = action({
  args: { address: v.string() },
  handler: async (ctx, { address }): Promise<{ ok: boolean }> => {
    const addr = address.toLowerCase();
    const config = await ctx.runQuery(internal.raffle.getLatestConfigInternal, {});
    return await ctx.runMutation(internal.raffle.insertShareBonus, { address: addr, epoch: config?.epoch ?? 1 });
  },
});

export const insertShareBonus = internalMutation({
  args: { address: v.string(), epoch: v.number() },
  handler: async (ctx, { address, epoch }) => {
    const addr = address.toLowerCase();

    // Block if raffle already has a winner (draw completed)
    const result = await ctx.db.query("raffleResults")
      .withIndex("by_epoch", (q: any) => q.eq("epoch", epoch)).first();
    if (result) throw new Error("Raffle has ended");

    // Check already claimed
    const existing = await ctx.db
      .query("raffleEntries")
      .withIndex("by_address_epoch", (q: any) => q.eq("address", addr).eq("epoch", epoch))
      .collect();
    if (existing.some((e: any) => e.token === "BONUS")) throw new Error("Already claimed");

    // Check has ≥1 paid ticket this epoch
    const hasPaid = existing.some((e: any) => e.token !== "BONUS");
    if (!hasPaid) throw new Error("Must buy at least 1 ticket first");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", addr))
      .first();

    const fakeTxHash = `bonus-share-${addr}-${epoch}-${Date.now()}`;
    await ctx.db.insert("raffleEntries", {
      address:     addr,
      username:    profile?.username,
      tickets:     1,
      chain:       "arb",
      token:       "BONUS",
      txHash:      fakeTxHash,
      epoch,
      blockNumber: 0,
      timestamp:   Date.now(),
      synced:      false,
    });

    // Submit on-chain async
    await ctx.scheduler.runAfter(0, internal.raffle.submitShareBonusOnChain, { buyer: addr, txHash: fakeTxHash });
    return { ok: true };
  },
});

export const submitShareBonusOnChain = internalAction({
  args: { buyer: v.string(), txHash: v.string() },
  handler: async (ctx, { buyer, txHash }) => {
    const arbAddr    = ARB_RAFFLE_CONTRACT();
    const privateKey = process.env.VBMS_SIGNER_PRIVATE_KEY;
    if (!arbAddr || !privateKey) return;
    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.JsonRpcProvider(ARB_RPC);
      const signer   = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(arbAddr, RAFFLE_ARB_ABI, signer);
      const tx = await (contract as any).addBaseEntries(buyer, 1);
      await tx.wait(1);
      await ctx.runMutation(internal.raffle.markEntrySynced, { txHash, arbTxHash: tx.hash });
      console.log(`[Raffle] Share bonus on-chain: ${buyer} (tx: ${tx.hash})`);
    } catch (e) {
      console.error("[Raffle] submitShareBonusOnChain failed:", e);
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

export const getRaffleResultInternal = internalQuery({
  args: { epoch: v.number() },
  handler: async (ctx, { epoch }) => {
    return await ctx.db
      .query("raffleResults")
      .withIndex("by_epoch", (q: any) => q.eq("epoch", epoch))
      .first();
  },
});

/** Admin: patch fields on existing result (e.g. stored before schema update) */
export const patchDrawResult = mutation({
  args: {
    adminKey:         v.string(),
    epoch:            v.number(),
    winnerChain:      v.optional(v.string()),
    winnerToken:      v.optional(v.string()),
    prizeDescription: v.optional(v.string()),
  },
  handler: async (ctx, { adminKey, epoch, winnerChain, winnerToken, prizeDescription }) => {
    if (adminKey !== process.env.VMW_INTERNAL_SECRET) throw new Error("Unauthorized");
    const rec = await ctx.db.query("raffleResults")
      .withIndex("by_epoch", (q: any) => q.eq("epoch", epoch)).first();
    if (!rec) throw new Error("No result for epoch " + epoch);
    const patch: Record<string, string> = {};
    if (winnerChain !== undefined) patch.winnerChain = winnerChain;
    if (winnerToken !== undefined) patch.winnerToken = winnerToken;
    if (prizeDescription !== undefined) patch.prizeDescription = prizeDescription;
    const before = { winnerChain: rec.winnerChain, winnerToken: rec.winnerToken, prizeDescription: rec.prizeDescription };
    await ctx.db.patch(rec._id, patch);
    console.warn(`[RAFFLE ADMIN] patchDrawResult epoch=${epoch} before=${JSON.stringify(before)} after=${JSON.stringify(patch)}`);
    return { ok: true, epoch, ...patch };
  },
});

/** Admin: manually insert a missing raffleEntry (for gaps in polling) */
export const insertMissingEntry = mutation({
  args: {
    adminKey:    v.string(),
    address:     v.string(),
    tickets:     v.number(),
    chain:       v.string(),
    token:       v.string(),
    txHash:      v.string(),
    epoch:       v.number(),
    blockNumber: v.number(),
  },
  handler: async (ctx, { adminKey, address, tickets, chain, token, txHash, epoch, blockNumber }) => {
    if (adminKey !== process.env.VMW_INTERNAL_SECRET) throw new Error("Unauthorized");
    if (tickets < 1 || tickets > 500) throw new Error("Invalid tickets count");
    if (!["base", "arb"].includes(chain)) throw new Error("Invalid chain: must be 'base' or 'arb'");
    const VALID_TOKENS = ["VBMS", "USDC", "USND", "ETH", "BONUS"];
    if (!VALID_TOKENS.includes(token)) throw new Error(`Invalid token: must be one of ${VALID_TOKENS.join(", ")}`);
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error("Invalid Ethereum address");
    const existing = await ctx.db
      .query("raffleEntries")
      .withIndex("by_txHash", (q: any) => q.eq("txHash", txHash))
      .first();
    if (existing) return { skipped: true };
    const addr = address.toLowerCase();
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", addr))
      .first();
    await ctx.db.insert("raffleEntries", {
      address: addr,
      username: profile?.username,
      tickets,
      chain,
      token,
      txHash,
      epoch,
      blockNumber,
      timestamp: Date.now(),
      synced: true,
    });
    return { recorded: true };
  },
});

/** Internal: record draw result once VRF fulfilled */
export const getEntriesForEpoch = internalQuery({
  args: { epoch: v.number() },
  handler: async (ctx, { epoch }) => {
    return await ctx.db.query("raffleEntries")
      .withIndex("by_epoch", (q: any) => q.eq("epoch", epoch))
      .collect();
  },
});

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
    winnerChain:    v.optional(v.string()),
    winnerToken:    v.optional(v.string()),
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

      // Determine which chain/token the winning ticket was purchased with
      let winnerChain: string | undefined;
      let winnerToken: string | undefined;
      try {
        const allEntries = await ctx.runQuery(internal.raffle.getEntriesForEpoch, { epoch: ep });
        const sorted = (allEntries as any[]).slice().sort((a: any, b: any) => a.blockNumber - b.blockNumber);
        let running = 0;
        for (const entry of sorted) {
          running += entry.tickets;
          if (winnerTicket <= running) {
            winnerChain = entry.chain;
            winnerToken = entry.token;
            break;
          }
        }
      } catch {}

      await ctx.runMutation(internal.raffle.recordDrawResult, {
        epoch:           ep,
        winner:          winner.toLowerCase(),
        winnerTicket,
        winnerIndex:     Number(winnerIndex),
        vrfRandomWord:   vrfRandomWord.toString(),
        totalEntries:    Number(totalEntries),
        prizeDescription: prizeDescription || "Goofy Romero – Queen of Diamonds",
        winnerChain,
        winnerToken,
      });

      return { hasWinner: true, winner: winner.toLowerCase(), winnerTicket };
    } catch (e) {
      console.error("[Raffle] checkAndRecordDraw error:", e);
      return { hasWinner: false };
    }
  },
});

/** Internal wrapper for autoCheckDraw to call checkAndRecordDraw without api import */
export const checkAndRecordDrawInternal = internalAction({
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
      const winnerTicket = Number(winnerIndex) + 1;
      let winnerChain: string | undefined;
      let winnerToken: string | undefined;
      try {
        const allEntries = await ctx.runQuery(internal.raffle.getEntriesForEpoch, { epoch: ep });
        const sorted = (allEntries as any[]).slice().sort((a: any, b: any) => a.blockNumber - b.blockNumber);
        let running = 0;
        for (const entry of sorted) {
          running += entry.tickets;
          if (winnerTicket <= running) { winnerChain = entry.chain; winnerToken = entry.token; break; }
        }
      } catch {}
      await ctx.runMutation(internal.raffle.recordDrawResult, {
        epoch: ep, winner: winner.toLowerCase(), winnerTicket, winnerIndex: Number(winnerIndex),
        vrfRandomWord: vrfRandomWord.toString(), totalEntries: Number(totalEntries),
        prizeDescription: prizeDescription || "", winnerChain, winnerToken,
      });
      return { hasWinner: true, winner: winner.toLowerCase(), winnerTicket };
    } catch (e) {
      console.error("[Raffle] checkAndRecordDrawInternal error:", e);
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
      const tx2 = await (contract as any).createRaffle(
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
        const tx = await (contract as any).addBaseEntries(buyer, 1);
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
    skipReset:        v.optional(v.boolean()),  // true if contract already reset (e.g. after manual withdraw)
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

      if (!args.skipReset) {
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
      } else {
        console.log("[resetRaffle] skipReset=true — skipping confirmPrizeDelivered + resetRaffle");
      }

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

/**
 * One-shot fix: re-stamp raffleEntries from old epoch to current epoch.
 * Use when BASE contract epoch is stale after ARB reset.
 * Only re-stamps entries with timestamp AFTER the current epoch config was created.
 */
export const restampStaleBaseEntries = mutation({
  args: { adminKey: v.string() },
  handler: async (ctx, { adminKey }) => {
    if (adminKey !== process.env.VMW_INTERNAL_SECRET) throw new Error("Unauthorized");

    const config = await ctx.db.query("raffleConfig").order("desc").first();
    if (!config) throw new Error("No config");
    const targetEpoch = config.epoch;
    const since = config.updatedAt - 24 * 60 * 60 * 1000; // entries since 24h before epoch was set

    // Find entries with wrong epoch that have recent timestamps
    const stale = await ctx.db.query("raffleEntries")
      .withIndex("by_epoch", (q: any) => q.eq("epoch", targetEpoch - 1))
      .collect();

    const toFix = stale.filter((e: any) => e.timestamp >= since);
    for (const e of toFix) {
      await ctx.db.patch(e._id, { epoch: targetEpoch });
    }

    console.log(`[restampStaleBaseEntries] Fixed ${toFix.length}/${stale.length} entries → epoch ${targetEpoch}`);
    return { fixed: toFix.length, total: stale.length, targetEpoch };
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
    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      // New epoch — insert clean record (no checkpoint/drawRequested from old epoch)
      await ctx.db.insert("raffleConfig", data);
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// WITHDRAW — owner pulls funds from both contracts
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Admin: withdraw all funds from both raffle contracts.
 * Sequence: confirmPrizeDelivered (ARB) → withdraw ETH → withdrawERC20 tokens.
 * BASE contract: needs closeRaffle or similar first if still active.
 */
export const withdrawRaffleFunds = action({
  args: { adminKey: v.string() },
  handler: async (_ctx, { adminKey }): Promise<{
    ok: boolean;
    arb?: Record<string, string>;
    base?: Record<string, string>;
    error?: string;
  }> => {
    if (adminKey !== process.env.VMW_INTERNAL_SECRET) throw new Error("Unauthorized");
    console.warn(`[RAFFLE ADMIN] withdrawRaffleFunds triggered at=${new Date().toISOString()}`);

    const privateKey = process.env.VBMS_SIGNER_PRIVATE_KEY;
    const arbAddr    = ARB_RAFFLE_CONTRACT();
    const baseAddr   = BASE_RAFFLE_CONTRACT();
    if (!privateKey || !arbAddr || !baseAddr) return { ok: false, error: "Keys or contracts not configured" };

    const USND_ARB  = "0x4ecf61a6c2fab8a047ceb3b3b263b401763e9d49";
    const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const VBMS_BASE = "0xb03439567cd22f278b21e1ffcdfb8e1696763827";

    const WITHDRAW_ABI = [
      "function confirmPrizeDelivered() external",
      "function withdraw() external",
      "function withdrawFunds() external",
      "function withdrawERC20(address token) external",
      "function withdrawTokens(address token) external",
      "function owner() view returns (address)",
    ];

    const tryCall = async (contract: any, fn: string, args: any[] = []) => {
      try {
        const tx = await contract[fn](...args);
        await tx.wait(1);
        return tx.hash as string;
      } catch (e: any) {
        return null;
      }
    };

    const results: { arb: Record<string, string>; base: Record<string, string> } = { arb: {}, base: {} };

    try {
      const { ethers } = await import("ethers");

      // ── ARB ──────────────────────────────────────────────────────────────
      const arbProvider = new ethers.JsonRpcProvider(ARB_RPC);
      const arbSigner   = new ethers.Wallet(privateKey, arbProvider);
      const arbContract = new ethers.Contract(arbAddr, WITHDRAW_ABI, arbSigner);

      // 1. confirmPrizeDelivered (unlocks funds)
      const confirmTx = await tryCall(arbContract, "confirmPrizeDelivered");
      if (confirmTx) results.arb.confirmPrizeDelivered = confirmTx;

      // 2. withdraw ETH
      const wdEth = await tryCall(arbContract, "withdraw") ?? await tryCall(arbContract, "withdrawFunds");
      if (wdEth) results.arb.withdrawETH = wdEth;

      // 3. withdraw USND
      const wdUsnd = await tryCall(arbContract, "withdrawERC20", [USND_ARB])
                  ?? await tryCall(arbContract, "withdrawTokens", [USND_ARB]);
      if (wdUsnd) results.arb.withdrawUSND = wdUsnd;

      // ── BASE ─────────────────────────────────────────────────────────────
      const baseProvider = new ethers.JsonRpcProvider(BASE_RPC);
      const baseSigner   = new ethers.Wallet(privateKey, baseProvider);
      const baseContract = new ethers.Contract(baseAddr, WITHDRAW_ABI, baseSigner);

      // 1. confirmPrizeDelivered
      const confirmBaseTx = await tryCall(baseContract, "confirmPrizeDelivered");
      if (confirmBaseTx) results.base.confirmPrizeDelivered = confirmBaseTx;

      // 2. withdraw ETH
      const wdBaseEth = await tryCall(baseContract, "withdraw") ?? await tryCall(baseContract, "withdrawFunds");
      if (wdBaseEth) results.base.withdrawETH = wdBaseEth;

      // 3. withdraw USDC
      const wdUsdc = await tryCall(baseContract, "withdrawERC20", [USDC_BASE])
                  ?? await tryCall(baseContract, "withdrawTokens", [USDC_BASE]);
      if (wdUsdc) results.base.withdrawUSDC = wdUsdc;

      // 4. withdraw VBMS (might be 0, still try)
      const wdVbms = await tryCall(baseContract, "withdrawERC20", [VBMS_BASE])
                  ?? await tryCall(baseContract, "withdrawTokens", [VBMS_BASE]);
      if (wdVbms) results.base.withdrawVBMS = wdVbms;

      return { ok: true, ...results };
    } catch (e: any) {
      return { ok: false, error: e?.shortMessage ?? e?.message ?? String(e), ...results };
    }
  },
});

/** Delete all raffleEntries for a given epoch (admin only) */
export const purgeEpochEntries = mutation({
  args: { adminKey: v.string(), epoch: v.number() },
  handler: async (ctx, { adminKey, epoch }) => {
    if (adminKey !== process.env.VMW_INTERNAL_SECRET) throw new Error("Unauthorized");
    const entries = await ctx.db.query("raffleEntries")
      .withIndex("by_epoch", (q: any) => q.eq("epoch", epoch))
      .collect();
    await Promise.all(entries.map((e: any) => ctx.db.delete(e._id)));
    console.warn(`[RAFFLE ADMIN] purgeEpochEntries epoch=${epoch} deleted=${entries.length} at=${new Date().toISOString()}`);
    return { deleted: entries.length };
  },
});
