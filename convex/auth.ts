/**
 * WEB3 AUTHENTICATION & SECURITY
 *
 * Critical security layer for protecting user data and preventing
 * unauthorized access to mutations.
 *
 * Uses ECDSA signature verification to ensure only wallet owners
 * can perform actions on their behalf.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Verify that a message was signed by the claimed address
 *
 * NOTE: This is now a wrapper that delegates to Convex Action
 * for full ECDSA verification with ethers.js in Node.js runtime
 *
 * For mutations, call this synchronously for format validation,
 * then use authenticateActionWithBackend() for full verification
 */
export function verifySignature(
  address: string,
  signature: string,
  message: string
): boolean {
  try {
    // Validate formats only (fast, synchronous check)
    if (!signature.startsWith("0x") || signature.length !== 132) {
      console.error("❌ Invalid signature format");
      return false;
    }

    const normalizedAddress = address.toLowerCase();
    if (
      !normalizedAddress.startsWith("0x") ||
      normalizedAddress.length !== 42
    ) {
      console.error("❌ Invalid address format");
      return false;
    }

    if (!message || message.length === 0) {
      console.error("❌ Empty message");
      return false;
    }

    // Format validation passed
    // Full ECDSA verification happens in authenticateActionWithBackend()
    return true;
  } catch (error: any) {
    console.error("❌ Signature validation error:", error);
    return false;
  }
}

/**
 * Verify that a message is recent (within 5 minutes)
 * Prevents replay attacks with old signatures
 */
export function verifyTimestamp(message: string): boolean {
  try {
    // Extract timestamp from message (format: "Action: address at timestamp")
    const match = message.match(/at (\d+)/);
    if (!match) {
      console.error("❌ No timestamp in message");
      return false;
    }

    const timestamp = parseInt(match[1]);

    // 🛡️ CRITICAL FIX: Validate timestamp is a valid number
    if (isNaN(timestamp)) {
      console.error("❌ Invalid timestamp format (NaN)");
      return false;
    }

    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    // Check if timestamp is within 5 minutes
    if (Math.abs(now - timestamp) > fiveMinutes) {
      console.error("❌ Message expired (older than 5 minutes)");
      return false;
    }

    return true;
  } catch (error: any) {
    console.error("❌ Timestamp verification error:", error);
    return false;
  }
}

/**
 * Verify that the address in the message matches the claimed address
 */
export function verifyMessageAddress(
  claimedAddress: string,
  message: string
): boolean {
  const normalizedClaimed = claimedAddress.toLowerCase();
  const normalizedMessage = message.toLowerCase();

  if (!normalizedMessage.includes(normalizedClaimed)) {
    console.error("❌ Address mismatch in message");
    return false;
  }

  return true;
}

/**
 * Complete authentication check (format validation only)
 * Use authenticateActionWithBackend() for full ECDSA verification
 */
export function authenticateAction(
  address: string,
  signature: string,
  message: string
): { success: boolean; error?: string } {
  // 1. Verify message format and address match
  if (!verifyMessageAddress(address, message)) {
    return { success: false, error: "Address mismatch" };
  }

  // 2. Verify timestamp (prevent replay attacks)
  if (!verifyTimestamp(message)) {
    return { success: false, error: "Expired signature" };
  }

  // 3. Verify signature format
  if (!verifySignature(address, signature, message)) {
    return { success: false, error: "Invalid signature format" };
  }

  return { success: true };
}

/**
 * Complete authentication with backend ECDSA verification
 * Calls Convex Action for full cryptographic validation
 */
export async function authenticateActionWithBackend(
  ctx: any,
  address: string,
  signature: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Format validation first (fast)
  const formatCheck = authenticateAction(address, signature, message);
  if (!formatCheck.success) {
    return formatCheck;
  }

  // 2. Full ECDSA verification via Convex Action
  try {
    // Import the action - types will be generated after deployment
    const cryptoActions = await import("./cryptoActions");

    const result = await ctx.runAction(cryptoActions.verifyEthereumSignature as any, {
      message,
      signature,
      expectedAddress: address,
    });

    if (!result.success) {
      console.error("❌ Backend signature verification failed:", result.error);
      return { success: false, error: result.error };
    }

    console.log("✅ Backend signature verification passed");
    return { success: true };
  } catch (error: any) {
    console.error("❌ Backend verification error:", error);
    return { success: false, error: "Backend verification failed" };
  }
}

// ============================================================================
// NONCE MANAGEMENT (Prevent replay attacks)
// ============================================================================

/**
 * Get a nonce for signing
 * Each wallet gets a unique nonce that increments with each action
 */
export const getNonce = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();

    // Check if nonce exists
    const existing = await ctx.db
      .query("nonces")
      .withIndex("by_address", (q: any) => q.eq("address", normalizedAddress))
      .first();

    if (existing) {
      return existing.nonce;
    }

    // First time - return 0
    return 0;
  },
});

/**
 * Increment nonce after successful action
 * ONLY call this from within authenticated mutations
 */
export async function incrementNonce(ctx: any, address: string): Promise<void> {
  const normalizedAddress = address.toLowerCase();

  const existing = await ctx.db
    .query("nonces")
    .withIndex("by_address", (q: any) => q.eq("address", normalizedAddress))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      nonce: existing.nonce + 1,
      lastUsed: Date.now(),
    });
  } else {
    await ctx.db.insert("nonces", {
      address: normalizedAddress,
      nonce: 1,
      lastUsed: Date.now(),
    });
  }
}

/**
 * Verify nonce in message matches expected nonce
 * Prevents replay attacks by ensuring each signature is used only once
 */
export async function verifyNonce(
  ctx: any,
  address: string,
  message: string
): Promise<boolean> {
  try {
    // Extract nonce from message (format: "Action: address nonce:N at timestamp")
    const match = message.match(/nonce:(\d+)/);
    if (!match) {
      console.error("❌ No nonce in message");
      return false;
    }

    const messageNonce = parseInt(match[1]);

    // 🛡️ SECURITY: Validate nonce is a valid number
    if (isNaN(messageNonce)) {
      console.error("❌ Invalid nonce format (NaN)");
      return false;
    }

    const normalizedAddress = address.toLowerCase();

    // Get current nonce from database
    const existing = await ctx.db
      .query("nonces")
      .withIndex("by_address", (q: any) => q.eq("address", normalizedAddress))
      .first();

    const currentNonce = existing ? existing.nonce : 0;

    // Nonce in message must match current nonce
    if (messageNonce !== currentNonce) {
      console.error(
        `❌ Nonce mismatch: expected ${currentNonce}, got ${messageNonce}`
      );
      return false;
    }

    return true;
  } catch (error: any) {
    console.error("❌ Nonce verification error:", error);
    return false;
  }
}
