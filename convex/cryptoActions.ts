/**
 * CRYPTOGRAPHIC ACTIONS
 * 
 * Convex Actions with Node.js runtime for full ECDSA verification
 * Uses ethers.js for signature recovery and validation
 */

import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Verify an Ethereum signature (backend verification)
 * 
 * This runs in Node.js runtime and has access to full crypto libraries
 */
export const verifyEthereumSignature = action({
  args: {
    message: v.string(),
    signature: v.string(),
    expectedAddress: v.string(),
  },
  handler: async (ctx, { message, signature, expectedAddress }) => {
    try {
      // Dynamic import to ensure it works in Node.js runtime
      const { verifyMessage } = await import("ethers");

      // Validate formats
      if (!signature.startsWith("0x") || signature.length !== 132) {
        console.error("❌ Invalid signature format");
        return {
          success: false,
          error: "Invalid signature format",
        };
      }

      const normalizedExpected = expectedAddress.toLowerCase();
      if (!normalizedExpected.startsWith("0x") || normalizedExpected.length !== 42) {
        console.error("❌ Invalid address format");
        return {
          success: false,
          error: "Invalid address format",
        };
      }

      if (!message || message.length === 0) {
        console.error("❌ Empty message");
        return {
          success: false,
          error: "Empty message",
        };
      }

      // Recover address from signature
      const recoveredAddress = verifyMessage(message, signature);
      
      console.log("🔐 Signature verification:", {
        expected: normalizedExpected,
        recovered: recoveredAddress.toLowerCase(),
        match: recoveredAddress.toLowerCase() === normalizedExpected,
      });

      // Compare addresses (case-insensitive)
      if (recoveredAddress.toLowerCase() !== normalizedExpected) {
        console.error("❌ Address mismatch");
        return {
          success: false,
          error: "Signature does not match expected address",
          recoveredAddress: recoveredAddress.toLowerCase(),
        };
      }

      console.log("✅ Signature verified successfully");
      return {
        success: true,
        recoveredAddress: recoveredAddress.toLowerCase(),
      };
    } catch (error: any) {
      console.error("❌ Signature verification error:", error);
      return {
        success: false,
        error: error.message || "Failed to verify signature",
      };
    }
  },
});
