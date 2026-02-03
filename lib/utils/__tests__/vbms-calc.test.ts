import { describe, it, expect } from 'vitest';
import {
  VBMS_ENTRY_FEE,
  VBMS_PVP_WIN_REWARD,
  VBMS_PVP_LOSS_PENALTY,
  calculateVBMSPvPReward,
  calculateNewInbox,
  canAffordEntry,
  deductEntryFee,
  lifetimeEarnedIncrement,
} from '../vbms-calc';

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════
describe('VBMS constants', () => {
  it('entry fee is positive', () => {
    expect(VBMS_ENTRY_FEE).toBeGreaterThan(0);
  });

  it('win reward is positive', () => {
    expect(VBMS_PVP_WIN_REWARD).toBeGreaterThan(0);
  });

  it('loss penalty is negative', () => {
    expect(VBMS_PVP_LOSS_PENALTY).toBeLessThan(0);
  });

  it('win reward > entry fee (player profits on win)', () => {
    expect(VBMS_PVP_WIN_REWARD).toBeGreaterThan(VBMS_ENTRY_FEE);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateVBMSPvPReward
// ═══════════════════════════════════════════════════════════════
describe('calculateVBMSPvPReward', () => {
  it('winner gets reward + entry fee back', () => {
    expect(calculateVBMSPvPReward(true)).toBe(VBMS_PVP_WIN_REWARD + VBMS_ENTRY_FEE);
    // 100 + 20 = 120
    expect(calculateVBMSPvPReward(true)).toBe(120);
  });

  it('loser gets penalty (negative)', () => {
    expect(calculateVBMSPvPReward(false)).toBe(VBMS_PVP_LOSS_PENALTY);
    expect(calculateVBMSPvPReward(false)).toBe(-20);
  });

  it('net difference between win and loss', () => {
    const winReward = calculateVBMSPvPReward(true);
    const lossReward = calculateVBMSPvPReward(false);
    // 120 - (-20) = 140 total swing
    expect(winReward - lossReward).toBe(140);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateNewInbox
// ═══════════════════════════════════════════════════════════════
describe('calculateNewInbox', () => {
  it('increases inbox on win', () => {
    expect(calculateNewInbox(100, true)).toBe(100 + 120);
  });

  it('decreases inbox on loss', () => {
    expect(calculateNewInbox(100, false)).toBe(100 - 20);
  });

  it('can go negative (server handles clamping)', () => {
    expect(calculateNewInbox(0, false)).toBe(-20);
  });

  it('works with zero inbox on win', () => {
    expect(calculateNewInbox(0, true)).toBe(120);
  });
});

// ═══════════════════════════════════════════════════════════════
// canAffordEntry
// ═══════════════════════════════════════════════════════════════
describe('canAffordEntry', () => {
  it('returns true when inbox >= entry fee', () => {
    expect(canAffordEntry(20)).toBe(true);
    expect(canAffordEntry(100)).toBe(true);
    expect(canAffordEntry(1000)).toBe(true);
  });

  it('returns true at exact entry fee', () => {
    expect(canAffordEntry(VBMS_ENTRY_FEE)).toBe(true);
  });

  it('returns false when inbox < entry fee', () => {
    expect(canAffordEntry(19)).toBe(false);
    expect(canAffordEntry(0)).toBe(false);
  });

  it('returns false for negative inbox', () => {
    expect(canAffordEntry(-10)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// deductEntryFee
// ═══════════════════════════════════════════════════════════════
describe('deductEntryFee', () => {
  it('deducts entry fee from inbox', () => {
    expect(deductEntryFee(100)).toBe(80);
  });

  it('deducts exact fee amount', () => {
    expect(deductEntryFee(20)).toBe(0);
  });

  it('can go negative', () => {
    expect(deductEntryFee(10)).toBe(-10);
  });
});

// ═══════════════════════════════════════════════════════════════
// lifetimeEarnedIncrement
// ═══════════════════════════════════════════════════════════════
describe('lifetimeEarnedIncrement', () => {
  it('returns reward amount on win', () => {
    expect(lifetimeEarnedIncrement(true)).toBe(120);
  });

  it('returns 0 on loss (losses are not counted as earned)', () => {
    expect(lifetimeEarnedIncrement(false)).toBe(0);
  });
});
