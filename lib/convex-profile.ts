/**
 * CONVEX PROFILE SERVICE
 *
 * Drop-in replacement for Firebase ProfileService
 * Uses Convex for realtime data and unlimited bandwidth
 */

import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { devLog, devError } from '@/lib/utils/logger';

// Lazy initialization to avoid build-time errors
let convex: ConvexHttpClient | null = null;
const getConvex = () => {
  if (!convex) {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      throw new Error('NEXT_PUBLIC_CONVEX_URL is not defined');
    }
    convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  }
  return convex;
};

export interface UserProfile {
  address: string;
  username: string;
  stats: {
    totalPower: number;
    totalCards: number;
    openedCards: number;
    unopenedCards: number;
    // Aura system (unified ranking)
    aura?: number;
    // Collection-specific power
    vibePower?: number;
    vbrsPower?: number;
    vibefidPower?: number;
    afclPower?: number;
    coqPower?: number;
    pveWins: number;
    pveLosses: number;
    pvpWins: number;
    pvpLosses: number;
    attackWins: number;
    attackLosses: number;
    defenseWins: number;
    defenseLosses: number;
  };
  defenseDeck?: (string | {
    tokenId: string;
    power: number;
    imageUrl: string;
    name: string;
    rarity: string;
    foil?: string;
  })[];
  hasDefenseDeck?: boolean; // Flag for leaderboard (true if defenseDeck has 5 cards)
  attacksToday: number;
  rematchesToday: number;
  lastAttackDate?: string;
  lastRematchDate?: string;

  // Revealed Cards Cache (metadata cache for reliability when Alchemy fails)
  revealedCardsCache?: Array<{
    tokenId: string;
    name: string;
    imageUrl: string;
    rarity: string;
    wear?: string;
    foil?: string;
    character?: string;
    power?: number;
    attributes?: any;
    cachedAt: number;
  }>;

  // Economy fields
  coins?: number;
  lifetimeEarned?: number;
  lifetimeSpent?: number;
  dailyLimits?: {
    pveWins: number;
    pvpMatches: number;
    lastResetDate: string;
    firstPveBonus: boolean;
    firstPvpBonus: boolean;
    loginBonus: boolean;
    streakBonus: boolean;
  };
  winStreak?: number;
  lastWinTimestamp?: number;

  // Share incentives
  dailyShares?: number;
  lastShareDate?: string;
  hasSharedProfile?: boolean;
  totalShareBonus?: number;

  twitter?: string;
  twitterHandle?: string;
  twitterProfileImageUrl?: string;
  fid?: string;
  farcasterFid?: number;
  farcasterPfpUrl?: string;
  userIndex?: number;
  hasVibeBadge?: boolean; // VIBE badge for VibeFID holders (2x Wanted Cast)
  createdAt: number;
  lastUpdated: number;
}

export interface MatchHistory {
  id?: string;
  playerAddress: string;
  type: "pve" | "pvp" | "attack" | "defense";
  result: "win" | "loss" | "tie";
  playerPower: number;
  opponentPower: number;
  opponentAddress?: string;
  opponentUsername?: string;
  timestamp: number;
  playerCards: any[];
  opponentCards: any[];
}

export class ConvexProfileService {
  /**
   * Get a profile by wallet address
   */
  static async getProfile(address: string): Promise<UserProfile | null> {
    try {
      const normalizedAddress = address.toLowerCase();
      const profile = await getConvex().query(api.profiles.getProfile, {
        address: normalizedAddress,
      });
      return profile;
    } catch (error: any) {
      devError("❌ getProfile error:", error);
      return null;
    }
  }

  /**
   * Get leaderboard (top players by power)
   * Shows all players (increased limit to 1000)
   */
  static async getLeaderboard(limit: number = 1000): Promise<UserProfile[]> {
    try {
      // 🚀 OPTIMIZED: Use lite query (97% bandwidth reduction)
      const profiles = await getConvex().query(api.profiles.getLeaderboardLite, {
        limit,
      });
      // Cast through unknown since lite version returns partial UserProfile
      return profiles as unknown as UserProfile[];
    } catch (error: any) {
      devError("❌ getLeaderboard error:", error);
      return [];
    }
  }

  /**
   * Check if username is available
   */
  static async usernameExists(username: string): Promise<boolean> {
    try {
      const normalizedUsername = username.toLowerCase();
      const available = await getConvex().query(api.profiles.isUsernameAvailable, {
        username: normalizedUsername,
      });
      return !available; // If available=false, then it exists
    } catch (error: any) {
      devError("❌ usernameExists error:", error);
      return false;
    }
  }

  /**
   * Get address by username
   */
  static async getAddressByUsername(username: string): Promise<string | null> {
    try {
      const normalizedUsername = username.toLowerCase();
      const profile = await getConvex().query(api.profiles.getProfileByUsername, {
        username: normalizedUsername,
      });
      return profile ? profile.address : null;
    } catch (error: any) {
      devError("❌ getAddressByUsername error:", error);
      return null;
    }
  }

  /**
   * 🔒 SECURE: Create a new profile from Farcaster data
   * This is the ONLY way to create accounts - requires valid FID
   */
  static async createProfileFromFarcaster(
    address: string,
    fid: number,
    username: string,
    displayName?: string,
    pfpUrl?: string
  ): Promise<void> {
    try {
      const normalizedAddress = address.toLowerCase();

      // 🔒 SECURITY: FID is required
      if (!fid || fid <= 0) {
        throw new Error("🔒 Farcaster authentication required to create account");
      }

      // Create profile with Farcaster data
      await getConvex().mutation(api.profiles.upsertProfileFromFarcaster, {
        address: normalizedAddress,
        fid,
        username,
        displayName,
        pfpUrl,
      });

      devLog("✅ Profile created from Farcaster:", username, "FID:", fid);
    } catch (error: any) {
      devError("❌ createProfileFromFarcaster error:", error);
      throw new Error(`Erro ao criar perfil: ${error.message}`);
    }
  }

  /**
   * @deprecated Use createProfileFromFarcaster instead
   * Legacy profile creation - will fail for new accounts
   */
  static async createProfile(
    address: string,
    username: string
  ): Promise<void> {
    try {
      const normalizedAddress = address.toLowerCase();
      const normalizedUsername = username.toLowerCase();

      // Check if profile already exists
      const existingProfile = await this.getProfile(normalizedAddress);
      if (existingProfile) {
        throw new Error(
          "Esta wallet já possui um perfil. Use o perfil existente."
        );
      }

      // Check if username is taken
      const exists = await this.usernameExists(normalizedUsername);
      if (exists) {
        throw new Error("Username já está em uso");
      }

      // Create profile (will fail for new accounts - use createProfileFromFarcaster)
      await getConvex().mutation(api.profiles.upsertProfile, {
        address: normalizedAddress,
        username,
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
      });

      devLog("✅ Profile created successfully:", username);
    } catch (error: any) {
      devError("❌ createProfile error:", error);
      throw new Error(`Erro ao criar perfil: ${error.message}`);
    }
  }

  /**
   * Update profile stats
   */
  static async updateStats(
    address: string,
    totalCards: number,
    openedCards: number,
    unopenedCards: number,
    totalPower: number,
    tokenIds?: string[], // Optional: owned token IDs for defense deck validation
    collectionPowers?: { // Optional: collection-specific powers for leaderboard filtering
      vibePower?: number;
      vbrsPower?: number;
      vibefidPower?: number;
      afclPower?: number;
    }
  ): Promise<void> {
    try {
      const normalizedAddress = address.toLowerCase();

      // Get current profile to preserve other stats
      const profile = await this.getProfile(normalizedAddress);
      if (!profile) {
        throw new Error("Profile not found");
      }

      await getConvex().mutation(api.profiles.updateStats, {
        address: normalizedAddress,
        stats: {
          ...profile.stats,
          totalCards,
          openedCards,
          unopenedCards,
          totalPower,
          ...(collectionPowers || {}), // Spread collection powers if provided
        },
        tokenIds, // Pass tokenIds for validation
      });
    } catch (error: any) {
      devError("❌ updateStats error:", error);
      throw error;
    }
  }

  /**
   * Get validated defense deck (removes cards player no longer owns)
   * SECURITY: Prevents using cards from sold/transferred NFTs
   */
  static async getValidatedDefenseDeck(address: string): Promise<{
    defenseDeck: any[];
    removedCards: any[];
    isValid: boolean;
    warning?: string;
  }> {
    try {
      const normalizedAddress = address.toLowerCase();
      const result = await getConvex().mutation(api.profiles.getValidatedDefenseDeck, {
        address: normalizedAddress,
      });
      return result;
    } catch (error: any) {
      devError("❌ getValidatedDefenseDeck error:", error);
      throw error;
    }
  }

  /**
   * Update defense deck
   */
  static async updateDefenseDeck(
    address: string,
    defenseDeck: {
      tokenId: string;
      power: number;
      imageUrl: string;
      name: string;
      rarity: string;
      foil?: string;
    }[]
  ): Promise<void> {
    try {
      const normalizedAddress = address.toLowerCase();

      // ✅ Additional validation and logging
      devLog('📤 updateDefenseDeck called:', {
        address: normalizedAddress,
        cardCount: defenseDeck.length,
        cards: defenseDeck.map(c => ({
          tokenId: c.tokenId,
          power: c.power,
          powerType: typeof c.power,
          imageUrl: c.imageUrl?.substring(0, 50),
          name: c.name,
          rarity: c.rarity,
          foil: c.foil,
          hasAllFields: !!(c.tokenId && c.power !== undefined && c.imageUrl && c.name && c.rarity)
        }))
      });

      await getConvex().mutation(api.profiles.updateDefenseDeck, {
        address: normalizedAddress,
        defenseDeck,
      });

      devLog('✅ updateDefenseDeck succeeded');
    } catch (error: any) {
      devError("❌ updateDefenseDeck error:", error);
      devError("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        data: error.data
      });
      throw error;
    }
  }

  /**
   * Update Twitter handle
   */
  static async updateTwitter(
    address: string,
    twitter: string,
    twitterHandle?: string,
    twitterProfileImageUrl?: string
  ): Promise<void> {
    try {
      const normalizedAddress = address.toLowerCase();

      const profile = await this.getProfile(normalizedAddress);
      if (!profile) {
        throw new Error("Profile not found");
      }

      await getConvex().mutation(api.profiles.upsertProfile, {
        address: normalizedAddress,
        username: profile.username,
        twitter,
        twitterHandle,
        twitterProfileImageUrl,
      });
    } catch (error: any) {
      devError("❌ updateTwitter error:", error);
      throw error;
    }
  }

  /**
   * Update profile (general purpose)
   */
  static async updateProfile(
    address: string,
    updates: Partial<UserProfile>
  ): Promise<void> {
    try {
      const normalizedAddress = address.toLowerCase();

      // Get current profile
      const profile = await this.getProfile(normalizedAddress);
      if (!profile) {
        throw new Error("Profile not found");
      }

      // Handle stats update
      if (updates.stats) {
        await getConvex().mutation(api.profiles.updateStats, {
          address: normalizedAddress,
          stats: updates.stats,
        });
      }

      // Handle defense deck update
      if (updates.defenseDeck) {
        // Filter out legacy string format, only pass object format to mutation
        const validDefenseDeck = updates.defenseDeck.filter(
          (card): card is { tokenId: string; power: number; imageUrl: string; name: string; rarity: string; foil?: string } =>
            typeof card === 'object' && card !== null
        );

        await getConvex().mutation(api.profiles.updateDefenseDeck, {
          address: normalizedAddress,
          defenseDeck: validDefenseDeck,
        });
      }

      // Handle attack tracking update
      if (
        updates.attacksToday !== undefined ||
        updates.lastAttackDate !== undefined
      ) {
        await getConvex().mutation(api.profiles.updateAttacks, {
          address: normalizedAddress,
          attacksToday: updates.attacksToday ?? profile.attacksToday,
          lastAttackDate:
            updates.lastAttackDate ??
            profile.lastAttackDate ??
            new Date().toISOString().split("T")[0],
        });
      }

      // Handle Twitter update
      if (updates.twitter || updates.twitterHandle || updates.twitterProfileImageUrl) {
        await getConvex().mutation(api.profiles.upsertProfile, {
          address: normalizedAddress,
          username: profile.username,
          twitter: updates.twitter,
          twitterHandle: updates.twitterHandle,
          twitterProfileImageUrl: updates.twitterProfileImageUrl,
        });
      }

      // Handle FID (Farcaster ID) update
      if (updates.fid) {
        await getConvex().mutation(api.profiles.upsertProfile, {
          address: normalizedAddress,
          username: profile.username,
          fid: updates.fid,
        });
      }
    } catch (error: any) {
      devError("❌ updateProfile error:", error);
      throw error;
    }
  }

  /**
   * Increment a stat (for wins/losses)
   * @deprecated Use Web3AuthService.incrementStat() instead for secure signature verification
   * This mutation is now internal-only for security reasons
   */
  static async incrementStat(
    address: string,
    stat: "pvpWins" | "pvpLosses" | "attackWins" | "attackLosses" | "defenseWins" | "defenseLosses"
  ): Promise<void> {
    throw new Error(
      "incrementStat is deprecated. Use Web3AuthService.incrementStat() for secure signature verification, " +
      "or call internal.profiles.incrementStat from server-side mutations."
    );
  }

  /**
   * Record a match result
   */
  static async recordMatch(
    playerAddress: string,
    type: "pve" | "pvp" | "attack" | "defense",
    result: "win" | "loss" | "tie",
    playerPower: number,
    opponentPower: number,
    playerCards: any[],
    opponentCards: any[],
    opponentAddress?: string,
    opponentUsername?: string,
    coinsEarned?: number,
    entryFeePaid?: number,
    difficulty?: "gey" | "goofy" | "gooner" | "gangster" | "gigachad"
  ): Promise<void> {
    try {
      const normalizedPlayerAddress = playerAddress.toLowerCase();
      const normalizedOpponentAddress = opponentAddress?.toLowerCase();

      devLog("🎮 recordMatch called:", {
        playerAddress: normalizedPlayerAddress,
        type,
        result,
        playerPower,
        opponentPower,
        coinsEarned,
        entryFeePaid,
        difficulty,
      });

      await getConvex().mutation(api.matches.recordMatch, {
        playerAddress: normalizedPlayerAddress,
        type,
        result,
        playerPower,
        opponentPower,
        playerCards,
        opponentCards,
        opponentAddress: normalizedOpponentAddress,
        opponentUsername,
        coinsEarned,
        entryFeePaid,
        difficulty,
      });

      devLog("✅ Match recorded successfully");
    } catch (error: any) {
      devError("❌ recordMatch error:", error);
      throw error;
    }
  }

  /**
   * Get match history for a player
   */
  static async getMatchHistory(
    address: string,
    limit: number = 50
  ): Promise<MatchHistory[]> {
    try {
      const normalizedAddress = address.toLowerCase();

      // 🚀 OPTIMIZED: Use summary query (95% bandwidth reduction)
      const matches = await getConvex().query(api.matches.getMatchHistorySummary, {
        address: normalizedAddress,
        limit,
      });

      // Cast through unknown since summary version returns partial MatchHistory
      return matches as unknown as MatchHistory[];
    } catch (error: any) {
      devError("❌ getMatchHistory error:", error);
      return [];
    }
  }

  /**
   * Update username
   */
  static async updateUsername(
    address: string,
    newUsername: string
  ): Promise<void> {
    try {
      const normalizedAddress = address.toLowerCase();
      const normalizedUsername = newUsername.toLowerCase().trim();

      if (!normalizedUsername || normalizedUsername.length === 0) {
        throw new Error("Username não pode ser vazio");
      }

      if (normalizedUsername.length < 3) {
        throw new Error("Username deve ter no mínimo 3 caracteres");
      }

      if (normalizedUsername.length > 20) {
        throw new Error("Username deve ter no máximo 20 caracteres");
      }

      // Valida formato (apenas letras, números e underscore)
      if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
        throw new Error("Username pode conter apenas letras, números e underscore");
      }

      // Get current profile
      const currentProfile = await this.getProfile(normalizedAddress);
      if (!currentProfile) {
        throw new Error("Perfil não encontrado");
      }

      const oldUsername = currentProfile.username.toLowerCase();

      // Se for o mesmo username, não faz nada
      if (oldUsername === normalizedUsername) {
        return;
      }

      // Verifica se o novo username já está em uso
      const usernameExists = await this.usernameExists(normalizedUsername);
      if (usernameExists) {
        throw new Error("Este username já está em uso");
      }

      // Update profile with new username
      await getConvex().mutation(api.profiles.upsertProfile, {
        address: normalizedAddress,
        username: newUsername.trim(),
        stats: currentProfile.stats,
        defenseDeck: currentProfile.defenseDeck
          ? currentProfile.defenseDeck.filter(
              (card): card is { tokenId: string; power: number; imageUrl: string; name: string; rarity: string; foil?: string } =>
                typeof card === 'object' && card !== null
            )
          : undefined,
        twitter: currentProfile.twitter,
        twitterHandle: currentProfile.twitterHandle,
        twitterProfileImageUrl: currentProfile.twitterProfileImageUrl,
        fid: currentProfile.fid,
      });

      devLog("✅ Username updated successfully:", oldUsername, "->", normalizedUsername);
    } catch (error: any) {
      devError("❌ updateUsername error:", error);
      throw new Error(`Erro ao atualizar username: ${error.message}`);
    }
  }

  /**
   * 🎴 UPDATE REVEALED CARDS CACHE
   * Saves metadata of revealed cards to prevent disappearing when Alchemy fails
   */
  static async updateRevealedCardsCache(
    address: string,
    revealedCards: Array<{
      tokenId: string;
      name: string;
      imageUrl: string;
      rarity: string;
      wear?: string;
      foil?: string;
      character?: string;
      power?: number;
      attributes?: any;
    }>
  ): Promise<{ success: boolean; cachedCount: number; newlyCached: number }> {
    try {
      const normalizedAddress = address.toLowerCase();
      const result = await getConvex().mutation(api.profiles.updateRevealedCardsCache, {
        address: normalizedAddress,
        revealedCards,
      });
      return result;
    } catch (error: any) {
      devError("❌ updateRevealedCardsCache error:", error);
      throw error;
    }
  }
}
