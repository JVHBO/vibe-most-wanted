# Claude Code Instructions for VIBE Most Wanted

## Convex Deployments

**IMPORTANT:** This project has TWO Convex deployments:

| Environment | Deployment | URL |
|-------------|------------|-----|
| Development | `dev:dazzling-hedgehog-496` | dazzling-hedgehog-496.convex.cloud |
| **Production** | `prod:agile-orca-761` | agile-orca-761.convex.cloud |

### Deploy to Production

**ALWAYS use `--env-file .env.prod` for production operations!**

```bash
# Deploy to production
npx convex deploy --env-file .env.prod

# Run queries in production
npx convex run <function> --env-file .env.prod

# Example
npx convex run profiles:getProfile '{"address": "0x..."}' --env-file .env.prod
```

### Why this matters

The `.env.local` file points to DEV (`dazzling-hedgehog-496`). If you run `npx convex deploy` without `--env-file .env.prod`, it will deploy to DEV instead of PROD!

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

## Security

- Blacklist is in `convex/blacklist.ts`
- 106 exploiters currently banned
- Security report: `SECURITY_INCIDENT_REPORT.md`

## VibeFID Miniapp

**VibeFID** is a standalone miniapp extracted from vibe-most-wanted.

| Project | Repo | Miniapp URL |
|---------|------|-------------|
| VibeFID | `vibefid` | `https://farcaster.xyz/miniapps/aisYLhjuH5_G/vibefid` |
| VBMS (main) | `vibe-most-wanted` | `https://farcaster.xyz/miniapps/UpOGC4pheWVP/vbms` |

### Shared Convex Backend
Both projects use the SAME Convex deployment (`prod:agile-orca-761`). When deploying:
- Deploy from `vibe-most-wanted` to ensure all functions are included
- VibeFID-specific functions: `neynarScore`, `farcasterCards`

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
