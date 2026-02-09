/**
 * Date Utility Functions
 *
 * Common date formatting and manipulation functions
 */

/**
 * Format a timestamp to localized date string
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted date string
 *
 * @example
 * formatDate(Date.now()) // "Nov 6, 2025, 7:30 PM"
 */
export function formatDate(timestamp: number, locale: string = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

/**
 * Format a timestamp to short date (no time)
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted date string
 *
 * @example
 * formatDateShort(Date.now()) // "Nov 6, 2025"
 */
export function formatDateShort(timestamp: number, locale: string = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));
}

/**
 * Format relative time (e.g., "2 hours ago")
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @param locale - Locale string (default: 'en-US')
 * @returns Relative time string
 *
 * @example
 * formatRelativeTime(Date.now() - 3600000) // "1 hour ago"
 */
export function formatRelativeTime(timestamp: number, locale: string = 'en-US'): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diff = Date.now() - timestamp;

  // Convert to appropriate unit
  const diffSeconds = Math.floor(diff / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return rtf.format(-diffSeconds, 'second');
  } else if (diffMinutes < 60) {
    return rtf.format(-diffMinutes, 'minute');
  } else if (diffHours < 24) {
    return rtf.format(-diffHours, 'hour');
  } else if (diffDays < 7) {
    return rtf.format(-diffDays, 'day');
  } else if (diffWeeks < 4) {
    return rtf.format(-diffWeeks, 'week');
  } else if (diffMonths < 12) {
    return rtf.format(-diffMonths, 'month');
  } else {
    return rtf.format(-diffYears, 'year');
  }
}

/**
 * Get today's date in YYYY-MM-DD format
 *
 * @returns Today's date string
 *
 * @example
 * getTodayString() // "2025-11-06"
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
 * Get time ago in human readable format
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Human readable time ago string
 *
 * @example
 * getTimeAgo(Date.now() - 125000) // "2 minutes ago"
 */
export function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  }

  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}
