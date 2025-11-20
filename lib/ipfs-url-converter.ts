/**
 * Converts old IPFS URLs to Cloudflare gateway with .mp4 extension
 *
 * Handles:
 * - ipfs.io URLs
 * - ipfs.filebase.io URLs
 * - Any IPFS gateway URL
 *
 * Converts to: cloudflare-ipfs.com with ?filename=card.mp4
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

  // Convert to Cloudflare IPFS gateway with .mp4 extension
  return `https://cloudflare-ipfs.com/ipfs/${cid}?filename=card.mp4`;
}
