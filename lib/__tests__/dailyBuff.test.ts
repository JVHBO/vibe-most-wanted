import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ARENA_COLLECTIONS,
  BUFF_CONFIG,
  getDailyBuffedCollection,
  isCollectionBuffed,
  getBuffBonus,
  getDailyBuffInfo,
  getTimeUntilNextBuff,
} from '../dailyBuff';

// ═══════════════════════════════════════════════════════════════
// ARENA_COLLECTIONS / BUFF_CONFIG constants
// ═══════════════════════════════════════════════════════════════
describe('constants', () => {
  it('has a non-empty list of arena collections', () => {
    expect(ARENA_COLLECTIONS.length).toBeGreaterThan(0);
  });

  it('all collections are lowercase strings', () => {
    ARENA_COLLECTIONS.forEach(c => {
      expect(c).toBe(c.toLowerCase());
    });
  });

  it('BUFF_CONFIG has positive oddsBonus', () => {
    expect(BUFF_CONFIG.oddsBonus).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// getDailyBuffedCollection
// ═══════════════════════════════════════════════════════════════
describe('getDailyBuffedCollection', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a valid arena collection', () => {
    const buffed = getDailyBuffedCollection();
    expect(ARENA_COLLECTIONS).toContain(buffed);
  });

  it('returns the same collection for the same UTC day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-03T10:00:00Z'));
    const first = getDailyBuffedCollection();
    vi.setSystemTime(new Date('2026-02-03T23:59:59Z'));
    const second = getDailyBuffedCollection();
    expect(first).toBe(second);
  });

  it('rotates to a potentially different collection the next day', () => {
    vi.useFakeTimers();
    // Use dates that are guaranteed to produce different modulo results
    // with 6 collections: day N and day N+1 differ by 1 in modulo 6
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    const day1 = getDailyBuffedCollection();
    vi.setSystemTime(new Date('2026-01-02T12:00:00Z'));
    const day2 = getDailyBuffedCollection();
    // They could theoretically be the same if wrapping, but for consecutive days
    // with 6 collections they should differ (day % 6 increments by 1)
    expect(day1 !== day2 || ARENA_COLLECTIONS.length === 1).toBe(true);
  });

  it('cycles through all collections over N days', () => {
    vi.useFakeTimers();
    const seen = new Set<string>();
    const n = ARENA_COLLECTIONS.length;
    for (let i = 0; i < n; i++) {
      const date = new Date(`2026-01-${String(i + 1).padStart(2, '0')}T12:00:00Z`);
      vi.setSystemTime(date);
      seen.add(getDailyBuffedCollection());
    }
    // Over N consecutive days, we should see all N collections
    expect(seen.size).toBe(n);
  });

  it('uses UTC, not local time (same UTC day across timezone boundary)', () => {
    vi.useFakeTimers();
    // 23:00 UTC on Feb 3 and 01:00 UTC on Feb 3 are same UTC day
    vi.setSystemTime(new Date('2026-02-03T01:00:00Z'));
    const early = getDailyBuffedCollection();
    vi.setSystemTime(new Date('2026-02-03T23:00:00Z'));
    const late = getDailyBuffedCollection();
    expect(early).toBe(late);
  });
});

// ═══════════════════════════════════════════════════════════════
// isCollectionBuffed
// ═══════════════════════════════════════════════════════════════
describe('isCollectionBuffed', () => {
  it('returns true for the buffed collection', () => {
    const buffed = getDailyBuffedCollection();
    expect(isCollectionBuffed(buffed)).toBe(true);
  });

  it('returns false for a non-buffed collection', () => {
    const buffed = getDailyBuffedCollection();
    const other = ARENA_COLLECTIONS.find(c => c !== buffed);
    if (other) {
      expect(isCollectionBuffed(other)).toBe(false);
    }
  });

  it('returns false for an unknown collection', () => {
    expect(isCollectionBuffed('nonexistent_collection')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// getBuffBonus
// ═══════════════════════════════════════════════════════════════
describe('getBuffBonus', () => {
  it('returns oddsBonus for buffed collection', () => {
    const buffed = getDailyBuffedCollection();
    expect(getBuffBonus(buffed)).toBe(BUFF_CONFIG.oddsBonus);
  });

  it('returns 0 for non-buffed collection', () => {
    const buffed = getDailyBuffedCollection();
    const other = ARENA_COLLECTIONS.find(c => c !== buffed);
    if (other) {
      expect(getBuffBonus(other)).toBe(0);
    }
  });

  it('returns 0 for unknown collection', () => {
    expect(getBuffBonus('fake')).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// getDailyBuffInfo
// ═══════════════════════════════════════════════════════════════
describe('getDailyBuffInfo', () => {
  it('returns complete buff info object', () => {
    const info = getDailyBuffInfo();
    expect(info).toHaveProperty('collection');
    expect(info).toHaveProperty('bonus');
    expect(info).toHaveProperty('emoji');
    expect(info).toHaveProperty('name');
    expect(info).toHaveProperty('badgeText');
    expect(ARENA_COLLECTIONS).toContain(info.collection);
    expect(info.bonus).toBe(BUFF_CONFIG.oddsBonus);
    expect(info.emoji).toBe(BUFF_CONFIG.buffEmoji);
    expect(info.name).toBe(BUFF_CONFIG.buffName);
    expect(info.badgeText).toBe(BUFF_CONFIG.badgeText);
  });
});

// ═══════════════════════════════════════════════════════════════
// getTimeUntilNextBuff
// ═══════════════════════════════════════════════════════════════
describe('getTimeUntilNextBuff', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns hours, minutes, seconds', () => {
    const time = getTimeUntilNextBuff();
    expect(time).toHaveProperty('hours');
    expect(time).toHaveProperty('minutes');
    expect(time).toHaveProperty('seconds');
    expect(time.hours).toBeGreaterThanOrEqual(0);
    expect(time.hours).toBeLessThanOrEqual(23);
    expect(time.minutes).toBeGreaterThanOrEqual(0);
    expect(time.minutes).toBeLessThanOrEqual(59);
    expect(time.seconds).toBeGreaterThanOrEqual(0);
    expect(time.seconds).toBeLessThanOrEqual(59);
  });

  it('returns ~24h at start of UTC day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-03T00:00:01Z'));
    const time = getTimeUntilNextBuff();
    expect(time.hours).toBe(23);
    expect(time.minutes).toBe(59);
  });

  it('returns ~1s near end of UTC day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-03T23:59:59Z'));
    const time = getTimeUntilNextBuff();
    expect(time.hours).toBe(0);
    expect(time.minutes).toBe(0);
    expect(time.seconds).toBeLessThanOrEqual(1);
  });

  it('returns ~12h at midday UTC', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-03T12:00:00Z'));
    const time = getTimeUntilNextBuff();
    expect(time.hours).toBe(12);
    expect(time.minutes).toBe(0);
    expect(time.seconds).toBe(0);
  });
});
