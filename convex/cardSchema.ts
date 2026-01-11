/**
 * 🔒 SECURITY: Strict card schema validators
 *
 * Replaces v.any() with typed validators to prevent injection attacks
 */
import { v } from "convex/values";

/**
 * Card validator for game mutations
 * Validates that cards have proper structure
 */
export const cardValidator = v.object({
  // Required fields
  tokenId: v.string(),
  name: v.string(),
  power: v.number(),
  rarity: v.union(
    v.literal("Common"),
    v.literal("Rare"),
    v.literal("Epic"),
    v.literal("Legendary"),
    v.literal("Mythic"),
    v.literal("common"),
    v.literal("rare"),
    v.literal("epic"),
    v.literal("legendary"),
    v.literal("mythic")
  ),

  // Optional visual fields
  imageUrl: v.optional(v.string()),
  collection: v.optional(v.string()),
  foil: v.optional(v.string()),
  wear: v.optional(v.string()),

  // Optional game fields
  equipped: v.optional(v.boolean()),
  contractAddress: v.optional(v.string()),
  address: v.optional(v.string()),

  // VibeFID specific
  fid: v.optional(v.number()),
  username: v.optional(v.string()),
  displayName: v.optional(v.string()),
  pfpUrl: v.optional(v.string()),
  neynarScore: v.optional(v.number()),

  // Playing card properties
  suit: v.optional(v.string()),
  rank: v.optional(v.string()),
  suitSymbol: v.optional(v.string()),
  color: v.optional(v.string()),

  // Additional metadata (for NFT attributes)
  attributes: v.optional(v.array(v.object({
    trait_type: v.string(),
    value: v.union(v.string(), v.number()),
  }))),
});

/**
 * Simplified card validator for decks/arrays
 */
export const deckCardValidator = v.object({
  tokenId: v.string(),
  power: v.number(),
  name: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  collection: v.optional(v.string()),
  rarity: v.optional(v.string()),
  foil: v.optional(v.string()),
  wear: v.optional(v.string()),
  fid: v.optional(v.number()),
  username: v.optional(v.string()),
  displayName: v.optional(v.string()),
  pfpUrl: v.optional(v.string()),
  suit: v.optional(v.string()),
  rank: v.optional(v.string()),
  suitSymbol: v.optional(v.string()),
  color: v.optional(v.string()),
  contractAddress: v.optional(v.string()),
});

/**
 * Wager card validator for poker battles
 */
export const wagerCardValidator = v.object({
  tokenId: v.string(),
  power: v.number(),
  name: v.string(),
  imageUrl: v.optional(v.string()),
  collection: v.optional(v.string()),
  rarity: v.optional(v.string()),
  contractAddress: v.optional(v.string()),
});

/**
 * Validates a card has minimum required power
 */
export function validateCardPower(card: { power: number }, minPower: number = 0, maxPower: number = 100000): boolean {
  return card.power >= minPower && card.power <= maxPower;
}

/**
 * Validates deck has correct number of cards
 */
export function validateDeckSize(deck: unknown[], expectedSize: number = 10): boolean {
  return Array.isArray(deck) && deck.length === expectedSize;
}

/**
 * Sanitize card data to prevent XSS/injection
 */
export function sanitizeCard<T extends Record<string, unknown>>(card: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(card)) {
    if (typeof value === 'string') {
      // Remove any HTML/script tags
      sanitized[key] = value.replace(/<[^>]*>/g, '').slice(0, 1000);
    } else if (typeof value === 'number') {
      // Clamp numbers to reasonable range
      sanitized[key] = Math.max(-1000000, Math.min(1000000, value));
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}
