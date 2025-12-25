/**
 * BLACKLIST - Exploiter Addresses
 *
 * EXPLOIT #1: Race condition in TESTVBMS->VBMS conversion (Dec 10-12, 2025)
 * Total stolen: 12,505,507 VBMS (~12.5M)
 *
 * EXPLOIT #2: Referral farming with fake accounts (Dec 21, 2025)
 * Total stolen: 38,480,000 VBMS (~38.5M)
 *
 * GRAND TOTAL: ~51M VBMS stolen
 *
 * Last updated: 2025-12-21T23:00:00Z - 106 exploiters
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { logTransaction } from "./coinsInbox";

// ========== HARDCODED BLACKLIST ==========
// These addresses are PERMANENTLY banned from VBMS claims

export const EXPLOITER_BLACKLIST: Record<string, { username: string; fid: number; amountStolen: number; claims: number }> = {
  // ===== EXPLOIT #1: Race Condition (Dec 10-12, 2025) =====
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
  // ===== EXPLOIT #2: Referral Farming (Dec 21, 2025) - 86 addresses =====
  "0x93ab9ef9c10bdd9db53e8ec325a42118e0ac1486": { username: "dobronx", fid: 0, amountStolen: 4115000, claims: 100 },
  "0x94e7f886caf987a0029e37ac820982c80a13c148": { username: "pakhaji", fid: 0, amountStolen: 4115000, claims: 100 },
  "0x42a6b996b0547d2d3743b79dde377d98818abd32": { username: "yolo", fid: 0, amountStolen: 1490000, claims: 59 },
  "0x844a8e4da76bd08761f36bdba1f9746d58f9480d": { username: "gm", fid: 0, amountStolen: 1202500, claims: 52 },
  "0x1a2495bf4ed2aaf46e4834ea21d66109fa243f33": { username: "dbd", fid: 0, amountStolen: 1152500, claims: 50 },
  "0x4a2ba466a447d6a2010f4acfa7625db3c3c7cfc9": { username: "tyrionn", fid: 0, amountStolen: 925000, claims: 46 },
  "0x986686aced770960fe8a55d37545ebd90102ca97": { username: "berly", fid: 0, amountStolen: 832500, claims: 43 },
  "0x8f1af8261edae03a3680d1359228d2dac34eaec5": { username: "anonnux", fid: 0, amountStolen: 790000, claims: 52 },
  "0xb4909a4c636c45943c72921542ece5cd5d228cdb": { username: "nody69", fid: 0, amountStolen: 750000, claims: 40 },
  "0x8c84464ac8a4110285cf83d76b0c91d50ecf5fd9": { username: "ycbibvcyrvyb", fid: 0, amountStolen: 750000, claims: 45 },
  "0xe95dd130f8a1ac6e6c6fd8ac0dd9d14a80b3bc4c": { username: "jamie", fid: 0, amountStolen: 750000, claims: 40 },
  "0x4d1ef290857226044b0a9c6916ef4b624967bb12": { username: "gyfjiybyb", fid: 0, amountStolen: 675000, claims: 38 },
  "0xc48e66a008cc7195c048d8b3a95bc48f96c26fd2": { username: "basreng", fid: 0, amountStolen: 675000, claims: 38 },
  "0x8dcfeaba1109ab99d11069c33c8e20bfd64a3ced": { username: "ofkdbd", fid: 0, amountStolen: 632500, claims: 37 },
  "0xbcfbc3e9d1eac6684bc92d9ab6d117bf1c83675f": { username: "xenna", fid: 0, amountStolen: 632500, claims: 37 },
  "0xf494e397fd54efea84f39b51df06811b1657c373": { username: "raees18", fid: 0, amountStolen: 632500, claims: 37 },
  "0x03bf270d1c8429a0b378410c0ca9a07ca258cf79": { username: "rendy", fid: 0, amountStolen: 592500, claims: 35 },
  "0x2e4078e117fc3cf837042f063c522d6521f8baa3": { username: "tayyeba", fid: 0, amountStolen: 592500, claims: 35 },
  "0x9a50ff911c2500b494995e4419be65df3214d1d4": { username: "basdabonezzz", fid: 0, amountStolen: 592500, claims: 35 },
  "0x72fe79e122f447a3ba3d600d33cb74e5e01f2649": { username: "tkjfjf", fid: 0, amountStolen: 555000, claims: 34 },
  "0x92deaf8a0d953cdd64df5232939ab04ab5699604": { username: "bdbs", fid: 0, amountStolen: 555000, claims: 34 },
  "0xa24f8ca04e013911c4af840822119836f1624050": { username: "boli", fid: 0, amountStolen: 555000, claims: 34 },
  "0x5dfc840a696e207ea58f8c87be8fa808aaab366d": { username: "raa", fid: 0, amountStolen: 555000, claims: 34 },
  "0x6e3b59af52ce6f21fdb29ca2f730331f13a1952a": { username: "foom", fid: 0, amountStolen: 555000, claims: 34 },
  "0x4c7c8691b50dd0f070c25165b6ae839c8bcf3ee9": { username: "xennaberryl", fid: 0, amountStolen: 555000, claims: 34 },
  "0x2b0e2df099eee131becf3f4549a87944227c64e9": { username: "bdbsvdvs", fid: 0, amountStolen: 555000, claims: 37 },
  "0x79189269b91c91d3db41d33e3c266f4b704230b0": { username: "tsaqieff", fid: 0, amountStolen: 555000, claims: 34 },
  "0x5678fb8b977d85a499b3d979fad7f38282d1441d": { username: "irurh", fid: 0, amountStolen: 555000, claims: 34 },
  "0xfc84fc61ef5cc8677118a56f9c1b155fe3db97ea": { username: "ltot", fid: 0, amountStolen: 555000, claims: 34 },
  "0x27471fb793704bfa67e00e357258c40880b2d9d5": { username: "bsbsbsur", fid: 0, amountStolen: 555000, claims: 34 },
  "0xf5fa00bc2ad069b8d1e06770ee640b3f53b73e4d": { username: "oyykbt", fid: 0, amountStolen: 555000, claims: 34 },
  "0xc16f0b36e296d4fa710a1cde7a7cc73033b45875": { username: "vavsvs", fid: 0, amountStolen: 555000, claims: 34 },
  "0xe98d89c1c63ca79f75260fb48003aad4a63ff303": { username: "bsbshs", fid: 0, amountStolen: 555000, claims: 34 },
  "0x7ebc13e06ad0e52ec74c58aa2cc8eebf43e1cd23": { username: "pyynf", fid: 0, amountStolen: 555000, claims: 38 },
  "0x3b2848c24046708b86bea8f86a69fbd942ebcf3e": { username: "tare", fid: 0, amountStolen: 520000, claims: 33 },
  "0x7de544a076e163a8050d4b7cd0d67464836b54e9": { username: "haji", fid: 0, amountStolen: 520000, claims: 33 },
  "0xbb3d7721ab44d5a2e4d509d0223d77581d18911b": { username: "kulay", fid: 0, amountStolen: 520000, claims: 33 },
  "0xcbf6e8efc0720c7fd99bce14b7fa5578af75a870": { username: "soft", fid: 0, amountStolen: 520000, claims: 33 },
  "0x9a9eaa9c7569ac36087b9685c989aeb5ae89ea8a": { username: "uma", fid: 0, amountStolen: 520000, claims: 32 },
  "0x588dcd65f44572f3e5ce323b4570e30025da755a": { username: "omaga", fid: 0, amountStolen: 520000, claims: 32 },
  "0x987d2f1cf8ea90a75ad11851ad356380124eda4c": { username: "berryl", fid: 0, amountStolen: 520000, claims: 34 },
  "0x9d56d4e3ff49ccca7e0f9590c64ffd262e8c83c0": { username: "bebehd", fid: 0, amountStolen: 520000, claims: 35 },
  "0x8dd19c3f844095ca321a10f6d95d621f6bd26ba3": { username: "haha", fid: 0, amountStolen: 520000, claims: 32 },
  "0xe9cf12695d5613143f5c90f98dec50299648cf91": { username: "gilame", fid: 0, amountStolen: 520000, claims: 33 },
  "0xd68b474126ab6042391db26cdf86e6a4da12ce36": { username: "bsbs", fid: 0, amountStolen: 520000, claims: 32 },
  "0x826acbaf69cb9878fb1188e07558908285f556ae": { username: "bankrbot", fid: 0, amountStolen: 520000, claims: 32 },
  "0x6216b24345b8ad3b8fbcaf5c37262b07781a29ef": { username: "khaleed", fid: 0, amountStolen: 520000, claims: 33 },
  "0x17b0e93e326f5221fad0b9f8f873a40303a3565a": { username: "jonsnow", fid: 0, amountStolen: 520000, claims: 32 },
  "0x067a3c235b8c7f2127c5ea504ab253ac7bd3ab18": { username: "kim", fid: 0, amountStolen: 520000, claims: 32 },
  "0x5c51fb6fb7dbd99aa0c3ff05b6b33cd1fcd0e1c0": { username: "haruto", fid: 0, amountStolen: 457500, claims: 30 },
  "0x40bc7906e5dd887d0df7a04c125b8ee99ffb999b": { username: "renz420", fid: 0, amountStolen: 422500, claims: 29 },
  "0x34d1163f8f3d44c38bacbb6a8c86acb62cd7e4fb": { username: "mexxeth", fid: 0, amountStolen: 390000, claims: 42 },
  "0xc1fc1b3c4818ba8d93b1ecfe3363c967d44efe6c": { username: "ombray", fid: 0, amountStolen: 322500, claims: 23 },
  "0x0d8c3bdc2ed9e10668ec802cd704e724376158fc": { username: "gunvir", fid: 0, amountStolen: 322500, claims: 25 },
  "0xb5387885faa8194b59837549b67ad6fe97697dcb": { username: "qowhec", fid: 0, amountStolen: 322500, claims: 34 },
  "0xbde56569fbdce28d41291b46ca4f028e38f99253": { username: "pythvsvs", fid: 0, amountStolen: 270000, claims: 34 },
  "0xa813827e94fe2b454eda32659c80bf36d6b0ae74": { username: "yeowheidh", fid: 0, amountStolen: 192500, claims: 17 },
  "0xf61738769e634185320e5dad9666cbb2dd065c32": { username: "clode", fid: 0, amountStolen: 125000, claims: 13 },
  "0xc4bf1e049382d321cbbed969a9204729709eba2f": { username: "bcbxhdud", fid: 0, amountStolen: 107500, claims: 11 },
  "0x324c6c79d03220912261ca5c386446090f6bdc4c": { username: "dimes", fid: 0, amountStolen: 107500, claims: 11 },
  "0xd32dde19b55d0c632cd304c730ef5f3417969424": { username: "sabarud", fid: 0, amountStolen: 107500, claims: 11 },
  "0xd9b2247601de128197000f38c930826bdc62fa4c": { username: "hrvssv", fid: 0, amountStolen: 107500, claims: 11 },
  "0xdff23fcd7af0f1fbb918b47d59c14479040dcc9a": { username: "bbvv", fid: 0, amountStolen: 107500, claims: 11 },
  "0x125197f8aa760f88172f436b566ded5a47d74c7f": { username: "moxiee1", fid: 0, amountStolen: 107500, claims: 11 },
  "0xaef2bf99f130643e81326f8dac7d7ab766c8bdc5": { username: "raes2", fid: 0, amountStolen: 107500, claims: 11 },
  "0xa2c94b5516eaad532767faaec8a66072b98420fc": { username: "jrbdbx", fid: 0, amountStolen: 107500, claims: 11 },
  "0x6d1c81460fa07ca4f394b0071aca07826139ac62": { username: "bevsvs", fid: 0, amountStolen: 107500, claims: 11 },
  "0x192de512fd906d4dc2b2fba88efef5c6964060dd": { username: "yegevs", fid: 0, amountStolen: 107500, claims: 11 },
  "0x54e4e67954cbcec69e1e6b1c14ddba2b15eb837e": { username: "poytr", fid: 0, amountStolen: 107500, claims: 11 },
  "0x804dae25c43e679ff852b3fd8a626d3f190862d3": { username: "uevsvs", fid: 0, amountStolen: 107500, claims: 11 },
  "0xb6f5270216adde7896b4a026af92dae9bf0a1b6f": { username: "hrrgvee", fid: 0, amountStolen: 107500, claims: 12 },
  "0x27a9deac0fd33059251a29217c6f558fa0460f0e": { username: "bsbsvawjd", fid: 0, amountStolen: 107500, claims: 11 },
  "0x68fba4da5b56b5a72f80d2e737e64d636fb4f3b0": { username: "rose", fid: 0, amountStolen: 107500, claims: 12 },
  "0xf147fedadcf61b49d9e71e0c747fdc1b67cc78d1": { username: "vdvsvs", fid: 0, amountStolen: 107500, claims: 11 },
  "0x05414727a5ad7dbef2cc8bcc1548424803d87e27": { username: "ulane", fid: 0, amountStolen: 107500, claims: 11 },
  "0xa45a920f28725a48d8efece069182f72e804880a": { username: "prhevsbz", fid: 0, amountStolen: 107500, claims: 11 },
  "0x04016e6017b45eb96bbdd045225458e90315f5bf": { username: "gesvvsvw", fid: 0, amountStolen: 107500, claims: 11 },
  "0x5072d874d43f3b35ba830e45daab1cc3f6fb462c": { username: "nius", fid: 0, amountStolen: 107500, claims: 12 },
  "0xc7afb4a1a2f821ad160c29e7370cd73824ec5b58": { username: "hanzwwe", fid: 0, amountStolen: 92500, claims: 13 },
  "0x14e9915cc24eafa11c304a6d53eb142fc0dee55a": { username: "fasheng", fid: 0, amountStolen: 92500, claims: 17 },
  "0x384636c26ea99d347196dd8339bab542e15a44da": { username: "kebejj", fid: 0, amountStolen: 35000, claims: 5 },
  "0xb8d364933c26a82b46e9533742fe15c20264881a": { username: "ansatt", fid: 0, amountStolen: 35000, claims: 5 },
  "0x3ae4fa9293265527f9c8d76b83910eaaba20f1cb": { username: "salmane", fid: 0, amountStolen: 22500, claims: 4 },
};

// ========== CHECK BLACKLIST ==========

export function isBlacklisted(address: string): boolean {
  return address.toLowerCase() in EXPLOITER_BLACKLIST;
}

export function getBlacklistInfo(address: string) {
  return EXPLOITER_BLACKLIST[address.toLowerCase()] || null;
}

// ========== QUERY: Check if Player is Banned ==========

export const checkBan = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    if (!address) return { isBanned: false };

    const normalizedAddress = address.toLowerCase();
    const info = EXPLOITER_BLACKLIST[normalizedAddress];

    if (info) {
      return {
        isBanned: true,
        username: info.username,
        amountStolen: info.amountStolen,
        reason: `Your account was permanently banned for exploiting ${info.amountStolen.toLocaleString()} VBMS in December 2025.`,
        exploitDate: "December 10-12, 2025",
      };
    }

    return { isBanned: false };
  },
});

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

// ========== INTERNAL: Remove Defense Decks from Blacklisted Players ==========

export const removeBlacklistedDefenseDecks = internalMutation({
  handler: async (ctx) => {
    let removedCount = 0;
    const removed: { address: string; username: string; deckSize: number }[] = [];

    for (const address of Object.keys(EXPLOITER_BLACKLIST)) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q: any) => q.eq("address", address))
        .first();

      if (profile && profile.defenseDeck && profile.defenseDeck.length > 0) {
        const deckSize = profile.defenseDeck.length;
        await ctx.db.patch(profile._id, {
          defenseDeck: [], // Clear defense deck
          hasFullDefenseDeck: false, // 🚀 BANDWIDTH FIX
        });
        removedCount++;
        removed.push({
          address,
          username: EXPLOITER_BLACKLIST[address].username,
          deckSize,
        });
        console.log(`🚫 Removed defense deck from exploiter: ${address} (${EXPLOITER_BLACKLIST[address].username}) - had ${deckSize} cards`);
      }
    }

    return { removedCount, removed };
  },
});

// ========== ADMIN: Remove Defense Decks from Blacklisted Players (PUBLIC for admin use) ==========

// 🔒 SECURITY FIX: Changed from mutation to internalMutation
export const adminRemoveBlacklistedDefenseDecks = internalMutation({
  args: {},
  handler: async (ctx) => {
    let removedCount = 0;
    const removed: { address: string; username: string; deckSize: number }[] = [];

    for (const address of Object.keys(EXPLOITER_BLACKLIST)) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q: any) => q.eq("address", address))
        .first();

      if (profile && profile.defenseDeck && profile.defenseDeck.length > 0) {
        const deckSize = profile.defenseDeck.length;
        await ctx.db.patch(profile._id, {
          defenseDeck: [], // Clear defense deck
          hasFullDefenseDeck: false, // 🚀 BANDWIDTH FIX
        });
        removedCount++;
        removed.push({
          address,
          username: EXPLOITER_BLACKLIST[address].username,
          deckSize,
        });
        console.log(`🚫 Removed defense deck from exploiter: ${address} (${EXPLOITER_BLACKLIST[address].username}) - had ${deckSize} cards`);
      }
    }

    return { removedCount, removed };
  },
});

// ========== SHAME BUTTON SYSTEM ==========

const SHAME_REWARD = 100; // VBMS per shame click
const MAX_SHAMES_PER_PLAYER = 10; // Max shames a player can give total

/**
 * Get player's remaining shames and shame counts per exploiter
 */
export const getShameStatus = query({
  args: { playerAddress: v.string() },
  handler: async (ctx, { playerAddress }) => {
    const normalizedAddress = playerAddress.toLowerCase();

    // Get all shame records for this player (max 10 per player)
    const shameRecords = await ctx.db
      .query("shameClicks")
      .withIndex("by_shamer", (q: any) => q.eq("shamerAddress", normalizedAddress))
      .take(20); // 🔒 SECURITY: Limit (max should be 10 per MAX_SHAMES_PER_PLAYER)

    const totalShamesGiven = shameRecords.length;
    const remainingShames = Math.max(0, MAX_SHAMES_PER_PLAYER - totalShamesGiven);

    // Get which exploiters they've shamed
    const shamedExploiters = shameRecords.map(r => r.exploiterAddress);

    return {
      totalShamesGiven,
      remainingShames,
      shamedExploiters,
      maxShames: MAX_SHAMES_PER_PLAYER,
      rewardPerShame: SHAME_REWARD,
    };
  },
});

/**
 * Get total shame counts for all exploiters
 */
/**
 * 🚀 BANDWIDTH FIX: Added limit (1000 max)
 */
export const getExploiterShameCounts = query({
  handler: async (ctx) => {
    // 🚀 BANDWIDTH FIX: Limit to last 1000 shames
    const allShames = await ctx.db.query("shameClicks").order("desc").take(1000);

    // Count shames per exploiter
    const shameCounts: Record<string, number> = {};
    for (const shame of allShames) {
      const addr = shame.exploiterAddress;
      shameCounts[addr] = (shameCounts[addr] || 0) + 1;
    }

    return shameCounts;
  },
});

/**
 * Shame an exploiter and receive 100 VBMS
 */
export const shameExploiter = mutation({
  args: {
    playerAddress: v.string(),
    exploiterAddress: v.string(),
  },
  handler: async (ctx, { playerAddress, exploiterAddress }) => {
    const normalizedPlayer = playerAddress.toLowerCase();
    const normalizedExploiter = exploiterAddress.toLowerCase();

    // Verify exploiter is in blacklist
    if (!isBlacklisted(normalizedExploiter)) {
      throw new Error("This address is not on the shame list");
    }

    // Check if player exists
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", normalizedPlayer))
      .first();

    if (!profile) {
      throw new Error("Player profile not found");
    }

    // Check if player is blacklisted (exploiters can't shame)
    if (isBlacklisted(normalizedPlayer)) {
      throw new Error("Exploiters cannot participate in shaming");
    }

    // Count total shames by this player (max 10 per player)
    const playerShames = await ctx.db
      .query("shameClicks")
      .withIndex("by_shamer", (q: any) => q.eq("shamerAddress", normalizedPlayer))
      .take(20); // 🔒 SECURITY: Limit (max should be 10 per MAX_SHAMES_PER_PLAYER)

    if (playerShames.length >= MAX_SHAMES_PER_PLAYER) {
      throw new Error(`You've reached the maximum of ${MAX_SHAMES_PER_PLAYER} shames`);
    }

    // Check if player already shamed this specific exploiter
    const existingShame = playerShames.find(s => s.exploiterAddress === normalizedExploiter);
    if (existingShame) {
      throw new Error("You've already shamed this exploiter");
    }

    // Record the shame
    await ctx.db.insert("shameClicks", {
      shamerAddress: normalizedPlayer,
      exploiterAddress: normalizedExploiter,
      timestamp: Date.now(),
    });

    // Give reward
    const currentCoins = profile.coins || 0;
    const newCoins = currentCoins + SHAME_REWARD;

    await ctx.db.patch(profile._id, {
      coins: newCoins,
      lifetimeEarned: (profile.lifetimeEarned || 0) + SHAME_REWARD,
    });

    const exploiterInfo = getBlacklistInfo(normalizedExploiter);

    // 📊 LOG TRANSACTION
    await logTransaction(ctx, {
      address: normalizedPlayer,
      type: 'bonus',
      amount: SHAME_REWARD,
      source: 'shame',
      description: `Shamed exploiter @${exploiterInfo?.username || 'unknown'}`,
      balanceBefore: currentCoins,
      balanceAfter: newCoins,
    });

    console.log(`🔔 ${normalizedPlayer} shamed @${exploiterInfo?.username}! +${SHAME_REWARD} VBMS. New balance: ${newCoins}`);

    return {
      success: true,
      reward: SHAME_REWARD,
      newBalance: newCoins,
      remainingShames: MAX_SHAMES_PER_PLAYER - playerShames.length - 1,
      exploiterUsername: exploiterInfo?.username,
    };
  },
});
