/**
 * 🔒 CSRF Protection
 *
 * Generates and validates CSRF tokens for state-changing requests
 */
import { cookies } from "next/headers";
import crypto from "crypto";

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_SECRET = process.env.CSRF_SECRET || "default-csrf-secret-change-me";

/**
 * Generate a new CSRF token
 */
export function generateCsrfToken(): string {
  const token = crypto.randomBytes(32).toString("hex");
  const timestamp = Date.now().toString(36);
  const signature = crypto
    .createHmac("sha256", CSRF_SECRET)
    .update(token + timestamp)
    .digest("hex")
    .slice(0, 16);

  return `${token}.${timestamp}.${signature}`;
}

/**
 * Validate a CSRF token
 */
export function validateCsrfToken(token: string): boolean {
  if (!token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [tokenPart, timestamp, signature] = parts;

  // Check signature
  const expectedSignature = crypto
    .createHmac("sha256", CSRF_SECRET)
    .update(tokenPart + timestamp)
    .digest("hex")
    .slice(0, 16);

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return false;
  }

  // Check token age (max 1 hour)
  const tokenTime = parseInt(timestamp, 36);
  const maxAge = 60 * 60 * 1000; // 1 hour
  if (Date.now() - tokenTime > maxAge) {
    return false;
  }

  return true;
}

/**
 * Set CSRF cookie and return token for client
 */
export async function setCsrfCookie(): Promise<string> {
  const token = generateCsrfToken();
  const cookieStore = await cookies();

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60, // 1 hour
    path: "/",
  });

  return token;
}

/**
 * Verify CSRF token from request
 * Compares header token with cookie token
 */
export async function verifyCsrfToken(request: Request): Promise<boolean> {
  try {
    const headerToken = request.headers.get(CSRF_HEADER_NAME);
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

    // Both must exist
    if (!headerToken || !cookieToken) {
      return false;
    }

    // Both must be valid
    if (!validateCsrfToken(headerToken) || !validateCsrfToken(cookieToken)) {
      return false;
    }

    // Tokens must match (timing-safe comparison)
    if (headerToken.length !== cookieToken.length) {
      return false;
    }

    return crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken));
  } catch {
    return false;
  }
}

/**
 * CSRF middleware helper
 * Returns Response if CSRF validation fails, null if valid
 *
 * Note: Only use for traditional form submissions.
 * For API calls from your own frontend, origin checking is often sufficient.
 */
export async function csrfMiddleware(request: Request): Promise<Response | null> {
  // Skip for safe methods
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return null;
  }

  // Check origin header for same-origin requests
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      // Allow same origin
      if (originUrl.host === host) {
        return null;
      }
      // Allow localhost in development
      if (process.env.NODE_ENV !== "production" && originUrl.hostname === "localhost") {
        return null;
      }
    } catch {
      // Invalid origin URL
    }
  }

  // For cross-origin or no-origin requests, verify CSRF token
  const isValid = await verifyCsrfToken(request);

  if (!isValid) {
    return new Response(
      JSON.stringify({ error: "CSRF validation failed" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return null;
}

/**
 * Get CSRF token for client-side use
 * Call this from a GET endpoint to get a token for forms
 */
export async function getCsrfTokenForClient(): Promise<{ token: string }> {
  const token = await setCsrfCookie();
  return { token };
}
