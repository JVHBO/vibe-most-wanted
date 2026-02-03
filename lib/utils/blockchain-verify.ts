/**
 * Pure functions for blockchain transaction verification.
 * Extracted from convex/blockchainVerify.ts for testability.
 */

// Contract addresses
export const CONTRACTS = {
  VBMSToken: '0xb03439567cd22f278b21e1ffcdfb8e1696763827',
  VBMSPoolTroll: '0x062b914668f3fd35c3ae02e699cb82e1cf4be18b',
} as const;

// ERC20 Transfer event topic (keccak256 of "Transfer(address,address,uint256)")
export const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

/**
 * Validate transaction hash format (0x + 64 hex chars)
 */
export function isValidTxHash(txHash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}

/**
 * Check if txHash is the zero hash used for free operations
 */
export function isFreeOperationHash(txHash: string): boolean {
  return txHash === '0x0000000000000000000000000000000000000000000000000000000000000000';
}

export interface TransferLog {
  address: string;
  topics: string[];
  data: string;
}

export interface ParsedTransfer {
  from: string;
  to: string;
  amount: bigint;
  tokenAddress: string;
}

/**
 * Parse ERC20 Transfer event log
 * Returns null if log is not a valid Transfer event
 */
export function parseTransferLog(log: TransferLog): ParsedTransfer | null {
  if (!log.topics || log.topics.length < 3) return null;
  if (log.topics[0] !== TRANSFER_TOPIC) return null;

  const from = '0x' + log.topics[1].slice(26).toLowerCase();
  const to = '0x' + log.topics[2].slice(26).toLowerCase();
  const amount = BigInt(log.data);

  return {
    from,
    to,
    amount,
    tokenAddress: log.address.toLowerCase(),
  };
}

/**
 * Find a matching VBMS transfer in transaction logs
 */
export function findMatchingVBMSTransfer(
  logs: TransferLog[],
  expectedFrom: string,
  expectedTo: string,
  expectedAmount: bigint
): ParsedTransfer | null {
  for (const log of logs) {
    if (log.address?.toLowerCase() !== CONTRACTS.VBMSToken.toLowerCase()) continue;

    const parsed = parseTransferLog(log);
    if (!parsed) continue;

    if (parsed.from !== expectedFrom.toLowerCase()) continue;
    if (parsed.to !== expectedTo.toLowerCase()) continue;
    if (parsed.amount < expectedAmount) continue;

    return parsed;
  }
  return null;
}

/**
 * Validate native transfer fields
 */
export function validateNativeTransfer(
  actualFrom: string,
  actualTo: string,
  actualValue: bigint,
  expectedFrom: string,
  expectedTo: string,
  expectedAmount: bigint
): { isValid: boolean; error?: string } {
  if (actualFrom.toLowerCase() !== expectedFrom.toLowerCase()) {
    return { isValid: false, error: `From address mismatch: expected ${expectedFrom}, got ${actualFrom}` };
  }
  if (actualTo.toLowerCase() !== expectedTo.toLowerCase()) {
    return { isValid: false, error: `To address mismatch: expected ${expectedTo}, got ${actualTo}` };
  }
  if (actualValue < expectedAmount) {
    return { isValid: false, error: `Amount mismatch: expected ${expectedAmount}, got ${actualValue}` };
  }
  return { isValid: true };
}
