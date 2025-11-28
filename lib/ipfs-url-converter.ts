/**
 * Converts old IPFS URLs to Filebase IPFS gateway (faster and more reliable)
 *
 * Handles:
 * - ipfs.io URLs
 * - cloudflare-ipfs.com URLs
 * - ipfs.filebase.io URLs (returns as-is)
 * - Any IPFS gateway URL
 *
 * Converts to: ipfs.filebase.io/ipfs/{cid}
 *
 * Note: No extension needed - CardMedia auto-detects IPFS URLs as video
 */
export function convertIpfsUrl(url: string | undefined): string | undefined {
  // Handle empty, undefined, or invalid URLs
  if (!url || url === 'undefined' || url === 'null' || url.trim() === '') {
    console.warn('Invalid IPFS URL:', url);
    return undefined;
  }

  // Already using Filebase gateway - return as-is
  if (url.includes('ipfs.filebase.io')) {
    return url;
  }

  // Extract CID from various IPFS URL formats
  const ipfsMatch = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);

  if (!ipfsMatch) {
    // Not an IPFS URL, return as-is
    return url;
  }

  const cid = ipfsMatch[1];

  // Convert to Filebase IPFS gateway (faster and more reliable)
  const convertedUrl = `https://ipfs.filebase.io/ipfs/${cid}`;
  return convertedUrl;
}
