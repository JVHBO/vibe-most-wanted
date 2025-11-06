/**
 * Avatar Utility Functions
 *
 * Generate avatar URLs for users
 */

/**
 * Get DiceBear avatar URL for a username
 *
 * Uses the avataaars style from DiceBear API v7.x
 *
 * @param username - Username to generate avatar for
 * @param style - Avatar style (default: 'avataaars')
 * @returns Avatar URL
 *
 * @example
 * getAvatarUrl('john') // "https://api.dicebear.com/7.x/avataaars/svg?seed=john"
 */
export function getAvatarUrl(
  username: string,
  style: 'avataaars' | 'identicon' | 'bottts' | 'pixel-art' = 'avataaars'
): string {
  // URL-encode the username to handle special characters
  const seed = encodeURIComponent(username);
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
}

/**
 * Get avatar URL with custom options
 *
 * @param username - Username to generate avatar for
 * @param options - Custom DiceBear options
 * @returns Avatar URL with custom params
 *
 * @example
 * getAvatarUrlWithOptions('john', { backgroundColor: '0000ff', radius: 50 })
 */
export function getAvatarUrlWithOptions(
  username: string,
  options?: {
    backgroundColor?: string;
    radius?: number;
    size?: number;
    style?: string;
  }
): string {
  const seed = encodeURIComponent(username);
  const style = options?.style || 'avataaars';

  let url = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;

  if (options?.backgroundColor) {
    url += `&backgroundColor=${options.backgroundColor}`;
  }

  if (options?.radius !== undefined) {
    url += `&radius=${options.radius}`;
  }

  if (options?.size) {
    url += `&size=${options.size}`;
  }

  return url;
}

/**
 * Get Gravatar URL from email
 *
 * @param email - Email address
 * @param size - Image size in pixels (default: 200)
 * @returns Gravatar URL
 *
 * @example
 * getGravatarUrl('user@example.com') // "https://www.gravatar.com/avatar/..."
 */
export function getGravatarUrl(email: string, size: number = 200): string {
  // Simple MD5-like hash (for Gravatar)
  // In production, use a proper MD5 library
  const hash = email.toLowerCase().trim();
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
}
