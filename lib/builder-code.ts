/**
 * Base Builder Code Configuration
 *
 * Builder codes are used for onchain attribution of transactions.
 * When users interact with contracts through this app, the builder code
 * is appended to identify this app as the source.
 *
 * Docs: https://docs.base.org/base-chain/quickstart/builder-codes
 */

/**
 * Your unique builder code from base.dev
 * Used for onchain attribution of transactions
 */
export const BUILDER_CODE = 'bc_j3oc0rlv';

/**
 * Encode builder code as data suffix for ERC-5792 wallet_sendCalls
 *
 * The format follows the Base Attribution specification.
 * This suffix is appended to transaction calldata.
 */
export function encodeBuilderCodeSuffix(code: string = BUILDER_CODE): `0x${string}` {
  // Builder code attribution format:
  // 0x + "base-builder" prefix (62617365-6275696c646572) + code bytes
  const prefix = '62617365'; // "base" in hex
  const codeHex = Buffer.from(code).toString('hex');
  return `0x${prefix}${codeHex}` as `0x${string}`;
}

/**
 * Get the dataSuffix capability for wallet_sendCalls
 *
 * Usage with wagmi experimental useWriteContracts:
 * ```ts
 * import { getDataSuffixCapability } from '@/lib/builder-code';
 *
 * const { writeContracts } = useWriteContracts();
 *
 * writeContracts({
 *   contracts: [...],
 *   capabilities: getDataSuffixCapability(),
 * });
 * ```
 */
export function getDataSuffixCapability() {
  return {
    dataWithSuffix: {
      dataSuffix: encodeBuilderCodeSuffix(),
    },
  };
}

/**
 * Append builder code suffix to existing calldata
 *
 * For use with legacy writeContract when wallet_sendCalls is not available.
 * Note: This only works with EOA wallets, not Smart Accounts.
 */
export function appendBuilderCodeToCalldata(calldata: `0x${string}`): `0x${string}` {
  const suffix = encodeBuilderCodeSuffix();
  // Remove 0x from suffix before appending
  return `${calldata}${suffix.slice(2)}` as `0x${string}`;
}
