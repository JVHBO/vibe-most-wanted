/**
 * CONVEX PVP SERVICE
 *
 * Drop-in replacement for Firebase PvPService
 * Uses Convex for realtime PvP rooms and matchmaking
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

export interface GameRoom {
  _id: string;
  roomId: string;
  status: "waiting" | "ready" | "playing" | "finished" | "cancelled";
  mode?: "ranked" | "casual"; // Optional: ranked (costs coins) or casual (free)
  hostAddress: string;
  hostUsername: string;
  guestAddress?: string;
  guestUsername?: string;
  hostCards?: any[];
  guestCards?: any[];
  hostPower?: number;
  guestPower?: number;
  winnerId?: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
}

export class ConvexPvPService {
  /**
   * Create a custom room
   */
  static async createRoom(
    hostAddress: string,
    hostUsername?: string,
    mode?: "ranked" | "casual"
  ): Promise<string> {
    try {
      const normalizedAddress = hostAddress.toLowerCase();

      const code = await getConvex().mutation(api.rooms.createRoom, {
        hostAddress: normalizedAddress,
        hostUsername: hostUsername || normalizedAddress.substring(0, 8),
        mode: mode || "ranked", // Default to ranked if not specified
      });

      devLog("✅ Room created:", code, `(${mode || 'ranked'})`);
      return code;
    } catch (error: any) {
      devError("❌ createRoom error:", error);
      throw new Error(`Erro ao criar sala: ${error.message}`);
    }
  }

  /**
   * Join a room with code
   */
  static async joinRoom(
    code: string,
    guestAddress: string,
    guestUsername?: string
  ): Promise<boolean> {
    try {
      const normalizedAddress = guestAddress.toLowerCase();

      await getConvex().mutation(api.rooms.joinRoom, {
        code,
        guestAddress: normalizedAddress,
        guestUsername: guestUsername || normalizedAddress.substring(0, 8),
      });

      devLog("✅ Joined room:", code);
      return true;
    } catch (error: any) {
      devError("❌ joinRoom error:", error);
      throw new Error(`Erro ao entrar na sala: ${error.message}`);
    }
  }

  /**
   * Find automatic match
   */
  static async findMatch(playerAddress: string, playerUsername?: string): Promise<string> {
    devLog("🔍 findMatch called for:", playerAddress);

    try {
      const normalizedAddress = playerAddress.toLowerCase();

      const roomCode = await getConvex().mutation(api.rooms.findMatch, {
        playerAddress: normalizedAddress,
        playerUsername: playerUsername || normalizedAddress.substring(0, 8),
      });

      if (roomCode) {
        devLog("✅ Matched with room:", roomCode);
        return roomCode;
      } else {
        devLog("⏳ Added to matchmaking queue");
        return "";
      }
    } catch (error: any) {
      devError("❌ findMatch ERROR:", error);
      devError("Error code:", error.code);
      devError("Error message:", error.message);
      throw error;
    }
  }

  /**
   * Remove from matchmaking queue
   */
  static async cancelMatchmaking(playerAddress: string): Promise<void> {
    try {
      const normalizedAddress = playerAddress.toLowerCase();

      await getConvex().mutation(api.rooms.cancelMatchmaking, {
        playerAddress: normalizedAddress,
      });

      devLog("✅ Cancelled matchmaking:", normalizedAddress);
    } catch (error: any) {
      devError("❌ cancelMatchmaking error:", error);
    }
  }

  /**
   * Update selected cards in room
   */
  static async updateCards(
    code: string,
    playerAddress: string,
    cards: any[]
  ): Promise<void> {
    devLog("🎯 updateCards called:", {
      code,
      playerAddress,
      cardsCount: cards.length,
    });

    try {
      const normalizedAddress = playerAddress.toLowerCase();
      const power = cards.reduce((sum, c) => sum + (c.power || 0), 0);

      await getConvex().mutation(api.rooms.updateCards, {
        code,
        playerAddress: normalizedAddress,
        cards,
        power,
      });

      devLog("✅ Cards updated");
    } catch (error: any) {
      devError("❌ updateCards error:", error);
      throw new Error(`Erro ao atualizar cartas: ${error.message}`);
    }
  }

  /**
   * Get room by code
   */
  static async getRoom(code: string): Promise<GameRoom | null> {
    try {
      const room = await getConvex().query(api.rooms.getRoom, { code });
      return room as GameRoom | null;
    } catch (error: any) {
      devError("❌ getRoom error:", error);
      return null;
    }
  }

  /**
   * Leave room
   */
  static async leaveRoom(code: string, playerAddress: string): Promise<void> {
    try {
      const normalizedAddress = playerAddress.toLowerCase();

      await getConvex().mutation(api.rooms.leaveRoom, {
        code,
        playerAddress: normalizedAddress,
      });

      devLog("✅ Left room:", code);
    } catch (error: any) {
      devError("❌ leaveRoom error:", error);
    }
  }

  /**
   * Finish room with winner
   */
  static async finishRoom(code: string, winnerId: string): Promise<void> {
    try {
      await getConvex().mutation(api.rooms.finishRoom, {
        code,
        winnerId,
      });

      devLog("✅ Room finished:", code, "winner:", winnerId);
    } catch (error: any) {
      devError("❌ finishRoom error:", error);
    }
  }

  /**
   * Watch room changes (polling-based for now)
   * Returns unsubscribe function
   */
  static watchRoom(
    code: string,
    callback: (room: GameRoom | null) => void
  ): () => void {
    let isActive = true;
    let lastRoom: GameRoom | null = null;

    const poll = async () => {
      if (!isActive) return;

      try {
        const room = await this.getRoom(code);

        // Only call callback if room changed
        if (JSON.stringify(room) !== JSON.stringify(lastRoom)) {
          lastRoom = room;
          callback(room);
        }
      } catch (error) {
        devError("❌ watchRoom poll error:", error);
      }

      if (isActive) {
        setTimeout(poll, 1000); // Poll every 1 second
      }
    };

    poll(); // Start polling

    // Return unsubscribe function
    return () => {
      isActive = false;
    };
  }

  /**
   * Watch matchmaking status (polling-based)
   * Callback receives roomCode when matched, null if cancelled
   */
  static watchMatchmaking(
    playerAddress: string,
    callback: (roomCode: string | null) => void
  ): () => void {
    let isActive = true;
    let hasCalledBack = false; // Prevent multiple callbacks
    let retryCount = 0;
    const MAX_RETRIES = 15; // Max 15 retries after seeing "matched" status

    const poll = async () => {
      if (!isActive || hasCalledBack) return;

      try {
        // Check if player has been matched
        const matchStatus = await getConvex().query(api.rooms.getMatchmakingStatus, {
          playerAddress: playerAddress.toLowerCase(),
        });

        if (matchStatus) {
          if (matchStatus.status === "matched") {
            // Player was matched! Find the room
            const room = await getConvex().query(api.rooms.getRoomByPlayer, {
              playerAddress: playerAddress.toLowerCase(),
            });

            if (room && room.roomId) {
              devLog("✅ Match found! Room:", room.roomId);
              hasCalledBack = true;
              callback(room.roomId);
              return; // Stop polling
            }
            else {
              // Matched but room not found yet - retry with faster polling
              retryCount++;
              devLog(`⏳ Matched but room not ready yet, retry ${retryCount}/${MAX_RETRIES}`);

              if (retryCount >= MAX_RETRIES) {
                devError("❌ Max retries reached, room never appeared");
                hasCalledBack = true;
                callback(null); // Give up
                return;
              }
            }
          } else if (matchStatus.status === "cancelled") {
            // Matchmaking was cancelled
            devLog("⚠️ Matchmaking cancelled");
            hasCalledBack = true;
            callback(null);
            return; // Stop polling
          }
        }
      } catch (error) {
        devError("❌ Error polling matchmaking status:", error);
      }

      if (isActive && !hasCalledBack) {
        // Use faster polling (500ms) when matched but room not found
        // Otherwise use normal polling (1000ms instead of 2000ms for better UX)
        const pollInterval = retryCount > 0 ? 500 : 1000;
        setTimeout(poll, pollInterval);
      }
    };

    poll(); // Start polling

    // Return unsubscribe function
    return () => {
      isActive = false;
    };
  }

  /**
   * Cleanup old rooms (older than 5 minutes)
   */
  static async cleanupOldRooms(): Promise<void> {
    devLog("🧹 Cleaning up old rooms...");

    try {
      const deleted = await getConvex().mutation(api.rooms.cleanupOldRoomsPublic, {});

      if (deleted > 0) {
        devLog(`✅ Deleted ${deleted} old rooms`);
      }
    } catch (error: any) {
      devError("❌ cleanupOldRooms error:", error);
    }
  }
}
