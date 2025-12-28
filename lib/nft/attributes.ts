/**
 * NFT Attribute Utilities
 *
 * Extracted from app/page.tsx for reusability
 * These functions handle NFT metadata parsing across different formats
 */

import { VIBEFID_POWER_CONFIG } from '../collections';

/**
 * Find an attribute value from NFT metadata
 * Searches multiple possible locations for attribute data
 */
export function findAttr(nft: any, trait: string): string {
  const locs = [
    nft?.raw?.metadata?.attributes,
    nft?.metadata?.attributes,
    nft?.metadata?.traits,
    nft?.raw?.metadata?.traits
  ];

  for (const attrs of locs) {
    if (!Array.isArray(attrs)) continue;

    const found = attrs.find((a: any) => {
      const traitType = String(a?.trait_type || a?.traitType || a?.name || '').toLowerCase().trim();
      const searchTrait = trait.toLowerCase().trim();
      return traitType === searchTrait || traitType.includes(searchTrait);
    });

    if (found) {
      const value = found.value !== undefined ? found.value : found.trait_value;
      if (value !== undefined && value !== null) return String(value).trim();
    }
  }

  return '';
}

/**
 * Check if an NFT card is unrevealed/unopened
 *
 * IMPROVED: First checks for revealed attributes (Wear, Character, Power)
 * before checking Rarity, because some NFTs have Rarity="Unopened" even
 * after being revealed (contract bug).
 */
export function isUnrevealed(nft: any): boolean {
  const hasAttrs = !!(
    nft?.raw?.metadata?.attributes?.length ||
    nft?.metadata?.attributes?.length ||
    nft?.raw?.metadata?.traits?.length ||
    nft?.metadata?.traits?.length
  );

  // No attributes = unrevealed
  if (!hasAttrs) return true;

  const n = String(nft?.name || '').toLowerCase();

  // PRIORITY 1: Check if card has revealed attributes (Wear, Character, Power)
  // If it has these, it's DEFINITELY revealed regardless of rarity value
  const wear = findAttr(nft, 'wear');
  const character = findAttr(nft, 'character');
  const power = findAttr(nft, 'power');
  const foil = findAttr(nft, 'foil');

  // If card has Wear/Character/Power/Foil attributes, it's definitely revealed
  if (wear || character || power || foil) {
    return false;
  }

  // PRIORITY 2: Check if it has a REAL rarity (Common, Rare, Epic, Legendary, Mythic)
  const actualRarity = findAttr(nft, 'rarity');
  const r = (actualRarity || '').toLowerCase();

  if (r && r !== 'unopened' && (
    r.includes('common') ||
    r.includes('rare') ||
    r.includes('epic') ||
    r.includes('legendary') ||
    r.includes('mythic')
  )) {
    return false;
  }

  // PRIORITY 3: Check for explicit unopened indicators
  const s = (findAttr(nft, 'status') || '').toLowerCase();
  if (r === 'unopened' || s === 'unopened' || n === 'unopened' || n.includes('sealed pack')) {
    return true;
  }

  // PRIORITY 4: Fallback - check if has image OR rarity
  const hasImage = !!(
    nft?.image?.cachedUrl ||
    nft?.image?.originalUrl ||
    nft?.metadata?.image ||
    nft?.raw?.metadata?.image
  );
  const hasRarity = r !== '';

  return !(hasImage || hasRarity);
}

/**
 * Calculate VibeFID card power using the special VibeFID config
 * VibeFID has different base powers and multipliers than regular cards
 */
export function calcVibeFIDPower(nft: any): number {
  const foil = findAttr(nft, 'foil') || 'None';
  const rarity = findAttr(nft, 'rarity') || 'Common';
  const wear = findAttr(nft, 'wear') || 'Lightly Played';

  // Base power from VIBEFID_POWER_CONFIG
  const r = rarity.toLowerCase();
  let base = VIBEFID_POWER_CONFIG.rarityBase.common;
  if (r.includes('mythic')) base = VIBEFID_POWER_CONFIG.rarityBase.mythic;
  else if (r.includes('legend')) base = VIBEFID_POWER_CONFIG.rarityBase.legendary;
  else if (r.includes('epic')) base = VIBEFID_POWER_CONFIG.rarityBase.epic;
  else if (r.includes('rare')) base = VIBEFID_POWER_CONFIG.rarityBase.rare;

  // Wear multiplier from VIBEFID_POWER_CONFIG
  let wearMult = VIBEFID_POWER_CONFIG.wearMultiplier.default;
  const w = wear.toLowerCase();
  if (w.includes('pristine')) wearMult = VIBEFID_POWER_CONFIG.wearMultiplier.pristine;
  else if (w.includes('mint')) wearMult = VIBEFID_POWER_CONFIG.wearMultiplier.mint;

  // Foil multiplier from VIBEFID_POWER_CONFIG
  let foilMult = VIBEFID_POWER_CONFIG.foilMultiplier.none;
  const f = foil.toLowerCase();
  if (f.includes('prize')) foilMult = VIBEFID_POWER_CONFIG.foilMultiplier.prize;
  else if (f.includes('standard')) foilMult = VIBEFID_POWER_CONFIG.foilMultiplier.standard;

  const power = base * wearMult * foilMult;
  return Math.max(1, Math.round(power));
}

/**
 * Calculate card power based on rarity, wear, and foil
 *
 * Power formula:
 * - Base power from rarity (Mythic: 800, Legendary: 240, Epic: 80, Rare: 20, Common: 5)
 * - Wear multiplier (Pristine: ×1.8, Mint: ×1.4, Others: ×1.0)
 * - Foil multiplier (Prize: ×15, Standard: ×2.5, None: ×1.0)
 *
 * Final power = Base × Wear × Foil (min 1)
 *
 * @param nft - NFT metadata object
 * @param isVibeFID - If true, use VibeFID-specific power config
 */
export function calcPower(nft: any, isVibeFID: boolean = false): number {
  // VibeFID uses its own power config
  if (isVibeFID) {
    return calcVibeFIDPower(nft);
  }

  const foil = findAttr(nft, 'foil') || 'None';
  const rarity = findAttr(nft, 'rarity') || 'Common';
  const wear = findAttr(nft, 'wear') || 'Lightly Played';

  // Base power by rarity
  let base = 5;
  const r = rarity.toLowerCase();
  if (r.includes('mythic')) base = 800;
  else if (r.includes('legend')) base = 240;
  else if (r.includes('epic')) base = 80;
  else if (r.includes('rare')) base = 20;
  else if (r.includes('common')) base = 5;
  else base = 5;

  // Wear multiplier (Pristine=×1.8, Mint=×1.4, Others=×1.0)
  let wearMult = 1.0;
  const w = wear.toLowerCase();
  if (w.includes('pristine')) wearMult = 1.8;
  else if (w.includes('mint')) wearMult = 1.4;

  // Foil multiplier (Prize=×15, Standard=×2.5)
  let foilMult = 1.0;
  const f = foil.toLowerCase();
  if (f.includes('prize')) foilMult = 15.0;
  else if (f.includes('standard')) foilMult = 2.5;

  const power = base * wearMult * foilMult;
  return Math.max(1, Math.round(power));
}

/**
 * Normalize various URL formats (IPFS, HTTP → HTTPS)
 * Uses Filebase gateway for IPFS (more reliable than ipfs.io)
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';
  let u = url.trim();
  if (u.startsWith('ipfs://')) u = 'https://ipfs.filebase.io/ipfs/' + u.slice(7);
  else if (u.startsWith('ipfs/')) u = 'https://ipfs.filebase.io/ipfs/' + u.slice(5);
  u = u.replace(/^http:\/\//i, 'https://');
  return u;
}

/**
 * UNIVERSAL: Check if a card is revealed
 * Works with both:
 * - Raw NFT objects (from Alchemy API)
 * - Processed Card objects (from PlayerCardsContext)
 *
 * Use this function everywhere in the codebase for consistency!
 */
export function isCardRevealed(card: any): boolean {
  if (!card) return false;

  // Check if it's a processed Card (has rarity as direct property)
  if (typeof card.rarity === 'string') {
    const rarity = card.rarity.toLowerCase();

    // Unrevealed rarities
    if (rarity === 'unopened' || rarity === '' || rarity === 'unknown') {
      return false;
    }

    // Check for valid rarity
    const validRarities = ['common', 'rare', 'epic', 'legendary', 'mythic'];
    if (validRarities.some(r => rarity.includes(r))) {
      // Also check for valid image
      if (card.imageUrl) {
        const img = card.imageUrl.toLowerCase();
        if (img.includes('placeholder') || img.includes('unrevealed')) {
          return false;
        }
        return true;
      }
    }

    return false;
  }

  // It's a raw NFT - use the existing isUnrevealed logic (inverted)
  return !isUnrevealed(card);
}

/**
 * Filter an array of cards/NFTs to only include revealed ones
 * Works with both raw NFTs and processed Cards
 */
export function filterRevealedCards<T>(cards: T[]): T[] {
  return cards.filter(card => isCardRevealed(card));
}
