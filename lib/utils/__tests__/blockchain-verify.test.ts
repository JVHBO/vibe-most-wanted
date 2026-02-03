import { describe, it, expect } from 'vitest';
import {
  isValidTxHash,
  isFreeOperationHash,
  parseTransferLog,
  findMatchingVBMSTransfer,
  validateNativeTransfer,
  CONTRACTS,
  TRANSFER_TOPIC,
  type TransferLog,
} from '../blockchain-verify';

// ═══════════════════════════════════════════════════════════════
// isValidTxHash
// ═══════════════════════════════════════════════════════════════
describe('isValidTxHash', () => {
  it('accepts valid 0x + 64 hex chars', () => {
    const hash = '0x' + 'a'.repeat(64);
    expect(isValidTxHash(hash)).toBe(true);
  });

  it('accepts mixed case hex', () => {
    const hash = '0xAbCdEf0123456789AbCdEf0123456789AbCdEf0123456789AbCdEf0123456789';
    expect(isValidTxHash(hash)).toBe(true);
  });

  it('rejects without 0x prefix', () => {
    expect(isValidTxHash('a'.repeat(64))).toBe(false);
  });

  it('rejects too short hash', () => {
    expect(isValidTxHash('0x' + 'a'.repeat(63))).toBe(false);
  });

  it('rejects too long hash', () => {
    expect(isValidTxHash('0x' + 'a'.repeat(65))).toBe(false);
  });

  it('rejects non-hex characters', () => {
    expect(isValidTxHash('0x' + 'g'.repeat(64))).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidTxHash('')).toBe(false);
  });

  it('rejects just 0x', () => {
    expect(isValidTxHash('0x')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// isFreeOperationHash
// ═══════════════════════════════════════════════════════════════
describe('isFreeOperationHash', () => {
  it('returns true for zero hash', () => {
    expect(isFreeOperationHash('0x' + '0'.repeat(64))).toBe(true);
  });

  it('returns false for non-zero hash', () => {
    expect(isFreeOperationHash('0x' + '0'.repeat(63) + '1')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isFreeOperationHash('')).toBe(false);
  });

  it('returns false for random valid hash', () => {
    expect(isFreeOperationHash('0x' + 'a'.repeat(64))).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// parseTransferLog
// ═══════════════════════════════════════════════════════════════
describe('parseTransferLog', () => {
  const fromAddr = '0x1234567890abcdef1234567890abcdef12345678';
  const toAddr = '0xabcdef1234567890abcdef1234567890abcdef12';
  const fromTopic = '0x000000000000000000000000' + fromAddr.slice(2);
  const toTopic = '0x000000000000000000000000' + toAddr.slice(2);

  it('parses valid Transfer event log', () => {
    const log: TransferLog = {
      address: CONTRACTS.VBMSToken,
      topics: [TRANSFER_TOPIC, fromTopic, toTopic],
      data: '0x' + BigInt(1000000).toString(16).padStart(64, '0'),
    };
    const parsed = parseTransferLog(log);
    expect(parsed).not.toBeNull();
    expect(parsed!.from).toBe(fromAddr);
    expect(parsed!.to).toBe(toAddr);
    expect(parsed!.amount).toBe(1000000n);
    expect(parsed!.tokenAddress).toBe(CONTRACTS.VBMSToken.toLowerCase());
  });

  it('returns null for non-Transfer event', () => {
    const log: TransferLog = {
      address: CONTRACTS.VBMSToken,
      topics: ['0x' + 'f'.repeat(64), fromTopic, toTopic],
      data: '0x01',
    };
    expect(parseTransferLog(log)).toBeNull();
  });

  it('returns null for missing topics', () => {
    const log: TransferLog = {
      address: CONTRACTS.VBMSToken,
      topics: [TRANSFER_TOPIC],
      data: '0x01',
    };
    expect(parseTransferLog(log)).toBeNull();
  });

  it('returns null for empty topics', () => {
    const log: TransferLog = {
      address: CONTRACTS.VBMSToken,
      topics: [],
      data: '0x01',
    };
    expect(parseTransferLog(log)).toBeNull();
  });

  it('lowercases addresses', () => {
    const upperFromTopic = '0x000000000000000000000000' + 'ABCDEF1234567890ABCDEF1234567890ABCDEF12';
    const log: TransferLog = {
      address: '0xB03439567CD22F278B21E1FFCDFB8E1696763827',
      topics: [TRANSFER_TOPIC, upperFromTopic, toTopic],
      data: '0x01',
    };
    const parsed = parseTransferLog(log);
    expect(parsed!.from).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
    expect(parsed!.tokenAddress).toBe('0xb03439567cd22f278b21e1ffcdfb8e1696763827');
  });
});

// ═══════════════════════════════════════════════════════════════
// findMatchingVBMSTransfer
// ═══════════════════════════════════════════════════════════════
describe('findMatchingVBMSTransfer', () => {
  const fromAddr = '0x1234567890abcdef1234567890abcdef12345678';
  const toAddr = CONTRACTS.VBMSPoolTroll.toLowerCase();
  const fromTopic = '0x000000000000000000000000' + fromAddr.slice(2);
  const toTopic = '0x000000000000000000000000' + toAddr.slice(2);
  const amount = 1000000n;
  const amountHex = '0x' + amount.toString(16).padStart(64, '0');

  function makeTransferLog(overrides: Partial<TransferLog> = {}): TransferLog {
    return {
      address: CONTRACTS.VBMSToken,
      topics: [TRANSFER_TOPIC, fromTopic, toTopic],
      data: amountHex,
      ...overrides,
    };
  }

  it('finds matching transfer', () => {
    const logs = [makeTransferLog()];
    const result = findMatchingVBMSTransfer(logs, fromAddr, toAddr, amount);
    expect(result).not.toBeNull();
    expect(result!.from).toBe(fromAddr);
    expect(result!.to).toBe(toAddr);
    expect(result!.amount).toBe(amount);
  });

  it('returns null when no logs', () => {
    expect(findMatchingVBMSTransfer([], fromAddr, toAddr, amount)).toBeNull();
  });

  it('skips non-VBMS token logs', () => {
    const logs = [makeTransferLog({ address: '0x' + '1'.repeat(40) })];
    expect(findMatchingVBMSTransfer(logs, fromAddr, toAddr, amount)).toBeNull();
  });

  it('skips mismatched from address', () => {
    const wrongFromTopic = '0x000000000000000000000000' + '9'.repeat(40);
    const logs = [makeTransferLog({ topics: [TRANSFER_TOPIC, wrongFromTopic, toTopic] })];
    expect(findMatchingVBMSTransfer(logs, fromAddr, toAddr, amount)).toBeNull();
  });

  it('skips mismatched to address', () => {
    const wrongToTopic = '0x000000000000000000000000' + '9'.repeat(40);
    const logs = [makeTransferLog({ topics: [TRANSFER_TOPIC, fromTopic, wrongToTopic] })];
    expect(findMatchingVBMSTransfer(logs, fromAddr, toAddr, amount)).toBeNull();
  });

  it('skips when amount is too low', () => {
    const lowAmount = '0x' + (100n).toString(16).padStart(64, '0');
    const logs = [makeTransferLog({ data: lowAmount })];
    expect(findMatchingVBMSTransfer(logs, fromAddr, toAddr, amount)).toBeNull();
  });

  it('accepts amount greater than expected', () => {
    const bigAmount = '0x' + (amount * 2n).toString(16).padStart(64, '0');
    const logs = [makeTransferLog({ data: bigAmount })];
    const result = findMatchingVBMSTransfer(logs, fromAddr, toAddr, amount);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(amount * 2n);
  });

  it('finds matching log among multiple', () => {
    const wrongLog = makeTransferLog({ address: '0x' + '1'.repeat(40) });
    const correctLog = makeTransferLog();
    const logs = [wrongLog, correctLog];
    const result = findMatchingVBMSTransfer(logs, fromAddr, toAddr, amount);
    expect(result).not.toBeNull();
  });

  it('is case-insensitive for addresses', () => {
    const result = findMatchingVBMSTransfer(
      [makeTransferLog()],
      fromAddr.toUpperCase(),
      toAddr.toUpperCase(),
      amount
    );
    expect(result).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// validateNativeTransfer
// ═══════════════════════════════════════════════════════════════
describe('validateNativeTransfer', () => {
  const from = '0xaaaa';
  const to = '0xbbbb';
  const amount = 1000n;

  it('valid when all match', () => {
    const result = validateNativeTransfer(from, to, amount, from, to, amount);
    expect(result.isValid).toBe(true);
  });

  it('valid when actual amount exceeds expected', () => {
    const result = validateNativeTransfer(from, to, 2000n, from, to, amount);
    expect(result.isValid).toBe(true);
  });

  it('invalid on from mismatch', () => {
    const result = validateNativeTransfer('0xcccc', to, amount, from, to, amount);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('From address mismatch');
  });

  it('invalid on to mismatch', () => {
    const result = validateNativeTransfer(from, '0xcccc', amount, from, to, amount);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('To address mismatch');
  });

  it('invalid when amount too low', () => {
    const result = validateNativeTransfer(from, to, 500n, from, to, amount);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Amount mismatch');
  });

  it('is case-insensitive', () => {
    const result = validateNativeTransfer(
      '0xAAAA', '0xBBBB', amount,
      '0xaaaa', '0xbbbb', amount
    );
    expect(result.isValid).toBe(true);
  });
});
