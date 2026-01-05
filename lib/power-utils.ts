/**
 * 🚀 POWER UTILS - Centralized power calculation with collection multipliers
 *
 * Collection Power Multipliers:
 * - VibeFID: 5x (general battles), 10x (leaderboard attacks)
 * - VBMS (vibe): 2x
 * - Nothing: 0.5x (50% weaker - non-NFT cards)
 * - All other collections: 1x
 */

/**
 * Get the power multiplier for a collection
 * @param collection - The collection name ('vibefid', 'vibe', etc.)
 * @param isLeaderboardAttack - If true, VibeFID gets 10x instead of 5x
 */
export function getCollectionMultiplier(collection: string | undefined, isLeaderboardAttack = false): number {
  if (collection === 'vibefid') return isLeaderboardAttack ? 10 : 5;
  if (collection === 'vibe') return 2;
  if (collection === 'nothing') return 0.5;
  return 1;
}

/**
 * Calculate the display power of a card with collection multiplier
 * @param card - Card object with power and collection properties
 * @param isLeaderboardAttack - If true, VibeFID gets 10x instead of 5x
 */
export function getCardDisplayPower(
  card: { power?: number; collection?: string } | null | undefined,
  isLeaderboardAttack = false
): number {
  if (!card) return 0;
  const base = card.power || 0;
  const multiplier = getCollectionMultiplier(card.collection, isLeaderboardAttack);
  return Math.floor(base * multiplier);
}

/**
 * Calculate the total power of an array of cards with collection multipliers
 * @param cards - Array of card objects
 * @param isLeaderboardAttack - If true, VibeFID gets 10x instead of 5x
 */
export function calculateTotalPower(
  cards: Array<{ power?: number; collection?: string }>,
  isLeaderboardAttack = false
): number {
  return cards.reduce((sum, card) => {
    return sum + getCardDisplayPower(card, isLeaderboardAttack);
  }, 0);
}

/**
 * Format power value for display
 * @param power - The power value
 * @param includeMultiplierBadge - Whether to include "(2x)" badge for VBMS cards
 */
export function formatPower(power: number): string {
  return Math.round(power).toLocaleString();
}

/**
 * Get power display string with collection indicator
 * @param card - Card object
 * @param isLeaderboardAttack - If true, VibeFID gets 10x instead of 5x
 */
export function getPowerWithBadge(
  card: { power?: number; collection?: string } | null | undefined,
  isLeaderboardAttack = false
): { power: number; badge: string | null } {
  if (!card) return { power: 0, badge: null };

  const displayPower = getCardDisplayPower(card, isLeaderboardAttack);

  let badge: string | null = null;
  if (card.collection === 'vibefid') {
    badge = isLeaderboardAttack ? '(10x)' : '(5x)';
  } else if (card.collection === 'vibe') {
    badge = '(2x)';
  }

  return { power: displayPower, badge };
}
