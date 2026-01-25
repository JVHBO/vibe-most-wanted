# Claude Code Instructions for VIBE Most Wanted

## Convex Deployment

**CRITICAL: ALWAYS USE PRODUCTION - NEVER USE DEV!**

| Deployment | URL |
|------------|-----|
| `prod:agile-orca-761` | agile-orca-761.convex.cloud |

The `.env.local` file MUST point to production:
```
CONVEX_DEPLOYMENT=prod:agile-orca-761
NEXT_PUBLIC_CONVEX_URL=https://agile-orca-761.convex.cloud
```

### Deploy to Production

```bash
# Deploy Convex
npx convex deploy --env-file .env.prod

# Run queries
npx convex run <function> --env-file .env.prod
```

## Known Issues (Bugs)

### Bug #1: `.env.local` overrides environment variables
- Setting `CONVEX_DEPLOYMENT=prod:...` before commands does NOT work
- The `.env.local` file always takes precedence
- Solution: Use `--env-file .env.prod` flag

### Bug #2: Vercel env vars with `\n` (RECURRING)
- **Status**: Keeps recurring - happened again on Dec 22, 2025
- **Cause**: Unknown - Vercel sometimes appends `\n` to ALL env vars
- **Symptoms**: Build fails with cryptic errors, works locally but fails on Vercel
- **Detection**: Pull env vars and check for `\n`:
```bash
npx vercel env pull .env.vercel-check --environment production
# Check file for \n characters at end of values
```
- **Fix**: Use `printf` (not `<<<`) to avoid adding newlines:
```bash
# For each corrupted var:
npx vercel env rm VAR_NAME production -y
printf "value_without_newline" | npx vercel env add VAR_NAME production

# Example:
npx vercel env rm CONVEX_DEPLOYMENT production -y
printf "prod:agile-orca-761" | npx vercel env add CONVEX_DEPLOYMENT production

npx vercel env rm NEXT_PUBLIC_CONVEX_URL production -y
printf "https://agile-orca-761.convex.cloud" | npx vercel env add NEXT_PUBLIC_CONVEX_URL production
```

### Bug #3: TypeScript type narrowing in Convex filters
- **Issue**: `args.cursor` inside `.filter()` callback doesn't narrow type even after `if (args.cursor)` check
- **Error**: `Type 'undefined' is not assignable to parameter of type 'ExpressionOrValue<Value>'`
- **Fix**: Capture value in local variable before callback:
```typescript
// BAD - TypeScript doesn't narrow inside callback
if (args.cursor) {
  query = query.filter(q => q.lt(q.field("_creationTime"), args.cursor)); // ERROR!
}

// GOOD - Local variable preserves narrowed type
if (args.cursor) {
  const cursor = args.cursor;
  query = query.filter(q => q.lt(q.field("_creationTime"), cursor)); // Works!
}
```

### Bug #4: Vercel cache not uploading changes
- **Symptoms**: Local build works, Vercel build fails with old errors
- **Fix**: Use `--force` flag to bypass cache:
```bash
npx vercel --prod --force
```

### Bug #5: Deploying to wrong environment
- **Symptoms**: Changes deployed but not visible in production
- **Cause**: Forgot `--env-file .env.prod` when deploying Convex
- **Fix**: Always deploy Convex before Vercel:
```bash
npx convex deploy --env-file .env.prod
npx vercel --prod
```

### Bug #6: Schema mismatch after git revert
- **Symptoms**: Convex deploy fails with "Object contains extra field" error
- **Cause**: Data has fields that were added then reverted from schema
- **Example**: `notificationTokens` has `app` field in data but not in schema
- **Fix**: Add missing optional fields to schema before deploying:
```typescript
// Add to schema to match existing data
app: v.optional(v.string()),
```
- **Note**: VibeFID now has its own separate Convex deployment. See "VibeFID Miniapp" section below.

### Bug #9: Balance cache skipping new collections (Jan 2026)
- **Symptoms**: Player's NFTs not showing, ownedTokenIds missing cards they own on-chain
- **Cause**: `checkCollectionBalances()` in `lib/nft/fetcher.ts` was skipping contracts not in cache
- **Location**: Line ~191 in `lib/nft/fetcher.ts`
- **Fix**: Changed filter to include contracts NOT in cache (treat as unknown, fetch them)
```typescript
// OLD (buggy): If contract not in cache, assumed balance = 0, skipped fetch
cached.balances[contractLower] || 0) > 0

// NEW (fixed): If contract not in cache, include it to fetch
if (!(contractLower in cached.balances)) return true; // need to fetch
```
- **Related**: Alchemy marks some collections as "spam" but still returns them

### Bug #10: RPC balance check '0x' treated as error (Jan 2026)
- **Symptoms**: Optimization disabled because all users fetched ALL collections
- **Cause**: `checkSingleBalance()` treated `'0x'` response as error (-1) instead of valid 0 balance
- **Location**: `lib/nft/fetcher.ts` line ~130
- **Issues fixed**:
  1. `'0x'`, `'0x0'`, `'0x00'` are now treated as valid 0 balance
  2. Cache now saves for users with 0 NFTs (saves future RPC calls)
  3. Fallback to "fetch ALL" only triggers if ALL RPCs fail (-1), not if user has 0 NFTs
- **Impact**: Reduces Alchemy calls by ~70-90% for returning users
```typescript
// OLD (buggy): '0x' was treated as error
if (json.result === '0x') return -1; // Wrong!

// NEW (fixed): '0x' means 0 balance
if (json.result === '0x' || json.result === '0x0' || json.result === '0x00') {
  return 0; // Valid - user has 0 NFTs in this collection
}
```

## Security

- Blacklist is in `convex/blacklist.ts`
- 106 exploiters currently banned
- Security report: `SECURITY_INCIDENT_REPORT.md`

### Coin Audit System (Jan 2026)

All mutations that give coins MUST have audit logs. This enables exploit detection.

#### Tables for Tracking
| Table | Purpose |
|-------|---------|
| `coinTransactions` | User-facing transaction history |
| `coinAuditLog` | Security audit trail (internal) |
| `claimAnalytics` | Tracks claim behavior patterns |

#### Mutations with Audit Logs
Every mutation that adds coins must call `createAuditLog()` from `coinAudit.ts`:

```typescript
import { createAuditLog } from "./coinAudit";

// After updating coins:
await createAuditLog(
  ctx,
  playerAddress,
  "earn",           // type: earn | spend | convert | claim | recover
  amount,
  balanceBefore,
  balanceAfter,
  "source_name",    // e.g., "pve_reward", "referral_reward"
  sourceId,         // optional: specific identifier
  { reason: "..." } // optional: metadata
);
```

#### Covered Sources (as of Jan 2026)
- `pve_reward` - PvE battle wins (economy.ts)
- `pvp_reward` - PvP battle wins (economy.ts)
- `attack_win` - Attack mode wins (economy.ts)
- `daily_share` - Daily share bonus (economy.ts)
- `referral_reward` - Referral tier claims (referrals.ts)
- `referral_badge_reward` - Referral badge (tier 100) (referrals.ts)
- `raid_boss_reward` - Raid boss rewards (raidBoss.ts)
- `inbox_claim` - Inbox to balance (vbmsClaim.ts)
- `pve_inbox` - PvE rewards to inbox (vbmsClaim.ts)
- `pvp_inbox` - PvP rewards to inbox (vbmsClaim.ts)

### Dead Code Cleanup (Jan 2026)

Removed ~400 lines of dead code from `vbmsClaim.ts`:
- `claimBattleRewardsNow` / `claimBattleRewardsNowInternal` - never used
- `recordImmediateClaim` - never used
- `claimPveRewardNow` / `claimPveRewardNowInternal` - never used
- `sendAchievementToInbox` / `claimAchievementNow` - achievements removed

**Lesson**: Frontend doesn't have "immediate claim" - all rewards go to inbox first.

### Naming Gotcha: `sendToInbox`

The function `sendToInbox` in `vbmsClaim.ts` is **misleadingly named**:
- It does NOT send to `profile.coinsInbox`
- It sends directly to `profile.coins` (balance)
- Renaming is risky due to frontend dependencies

**Actual flow**:
1. `sendPveRewardToInbox` / `sendPvpRewardToInbox` → adds to `profile.coinsInbox`
2. `claimInboxAsTESTVBMS` → moves from `coinsInbox` to `coins`
3. `sendToInbox` → adds directly to `coins` (used for PvE/PvP immediate rewards)

### Claim Analytics Tracking (Jan 2026)

The `claimAnalytics` table tracks user behavior. Valid choices:
- `inbox` - Claimed from inbox
- `pve` - PvE reward sent to inbox
- `pvp` - PvP reward sent to inbox
- `convert` - TESTVBMS → VBMS conversion

**Note**: `immediate` was removed - it was never used by frontend.

Schema in `schema.ts`:
```typescript
choice: v.union(
  v.literal("immediate"), // legacy, kept for old data
  v.literal("inbox"),
  v.literal("pve"),
  v.literal("pvp"),
  v.literal("convert")
),
```

### Player Economy Query

`getPlayerEconomy` now returns pending conversion info:
```typescript
{
  coins: number,              // Total balance
  availableCoins: number,     // coins - pendingConversion
  pendingConversion: number,  // Amount locked for conversion
  pendingConversionTimestamp: number | null,
  hasPendingConversion: boolean,
  // ... other fields
}
```

## VibeFID Miniapp

**VibeFID** is a standalone miniapp extracted from vibe-most-wanted.

| Project | Repo | Miniapp URL |
|---------|------|-------------|
| VibeFID | `vibefid` | `https://farcaster.xyz/miniapps/aisYLhjuH5_G/vibefid` |
| VBMS (main) | `vibe-most-wanted` | `https://farcaster.xyz/miniapps/0sNKxskaSKsH/vbms---game-and-wanted-cast` |

### Separate Convex Backends (Updated Jan 2026)
**VibeFID now has its own Convex deployment!** Each project manages its own data:
- VBMS: `prod:agile-orca-761` (this repo)
- VibeFID: Has its own separate Convex deployment

**VBMS cardVotes.ts:**
- Only `getUnreadMessageCount` remains (for red dot on VibeFID button)
- All VibeMail/voting code (~1160 lines) was removed and moved to VibeFID

### /fid Route Redirect
The `/fid` route in vibe-most-wanted now **redirects to VibeFID miniapp**:
- Existing Farcaster frame posts pointing to `vibemostwanted.xyz/fid` will open VibeFID
- The page auto-redirects when Farcaster context is ready

## Neynar Score Progress System

The score progress feature tracks Neynar score changes over time:

### Key Points
1. **Mint-time score is ALWAYS the baseline** - stored in `farcasterCards.neynarScore`
2. **Only saves if score changed** - prevents duplicate entries (uses 0.0001 threshold)
3. **`getScoreHistory` query** - always uses mint-time score as "First Check"
4. **Cleanup function** - `cleanupDuplicateScores` removes repeated values

### On New Mint
The `mintFarcasterCard` mutation saves initial score to `neynarScoreHistory` table:
```typescript
await ctx.db.insert("neynarScoreHistory", {
  fid: args.fid,
  username: args.username,
  score: args.neynarScore,
  rarity: args.rarity,
  checkedAt: Date.now(),
});
```

## File Modification Issues

### Dev Server Race Conditions
When Next.js dev server is running, the Edit tool may fail with "File has been unexpectedly modified".

**Solution**: Use bash heredoc or node scripts:
```bash
cat > "path/to/file.ts" << 'ENDOFFILE'
// file content here
ENDOFFILE
```

Or create a `.cjs` script and run with `node script.cjs`.

### Bug #7: mintFarcasterCard missing `language` field (Jan 2026)
- **Symptoms**: Cards minted on-chain but not saved to Convex
- **Error**: `ArgumentValidationError: Object contains extra field 'language' that is not in the validator`
- **Cause**: Frontend sends `language` field for welcome message localization, but Convex mutation didn't accept it
- **Fix**: Added `language: v.optional(v.string())` to `mintFarcasterCard` args
- **Affected FIDs**: 213263, 285604, 520247, 264335

### Bug #8: Welcome VibeMail not sent on mint (Jan 2026)
- **Symptoms**: New card holders don't receive welcome message
- **Cause**: `mintFarcasterCard` didn't have welcome VibeMail logic
- **Fix**: Added `ctx.db.insert("cardVotes", {...})` with welcome message after card creation
- **Note**: Use `voterFid: 0` and system address for automated messages

### Card Regeneration Admin Page
- **Location**: `/admin/regenerate` in vibe-most-wanted
- **Purpose**: Regenerate card video + PNG for broken cards
- **Process**:
  1. Generates card image (client-side canvas)
  2. Uploads PNG to IPFS via `/api/upload-nft-image`
  3. Generates video with foil animation (3s static, 5s animated PFP)
  4. Uploads video to IPFS via `/api/upload-nft-video`
  5. Updates Convex with `updateCardImages`
  6. Refreshes OpenSea metadata

### VibeFID Card URLs
- **imageUrl**: Video (WebM) - shown on OpenSea as animation
- **cardImageUrl**: Static PNG - for sharing/thumbnails
- **shareImageUrl**: Share image with criminal backstory text

### OpenSea Refresh
```bash
curl -X POST "https://api.opensea.io/api/v2/chain/base/contract/0x60274A138d026E3cB337B40567100FdEC3127565/nfts/{FID}/refresh" -H "X-API-KEY: YOUR_KEY"
```
- Can take 1-5 minutes to process
- Check with API: `GET /nfts/{FID}` and look for `animation_url`

### Animated PFP (GIF) Cards
- Videos are 5 seconds instead of 3 seconds
- GIF frames are extracted and animated in the video
- Check PFP type: `curl -sI {pfp_url} | grep Content-Type`

## Power System (Jan 2026)

### Collection Power Multipliers

**CRITICAL**: Power multipliers must be applied consistently across ALL game modes!

| Collection | General Battles | Leaderboard Attacks | Raid Boss |
|------------|-----------------|---------------------|-----------|
| **VibeFID** | 5x | 10x | 5x + 50% team buff |
| **VBMS (vibe)** | 2x | 2x | 2x |
| **Nothing** | 0.5x (-50%) | 0.5x | 0.5x |
| **Boss Collection** | - | - | 2x (matching boss) |
| **Others** | 1x | 1x | 1x |

### Files with Power Calculations

**ALL these files MUST have consistent multipliers:**

| File | Function | Purpose |
|------|----------|---------|
| `lib/power-utils.ts` | `getCollectionMultiplier()` | **Centralized** (use this!) |
| `hooks/useCardCalculations.ts` | `useTotalPower()` | Memoized total power |
| `hooks/useBattleOptimizations.ts` | `calculateBattleResult()` | PvE/PvP battles |
| `app/page.tsx` | `calculateLeaderboardAttackPower()` | Leaderboard attacks |
| `contexts/PlayerCardsContext.tsx` | `calculateLeaderboardAttackPower()` | Context version |
| `app/leaderboard/page.tsx` | inline calculation | Leaderboard page |
| `components/PokerBattleTable.tsx` | `getDisplayPower()` | Poker battles |
| `components/AttackCardSelectionModal.tsx` | `getDisplayPower()` | Attack modal |
| `components/PveCardSelectionModal.tsx` | `getDisplayPower()` | PvE modal |
| `components/RaidDeckSelectionModal.tsx` | `getDisplayPower()` | Raid deck modal |
| `app/raid/deck/page.tsx` | `getCardBuff()` | Raid deck page |
| `convex/raidBoss.ts` | `setRaidDeck`, `attackBoss` | Backend raid |

### Common Mistakes

1. **Forgetting Nothing 0.5x** - UI says "-50% power" but code didn't apply it
2. **Inconsistent VibeFID** - Some places had 10x, others 5x
3. **Missing VBMS 2x in leaderboard** - Only VibeFID had multiplier
4. **Defense deck without multipliers** - `dealerTotal` used raw power

### Adding New Multipliers

When adding a new collection buff, update ALL files above:

```typescript
// Pattern for multiplier calculation
const multiplier =
  c.collection === 'vibefid' ? (isLeaderboard ? 10 : 5) :
  c.collection === 'vibe' ? 2 :
  c.collection === 'nothing' ? 0.5 :
  1;
return sum + Math.floor((c.power || 0) * multiplier);
```

## UI Alignment Issues

### Button Centering
- **Problem**: Buttons appear off-center due to hidden `ml-*` classes
- **Fix**: Use `justify-center` on parent container and remove margin classes
- **Example**: VibeFID button had `ml-2` causing misalignment with buttons below

## Debugging NFT Issues

### Player não vê seus NFTs
1. **Primeiro**: Verificar on-chain com Alchemy API diretamente
```bash
curl -s "https://base-mainnet.g.alchemy.com/nft/v3/API_KEY/getNFTsForOwner?owner=ADDRESS&contractAddresses[]=CONTRACT&withMetadata=false"
```

2. **Contratos corretos** (não confundir!):
| Collection | Contract |
|------------|----------|
| vibe (VBMS) | `0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728` |
| viberotbangers | `0x120c612d79a3187a3b8b4f4bb924cebe41eb407a` |
| vibefid | `0x60274A138d026E3cB337B40567100FdEC3127565` |
| meowverse | `0xF0BF71bcD1F1aeb1bA6BE0AfBc38A1ABe9aa9150` |
| nothing | `0xfeabae8bdb41b2ae507972180df02e70148b38e1` |

3. **Alchemy marca como SPAM** - Isso é normal, não filtramos por `isSpam`

4. **Sincronização do ownedTokenIds**:
   - Só acontece quando player carrega a home page
   - Frontend busca NFTs da Alchemy → chama `updateStats` → atualiza `ownedTokenIds`
   - Se player não carrega página, fica desatualizado

5. **Fix manual para player específico**:
```bash
# Ver o que tem on-chain vs no profile
npx convex run profiles:getProfile '{"address": "0x..."}' --env-file .env.prod

# Adicionar tokens faltando
npx convex run profiles:updateStats '{"address": "0x...", "stats": {...}, "tokenIds": [...]}' --env-file .env.prod
```

6. **Mutations de admin úteis**:
   - `admin:addVibeFIDToOwnedTokens` - Adiciona VibeFID faltando
   - `admin:syncDefenseDeckToOwned` - Sincroniza defenseDeck → ownedTokenIds

## VibeFID vs VBMS Notifications

### Neynar Apps Separados
| App | Neynar App ID | API Key |
|-----|---------------|---------|
| VBMS | `e4b053fc-a6bd-4975-a6bc-a3174e617d19` | (ver Vercel) |
| VibeFID | `f595d65b-e6d3-458b-abe0-0545bdf393f5` | (ver Vercel) |

- Cada app tem sua própria API key no dashboard do Neynar
- VibeFID usa Neynar-only (não salva tokens no Convex)
- VBMS também usa Neynar managed webhooks

## Convex Bandwidth Optimization (Jan 2026)

### Critical Rules - ALWAYS Follow

1. **NEVER use `.collect()` without `.take()` limit**
```typescript
// ❌ BAD - Loads entire table
const items = await ctx.db.query("table").collect();

// ✅ GOOD - Limited load
const items = await ctx.db.query("table").take(100);
```

2. **ALWAYS use indexes instead of filters when possible**
```typescript
// ❌ BAD - Full table scan
const items = await ctx.db.query("items")
  .filter(q => q.eq(q.field("address"), addr))
  .collect();

// ✅ GOOD - Index lookup
const items = await ctx.db.query("items")
  .withIndex("by_address", q => q.eq("address", addr))
  .take(100);
```

3. **NEVER do N+1 queries in loops**
```typescript
// ❌ BAD - N queries
for (const item of items) {
  const profile = await ctx.db.query("profiles")...first();
}

// ✅ GOOD - Batch load with Promise.all
const addresses = [...new Set(items.map(i => i.address))];
const profilePromises = addresses.map(addr =>
  ctx.db.query("profiles").withIndex("by_address", q => q.eq("address", addr)).first()
);
const profiles = await Promise.all(profilePromises);
const profileMap = new Map(profiles.filter(Boolean).map(p => [p.address, p]));
```

### Optimized Files (Jan 2026)

| File | Function | Fix |
|------|----------|-----|
| `profiles.ts` | `updateLeaderboardFullCache` | 250 queries → 1 batch with Set lookup |
| `profiles.ts` | `getDefenseDeckOnly` | New lightweight query for attacks |
| `vbmsClaim.ts` | `getFullTransactionHistory` | 3x `.collect()` → 3x `.take(limit)` |
| `notifications.ts` | `getAllTokens` | `.collect()` → `.take(50000)` |
| `notifications.ts` | `saveToken` | `.collect()` → `.take(10)` |
| `raidBoss.ts` | `defeatBossAndSpawnNext` | `.collect()` → `.take(10000)` + batch updates |
| `raidBoss.ts` | `getUnclaimedRewards` | `.collect()` → `.take(100)` |
| `cardVotes.ts` | Entire file | Removed ~1160 lines of dead code |

### Common Limits to Use

| Context | Recommended Limit |
|---------|------------------|
| Per-player queries | 100-500 |
| Leaderboard entries | 250-500 |
| Notification tokens per FID | 10 |
| Raid contributions per boss | 10,000 |
| Transaction history | 500 |
| Active raid decks | 5,000 |

### Bandwidth Savings Achieved

- **Before**: ~400MB/day
- **Target**: ~100MB/day
- **Key wins**:
  - Leaderboard cache: 250 queries → 1 (saved ~75MB/day)
  - Defense deck query: Full profile → minimal data (~75% reduction per attack)
  - Transaction history: Unbounded → limited (saves ~3MB per heavy user)
  - Dead VibeFID code removed: Eliminates unused query paths

## Frontend Bandwidth Optimization (Jan 2026)

### Critical: useQuery Creates WebSocket Subscriptions!

The biggest bandwidth consumer is NOT the queries themselves, but the **WebSocket subscriptions** that `useQuery` creates. Each `useQuery` opens a persistent connection that syncs data continuously.

### Pattern 1: Replace useQuery with Manual Queries

```typescript
// ❌ BAD - Creates persistent WebSocket subscription
const questProgress = useQuery(api.quests.getQuestProgress, address ? { address } : "skip");

// ✅ GOOD - One-time HTTP request, no subscription
const convex = useConvex();
const [questProgress, setQuestProgress] = useState<any>(null);
const questsLoadedRef = useRef(false);

useEffect(() => {
  if (!address || questsLoadedRef.current) return;
  questsLoadedRef.current = true;

  const loadData = async () => {
    const result = await convex.query(api.quests.getQuestProgress, { address });
    setQuestProgress(result);
  };
  loadData();
}, [address, convex]);
```

### Pattern 2: SessionStorage Cache for Mutations

Prevent redundant mutation calls within the same session:

```typescript
// ❌ BAD - Calls ensureWelcomeGift on every mount
useEffect(() => {
  if (!address) return;
  ensureWelcomeGift({ playerAddress: address });
}, [address]);

// ✅ GOOD - Only calls once per day per session
useEffect(() => {
  if (!address) return;
  const init = async () => {
    const sessionKey = `vbms_missions_init_${address.toLowerCase()}`;
    const today = new Date().toISOString().split('T')[0];
    const cached = sessionStorage.getItem(sessionKey);
    if (cached === today) return; // Already done today

    await ensureWelcomeGift({ playerAddress: address.toLowerCase() });
    sessionStorage.setItem(sessionKey, today);
  };
  init();
}, [address]);
```

### Pattern 3: Use Context Instead of Duplicate useQuery

```typescript
// ❌ BAD - Duplicate subscription (ProfileContext already has this!)
const profileDashboard = useQuery(api.profiles.getProfileDashboard,
  address ? { address } : "skip"
);

// ✅ GOOD - Reuse existing ProfileContext
const { userProfile } = useProfile();
const profileDashboard = userProfile; // Already loaded!
```

### Pattern 4: Skip Redundant Mutations with Ref Checks

```typescript
// ❌ BAD - Updates stats even if nothing changed
useEffect(() => {
  if (address && stats) {
    updateStatsLite({ address, stats });
  }
}, [address, stats]);

// ✅ GOOD - Only update if values actually changed
const prevStatsRef = useRef<string>("");
useEffect(() => {
  if (!address || !stats) return;
  const statsKey = JSON.stringify(stats);
  if (prevStatsRef.current === statsKey) return;
  prevStatsRef.current = statsKey;
  updateStatsLite({ address, stats });
}, [address, stats]);
```

### Pattern 5: One-Time Effects with Refs

```typescript
// ❌ BAD - Runs every time deps change
useEffect(() => {
  cleanConflictingDefenseCards({ address });
}, [address]);

// ✅ GOOD - Run only once per session
const cleanedDefenseRef = useRef(false);
useEffect(() => {
  if (!address || cleanedDefenseRef.current) return;
  cleanedDefenseRef.current = true;
  cleanConflictingDefenseCards({ address });
}, [address]);
```

### Files Optimized (Jan 2026)

| File | Optimization |
|------|-------------|
| `app/page.tsx` | Converted 4 useQuery → manual queries, added sessionStorage cache, refs for one-time effects |
| `app/quests/page.tsx` | SessionStorage cache for mission initialization |
| `app/baccarat/page.tsx` | Manual query for dailyPlays |
| `lib/convex-profile.ts` | Uses `getProfileDashboard` (lightweight) instead of `getProfile` (heavy) |
| `contexts/PlayerCardsContext.tsx` | SessionStorage cache for linked addresses |
| `convex/missions.ts` | Returns only essential fields (not full documents) |

### When to Use useQuery vs Manual Query

| Scenario | Use |
|----------|-----|
| Data needs real-time updates (chat, live scores) | `useQuery` |
| Data loaded once per session (quests, profile) | Manual query |
| Data that rarely changes (settings, missions) | Manual query + sessionStorage |
| Heavy data (arrays, lists) | Manual query with pagination |

### Measuring Impact

Bandwidth optimizations may NOT show immediate results because:
1. **Cumulative metrics** - Dashboard shows totals, not deltas
2. **Session caching** - Old sessions still use old code until refresh
3. **Traffic variance** - More users = more bandwidth regardless of optimization

**True test**: Compare bandwidth per unique user over 24-48 hours after deploy

## Wield API (VMW Cards Metadata)

### API Configuration
| Key | Value |
|-----|-------|
| **Base URL** | `https://build.wield.xyz/vibe/boosterbox` |
| **API Key** | `YUEPI-G3KJ7-5FCXV-ANSPV-BZ3DA` |
| **Header** | `API-KEY` (NOT `x-api-key`!) |
| **Contract** | `0xf14c1dc8ce5fe65413379f76c43fa1460c31e728` |

### Working Endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `/metadata/{slug}/{tokenId}` | NO | Get single token metadata |
| `/metadata?contractAddress=...` | YES | Get ALL cards metadata (official data!) |
| `/owner/{address}` | YES | Get tokens by owner |

### Example Requests

```bash
# Single token (NO auth needed)
curl -s "https://build.wield.xyz/vibe/boosterbox/metadata/vibe-most-wanted/14068"

# ALL cards metadata (REQUIRES API-KEY header)
curl -s -H "API-KEY: YUEPI-G3KJ7-5FCXV-ANSPV-BZ3DA" \
  "https://build.wield.xyz/vibe/boosterbox/metadata?contractAddress=0xf14c1dc8ce5fe65413379f76c43fa1460c31e728"

# Create new API key
curl -X POST -H "Content-Type: application/json" \
  -d '{"description": "VMW TCG", "email": "your@email.com"}' \
  https://build.wield.xyz/apikey/create
```

### Common Mistakes (DON'T DO!)
- ❌ `x-api-key` header → Use `API-KEY`
- ❌ `/contractAddress/{addr}/all-metadata` → Use `/metadata?contractAddress=`
- ❌ Searching unminted tokens by tokenId → They don't exist on-chain!
- ❌ Rate limited? Create new API key (it's free)

### VMW Card Data

**Data file:** `data/vmw-tcg-cards.json` (source of truth)

| Rarity | Count | Ranks |
|--------|-------|-------|
| Mythic | 5 | neymar (NEW!) + 4 Aces |
| Legendary | 8 | Queens + Kings |
| Epic | 12 | 9, 10, Jacks |
| Rare | 8 | 7, 8 |
| Common | 20 | 2-6 |

**Total: 53 cards** (52 standard deck + neymar)

### Name Aliases (on-chain → baccarat)
Some cards have different names on-chain vs in baccarat images:
- `nicogay` → `nico`
- `chilli` → `chilipepper`
- `Goofy Romero` → `goofy romero`
- `Linda Xied` → `linda xied`
- `Beeper` → `beeper`
- `filthy` → `don filthy`
- `vlad` → `vlady`
- `shill` → `shills`
- `beto` → `betobutter`
- `proxy` → `slaterg`
- `lombra` → `lombra jr`
- `vibe` → `vibe intern`
- `jack` → `jack the sniper`
- `horsefacts` → `horsefarts`
- `jc` → `jc denton`

### API Docs
- Full docs: https://docs.wield.xyz/api-reference/vibemarket-intro

### Otimização Futura: Coleções via Wield (NÃO IMPLEMENTADO)

**Problema atual:**
- Alchemy às vezes retorna quantidade errada de cartas
- Gasta muito bandwidth/calls do Alchemy

**Coleções que funcionam com Wield API (TODAS vibechain boosterbox):**
| Coleção | Contract | Wield | Slug |
|---------|----------|-------|------|
| VMW (vibe) | `0xf14c1dc8ce5fe65413379f76c43fa1460c31e728` | ✅ | vibe-most-wanted |
| Viberotbangers | `0x120c612d79a3187a3b8b4f4bb924cebe41eb407a` | ✅ | vibe-rot-bangers |
| Meowverse | `0xF0BF71bcD1F1aeb1bA6BE0AfBc38A1ABe9aa9150` | ✅ | meowverse |
| GM VBRS | `0xefe512e73ca7356c20a21aa9433bad5fc9342d46` | ✅ | gm-vbrs |
| Viberuto | `0x70b4005a83a0b39325d27cf31bd4a7a30b15069f` | ✅ | viberuto |
| VibeFX | `0xc7f2d8c035b2505f30a5417c0374ac0299d88553` | ✅ | vibefx |
| History of Computer | `0x319b12e8eba0be2eae1112b357ba75c2c178b567` | ✅ | history-of-computer |
| Team Pothead | `0x1f16007c7f08bf62ad37f8cfaf87e1c0cf8e2aea` | ✅ | team-pothead |
| Tarot | `0x34d639c63384a00a2d25a58f73bea73856aa0550` | ✅ | tarot |
| Baseball Cabal | `0x3ff41af61d092657189b1d4f7d74d994514724bb` | ✅ | baseball-cabal |
| Poorly Drawn Pepes | `0x8cb5b730943b25403ccac6d5fd649bd0cbde76d8` | ✅ | poorly-drawn-pepes |
| $CU-MI-OH! | `0xfeabae8bdb41b2ae507972180df02e70148b38e1` | ✅ | cu-mi-oh |

**NÃO funcionam com Wield (outros sistemas):**
| Coleção | Razão |
|---------|-------|
| VibeFID | Contrato separado, não é boosterbox |
| Nothing | Não é NFT, só Convex cardInventory |

**Solução proposta:**
1. `/owner/{address}?contractAddress=X` → lista de tokenIds (1 call por coleção)
2. Cache localStorage por token (foil/wear nunca mudam)
3. Só buscar metadata de tokens NOVOS
4. Fallback pra Alchemy se Wield falhar

**Endpoints necessários:**
```bash
# Lista de tokens do owner (precisa API-KEY)
GET /owner/{address}?contractAddress=0x...
Header: API-KEY

# Metadata individual (NÃO precisa de API key!)
GET /metadata/vibe-most-wanted/{tokenId}
GET /metadata/vibe-rot-bangers/{tokenId}
GET /metadata/meowverse/{tokenId}
```

**Cuidados na implementação:**
- Rate limit: max 5 calls paralelos, delay 100ms entre batches
- Cache permanente por tokenId (metadata não muda)
- Cache de 10min para lista de tokens do owner
- Sempre ter fallback pra Alchemy
- Testar bem antes de deploy (sistema crítico!)
- Nothing cards: continuar usando Convex (cardInventory table)

**Economia estimada:**
- 90% das vezes: cache local (0 calls)
- Player novo/comprou cartas: 1 call owner + N calls metadata
- Metadata cacheia PARA SEMPRE

## Baccarat Casino Mode

### Arquivos:
| Arquivo | Descrição |
|---------|-----------|
| `convex/baccarat.ts` | Backend mutations/queries |
| `convex/schema.ts` | Tabelas baccaratTables, baccaratBets |
| `app/baccarat/page.tsx` | Página do jogo |
| `public/images/baccarat/` | 52 cartas PNG customizadas |

### Cartas Customizadas:
Formato: `"{rank} {suit}, {personagem}.png"`
- Exemplo: `ace hearts, anon.png`, `king spades, nico.png`
- Backend usa: `rank: 'A'|'2'|...|'K'`, `suit: 'hearts'|'diamonds'|'clubs'|'spades'`

## TCG Mode (Vibe Clash)

### Arquivos Principais
| Arquivo | Descrição |
|---------|-----------|
| `app/tcg/page.tsx` | Página principal do TCG (~5500 linhas) |
| `data/vmw-tcg-cards.json` | Dados das 53 cartas VMW (suit, rank, rarity, aliases) |
| `data/tcg-abilities.json` | Habilidades das cartas (53 abilities únicas) |
| `public/images/baccarat/` | Imagens PNG das cartas (compartilhado com Baccarat) |
| `components/home/GameGrid.tsx` | Grid de modos na home (inclui botão TCG) |

### Configuração do Jogo
```typescript
const TCG_CONFIG = {
  LANES: 3,                    // 3 lanes de batalha
  CARDS_PER_LANE: 3,          // Máx 3 cartas por lane
  HAND_SIZE: 5,               // 5 cartas na mão
  DECK_SIZE: 15,              // Deck de 15 cartas
  TOTAL_TURNS: 6,             // 6 turnos por jogo
  TURN_TIME_SECONDS: 15,      // 15 segundos por turno (timer implementado)
  STARTING_ENERGY: 3,         // Energia inicial
  ENERGY_PER_TURN: 1,         // Ganha 1 energia por turno
  MAX_ENERGY: 10,             // Máximo 10 energia
};
```

### Sistema de Combos (26 total)
| Tipo | Quantidade | Exemplo |
|------|------------|---------|
| Team Combos | 20 | viral_trio (dan romero + thosmur + zurkchad) |
| Synergy Combos | 6 | royal_brothers (antonio + miguel) |

**Combos de Synergy (do JSON de abilities):**
- `royal_brothers`: ANTONIO + MIGUEL = 100% power
- `philosopher_chad`: SARTOCRATES + ZURKCHAD = +3 power/turno
- `coinbase_nft`: BRIAN ARMSTRONG + NFTKID = steal 2 power
- `community_creators`: SMOLEMARU + BRADYMCK = draw extra
- `scaling_masters`: BETOBUTTER + MORLACOS = +3 power se vencer
- `open_source_ai`: GROKO + LINUX = copy ability

### Bug #11: Cartas VBMS sem imagem no TCG (Jan 2026)
- **Sintomas**: Cartas do player aparecem sem imagem (placeholder cinza com "?")
- **Causa**: Cartas do Alchemy vêm com `imageUrl` apontando para vídeo/IPFS, não PNG
- **Cartas afetadas**: Todas VBMS do player (proxy, ventra, etc.)
- **Solução**: Função `getVbmsBaccaratImageUrl()` mapeia nome da carta → PNG do baccarat
- **Localização**: `app/tcg/page.tsx` linha ~3895

```typescript
// Helper que converte nome da carta para URL da imagem baccarat
const getVbmsBaccaratImageUrl = (cardName: string): string | null => {
  // 1. Busca carta em tcgCardsData.cards por onChainName ou baccarat
  // 2. Aplica aliases (proxy → slaterg, etc.)
  // 3. Retorna: /images/baccarat/{rank} {suit}, {baccarat}.png
};

// Uso no mapeamento de cartas
if (isVbms && cardName) {
  imageUrl = getVbmsBaccaratImageUrl(cardName) || card.imageUrl || "/images/card-back.png";
}
```

### Aliases Importantes (onChainName → baccarat)
Definidos em `data/vmw-tcg-cards.json`:
```json
{
  "proxy": "slaterg",      // Jack de Diamonds
  "nicogay": "nico",       // King de Spades
  "chilli": "chilipepper", // Queen de Diamonds
  "horsefacts": "horsefarts",
  "vibe": "vibe intern",
  "jack": "jack the sniper"
}
```

### Cartas Permitidas no TCG
| Coleção | Multiplicador | Tipo |
|---------|---------------|------|
| VBMS (vibe) | 1x | vbms |
| VibeFID | 5x | vibefid |
| Nothing | 0.5x | nothing |

### Sistema de Habilidades
- Cada carta VMW tem 1 habilidade única
- Tipos: `onReveal`, `ongoing`, `active`
- Custo por raridade: Common=1, Rare=2, Epic=3, Legendary=4, Mythic=5
- Ordem de ativação: menor custo primeiro, empate = player antes de CPU

### Traduções TCG
Chaves de tradução em `lib/translations.ts`:
- `tcgTitle`, `tcgSubtitle` - Título
- `tcgCombosTotal`, `tcgSynergyCombos`, `tcgTeamCombos` - Guia de combos
- `tcgSkillOrderTitle`, `tcgTurnPhases`, `tcgPhasePlay/Reveal/Abilities/Resolve` - Ordem das skills
- `tcgCombo*` - Nomes e descrições dos 6 combos de synergy
- Traduzido em 10 idiomas: pt-BR, en, es, hi, ru, zh, id, fr, ja, it

### Timer de Turno (Implementado Jan 2026)
- 15 segundos por turno
- Botão "END TURN" mostra countdown nos últimos 10s
- Cores: roxo (normal) → laranja (10-6s) → vermelho pulsante (5-1s)
- Auto end turn quando timer chega a 0

### Acesso ao TCG
- **Antes**: Restrito por whitelist (`TCG_ALLOWED_WALLETS`)
- **Agora**: Aberto para todos (removido `restricted: true`)
- Badge "NEW" no botão do GameGrid

