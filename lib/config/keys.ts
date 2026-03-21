/**
 * Centralized API key access.
 * All keys MUST come from environment variables — no hardcoded fallbacks.
 * Set these in .env.local (dev) or Vercel dashboard (prod).
 */

export const WIELD_API_KEY = process.env.WIELD_API_KEY ?? '';
export const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';
export const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY ?? '';
export const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY ?? '';

/** Throws at request time so build doesn't fail, but bad requests get caught early. */
export function requireKey(key: string, name: string): string {
  if (!key) throw new Error(`Missing env var: ${name}`);
  return key;
}
