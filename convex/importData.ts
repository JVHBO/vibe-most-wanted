/**
 * Import data from Firebase backup
 * Run with: npx convex run importData:importProfiles
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Type for backup profile data
type BackupProfile = {
  address: string;
  username: string;
  stats: {
    totalPower: number;
    totalCards: number;
    openedCards: number;
    unopenedCards: number;
    pveWins: number;
    pveLosses: number;
    pvpWins: number;
    pvpLosses: number;
    attackWins: number;
    attackLosses: number;
    defenseWins: number;
    defenseLosses: number;
  };
  attacksToday: number;
  rematchesToday: number;
  createdAt: number;
  lastUpdated: number;
  defenseDeck?: string[];
  lastAttackDate?: string;
  twitter?: string;
  twitterHandle?: string;
  userIndex?: number;
  updatedAt?: number;
};

// Sample profile data (we'll add real data here)
const BACKUP_PROFILES: Record<string, BackupProfile> = {
  "0x12cf353ef7d37ab6c5505ff673116986db7c9102": {
    address: "0x12cf353ef7d37ab6c5505ff673116986db7c9102",
    username: "0xjoonx",
    stats: {
      totalPower: 173,
      totalCards: 11,
      openedCards: 11,
      unopenedCards: 0,
      pveWins: 0,
      pveLosses: 0,
      pvpWins: 0,
      pvpLosses: 0,
      attackWins: 0,
      attackLosses: 0,
      defenseWins: 0,
      defenseLosses: 0,
    },
    attacksToday: 0,
    rematchesToday: 0,
    createdAt: 1761234483880,
    lastUpdated: 1761254595472,
  },
  "0x167e316d548cf1613b12cdd7c92e5859053a0039": {
    address: "0x167e316d548cf1613b12cdd7c92e5859053a0039",
    username: "Ted Binion",
    defenseDeck: ["8117", "8111", "8130", "8120", "8126"],
    stats: {
      totalPower: 336,
      totalCards: 50,
      openedCards: 50,
      unopenedCards: 0,
      pveWins: 0,
      pveLosses: 0,
      pvpWins: 0,
      pvpLosses: 0,
      attackWins: 0,
      attackLosses: 0,
      defenseWins: 0,
      defenseLosses: 0,
    },
    attacksToday: 0,
    rematchesToday: 0,
    userIndex: 9999,
    createdAt: 1761265484317,
    lastUpdated: 1761504863082,
  },
  "0x28f4a9a2e747ec2cb1b4e235a55dff5be2ef48d6": {
    address: "0x28f4a9a2e747ec2cb1b4e235a55dff5be2ef48d6",
    username: "0xStk",
    defenseDeck: ["8073", "8074", "8075", "8077", "8078"],
    stats: {
      totalPower: 229,
      totalCards: 10,
      openedCards: 10,
      unopenedCards: 0,
      pveWins: 0,
      pveLosses: 0,
      pvpWins: 0,
      pvpLosses: 0,
      attackWins: 0,
      attackLosses: 0,
      defenseWins: 0,
      defenseLosses: 0,
    },
    attacksToday: 0,
    rematchesToday: 0,
    lastAttackDate: "2025-10-26",
    createdAt: 1761156122616,
    lastUpdated: 1761508109296,
  },
  "0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52": {
    address: "0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52",
    username: "joaovitorhbo",
    twitter: "Lowprofile_eth",
    defenseDeck: ["6483", "6729", "2522", "6923", "7948"],
    stats: {
      totalPower: 1604,
      totalCards: 58,
      openedCards: 58,
      unopenedCards: 0,
      pveWins: 0,
      pveLosses: 0,
      pvpWins: 1,
      pvpLosses: 0,
      attackWins: 0,
      attackLosses: 0,
      defenseWins: 0,
      defenseLosses: 0,
    },
    attacksToday: 0,
    rematchesToday: 0,
    lastAttackDate: "2025-10-26",
    createdAt: 1761109636162,
    lastUpdated: 1761508671244,
  },
  "0x921bc01f8b105b831f01ec6619ff915b41de9fa8": {
    address: "0x921bc01f8b105b831f01ec6619ff915b41de9fa8",
    username: "Vipul",
    stats: {
      totalPower: 0,
      totalCards: 0,
      openedCards: 0,
      unopenedCards: 0,
      pveWins: 0,
      pveLosses: 0,
      pvpWins: 0,
      pvpLosses: 0,
      attackWins: 0,
      attackLosses: 0,
      defenseWins: 0,
      defenseLosses: 0,
    },
    attacksToday: 0,
    rematchesToday: 0,
    createdAt: 1761246110210,
    lastUpdated: 1761246110210,
  },
  "0x9c9d341658cd8be9023c8b6b6cd2179c720538a0": {
    address: "0x9c9d341658cd8be9023c8b6b6cd2179c720538a0",
    username: "sweet",
    twitter: "0xsweets",
    defenseDeck: ["209", "107", "2314", "2295", "2298"],
    stats: {
      totalPower: 975,
      totalCards: 110,
      openedCards: 110,
      unopenedCards: 0,
      pveWins: 0,
      pveLosses: 0,
      pvpWins: 0,
      pvpLosses: 0,
      attackWins: 0,
      attackLosses: 0,
      defenseWins: 0,
      defenseLosses: 0,
    },
    attacksToday: 0,
    rematchesToday: 0,
    createdAt: 1761160880320,
    lastUpdated: 1761504833262,
  },
  "0xa12fcb2e0ee6c6e4930edf254a9fa5a17636b67d": {
    address: "0xa12fcb2e0ee6c6e4930edf254a9fa5a17636b67d",
    username: "Jayabs",
    twitter: "jayabs_eth",
    defenseDeck: ["6256", "6261", "6260", "6259", "6265"],
    stats: {
      totalPower: 179,
      totalCards: 20,
      openedCards: 20,
      unopenedCards: 0,
      pveWins: 0,
      pveLosses: 0,
      pvpWins: 0,
      pvpLosses: 0,
      attackWins: 0,
      attackLosses: 0,
      defenseWins: 0,
      defenseLosses: 0,
    },
    attacksToday: 0,
    rematchesToday: 0,
    userIndex: 9999,
    createdAt: 1761267394741,
    lastUpdated: 1761336389853,
  },
  "0xbb4c7d8b2e32c7c99d358be999377c208cce53c2": {
    address: "0xbb4c7d8b2e32c7c99d358be999377c208cce53c2",
    username: "Claude",
    twitter: "claudeIAbyjvhbo",
    twitterHandle: "CLAUDINbyJVHBO",
    defenseDeck: ["1", "2", "3", "4", "5"],
    stats: {
      totalPower: 19,
      totalCards: 5,
      openedCards: 5,
      unopenedCards: 0,
      pveWins: 0,
      pveLosses: 0,
      pvpWins: 0,
      pvpLosses: 0,
      attackWins: 0,
      attackLosses: 0,
      defenseWins: 0,
      defenseLosses: 0,
    },
    attacksToday: 0,
    rematchesToday: 0,
    userIndex: 9999,
    createdAt: 1761432598523,
    lastUpdated: 1761450525620,
    updatedAt: 1761442222362,
  },
  "0xc2c3ca34cf5e80c49514acda6a466ed2894483e3": {
    address: "0xc2c3ca34cf5e80c49514acda6a466ed2894483e3",
    username: "Shiro",
    stats: {
      totalPower: 47,
      totalCards: 38,
      openedCards: 18,
      unopenedCards: 20,
      pveWins: 0,
      pveLosses: 0,
      pvpWins: 0,
      pvpLosses: 0,
      attackWins: 0,
      attackLosses: 0,
      defenseWins: 0,
      defenseLosses: 0,
    },
    attacksToday: 0,
    rematchesToday: 0,
    createdAt: 1761185088739,
    lastUpdated: 1761185704772,
  },
  "0xcd7edea4be83d02db5cfe0079847581723bb28b4": {
    address: "0xcd7edea4be83d02db5cfe0079847581723bb28b4",
    username: "BASEDNUKEM",
    stats: {
      totalPower: 0,
      totalCards: 0,
      openedCards: 0,
      unopenedCards: 0,
      pveWins: 0,
      pveLosses: 0,
      pvpWins: 0,
      pvpLosses: 0,
      attackWins: 0,
      attackLosses: 0,
      defenseWins: 0,
      defenseLosses: 0,
    },
    attacksToday: 0,
    rematchesToday: 0,
    userIndex: 9999,
    createdAt: 1761447624213,
    lastUpdated: 1761447624213,
  },
  "0xd024c93588fb2fc5da321eba704d2302d2c9443a": {
    address: "0xd024c93588fb2fc5da321eba704d2302d2c9443a",
    username: "account_test",
    defenseDeck: ["7950", "7951", "7953", "7949", "7954"],
    stats: {
      totalPower: 50,
      totalCards: 8,
      openedCards: 8,
      unopenedCards: 0,
      pveWins: 0,
      pveLosses: 0,
      pvpWins: 0,
      pvpLosses: 1,
      attackWins: 0,
      attackLosses: 1,
      defenseWins: 0,
      defenseLosses: 0,
    },
    attacksToday: 1,
    rematchesToday: 0,
    lastAttackDate: "2025-10-26",
    createdAt: 1761177069064,
    lastUpdated: 1761508671390,
  },
};

export const importProfiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    let count = 0;

    for (const [address, profileRaw] of Object.entries(BACKUP_PROFILES)) {
      const profile = profileRaw as BackupProfile;

      // Criar objeto apenas com campos que existem
      const profileData: any = {
        address: profile.address,
        username: profile.username,
        stats: profile.stats,
        attacksToday: profile.attacksToday,
        rematchesToday: profile.rematchesToday,
        createdAt: profile.createdAt,
        lastUpdated: profile.lastUpdated,
      };

      // Adicionar campos opcionais apenas se existirem
      if (profile.defenseDeck) profileData.defenseDeck = profile.defenseDeck;
      if (profile.lastAttackDate) profileData.lastAttackDate = profile.lastAttackDate;
      if (profile.twitter) profileData.twitter = profile.twitter;
      if (profile.twitterHandle) profileData.twitterHandle = profile.twitterHandle;
      if (profile.userIndex) profileData.userIndex = profile.userIndex;
      if (profile.updatedAt) profileData.updatedAt = profile.updatedAt;

      await ctx.db.insert("profiles", profileData);
      count++;
      console.log(`Imported: ${profile.username}`);
    }

    return { imported: count };
  },
});
