/**
 * Address Utility Functions
 *
 * Common address manipulation functions to avoid code duplication
 */

/**
 * Normalize an Ethereum address to lowercase
 *
 * @param address - Ethereum address (0x...)
 * @returns Normalized lowercase address
 * @throws Error if address format is invalid
 */
export function normalizeAddress(address: string): string {
  if (!address) {
    throw new Error('Address is required');
  }

  if (!address.startsWith('0x')) {
    throw new Error('Invalid address format: must start with 0x');
  }

  if (address.length !== 42) {
    throw new Error(`Invalid address length: expected 42, got ${address.length}`);
  }

  return address.toLowerCase();
}

/**
 * Check if two addresses are equal (case-insensitive)
 *
 * @param address1 - First address
 * @param address2 - Second address
 * @returns True if addresses match
 */
export function addressesEqual(address1: string, address2: string): boolean {
  try {
    return normalizeAddress(address1) === normalizeAddress(address2);
  } catch {
    return false;
  }
}

/**
 * Shorten an address for display (0x1234...5678)
 *
 * @param address - Full address
 * @param startChars - Number of chars to show at start (default: 6)
 * @param endChars - Number of chars to show at end (default: 4)
 * @returns Shortened address
 */
export function shortenAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (!address || address.length < startChars + endChars) {
    return address;
  }

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Validate Ethereum address format
 *
 * @param address - Address to validate
 * @returns True if valid format
 */
export function isValidAddress(address: string): boolean {
  if (!address) return false;
  if (!address.startsWith('0x')) return false;
  if (address.length !== 42) return false;

  // Check if contains only hex characters
  const hexRegex = /^0x[a-fA-F0-9]{40}$/;
  return hexRegex.test(address);
}
