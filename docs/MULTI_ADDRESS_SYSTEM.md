# Multi-Address & Merge System

## Overview

The multi-address system allows users to link multiple wallets to a single Farcaster account (FID). This consolidates their progress, cards, and balances across different wallets.

## How It Works

1. **Primary Wallet**: The main wallet where all progress is aggregated
2. **Linked Wallets**: Secondary wallets that share the same FID data
3. **Address Links**: Database records mapping linked wallets to their primary

## Key Features

- **Unified Leaderboard**: All linked wallets' stats are aggregated under the primary wallet
- **Cross-Wallet Card Access**: Cards owned by any linked wallet are available to the primary
- **Raid Deck Sync**: Raid decks from linked wallets are cleaned up when linking/unlinking
- **Coin Aggregation**: Balances from all linked wallets count toward the primary

## Database Structure

### profiles table

```typescript
{
  address: string,           // Primary wallet address
  linkedAddresses: string[], // Array of linked wallet addresses
  linkedFids: string[],      // Array of linked FIDs (for multi-FID support)
  // ... other profile fields
}
```

### addressLinks table

```typescript
{
  address: string,        // Linked wallet address
  primaryAddress: string, // Primary wallet it's linked to
  linkedAt: number,       // Timestamp
}
```

## Admin Functions

### `mergeDuplicateProfile`

Merges a duplicate profile into the primary, transferring coins and linking the wallet.

```typescript
// Usage via Convex dashboard:
npx convex run admin:mergeDuplicateProfile '{
  "primaryAddress": "0x...",
  "secondaryAddress": "0x..."
}' --env-file .env.prod
```

**What it does:**
1. Transfers all coins from secondary to primary
2. Creates addressLink record (if not exists)
3. Adds secondary to primary's linkedAddresses array
4. Removes FID from secondary profile
5. Resets secondary's coin balance to 0

**Returns:**
```typescript
{
  success: true,
  primaryUsername: "user1",
  secondaryUsername: "user2",
  coinsTransferred: 5200
}
```

### `linkDuplicateProfile`

Links a wallet without transferring balances (lighter operation).

```typescript
npx convex run admin:linkDuplicateProfile '{
  "primaryAddress": "0x...",
  "secondaryAddress": "0x..."
}' --env-file .env.prod
```

## User Functions

### `useUnifiedCode`

Single function that handles both linking wallets and merging FID accounts. Called from the Settings modal.

```typescript
// Called when user enters a link/merge code
profiles:useUnifiedCode({
  address: "0x...",
  code: "ABC123"
})

// Returns:
{
  success: true,
  type: "link" | "merge",
  linkedTo?: "0x...",
  mergedFrom?: "username"
}
```

### `useLinkCode`

Links a new wallet to an existing primary account.

**Flow:**
1. User A generates link code from Settings
2. User A connects with different wallet
3. User A enters the code
4. New wallet is linked to original account

### `useMergeCode`

Merges two FID accounts together (when user has multiple Farcaster accounts linked to different wallets).

**Flow:**
1. User logs in with FID A, generates merge code
2. User logs in with FID B, enters merge code
3. FID B's data is merged into FID A's account

## Cleanup on Unlink

When `unlinkWallet` is called, the system:

1. Removes address from `linkedAddresses` array
2. Deletes `addressLinks` record
3. Calls `cleanupLinkedWalletRaidData` to clear raid deck data

```typescript
// In raidBoss.ts
cleanupLinkedWalletRaidData({
  address: "0x..."  // The wallet being unlinked
})
```

## Finding Duplicate Accounts

To find profiles with the same FID (potential duplicates):

```bash
npx convex run backup:getAllProfiles '{}' --env-file .env.prod 2>&1 | node -e "
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  const data = JSON.parse(chunks.join(''));
  const fidCounts = {};

  data.forEach(p => {
    const fid = String(p.fid || p.farcasterFid);
    if (fid && fid !== 'undefined') {
      if (!fidCounts[fid]) fidCounts[fid] = [];
      fidCounts[fid].push({
        address: p.address,
        username: p.username,
        coins: p.coins || 0,
        linkedAddresses: p.linkedAddresses || []
      });
    }
  });

  // Find FIDs with multiple profiles
  Object.entries(fidCounts)
    .filter(([fid, profiles]) => profiles.length > 1)
    .forEach(([fid, profiles]) => {
      console.log('\\n=== FID', fid, '===');
      profiles.forEach(p => {
        console.log('  ', p.username, '-', p.address.slice(0,10) + '...', '- coins:', p.coins);
      });
    });
});
"
```

## Leaderboard Aggregation

The leaderboard filters out linked wallets to avoid double-counting:

```typescript
// In profiles.ts - getLeaderboardLite
const validProfiles = allProfiles.filter(profile => {
  // Skip profiles that are linked to another address
  const isLinkedWallet = allProfiles.some(other =>
    other.linkedAddresses?.includes(profile.address)
  );
  return !isLinkedWallet;
});
```

## Settings Modal UI

Users can manage linked wallets from the Settings modal:

1. **View Linked Wallets**: See all wallets linked to their account
2. **Generate Link Code**: Create a code to link a new wallet
3. **Unlink Wallet**: Remove a linked wallet (with confirmation modal)
4. **Use Code**: Enter a link/merge code from another session

## Security Considerations

- Link/merge codes expire after 5 minutes
- Codes are single-use
- Only the code generator's account can be linked to
- Admin functions are internal-only (cannot be called from client)
- Unlink requires confirmation to prevent accidental disconnection
