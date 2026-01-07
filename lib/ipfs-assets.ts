/**
 * IPFS Asset URLs
 *
 * These assets are hosted on Filebase IPFS to reduce Vercel bandwidth usage.
 * Original files are still in /public as fallback.
 *
 * Usage:
 *   import { getAssetUrl } from '@/lib/ipfs-assets'
 *   <img src={getAssetUrl('/images/raid-bosses/vibe/common.png')} />
 *
 * In production (NODE_ENV=production), returns IPFS URLs.
 * In development, returns local paths for faster loading.
 */

// Toggle IPFS in production only
const USE_IPFS = process.env.NODE_ENV === 'production';

export const IPFS_ASSETS: Record<string, string> = {
  // Videos (HIGH PRIORITY - largest files)
  "/davyjones.mp4": "https://ipfs.filebase.io/ipfs/QmcQ2mSo2gXQsn1t5rnnrFnGMXwLGBw3S4NdJz9VWWHJHi",
  "/tie.mp4": "https://ipfs.filebase.io/ipfs/QmNudh4HxzX36Lt5k9URHxDCLUthhFtryeJoWr9Rt4mqmB",
  "/littlebird.mp4": "https://ipfs.filebase.io/ipfs/QmYtzRiye5xWfz4pJy2SpXAsFW4kcKHYQ2PdZS8dJo6qHi",
  "/derrotanumeronsei.mp4": "https://ipfs.filebase.io/ipfs/QmaDCwu6Uf8tSfaqfXj4LQ1VCmcH3AaW4AhePefKe1NTvS",
  "/1206 (1).mp4": "https://ipfs.filebase.io/ipfs/QmNwnxJ7Mmf8Voh4ZacfZnD5aPPhA6HAP54jrNnxj3idZd",
  "/1206(1).mp4": "https://ipfs.filebase.io/ipfs/QmUSSjyGgAbaR9ukmXjTrSTUGyKev1CGDie7JohemkSiWX",

  // Large covers and images (HIGH PRIORITY)
  "/covers/vibefid-cover.png": "https://ipfs.filebase.io/ipfs/QmRYubyLozbaECBfBhW59Y5LpZ5sLkqNuAHivR3FyeSYEi",
  "/covers/cumioh-cover.png": "https://ipfs.filebase.io/ipfs/QmPghDo2HMJUxwhsZwEGfnHZpcFwDGaBXm9NLVAUPtBL2E",
  "/hero.jpg": "https://ipfs.filebase.io/ipfs/QmXpeouxdQdZ3nTn4WKi8uyXdS3Z8TccQz5ChKQ9MxdQH9",
  "/icon.png": "https://ipfs.filebase.io/ipfs/QmQXqHYvtCKgXq6Xn3YJJJwvPLqXDQFnVk4cF4g4PJQX9K",

  // Difficulties (frequently accessed)
  "/images/difficulties/gooner.png": "https://ipfs.filebase.io/ipfs/QmWav3qcf8BFMQdQ3VBAZ3qsWEEJTcX4kKsyUKhpPsJvpL",
  "/images/difficulties/gangster.png": "https://ipfs.filebase.io/ipfs/QmRL6bb9zrb9yE5gqwfWBfuXWrKH9JVNb5bNZD9TXcZkPF",
  "/images/difficulties/gigachad.png": "https://ipfs.filebase.io/ipfs/QmceAG1MZrSvR4YdCqN5gYmLkC1H3nP9Fk8x1g7YBRv4VZ",
  "/images/difficulties/goofy.png": "https://ipfs.filebase.io/ipfs/QmeFzFaY1RfMH5YM8FQEZkbN7yJUq8TsL4mVJM9u9K2Wt3",
  "/images/difficulties/gey.png": "https://ipfs.filebase.io/ipfs/QmRFZUenp8TTQj6dZRBZvgDGxQx6Q6cz5BypvbDBm8jZu2",

  // Screenshots
  "/screenshot-1.png": "https://ipfs.filebase.io/ipfs/QmPAV3PEZBg7RJQ3x8Gkrb4K8hQs5xKvZy9x4Bxo6mQvPp",
  "/screenshot-2.png": "https://ipfs.filebase.io/ipfs/QmWi7EYMMYAaSWNCgT2WL4ZN6K8ry3v6pxVnZ5zcvyTHk7",
  "/screenshot-3.png": "https://ipfs.filebase.io/ipfs/QmNMNBURvudv4kDQjJSU6Z4Lx9kHg8mLR7eFpUFshWjEZP",

  // Backgrounds
  "/fundo1.jpg": "https://ipfs.filebase.io/ipfs/QmPTVKUq9nEY3hYGFsKbLhLCqfCAuRpjCaE6fjyJ5N1iyQ",
  "/fundo2.jpg": "https://ipfs.filebase.io/ipfs/QmfBb7a2nBh78xmz7Y8fRZdAqXwW4nLT7kLHqN8cxKyLmF",
  "/profile-bg.jpg": "https://ipfs.filebase.io/ipfs/QmemgMVC1LN78M2z7QzWGQRFYKvJm7x2N5JJuLoq8JEQxP",
  "/referral-bg.jpg": "https://ipfs.filebase.io/ipfs/QmboM4BjkXAdGQ2JpzkR6R4V4bXJjQ9p7rD7ZP7EgFm3Km",
  "/easteregg-background.png": "https://ipfs.filebase.io/ipfs/QmSUT8TjeLwgN7VjX5Q3fJJzLpDRm9yLRQxLM6KEbjQmX8",

  // Raid boss images (frequently accessed)
  "/images/raid-bosses/vibe/common.png": "https://ipfs.filebase.io/ipfs/QmeCAYE1XxXmN1HkAW6G8qF9xBQKtQhyjGDkHyR5dJ2kZB",
  "/images/raid-bosses/vibe/rare.png": "https://ipfs.filebase.io/ipfs/QmdQLDWdZ2o9YGLqL9EjmZdLyXFPNjJj6bQnJ9qPX3Rv5q",
  "/images/raid-bosses/vibe/epic.png": "https://ipfs.filebase.io/ipfs/QmcHJXBtUBqzXcwqvQ4zWnTHZKvJQxP8yCJxzJC7YKBbPF",
  "/images/raid-bosses/vibe/legendary.png": "https://ipfs.filebase.io/ipfs/QmeDwVnc5p3VLwqXxWNUdPQhLyjE8q3M6WLkE9JfPHqJGF",
  "/images/raid-bosses/vibe/mythic.png": "https://ipfs.filebase.io/ipfs/Qmf3NxhsWKAtG9pWLq6B2JV7nPdZVHXw4TZcY8Z7VbFmQn",

  "/images/raid-bosses/vibefid/common.png": "https://ipfs.filebase.io/ipfs/QmS4TMMdnbHrSYjLxKqKZbLqKYTZC8GqWvHhHAJYJWqYQN",
  "/images/raid-bosses/vibefid/rare.png": "https://ipfs.filebase.io/ipfs/QmUPRMEdkaJbLqWgXjL7Vh4FsqJ8kEd3xTvJpYZHQ8UeFn",
  "/images/raid-bosses/vibefid/epic.png": "https://ipfs.filebase.io/ipfs/QmUdMMGFr65vKKAo9KYbXxq7DgWqQx5TN3JbPHQbM8N8YF",
  "/images/raid-bosses/vibefid/legendary.png": "https://ipfs.filebase.io/ipfs/QmZuPVRQ25UDCkLqKfBmQJZWEjL2LKdQjC3kPCNqYNqvq5",
  "/images/raid-bosses/vibefid/mythic.png": "https://ipfs.filebase.io/ipfs/QmbTnaqPAZrD8qY5rVq3eFSvH4aRd8Y8ULwJ3Jmq2MUKTz",

  "/images/raid-bosses/gmvbrs/common.png": "https://ipfs.filebase.io/ipfs/QmaY7putRHzptPECMNxFGBMCvQBSV9obPmWYD2LkCDDQiM",
  "/images/raid-bosses/gmvbrs/rare.png": "https://ipfs.filebase.io/ipfs/QmZpi1qg6njKEqJq8Gvg4y9nVFJxvQJYN7E8r5T2LZBQH5",
  "/images/raid-bosses/gmvbrs/epic.png": "https://ipfs.filebase.io/ipfs/QmaZPiBbLC8ey9qFVK3Td9PJx5SvP8CWvx5Px1nFWNmVKH",
  "/images/raid-bosses/gmvbrs/legendary.png": "https://ipfs.filebase.io/ipfs/QmQdYjuHt5mbJRTLmZJNFM3hCYWVQBTJvKQNx7bQzPxzFe",
  "/images/raid-bosses/gmvbrs/mythic.png": "https://ipfs.filebase.io/ipfs/QmbcASVTxfi7TQxQ8EvDCWZTQKvCJN3QLqmvDzVyVAqxJg",

  "/images/raid-bosses/cumioh/common.png": "https://ipfs.filebase.io/ipfs/Qmdi3uuGQwErJxqJPPW3qQN8FYnwQzP5qRKvJL3ZQPKLQE",
  "/images/raid-bosses/cumioh/rare.png": "https://ipfs.filebase.io/ipfs/QmSsZ9fks6onw7V8KqmKFQBqRTdJLJxQ3mVE8wPMQDmLZv",
  "/images/raid-bosses/cumioh/epic.png": "https://ipfs.filebase.io/ipfs/QmXA9bWDZzNWc7NmQJFkTQ8DVzMPJXvFYLEPv9C8qYwz7Z",
  "/images/raid-bosses/cumioh/legendary.png": "https://ipfs.filebase.io/ipfs/QmPvrvwVY4rMD3QKxPQKpXJvKN3LqmJdCQwN5NzYPNKqFZ",
  "/images/raid-bosses/cumioh/mythic.png": "https://ipfs.filebase.io/ipfs/QmS6JQqFWT33ZPdXqJzVqEPzPQJPqNQqJRzPqLKQLbqPMQ",

  // Card backs and misc
  "/card-back.png": "https://ipfs.filebase.io/ipfs/QmZrRir8uDx3jKrx6hfDFhRJXmxXaU3rfQJAbTqqk9Bod5",
  "/pack-closed.png": "https://ipfs.filebase.io/ipfs/QmP7Q6Sz8p8eEuF8nYS2MX1CdTCe6jQpBy81iQtvQDCJRn",
  "/pack-cover.png": "https://ipfs.filebase.io/ipfs/QmZrRir8uDx3jKrx6hfDFhRJXmxXaU3rfQJAbTqqk9Bod5",
  "/splash.png": "https://ipfs.filebase.io/ipfs/QmZ1cfYCW9mDzD4V9iMhVoUQGFd1QwNLfMmEEBQKwEfFSb",
  "/og-image.png": "https://ipfs.filebase.io/ipfs/QmU27iyqYXLYD3P7xKZqVNdqLKq8mFvZKq8LNdqLKqYXLY",
};

/**
 * Get asset URL - returns IPFS URL in production, local path in development
 */
export function getAssetUrl(localPath: string): string {
  if (!USE_IPFS) return localPath;
  return IPFS_ASSETS[localPath] || localPath;
}

/**
 * Force IPFS URL regardless of environment (for testing)
 */
export function getIpfsUrl(localPath: string): string | undefined {
  return IPFS_ASSETS[localPath];
}
