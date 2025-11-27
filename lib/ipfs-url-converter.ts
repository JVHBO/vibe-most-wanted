/**
 * Converts old IPFS URLs to Cloudflare IPFS gateway (faster and more reliable)
 *
 * Handles:
 * - ipfs.io URLs
 * - cloudflare-ipfs.com URLs (returns as-is)
 * - ipfs.filebase.io URLs
 * - Any IPFS gateway URL
 *
 * Converts to: cloudflare-ipfs.com/ipfs/{cid}
 *
 * Note: No extension needed - CardMedia auto-detects IPFS URLs as video
 */
export function convertIpfsUrl(url: string | undefined): string | undefined {
  // Handle empty, undefined, or invalid URLs
  if (!url || url === 'undefined' || url === 'null' || url.trim() === '') {
    console.warn('Invalid IPFS URL:', url);
    return undefined;
  }

  // Already using Cloudflare gateway - return as-is
  if (url.includes('cloudflare-ipfs.com')) {
    return url;
  }

  // Extract CID from various IPFS URL formats
  const ipfsMatch = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);

  if (!ipfsMatch) {
    // Not an IPFS URL, return as-is
    return url;
  }

  const cid = ipfsMatch[1];

  // Convert to Cloudflare IPFS gateway (faster and more reliable than ipfs.io)
  const convertedUrl = `https://cloudflare-ipfs.com/ipfs/${cid}`;
  return convertedUrl;
}
