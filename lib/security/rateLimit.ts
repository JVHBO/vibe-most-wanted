/**
 * 🔒 Distributed Rate Limiting with Upstash Redis
 *
 * Replaces in-memory rate limiting for scalability across instances
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis client (uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars)
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

/**
 * Standard rate limiter: 10 requests per 10 seconds
 */
export const standardRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "10 s"),
      analytics: true,
      prefix: "ratelimit:standard",
    })
  : null;

/**
 * Strict rate limiter: 5 requests per minute (for sensitive endpoints)
 */
export const strictRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
      prefix: "ratelimit:strict",
    })
  : null;

/**
 * Mint rate limiter: 1 request per 10 seconds
 */
export const mintRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, "10 s"),
      analytics: true,
      prefix: "ratelimit:mint",
    })
  : null;

/**
 * Check rate limit for an identifier (usually IP or address)
 * Returns { success: true } if allowed, { success: false, reset: timestamp } if blocked
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null = standardRateLimit
): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }> {
  // Fallback to allowing if Redis not configured
  if (!limiter) {
    console.warn("⚠️ Rate limiting disabled - UPSTASH_REDIS_REST_URL not configured");
    return { success: true };
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Allow request on error to prevent blocking legitimate users
    return { success: true };
  }
}

/**
 * Get client identifier from request (IP address)
 */
export function getClientIdentifier(request: Request): string {
  // Try various headers for real IP
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfIp = request.headers.get("cf-connecting-ip");

  // Use first IP from forwarded chain, or fallback
  const ip = forwarded?.split(",")[0]?.trim() || realIp || cfIp || "unknown";

  return ip;
}

/**
 * Rate limit middleware helper
 * Returns Response if rate limited, null if allowed
 */
export async function rateLimitMiddleware(
  request: Request,
  limiter: Ratelimit | null = standardRateLimit
): Promise<Response | null> {
  const identifier = getClientIdentifier(request);
  const result = await checkRateLimit(identifier, limiter);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        retryAfter: result.reset ? Math.ceil((result.reset - Date.now()) / 1000) : 60,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(result.reset ? Math.ceil((result.reset - Date.now()) / 1000) : 60),
          "X-RateLimit-Limit": String(result.limit || 10),
          "X-RateLimit-Remaining": String(result.remaining || 0),
        },
      }
    );
  }

  return null;
}
