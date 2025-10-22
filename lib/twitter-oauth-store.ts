// Temporary in-memory store for OAuth state
// In production, use Redis or a database
interface OAuthState {
  codeVerifier: string;
  address: string;
  timestamp: number;
}

const store = new Map<string, OAuthState>();

// Clean up expired entries (older than 10 minutes)
const EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes

function cleanup() {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (now - value.timestamp > EXPIRY_TIME) {
      store.delete(key);
    }
  }
}

// Run cleanup every minute
setInterval(cleanup, 60 * 1000);

export const TwitterOAuthStore = {
  set(key: string, codeVerifier: string, address: string) {
    store.set(key, {
      codeVerifier,
      address,
      timestamp: Date.now(),
    });
  },

  get(key: string): OAuthState | undefined {
    const value = store.get(key);
    if (!value) return undefined;

    // Check if expired
    if (Date.now() - value.timestamp > EXPIRY_TIME) {
      store.delete(key);
      return undefined;
    }

    return value;
  },

  delete(key: string) {
    store.delete(key);
  },
};
