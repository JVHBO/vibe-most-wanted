/**
 * CONVEX PVP SERVICE
 *
 * Drop-in replacement for Firebase PvPService
 * Uses Convex for realtime PvP rooms and matchmaking
 */

import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

// Client for server-side operations
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export interface GameRoom {
  _id: string;
  roomId: string;
  status: "waiting" | "ready" | "playing" | "finished" | "cancelled";
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
  static async createRoom(hostAddress: string, hostUsername?: string): Promise<string> {
    try {
      const normalizedAddress = hostAddress.toLowerCase();

      const code = await convex.mutation(api.rooms.createRoom, {
        hostAddress: normalizedAddress,
        hostUsername: hostUsername || normalizedAddress.substring(0, 8),
      });

      console.log("✅ Room created:", code);
      return code;
    } catch (error: any) {
      console.error("❌ createRoom error:", error);
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

      await convex.mutation(api.rooms.joinRoom, {
        code,
        guestAddress: normalizedAddress,
        guestUsername: guestUsername || normalizedAddress.substring(0, 8),
      });

      console.log("✅ Joined room:", code);
      return true;
    } catch (error: any) {
      console.error("❌ joinRoom error:", error);
      throw new Error(`Erro ao entrar na sala: ${error.message}`);
    }
  }

  /**
   * Find automatic match
   */
  static async findMatch(playerAddress: string, playerUsername?: string): Promise<string> {
    console.log("🔍 findMatch called for:", playerAddress);

    try {
      const normalizedAddress = playerAddress.toLowerCase();

      const roomCode = await convex.mutation(api.rooms.findMatch, {
        playerAddress: normalizedAddress,
        playerUsername: playerUsername || normalizedAddress.substring(0, 8),
      });

      if (roomCode) {
        console.log("✅ Matched with room:", roomCode);
        return roomCode;
      } else {
        console.log("⏳ Added to matchmaking queue");
        return "";
      }
    } catch (error: any) {
      console.error("❌ findMatch ERROR:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      throw error;
    }
  }

  /**
   * Remove from matchmaking queue
   */
  static async cancelMatchmaking(playerAddress: string): Promise<void> {
    try {
      const normalizedAddress = playerAddress.toLowerCase();

      await convex.mutation(api.rooms.cancelMatchmaking, {
        playerAddress: normalizedAddress,
      });

      console.log("✅ Cancelled matchmaking:", normalizedAddress);
    } catch (error: any) {
      console.error("❌ cancelMatchmaking error:", error);
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
    console.log("🎯 updateCards called:", {
      code,
      playerAddress,
      cardsCount: cards.length,
    });

    try {
      const normalizedAddress = playerAddress.toLowerCase();
      const power = cards.reduce((sum, c) => sum + (c.power || 0), 0);

      await convex.mutation(api.rooms.updateCards, {
        code,
        playerAddress: normalizedAddress,
        cards,
        power,
      });

      console.log("✅ Cards updated");
    } catch (error: any) {
      console.error("❌ updateCards error:", error);
      throw new Error(`Erro ao atualizar cartas: ${error.message}`);
    }
  }

  /**
   * Get room by code
   */
  static async getRoom(code: string): Promise<GameRoom | null> {
    try {
      const room = await convex.query(api.rooms.getRoom, { code });
      return room as GameRoom | null;
    } catch (error: any) {
      console.error("❌ getRoom error:", error);
      return null;
    }
  }

  /**
   * Leave room
   */
  static async leaveRoom(code: string, playerAddress: string): Promise<void> {
    try {
      const normalizedAddress = playerAddress.toLowerCase();

      await convex.mutation(api.rooms.leaveRoom, {
        code,
        playerAddress: normalizedAddress,
      });

      console.log("✅ Left room:", code);
    } catch (error: any) {
      console.error("❌ leaveRoom error:", error);
    }
  }

  /**
   * Finish room with winner
   */
  static async finishRoom(code: string, winnerId: string): Promise<void> {
    try {
      await convex.mutation(api.rooms.finishRoom, {
        code,
        winnerId,
      });

      console.log("✅ Room finished:", code, "winner:", winnerId);
    } catch (error: any) {
      console.error("❌ finishRoom error:", error);
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
        console.error("❌ watchRoom poll error:", error);
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
        const matchStatus = await convex.query(api.rooms.getMatchmakingStatus, {
          playerAddress: playerAddress.toLowerCase(),
        });

        if (matchStatus) {
          if (matchStatus.status === "matched") {
            // Player was matched! Find the room
            const room = await convex.query(api.rooms.getRoomByPlayer, {
              playerAddress: playerAddress.toLowerCase(),
            });

            if (room && room.roomId) {
              console.log("✅ Match found! Room:", room.roomId);
              hasCalledBack = true;
              callback(room.roomId);
              return; // Stop polling
            }
            else {
              // Matched but room not found yet - retry with faster polling
              retryCount++;
              console.log(`⏳ Matched but room not ready yet, retry ${retryCount}/${MAX_RETRIES}`);

              if (retryCount >= MAX_RETRIES) {
                console.error("❌ Max retries reached, room never appeared");
                hasCalledBack = true;
                callback(null); // Give up
                return;
              }
            }
          } else if (matchStatus.status === "cancelled") {
            // Matchmaking was cancelled
            console.log("⚠️ Matchmaking cancelled");
            hasCalledBack = true;
            callback(null);
            return; // Stop polling
          }
        }
      } catch (error) {
        console.error("❌ Error polling matchmaking status:", error);
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
    console.log("🧹 Cleaning up old rooms...");

    try {
      const deleted = await convex.mutation(api.rooms.cleanupOldRooms, {});

      if (deleted > 0) {
        console.log(`✅ Deleted ${deleted} old rooms`);
      }
    } catch (error: any) {
      console.error("❌ cleanupOldRooms error:", error);
    }
  }
}
