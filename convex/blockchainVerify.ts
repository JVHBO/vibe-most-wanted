/**
 * BLOCKCHAIN VERIFICATION UTILITY
 *
 * Verifies transactions on Base mainnet using RPC receipts
 * Used to prevent fake txHash exploits
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";

// Contract addresses for verification
const CONTRACTS = {
  VBMSToken: '0xb03439567cd22f278b21e1ffcdfb8e1696763827',
  VBMSPoolTroll: '0x062b914668f3fd35c3ae02e699cb82e1cf4be18b',
} as const;

// ERC20 Transfer event topic
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const BASE_RPC = process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";
const RECEIPT_WAIT_ATTEMPTS = 45;
const RECEIPT_WAIT_MS = 2000;

interface VerifyTransactionParams {
  txHash: string;
  expectedFrom: string;
  expectedTo: string;
  expectedAmount: bigint;
  isERC20?: boolean; // true for VBMS token transfers
}

interface TransactionVerifyResult {
  isValid: boolean;
  error?: string;
  actualFrom?: string;
  actualTo?: string;
  actualAmount?: string;
}

/**
 * Verify a transaction on Base mainnet
 * Supports both native ETH transfers and ERC20 token transfers
 */
export const verifyTransaction = internalAction({
  args: {
    txHash: v.string(),
    expectedFrom: v.string(),
    expectedTo: v.string(),
    expectedAmountWei: v.string(), // BigInt as string
    isERC20: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<TransactionVerifyResult> => {
    const { txHash, expectedFrom, expectedTo, expectedAmountWei, isERC20 } = args;

    if (!isValidTxHash(txHash)) {
      return { isValid: false, error: "Invalid transaction hash format" };
    }

    try {
      const receipt = await waitForRpcReceipt(txHash);

      // For ERC20 transfers, we need to check the logs
      if (isERC20) {
        return verifyERC20TransferFromReceipt(receipt, txHash, expectedFrom, expectedTo, expectedAmountWei);
      }

      // For native transfers, check the transaction directly
      const tx = await rpc("eth_getTransactionByHash", [txHash]);
      if (!tx) {
        return { isValid: false, error: "Transaction not found" };
      }

      if (receipt.status !== "0x1") {
        return { isValid: false, error: "Transaction failed" };
      }

      const actualFrom = tx.from?.toLowerCase();
      const actualTo = tx.to?.toLowerCase();
      const actualValue = BigInt(tx.value || '0');
      const expectedAmount = BigInt(expectedAmountWei);

      if (actualFrom !== expectedFrom.toLowerCase()) {
        return {
          isValid: false,
          error: `From address mismatch: expected ${expectedFrom}, got ${actualFrom}`,
          actualFrom,
          actualTo,
          actualAmount: actualValue.toString(),
        };
      }

      if (actualTo !== expectedTo.toLowerCase()) {
        return {
          isValid: false,
          error: `To address mismatch: expected ${expectedTo}, got ${actualTo}`,
          actualFrom,
          actualTo,
          actualAmount: actualValue.toString(),
        };
      }

      if (actualValue < expectedAmount) {
        return {
          isValid: false,
          error: `Amount mismatch: expected ${expectedAmount}, got ${actualValue}`,
          actualFrom,
          actualTo,
          actualAmount: actualValue.toString(),
        };
      }

      console.log(`[BlockchainVerify] ✅ TX ${txHash} verified: ${actualFrom} → ${actualTo}, ${actualValue} wei`);
      return {
        isValid: true,
        actualFrom,
        actualTo,
        actualAmount: actualValue.toString(),
      };

    } catch (error: any) {
      console.error(`[BlockchainVerify] Error verifying TX ${txHash}:`, error);
      return { isValid: false, error: error.message };
    }
  },
});

async function rpc(method: string, params: unknown[]): Promise<any> {
  const res = await fetch(BASE_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const payload = await res.json() as any;
  if (payload.error) {
    throw new Error(payload.error.message || `RPC error for ${method}`);
  }
  return payload.result;
}

async function waitForRpcReceipt(txHash: string): Promise<any> {
  for (let attempt = 0; attempt < RECEIPT_WAIT_ATTEMPTS; attempt++) {
    const receipt = await rpc("eth_getTransactionReceipt", [txHash]);
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, RECEIPT_WAIT_MS));
  }

  throw new Error("Transaction receipt not found.");
}

/**
 * Verify an ERC20 token transfer by checking transaction logs
 */
function verifyERC20TransferFromReceipt(
  receipt: any,
  txHash: string,
  expectedFrom: string,
  expectedTo: string,
  expectedAmountWei: string
): TransactionVerifyResult {
  try {
    // Check if transaction succeeded
    if (receipt.status !== '0x1') {
      return { isValid: false, error: "Transaction failed" };
    }

    // Look for Transfer event in logs
    const logs = receipt.logs || [];
    const expectedAmount = BigInt(expectedAmountWei);

    for (const log of logs) {
      // Check if this is a Transfer event from VBMS token
      if (log.address?.toLowerCase() !== CONTRACTS.VBMSToken.toLowerCase()) {
        continue;
      }

      if (log.topics?.[0] !== TRANSFER_TOPIC) {
        continue;
      }

      // Decode Transfer event: Transfer(from, to, amount)
      // topics[1] = from (padded to 32 bytes)
      // topics[2] = to (padded to 32 bytes)
      // data = amount
      const fromTopic = log.topics?.[1];
      const toTopic = log.topics?.[2];

      if (!fromTopic || !toTopic) continue;

      // Extract addresses from topics (remove padding)
      const actualFrom = '0x' + fromTopic.slice(26).toLowerCase();
      const actualTo = '0x' + toTopic.slice(26).toLowerCase();
      const actualAmount = BigInt(log.data);

      // Verify the transfer matches expected values
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
      console.log(`[BlockchainVerify] ✅ ERC20 TX ${txHash} verified: ${actualFrom} → ${actualTo}, ${actualAmount} VBMS`);
      return {
        isValid: true,
        actualFrom,
        actualTo,
        actualAmount: actualAmount.toString(),
      };
    }

    // No matching transfer found
    return {
      isValid: false,
      error: "No matching VBMS transfer found in transaction logs",
    };

  } catch (error: any) {
    console.error(`[BlockchainVerify] Error verifying ERC20 TX ${txHash}:`, error);
    return { isValid: false, error: error.message };
  }
}

/**
 * Quick check if a transaction hash format is valid
 */
export function isValidTxHash(txHash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}

/**
 * Check if txHash is the "zero" hash used for free operations
 */
export function isFreeOperationHash(txHash: string): boolean {
  return txHash === "0x0000000000000000000000000000000000000000000000000000000000000000";
}
