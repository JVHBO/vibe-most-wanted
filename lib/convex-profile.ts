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
  defenseDeck?: string[];
  attacksToday: number;
  rematchesToday: number;
  lastAttackDate?: string;
  lastRematchDate?: string;
  twitter?: string;
  twitterHandle?: string;
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
    totalPower: number
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
      });
    } catch (error: any) {
      console.error("❌ updateStats error:", error);
      throw error;
    }
  }

  /**
   * Update defense deck
   */
  static async updateDefenseDeck(
    address: string,
    defenseDeck: string[]
  ): Promise<void> {
    try {
      const normalizedAddress = address.toLowerCase();

      await convex.mutation(api.profiles.updateDefenseDeck, {
        address: normalizedAddress,
        defenseDeck,
      });
    } catch (error: any) {
      console.error("❌ updateDefenseDeck error:", error);
      throw error;
    }
  }

  /**
   * Update Twitter handle
   */
  static async updateTwitter(
    address: string,
    twitter: string,
    twitterHandle?: string
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
        await convex.mutation(api.profiles.updateDefenseDeck, {
          address: normalizedAddress,
          defenseDeck: updates.defenseDeck,
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
      if (updates.twitter || updates.twitterHandle) {
        await convex.mutation(api.profiles.upsertProfile, {
          address: normalizedAddress,
          username: profile.username,
          twitter: updates.twitter,
          twitterHandle: updates.twitterHandle,
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
   */
  static async incrementStat(
    address: string,
    stat: "pvpWins" | "pvpLosses" | "attackWins" | "attackLosses" | "defenseWins" | "defenseLosses"
  ): Promise<void> {
    try {
      const normalizedAddress = address.toLowerCase();

      await convex.mutation(api.profiles.incrementStat, {
        address: normalizedAddress,
        stat,
      });
    } catch (error: any) {
      console.error("❌ incrementStat error:", error);
      throw error;
    }
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
    opponentUsername?: string
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
}
