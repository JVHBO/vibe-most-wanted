/**
 * DAILY BUFF SYSTEM
 *
 * Every day, one Mecha Arena room gets buffed odds!
 * - Rotates through all collections daily
 * - Buff gives +0.5x to all betting odds
 * - Based on UTC day to ensure consistency worldwide
 */

// All collections in the Mecha Arena (only active collections)
export const ARENA_COLLECTIONS = [
  "gmvbrs",
  "vibe",
  "viberuto",
  "meowverse",
  "vibefid",
  "viberotbangers",
] as const;

export type ArenaCollection = (typeof ARENA_COLLECTIONS)[number];

// Buff configuration
export const BUFF_CONFIG = {
  // Bonus added to odds (e.g., 1.5x becomes 2.0x)
  oddsBonus: 0.5,
  // Display name for the buff
  buffName: "Daily Boost",
  // Emoji for the buff
  buffEmoji: "🔥",
  // Badge text
  badgeText: "HOT",
};

/**
 * Get the UTC day number (days since epoch)
 * This ensures the buff is the same worldwide
 */
function getUTCDayNumber(): number {
  const now = new Date();
  const utcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  return Math.floor(utcMidnight / (1000 * 60 * 60 * 24));
}

/**
 * Get today's buffed collection
 * Rotates through collections based on UTC day
 */
export function getDailyBuffedCollection(): ArenaCollection {
  const dayNumber = getUTCDayNumber();
  const index = dayNumber % ARENA_COLLECTIONS.length;
  return ARENA_COLLECTIONS[index];
}

/**
 * Check if a specific collection is buffed today
 */
export function isCollectionBuffed(collection: string): boolean {
  return collection === getDailyBuffedCollection();
}

/**
 * Get buffed odds for a collection
 * Returns the bonus to add to base odds (0 if not buffed)
 */
export function getBuffBonus(collection: string): number {
  return isCollectionBuffed(collection) ? BUFF_CONFIG.oddsBonus : 0;
}

/**
 * Get full buff info for display
 */
export function getDailyBuffInfo() {
  const buffedCollection = getDailyBuffedCollection();
  return {
    collection: buffedCollection,
    bonus: BUFF_CONFIG.oddsBonus,
    emoji: BUFF_CONFIG.buffEmoji,
    name: BUFF_CONFIG.buffName,
    badgeText: BUFF_CONFIG.badgeText,
  };
}

/**
 * Calculate time until next buff rotation (UTC midnight)
 */
export function getTimeUntilNextBuff(): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0
    )
  );
  const diff = tomorrow.getTime() - now.getTime();

  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}
