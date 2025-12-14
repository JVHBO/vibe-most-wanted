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
 * Verify a VBMS token transfer (legacy - uses tx.from)
 * @deprecated Use verifyERC20TransferByLogs for Smart Contract Wallet compatibility
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

// ERC20 Transfer event topic: keccak256("Transfer(address,address,uint256)")
const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

/**
 * Verify an ERC20 token transfer using Transfer event logs
 *
 * This method is REQUIRED for Smart Contract Wallets (like Coinbase Smart Wallet)
 * because tx.from may be a relayer/bundler address, not the user's address.
 *
 * The Transfer event's `from` field always shows the actual token holder,
 * regardless of who submitted the transaction.
 */
export async function verifyERC20TransferByLogs(
  txHash: `0x${string}`,
  expectedFrom: string,
  expectedTo: string,
  expectedAmount: bigint,
  tokenAddress: string
): Promise<{ verified: boolean; error?: string; actualFrom?: string; actualTo?: string; actualAmount?: string }> {
  const client = getBasePublicClient();

  try {
    // Wait for transaction to be confirmed
    const receipt = await waitForTxReceipt(txHash);

    if (receipt.status !== 'success') {
      return { verified: false, error: 'Transaction failed' };
    }

    // Parse Transfer event logs
    for (const log of receipt.logs) {
      // Check if this is from the correct token contract
      if (log.address.toLowerCase() !== tokenAddress.toLowerCase()) {
        continue;
      }

      // Check if this is a Transfer event
      if (log.topics[0] !== TRANSFER_EVENT_TOPIC) {
        continue;
      }

      // Decode Transfer event: Transfer(from, to, amount)
      // topics[1] = from (padded to 32 bytes)
      // topics[2] = to (padded to 32 bytes)
      // data = amount (uint256)
      const fromTopic = log.topics[1];
      const toTopic = log.topics[2];

      if (!fromTopic || !toTopic) continue;

      // Extract addresses from topics (remove 0x and padding, take last 40 chars)
      const actualFrom = ('0x' + fromTopic.slice(26)).toLowerCase();
      const actualTo = ('0x' + toTopic.slice(26)).toLowerCase();
      const actualAmount = BigInt(log.data);

      // Check if this Transfer matches our expected values
      if (actualFrom !== expectedFrom.toLowerCase()) {
        continue; // Keep looking for matching log
      }

      if (actualTo !== expectedTo.toLowerCase()) {
        continue;
      }

      if (actualAmount < expectedAmount) {
        continue;
      }

      // Found matching transfer!
      console.log(`✅ ERC20 Transfer verified via logs: ${actualFrom} → ${actualTo}, amount: ${actualAmount}`);
      return {
        verified: true,
        actualFrom,
        actualTo,
        actualAmount: actualAmount.toString(),
      };
    }

    // No matching Transfer event found
    return {
      verified: false,
      error: `No matching Transfer event found in logs (expected: ${expectedFrom} → ${expectedTo}, amount >= ${expectedAmount})`,
    };

  } catch (err: any) {
    console.error('❌ ERC20 Transfer verification error:', err);
    return { verified: false, error: err.message };
  }
}
