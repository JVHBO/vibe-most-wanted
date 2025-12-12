/**
 * BLACKLIST - Exploiter Addresses
 *
 * These addresses exploited a race condition in the TESTVBMS->VBMS conversion system
 * on December 10-12, 2025. They are permanently banned from claiming VBMS.
 *
 * Full report: EXPLOIT-REPORT-2025-12-12.md
 *
 * Total stolen: 12,505,507 VBMS (~12.5M)
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

// ========== HARDCODED BLACKLIST ==========
// These addresses are PERMANENTLY banned from VBMS claims

export const EXPLOITER_BLACKLIST: Record<string, { username: string; fid: number; amountStolen: number; claims: number }> = {
  "0x0395df57f73ae2029fc27a152cd87070bcfbd4a4": { username: "faqih", fid: 1063904, amountStolen: 1283500, claims: 156 },
  "0xbb367d00000f5e37ac702aab769725c299be2fc3": { username: "aliselalujp", fid: 272115, amountStolen: 1096804, claims: 128 },
  "0x0e14598940443b91d097b5fd6a89b5808fe35a6b": { username: "fvgf", fid: 1328239, amountStolen: 1094400, claims: 132 },
  "0x0230cf1cf5bf2537eb385772ff72edd5db45320d": { username: "ndmcm", fid: 1129881, amountStolen: 1094400, claims: 132 },
  "0x9ab292251cfb32b8f405ae43a9851aba61696ded": { username: "ral", fid: 1276961, amountStolen: 1094400, claims: 132 },
  "0xd4c3afc6adce7622400759d5194e5497b162e39d": { username: "fransiska", fid: 1156056, amountStolen: 1090100, claims: 124 },
  "0xa43ae3956ecb0ce00c69576153a34db42d265cc6": { username: "jessica", fid: 520832, amountStolen: 993303, claims: 114 },
  "0x04c6d801f529b8d4f118edb2722d5986d25a6ebf": { username: "khajoel", fid: 528311, amountStolen: 991800, claims: 114 },
  "0xff793f745cb0f1131f0614bf54f4c4310f33f0ce": { username: "azwar", fid: 544479, amountStolen: 991800, claims: 114 },
  "0x4ab24dac98c86778e2c837e5fa37ec5a2fdbffc0": { username: "uenxnx", fid: 1322032, amountStolen: 803900, claims: 97 },
  "0xf73e59d03d45a227e5a37aace702599c15d7e64d": { username: "rapoer", fid: 1168341, amountStolen: 455900, claims: 47 },
  "0xc85a10e41fdea999556f8779ea83e6cd1c5d0ded": { username: "desri", fid: 518884, amountStolen: 303400, claims: 37 },
  "0x0f6cfb4f54fec1deca1f43f9c0294ff945b16eb9": { username: "venombaseeth", fid: 308907, amountStolen: 270700, claims: 34 },
  "0x8cc9746c2bb68bd8f51e30ad96f67596b25b141b": { username: "hdhxhx", fid: 1483990, amountStolen: 98400, claims: 12 },
  "0xdeb2f2f02d2d5a2be558868ca8f31440c73d3091": { username: "jxjsjsjxj", fid: 1439850, amountStolen: 98400, claims: 12 },
  "0x2cb84569b69265eea55a8ceb361549548ca99749": { username: "aaggwgxgch", fid: 1420345, amountStolen: 98400, claims: 12 },
  "0xcd890b0f59d7d1a98ffdf133d6b99458324e6621": { username: "nxnckck", fid: 1328839, amountStolen: 98400, claims: 12 },
  "0xcda1b44a39cd827156334c69552d8ecdc697646f": { username: "hshdjxjck", fid: 1328834, amountStolen: 98400, claims: 12 },
  "0x32c3446427e4481096dd96e6573aaf1fbbb9cff8": { username: "jsjxjxjd", fid: 1328624, amountStolen: 98400, claims: 12 },
  "0xce1899674ac0b4137a5bb819e3849794a768eaf0": { username: "9", fid: 1249352, amountStolen: 98400, claims: 12 },
  "0x0d2450ada31e8dfd414e744bc3d250280dca202e": { username: "komeng", fid: 1031800, amountStolen: 95700, claims: 11 },
  "0x1915a871dea94e538a3c9ec671574ffdee6e7c45": { username: "miya", fid: 252536, amountStolen: 95700, claims: 11 },
  "0x705d7d414c6d94a8d1a06aeffc7cd92882480bd9": { username: "wow", fid: 443434, amountStolen: 60900, claims: 7 },
};

// ========== CHECK BLACKLIST ==========

export function isBlacklisted(address: string): boolean {
  return address.toLowerCase() in EXPLOITER_BLACKLIST;
}

export function getBlacklistInfo(address: string) {
  return EXPLOITER_BLACKLIST[address.toLowerCase()] || null;
}

// ========== QUERY: Get Shame List (for UI) ==========

export const getShameList = query({
  handler: async () => {
    const exploiters = Object.entries(EXPLOITER_BLACKLIST)
      .map(([address, data]) => ({
        address,
        ...data,
      }))
      .sort((a, b) => b.amountStolen - a.amountStolen);

    const totalStolen = exploiters.reduce((sum, e) => sum + e.amountStolen, 0);
    const totalClaims = exploiters.reduce((sum, e) => sum + e.claims, 0);

    return {
      exploiters,
      summary: {
        totalExploiters: exploiters.length,
        totalStolen,
        totalClaims,
        exploitDate: "December 10-12, 2025",
        exploitType: "Race Condition - Multiple Signature Generation",
      },
    };
  },
});

// ========== QUERY: Check if Address is Blacklisted ==========

export const checkBlacklist = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();
    const info = EXPLOITER_BLACKLIST[normalizedAddress];

    if (info) {
      return {
        isBlacklisted: true,
        reason: "VBMS Exploit - December 2025",
        ...info,
      };
    }

    return {
      isBlacklisted: false,
    };
  },
});

// ========== INTERNAL: Reset Exploiter Balances ==========

export const resetExploiterBalances = internalMutation({
  handler: async (ctx) => {
    let resetCount = 0;

    for (const address of Object.keys(EXPLOITER_BLACKLIST)) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q: any) => q.eq("address", address))
        .first();

      if (profile && (profile.coins || 0) > 0) {
        await ctx.db.patch(profile._id, {
          coins: 0,
          coinsInbox: 0,
        });
        resetCount++;
        console.log(`🚫 Reset balance for exploiter: ${address} (${EXPLOITER_BLACKLIST[address].username})`);
      }
    }

    return { resetCount };
  },
});
