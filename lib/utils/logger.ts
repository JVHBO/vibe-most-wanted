/**
 * Development Logger Utility
 *
 * Provides logging functions that only output in development mode.
 * In production, all logs are silenced for performance and security.
 */

/**
 * Log messages only in development mode
 * Replaces: console.log()
 */
export const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

/**
 * Log errors only in development mode
 * Replaces: console.error()
 */
export const devError = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(...args);
  }
};

/**
 * Log warnings only in development mode
 * Replaces: console.warn()
 */
export const devWarn = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(...args);
  }
};

/**
 * Always log (even in production)
 * Use sparingly for critical errors only
 */
export const productionLog = (...args: any[]) => {
  console.log(...args);
};

/**
 * Always log errors (even in production)
 * Use for critical errors that need to be tracked
 */
export const productionError = (...args: any[]) => {
  console.error(...args);
};
