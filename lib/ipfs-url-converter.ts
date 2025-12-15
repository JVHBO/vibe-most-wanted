/**
 * IPFS URL converter - returns URL as-is (no gateway conversion)
 */
export function convertIpfsUrl(url: string | undefined): string | undefined {
  if (!url || url === "undefined" || url === "null" || url.trim() === "") {
    return undefined;
  }
  return url;
}
