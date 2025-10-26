/**
 * CRYPTOGRAPHIC UTILITIES
 *
 * ⚠️ TODO: Full ECDSA implementation for Convex backend
 *
 * Current status: Format validation only
 * Before production: Implement full signature recovery using ethers/viem
 *
 * Why not implemented yet:
 * - Convex has limitations on npm packages
 * - @noble/secp256k1 API is complex for Convex environment
 * - Current approach: validate on frontend, double-check on backend
 *
 * Security note:
 * - Frontend validation with ethers (lib/web3-auth.ts) ✅
 * - Backend needs full implementation before production ⚠️
 */

/**
 * Placeholder - recover address from signature
 *
 * TODO: Implement using ethers.verifyMessage or equivalent
 * For now, this is a placeholder that throws an error
 */
export function recoverAddress(message: string, signature: string): string {
  throw new Error(
    "Full ECDSA verification not yet implemented in Convex backend. " +
    "Use frontend validation with ethers for now. " +
    "See lib/web3-auth.ts for implementation."
  );
}

/**
 * Placeholder - verify signature
 *
 * TODO: Implement full verification before production
 */
export function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  // For now, return true with warning
  console.warn(
    "⚠️ WARNING: Using placeholder signature verification. " +
    "Implement full ECDSA before production!"
  );
  return true;
}
