/**
 * Converts old IPFS URLs to standard ipfs.io gateway
 *
 * Handles:
 * - ipfs.io URLs (returns as-is)
 * - cloudflare-ipfs.com URLs
 * - ipfs.filebase.io URLs
 * - Any IPFS gateway URL
 *
 * Converts to: ipfs.io/ipfs/{cid}
 *
 * Note: No extension needed - CardMedia auto-detects IPFS URLs as video
 */
export function convertIpfsUrl(url: string | undefined): string | undefined {
  if (!url) return url;

  // Extract CID from various IPFS URL formats
  const ipfsMatch = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);

  if (!ipfsMatch) {
    // Not an IPFS URL, return as-is
    return url;
  }

  const cid = ipfsMatch[1];

  // Convert to standard ipfs.io gateway (no extension needed)
  return `https://ipfs.io/ipfs/${cid}`;
}
