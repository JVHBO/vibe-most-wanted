/**
 * Converts old IPFS URLs to standard ipfs.io gateway with .mp4 extension
 *
 * Handles:
 * - ipfs.io URLs without extension
 * - cloudflare-ipfs.com URLs
 * - ipfs.filebase.io URLs
 * - Any IPFS gateway URL
 *
 * Converts to: ipfs.io with ?filename=card.mp4
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

  // Convert to standard ipfs.io gateway with .mp4 extension
  return `https://ipfs.io/ipfs/${cid}?filename=card.mp4`;
}
