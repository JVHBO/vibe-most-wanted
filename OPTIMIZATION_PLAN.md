# Optimization Plan - VIBE Most Wanted

## Executive Summary

This document outlines optimization strategies to reduce bandwidth usage on **Convex** (1.14 GB/day peak) and **Alchemy API** (high API call volume).

---

## Part 1: Convex Bandwidth Optimization

### High-Bandwidth Functions (Top 5)

| Function | Bandwidth | Root Cause |
|----------|-----------|------------|
| `profiles.updateLeaderboardFullCache` | 1.14 GB | Loads ALL profile data for top 200 |
| `profiles.upsertProfileFromFarcaster` | 933.78 MB | Multiple lookups per operation |
| `profiles.getLeaderboardLite` | 493.98 MB | Cache miss triggers full query |
| `raidBoss.processAutoAttacks` | 261.32 MB | Profile lookups inside loop |
| `farcasterCards.getAllFarcasterCards` | 153.17 MB | No pagination, returns all cards |

---

### Optimization 1: Leaderboard Cache (Saves ~1.5 GB/day)

**Problem:** `updateLeaderboardFullCache` loads full profile objects for top 200 players.

**Solution:** Store only essential fields in leaderboard cache.

```typescript
// BEFORE: Full profile objects (huge)
const profiles = await ctx.db.query("profiles").collect();
const sorted = profiles.sort((a, b) => b.coins - a.coins).slice(0, 200);
await ctx.db.patch(cacheId, { data: sorted }); // Stores EVERYTHING

// AFTER: Only store leaderboard-specific fields
const sorted = profiles
  .sort((a, b) => b.coins - a.coins)
  .slice(0, 200)
  .map(p => ({
    _id: p._id,
    address: p.address,
    username: p.username,
    displayName: p.displayName,
    pfpUrl: p.pfpUrl,
    coins: p.coins,
    level: p.level,
    xp: p.xp,
    lifetimeCoins: p.lifetimeCoins,
    wins: p.wins,
    losses: p.losses,
    rank: p.rank,
    // EXCLUDE: inventory, settings, timestamps, etc.
  }));
```

**Impact:** ~60-70% reduction in leaderboard bandwidth

---

### Optimization 2: Profile Upsert Batching (Saves ~500 MB/day)

**Problem:** `upsertProfileFromFarcaster` performs multiple queries per call.

**Solution:** Add database-level deduplication and reduce query frequency.

```typescript
// Add index for faster lookups
// In schema.ts:
profiles: defineTable({...})
  .index("by_address", ["address"])
  .index("by_fid", ["fid"]) // ADD THIS

// In upsertProfileFromFarcaster:
// Use single query with index instead of multiple lookups
const existing = await ctx.db
  .query("profiles")
  .withIndex("by_fid", q => q.eq("fid", args.fid))
  .first();

// If exists, only patch changed fields
if (existing) {
  const updates = {};
  if (existing.username !== args.username) updates.username = args.username;
  if (existing.pfpUrl !== args.pfpUrl) updates.pfpUrl = args.pfpUrl;
  // Only patch if there are changes
  if (Object.keys(updates).length > 0) {
    await ctx.db.patch(existing._id, updates);
  }
  return existing._id;
}
```

**Impact:** ~50% reduction in upsert bandwidth

---

### Optimization 3: Auto-Attack Profile Caching (Saves ~200 MB/day)

**Problem:** `processAutoAttacks` queries profiles inside a loop.

**Solution:** Batch-load all needed profiles upfront.

```typescript
// BEFORE: Query inside loop (N queries)
for (const attack of pendingAttacks) {
  const attacker = await ctx.db.get(attack.attackerId); // Query #1
  const defender = await ctx.db.get(attack.defenderId); // Query #2
  // Process...
}

// AFTER: Batch load all profiles upfront (1-2 queries)
const attackerIds = new Set(pendingAttacks.map(a => a.attackerId));
const defenderIds = new Set(pendingAttacks.map(a => a.defenderId));
const allIds = [...new Set([...attackerIds, ...defenderIds])];

const profiles = await Promise.all(allIds.map(id => ctx.db.get(id)));
const profileMap = new Map(profiles.filter(Boolean).map(p => [p._id, p]));

for (const attack of pendingAttacks) {
  const attacker = profileMap.get(attack.attackerId);
  const defender = profileMap.get(attack.defenderId);
  // Process using cached profiles
}
```

**Impact:** ~70% reduction in auto-attack bandwidth

---

### Optimization 4: Paginated Card Queries (Saves ~100 MB/day)

**Problem:** `getAllFarcasterCards` returns ALL cards without pagination.

**Solution:** Add pagination and lazy loading.

```typescript
// BEFORE: Returns all cards
export const getAllFarcasterCards = query({
  handler: async (ctx) => {
    return await ctx.db.query("farcasterCards").collect();
  },
});

// AFTER: Paginated with cursor
export const getFarcasterCardsPaginated = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    let query = ctx.db.query("farcasterCards").order("desc");

    if (args.cursor) {
      // Use cursor for pagination
      query = query.filter(q => q.lt(q.field("_creationTime"), args.cursor));
    }

    const cards = await query.take(limit + 1);
    const hasMore = cards.length > limit;
    const items = hasMore ? cards.slice(0, limit) : cards;

    return {
      cards: items,
      nextCursor: hasMore ? items[items.length - 1]._creationTime : null,
    };
  },
});
```

**Impact:** ~80% reduction in initial load bandwidth

---

### Optimization 5: Selective Field Projection

**Problem:** Queries return all fields even when only a few are needed.

**Solution:** Create specialized "lite" queries for common operations.

```typescript
// For listing/display purposes - exclude heavy fields
export const getProfileLite = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", q => q.eq("address", args.address))
      .first();

    if (!profile) return null;

    // Return only display fields
    return {
      _id: profile._id,
      address: profile.address,
      username: profile.username,
      displayName: profile.displayName,
      pfpUrl: profile.pfpUrl,
      coins: profile.coins,
      level: profile.level,
      // Exclude: inventory, settings, full history, etc.
    };
  },
});
```

---

## Part 2: Alchemy API Optimization

### Current Issues

| Issue | Impact |
|-------|--------|
| Full metadata fetch (`withMetadata=true`) | ~10x larger responses |
| Multiple collection fetches per user | N API calls per page load |
| Short cache (30 min) | Frequent re-fetches |
| No server-side caching | Each user triggers fresh API calls |
| Up to 20 pages per collection | 2000 NFTs max per collection |

---

### Optimization 1: Server-Side NFT Cache (Saves 80% API calls)

**Problem:** Each user triggers separate Alchemy API calls.

**Solution:** Cache NFT data in Convex, refresh periodically.

```typescript
// convex/nftCache.ts
export const cacheNFTsForAddress = mutation({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("nftCache")
      .withIndex("by_address", q => q.eq("address", args.address))
      .first();

    // Only refresh if cache is older than 1 hour
    if (existing && Date.now() - existing.updatedAt < 3600000) {
      return existing.nfts;
    }

    // Fetch from Alchemy via action (HTTP call)
    const nfts = await ctx.scheduler.runAfter(0, internal.nftCache.fetchFromAlchemy, {
      address: args.address,
    });

    // Store in cache
    if (existing) {
      await ctx.db.patch(existing._id, { nfts, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("nftCache", { address: args.address, nfts, updatedAt: Date.now() });
    }

    return nfts;
  },
});
```

---

### Optimization 2: Fetch Without Full Metadata

**Problem:** `withMetadata=true` returns huge payloads.

**Solution:** Fetch token IDs only, use local metadata.

```typescript
// BEFORE: Full metadata (slow, expensive)
const url = `...getNFTsForOwner?...&withMetadata=true`;

// AFTER: Token IDs only (fast, cheap)
const url = `...getNFTsForOwner?...&withMetadata=false`;

// Then lookup metadata from Convex cache (farcasterCards table)
const tokenIds = response.ownedNfts.map(n => n.tokenId);
const cards = await getCardsByTokenIds(tokenIds);
```

For VibeFID cards, we already have all metadata in Convex `farcasterCards` table.

---

### Optimization 3: Reduce Collection Fetches

**Problem:** Separate API call for each collection.

**Solution:** Fetch all NFTs once, filter client-side.

```typescript
// BEFORE: Loop through collections
for (const collection of enabledCollections) {
  const nfts = await fetchNFTs(owner, collection.contractAddress);
}

// AFTER: Single call for all contracts
const contracts = enabledCollections.map(c => c.contractAddress);
const url = `...getNFTsForOwner?owner=${owner}&contractAddresses[]=${contracts.join('&contractAddresses[]=')}&withMetadata=false`;
```

---

### Optimization 4: Extend Client Cache

**Problem:** 30-minute cache causes frequent re-fetches.

**Solution:** Extend cache to 2-4 hours for NFTs.

```typescript
// BEFORE
const NFT_CACHE_TIME = 1000 * 60 * 30; // 30 minutes

// AFTER
const NFT_CACHE_TIME = 1000 * 60 * 60 * 2; // 2 hours

// Add manual refresh button for users who need fresh data
```

---

### Optimization 5: Use Static Arena Cards Data

**Problem:** `lib/arena-cards.ts` is huge (35k+ tokens) and loaded at runtime.

**Solution:**
1. Move to Convex `arenaCardsData` table (already exists)
2. Load only needed cards on-demand
3. Use pagination for card lists

```typescript
// Instead of importing entire arena-cards.ts
import { VIBEFID_CARDS } from '@/lib/arena-cards';

// Query only what you need
const cards = await ctx.db
  .query("arenaCardsData")
  .withIndex("by_collection", q => q.eq("collection", "vibefid"))
  .take(50);
```

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 days)
1. ✅ Extend NFT cache to 2 hours
2. ✅ Add pagination to `getAllFarcasterCards`
3. ✅ Create `getProfileLite` query

### Phase 2: Medium Effort (3-5 days)
4. Optimize leaderboard cache (store essential fields only)
5. Add server-side NFT cache in Convex
6. Batch profile lookups in auto-attacks

### Phase 3: Architecture Changes (1 week)
7. Add `by_fid` index to profiles
8. Implement cursor-based pagination across all list queries
9. Create NFT sync background job

---

## Expected Results

| Metric | Current | After Optimization |
|--------|---------|-------------------|
| Convex Daily Bandwidth | ~3 GB | ~800 MB (-70%) |
| Alchemy API Calls | ~10k/day | ~2k/day (-80%) |
| Page Load Time | 2-3s | <1s |
| Leaderboard Query | ~5 MB | ~500 KB |

---

## Monitoring

After implementing, monitor via:
- Convex Dashboard → Usage → Function Bandwidth
- Alchemy Dashboard → Usage → API Calls
- Vercel Analytics → Performance

---

*Created: 2025-12-22*
*Author: Claude Code*
