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
- **CRITICAL**: VBMS and VibeFID share the same Convex deployment. Never revert commits that change schema without fixing the schema first!

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

**What VBMS still uses from VibeFID data:**
- `cardVotes.getUnreadMessageCount` - Red dot notification on VibeFID button
- `farcasterCards.*` - Card minting, querying (shared table for now)

**Dead code removed from VBMS (Jan 2026):**
- `cardVotes.ts` - Removed ~1160 lines of VibeMail/voting code (now in VibeFID)
- Only `getUnreadMessageCount` kept for red dot notification

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

## Convex NFT Ownership System (Em Progresso - Jan 2026)

### Objetivo
Eliminar 44M+ chamadas Alchemy/mês usando Convex como fonte única de verdade para NFT ownership.

### Status: PAUSADO (precisa de sync inicial)

### O que foi feito:
1. ✅ Criado `convex/nftOwnership.ts` - tabela e mutations para NFT tracking
2. ✅ Criado `lib/nft/convex-fetcher.ts` - funções para buscar do Convex
3. ✅ Criado `app/api/webhook/alchemy/route.ts` - webhook handler para 13 coleções
4. ✅ Configurado webhook no Alchemy Dashboard com todos os 13 contratos
5. ✅ Adicionado `ALCHEMY_WEBHOOK_SIGNING_KEY` no Vercel

### Contratos configurados no webhook:
| Collection | Contract |
|------------|----------|
| VBMS | `0xf14c1dc8ce5fe65413379f76c43fa1460c31e728` |
| GM VBRS | `0xefe512e73ca7356c20a21aa9433bad5fc9342d46` |
| VibeFID | `0x60274a138d026e3cb337b40567100fdec3127565` |
| Viberuto | `0x70b4005a83a0b39325d27cf31bd4a7a30b15069f` |
| Meowverse | `0xf0bf71bcd1f1aeb1ba6be0afbc38a1abe9aa9150` |
| Poorly Drawn Pepes | `0x8cb5b730943b25403ccac6d5fd649bd0cbde76d8` |
| Team Pothead | `0x1f16007c7f08bf62ad37f8cfaf87e1c0cf8e2aea` |
| Tarot | `0x34d639c63384a00a2d25a58f73bea73856aa0550` |
| Baseball Cabal | `0x3ff41af61d092657189b1d4f7d74d994514724bb` |
| Vibe FX | `0xc7f2d8c035b2505f30a5417c0374ac0299d88553` |
| History of Computer | `0x319b12e8eba0be2eae1112b357ba75c2c178b567` |
| $CU-MI-OH! | `0xfeabae8bdb41b2ae507972180df02e70148b38e1` |
| Vibe Rot Bangers | `0x120c612d79a3187a3b8b4f4bb924cebe41eb407a` |

### Problema encontrado:
- Webhook registra transfers mas NÃO tem metadata (imageUrl, rarity, etc.)
- Cards apareciam sem imagem porque Convex só tinha placeholders
- Revertemos para Alchemy-only até resolver sync inicial

### Próximos passos para ativar:
1. **Criar script de sync inicial**:
   - Buscar TODOS os NFTs de todos os contratos via Alchemy
   - Popular Convex com metadata completa (imageUrl, rarity, power, etc.)
   - Só rodar UMA vez por coleção

2. **Melhorar webhook handler**:
   - Quando receber transfer sem metadata, buscar metadata do Alchemy
   - Salvar com dados completos no Convex

3. **Testar fluxo completo**:
   - Verificar que Convex tem dados completos
   - Ativar Convex-first no `page.tsx`
   - Verificar fallback para Alchemy funciona

### Arquivos relevantes:
- `convex/nftOwnership.ts` - Mutations e queries (PRONTO)
- `lib/nft/convex-fetcher.ts` - Client-side fetcher (DESATIVADO)
- `app/api/webhook/alchemy/route.ts` - Webhook handler (ATIVO mas dados incompletos)
- `app/page.tsx` - Usa Alchemy direto (REVERTIDO)

### Webhook signing key:
- Variável: `ALCHEMY_WEBHOOK_SIGNING_KEY`
- Valor: (ver Vercel env vars)

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
