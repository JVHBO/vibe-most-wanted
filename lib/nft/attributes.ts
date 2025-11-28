/**
 * NFT Attribute Utilities
 *
 * Extracted from app/page.tsx for reusability
 * These functions handle NFT metadata parsing across different formats
 */

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
 */
export function isUnrevealed(nft: any): boolean {
  const hasAttrs = !!(
    nft?.raw?.metadata?.attributes?.length ||
    nft?.metadata?.attributes?.length ||
    nft?.raw?.metadata?.traits?.length ||
    nft?.metadata?.traits?.length
  );

  // Se não tem atributos, é não revelada
  if (!hasAttrs) return true;

  const r = (findAttr(nft, 'rarity') || '').toLowerCase();
  const s = (findAttr(nft, 'status') || '').toLowerCase();
  const n = String(nft?.name || '').toLowerCase();

  // Verifica se tem indicadores explícitos de não revelada
  if (r === 'unopened' || s === 'unopened' || n === 'unopened' || n.includes('sealed pack')) {
    return true;
  }

  // Se tem imagem OU tem rarity, considera revelada
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
 * Calculate card power based on rarity, wear, and foil
 *
 * Power formula:
 * - Base power from rarity (Mythic: 800, Legendary: 240, Epic: 80, Rare: 20, Common: 5)
 * - Wear multiplier (Pristine: ×1.8, Mint: ×1.4, Others: ×1.0)
 * - Foil multiplier (Prize: ×15, Standard: ×2.5, None: ×1.0)
 *
 * Final power = Base × Wear × Foil (min 1)
 */
export function calcPower(nft: any): number {
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
