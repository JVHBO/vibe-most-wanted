/**
 * Transaction utilities for Base chain
 * Uses Alchemy RPC for reliability + retry logic for edge cases
 */

import { createPublicClient, http, TransactionReceipt } from 'viem';
import { base } from 'viem/chains';

// Use Alchemy RPC if available, fallback to public
const BASE_RPC_URL = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
  ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
  : process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

/**
 * Get a public client configured with best available RPC
 */
export function getBasePublicClient() {
  return createPublicClient({
    chain: base,
    transport: http(BASE_RPC_URL),
  });
}

/**
 * Wait for transaction receipt with robust retry logic
 *
 * Handles:
 * - RPC propagation delays (tx not found initially)
 * - Transaction pending in mempool
 * - Network errors
 *
 * @param txHash - Transaction hash to wait for
 * @param options - Configuration options
 */
export async function waitForTxReceipt(
  txHash: `0x${string}`,
  options: {
    maxWaitTime?: number;      // Total max wait time in ms (default: 120000 = 2 min)
    initialDelay?: number;     // Initial delay before first check (default: 2000ms)
    pollingInterval?: number;  // Time between retries (default: 2000ms)
  } = {}
): Promise<TransactionReceipt> {
  const {
    maxWaitTime = 120_000,
    initialDelay = 2000,
    pollingInterval = 2000,
  } = options;

  const client = getBasePublicClient();
  const startTime = Date.now();

  // Initial delay to allow tx propagation
  console.log(`⏳ Waiting ${initialDelay}ms for tx propagation...`);
  await new Promise(resolve => setTimeout(resolve, initialDelay));

  while (Date.now() - startTime < maxWaitTime) {
    try {
      // Try viem's built-in waitForTransactionReceipt first
      const receipt = await client.waitForTransactionReceipt({
        hash: txHash,
        timeout: Math.min(30_000, maxWaitTime - (Date.now() - startTime)),
        pollingInterval,
      });

      console.log(`✅ Transaction confirmed: ${txHash}`);
      return receipt;

    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      const errorMsg = err.message || String(err);

      // If tx not found, keep retrying (propagation delay)
      if (errorMsg.includes('could not be found') ||
          errorMsg.includes('not found') ||
          errorMsg.includes('Transaction receipt with hash')) {

        console.log(`⏳ Tx not indexed yet (${Math.round(elapsed/1000)}s elapsed), retrying...`);
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
        continue;
      }

      // If timeout but we still have time, retry
      if (errorMsg.includes('timed out') && elapsed < maxWaitTime - 5000) {
        console.log(`⏳ Receipt poll timed out, retrying...`);
        continue;
      }

      // Other errors - throw
      throw err;
    }
  }

  throw new Error(`Transaction ${txHash} not confirmed after ${maxWaitTime/1000}s`);
}

/**
 * Verify a VBMS token transfer
 */
export async function verifyVBMSTransfer(
  txHash: `0x${string}`,
  expectedFrom: string,
  expectedTo: string,
  expectedAmount: bigint,
  tokenAddress: string
): Promise<{ verified: boolean; error?: string }> {
  const client = getBasePublicClient();

  try {
    const receipt = await waitForTxReceipt(txHash);

    if (receipt.status !== 'success') {
      return { verified: false, error: 'Transaction failed' };
    }

    const tx = await client.getTransaction({ hash: txHash });

    // Verify sender
    if (tx.from.toLowerCase() !== expectedFrom.toLowerCase()) {
      return { verified: false, error: `Sender mismatch: expected ${expectedFrom}` };
    }

    // Verify contract call target
    if (tx.to?.toLowerCase() !== tokenAddress.toLowerCase()) {
      return { verified: false, error: 'Not a VBMS token transfer' };
    }

    // Decode calldata: transfer(address,uint256)
    // First 4 bytes = function selector
    // Next 32 bytes = address (padded)
    // Next 32 bytes = amount
    const toInCalldata = '0x' + tx.input.slice(34, 74).toLowerCase();
    const amountInCalldata = BigInt('0x' + tx.input.slice(74));

    if (toInCalldata !== expectedTo.toLowerCase()) {
      return { verified: false, error: `Recipient mismatch: expected ${expectedTo}` };
    }

    if (amountInCalldata < expectedAmount) {
      return { verified: false, error: `Amount insufficient: got ${amountInCalldata}, expected ${expectedAmount}` };
    }

    return { verified: true };

  } catch (err: any) {
    return { verified: false, error: err.message };
  }
}
