/**
 * Convex Utility Functions
 *
 * Common utilities for Convex backend functions
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
 * Get today's date in YYYY-MM-DD format
 *
 * @returns Today's date string
 */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if a timestamp is today
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns True if timestamp is today
 */
export function isToday(timestamp: number): boolean {
  const today = getTodayString();
  const date = new Date(timestamp).toISOString().split('T')[0];
  return today === date;
}

/**
 * Calculate total power from an array of NFTs
 *
 * @param nfts - Array of NFTs with power property
 * @returns Total power
 */
export function calculateTotalPower(nfts: Array<{ power?: number }>): number {
  return nfts.reduce((sum, nft) => sum + (nft.power || 0), 0);
}

/**
 * Validate that a number is within range
 *
 * @param value - Number to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param fieldName - Field name for error message
 * @throws Error if value is out of range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string = 'Value'
): void {
  if (value < min || value > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}, got ${value}`);
  }
}

/**
 * Validate that a string is not empty
 *
 * @param value - String to validate
 * @param fieldName - Field name for error message
 * @throws Error if string is empty
 */
export function validateNotEmpty(value: string, fieldName: string = 'Field'): void {
  if (!value || value.trim().length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
}
