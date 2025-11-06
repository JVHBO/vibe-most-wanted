/**
 * WEB3 AUTHENTICATION HELPERS
 *
 * Provides utilities for signing messages and authenticating
 * actions with Web3 wallets.
 *
 * This ensures only wallet owners can perform actions on their behalf.
 */

import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { verifyMessage } from "ethers";
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

/**
 * Sign a message with the user's wallet
 *
 * @param signer - Ethers signer or viem wallet client
 * @param message - Message to sign
 * @returns Signature string (0x...)
 */
export async function signMessage(
  signer: any,
  message: string
): Promise<string> {
  try {
    // For ethers v6
    if (signer.signMessage) {
      return await signer.signMessage(message);
    }

    // For viem
    if (signer.signMessage) {
      const signature = await signer.signMessage({ message });
      return signature as string;
    }

    throw new Error("Unsupported signer");
  } catch (error: any) {
    devError("❌ signMessage error:", error);
    throw new Error(`Failed to sign message: ${error.message}`);
  }
}

/**
 * Get current nonce for an address
 */
export async function getNonce(address: string): Promise<number> {
  try {
    const nonce = await getConvex().query(api.auth.getNonce, { address });
    return nonce;
  } catch (error: any) {
    devError("❌ getNonce error:", error);
    return 0; // Default to 0 for new users
  }
}

/**
 * Create a signed authentication payload
 *
 * @param signer - Wallet signer
 * @param address - User's wallet address
 * @param action - Description of action (e.g., "Update stats")
 * @returns { signature, message, nonce }
 */
export async function createAuthPayload(
  signer: any,
  address: string,
  action: string
): Promise<{
  signature: string;
  message: string;
  nonce: number;
}> {
  // 1. Get current nonce
  const nonce = await getNonce(address);

  // 2. Create message
  const timestamp = Date.now();
  const message = `${action}: ${address} nonce:${nonce} at ${timestamp}`;

  // 3. Sign message
  const signature = await signMessage(signer, message);

  // 4. Verify signature locally (security check)
  const recoveredAddress = verifyMessage(message, signature);
  if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
    throw new Error(
      "Signature verification failed: address mismatch"
    );
  }

  devLog("✅ Signature verified locally:", {
    address,
    recoveredAddress,
    match: recoveredAddress.toLowerCase() === address.toLowerCase(),
  });

  return { signature, message, nonce };
}

/**
 * Example: Securely update profile stats
 *
 * ```typescript
 * import { useWalletClient } from 'wagmi';
 * import { createAuthPayload } from '@/lib/web3-auth';
 *
 * const { data: walletClient } = useWalletClient();
 * const address = walletClient?.account.address;
 *
 * // Create auth payload
 * const auth = await createAuthPayload(walletClient, address, "Update stats");
 *
 * // Call secure mutation
 * await convex.mutation(api.profiles.updateStatsSecure, {
 *   address,
 *   signature: auth.signature,
 *   message: auth.message,
 *   stats: { ... }
 * });
 * ```
 */

/**
 * Convenience wrapper for secure mutations
 */
export class SecureConvexClient {
  private signer: any;
  private address: string;

  constructor(signer: any, address: string) {
    this.signer = signer;
    this.address = address;
  }

  /**
   * Update stats securely
   */
  async updateStats(stats: any) {
    const auth = await createAuthPayload(
      this.signer,
      this.address,
      "Update stats"
    );

    await getConvex().mutation(api.profiles.updateStatsSecure, {
      address: this.address,
      signature: auth.signature,
      message: auth.message,
      stats,
    });
  }

  /**
   * Update defense deck securely
   */
  async updateDefenseDeck(defenseDeck: {
    tokenId: string;
    power: number;
    imageUrl: string;
    name: string;
    rarity: string;
    foil?: string;
  }[]) {
    const auth = await createAuthPayload(
      this.signer,
      this.address,
      "Update defense deck"
    );

    await getConvex().mutation(api.profiles.updateDefenseDeckSecure, {
      address: this.address,
      signature: auth.signature,
      message: auth.message,
      defenseDeck,
    });
  }

  /**
   * Increment a stat securely
   */
  async incrementStat(
    stat:
      | "pvpWins"
      | "pvpLosses"
      | "attackWins"
      | "attackLosses"
      | "defenseWins"
      | "defenseLosses"
  ) {
    const auth = await createAuthPayload(
      this.signer,
      this.address,
      `Increment ${stat}`
    );

    await getConvex().mutation(api.profiles.incrementStatSecure, {
      address: this.address,
      signature: auth.signature,
      message: auth.message,
      stat,
    });
  }
}
