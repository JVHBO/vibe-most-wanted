/**
 * CONVEX PROFILE SERVICE
 *
 * Drop-in replacement for Firebase ProfileService
 * Uses Convex for realtime data and unlimited bandwidth
 */

import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

// Client for server-side operations
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export interface UserProfile {
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
  defenseDeck?: (string | {
    tokenId: string;
    power: number;
    imageUrl: string;
    name: string;
    rarity: string;
    foil?: string;
  })[];
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

  twitter?: string;
  twitterHandle?: string;
  twitterProfileImageUrl?: string;
  fid?: string;
  userIndex?: number;
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
      const profile = await convex.query(api.profiles.getProfile, {
        address: normalizedAddress,
      });
      return profile;
    } catch (error: any) {
      console.error("❌ getProfile error:", error);
      return null;
    }
  }

  /**
   * Get leaderboard (top players by power)
   */
  static async getLeaderboard(limit: number = 100): Promise<UserProfile[]> {
    try {
      const profiles = await convex.query(api.profiles.getLeaderboard, {
        limit,
      });
      return profiles as UserProfile[];
    } catch (error: any) {
      console.error("❌ getLeaderboard error:", error);
      return [];
    }
  }

  /**
   * Check if username is available
   */
  static async usernameExists(username: string): Promise<boolean> {
    try {
      const normalizedUsername = username.toLowerCase();
      const available = await convex.query(api.profiles.isUsernameAvailable, {
        username: normalizedUsername,
      });
      return !available; // If available=false, then it exists
    } catch (error: any) {
      console.error("❌ usernameExists error:", error);
      return false;
    }
  }

  /**
   * Get address by username
   */
  static async getAddressByUsername(username: string): Promise<string | null> {
    try {
      const normalizedUsername = username.toLowerCase();
      const profile = await convex.query(api.profiles.getProfileByUsername, {
        username: normalizedUsername,
      });
      return profile ? profile.address : null;
    } catch (error: any) {
      console.error("❌ getAddressByUsername error:", error);
      return null;
    }
  }

  /**
   * Create a new profile
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

      // Create profile
      await convex.mutation(api.profiles.upsertProfile, {
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

      console.log("✅ Profile created successfully:", username);
    } catch (error: any) {
      console.error("❌ createProfile error:", error);
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
    tokenIds?: string[] // Optional: owned token IDs for defense deck validation
  ): Promise<void> {
    try {
      const normalizedAddress = address.toLowerCase();

      // Get current profile to preserve other stats
      const profile = await this.getProfile(normalizedAddress);
      if (!profile) {
        throw new Error("Profile not found");
      }

      await convex.mutation(api.profiles.updateStats, {
        address: normalizedAddress,
        stats: {
          ...profile.stats,
          totalCards,
          openedCards,
          unopenedCards,
          totalPower,
        },
        tokenIds, // Pass tokenIds for validation
      });
    } catch (error: any) {
      console.error("❌ updateStats error:", error);
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
      const result = await convex.mutation(api.profiles.getValidatedDefenseDeck, {
        address: normalizedAddress,
      });
      return result;
    } catch (error: any) {
      console.error("❌ getValidatedDefenseDeck error:", error);
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
      console.log('📤 updateDefenseDeck called:', {
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

      await convex.mutation(api.profiles.updateDefenseDeck, {
        address: normalizedAddress,
        defenseDeck,
      });

      console.log('✅ updateDefenseDeck succeeded');
    } catch (error: any) {
      console.error("❌ updateDefenseDeck error:", error);
      console.error("❌ Error details:", {
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

      await convex.mutation(api.profiles.upsertProfile, {
        address: normalizedAddress,
        username: profile.username,
        twitter,
        twitterHandle,
        twitterProfileImageUrl,
      });
    } catch (error: any) {
      console.error("❌ updateTwitter error:", error);
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
        await convex.mutation(api.profiles.updateStats, {
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

        await convex.mutation(api.profiles.updateDefenseDeck, {
          address: normalizedAddress,
          defenseDeck: validDefenseDeck,
        });
      }

      // Handle attack tracking update
      if (
        updates.attacksToday !== undefined ||
        updates.lastAttackDate !== undefined
      ) {
        await convex.mutation(api.profiles.updateAttacks, {
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
        await convex.mutation(api.profiles.upsertProfile, {
          address: normalizedAddress,
          username: profile.username,
          twitter: updates.twitter,
          twitterHandle: updates.twitterHandle,
          twitterProfileImageUrl: updates.twitterProfileImageUrl,
        });
      }

      // Handle FID (Farcaster ID) update
      if (updates.fid) {
        await convex.mutation(api.profiles.upsertProfile, {
          address: normalizedAddress,
          username: profile.username,
          fid: updates.fid,
        });
      }
    } catch (error: any) {
      console.error("❌ updateProfile error:", error);
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

      console.log("🎮 recordMatch called:", {
        playerAddress: normalizedPlayerAddress,
        type,
        result,
        playerPower,
        opponentPower,
        coinsEarned,
        entryFeePaid,
        difficulty,
      });

      await convex.mutation(api.matches.recordMatch, {
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

      console.log("✅ Match recorded successfully");
    } catch (error: any) {
      console.error("❌ recordMatch error:", error);
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

      const matches = await convex.query(api.matches.getMatchHistory, {
        address: normalizedAddress,
        limit,
      });

      return matches as MatchHistory[];
    } catch (error: any) {
      console.error("❌ getMatchHistory error:", error);
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
      await convex.mutation(api.profiles.upsertProfile, {
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

      console.log("✅ Username updated successfully:", oldUsername, "->", normalizedUsername);
    } catch (error: any) {
      console.error("❌ updateUsername error:", error);
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
      const result = await convex.mutation(api.profiles.updateRevealedCardsCache, {
        address: normalizedAddress,
        revealedCards,
      });
      return result;
    } catch (error: any) {
      console.error("❌ updateRevealedCardsCache error:", error);
      throw error;
    }
  }
}
