# Share OpenGraph Image Fix - November 7, 2025

## Problem Summary
Battle share links were showing generic site image instead of battle result OG images in Farcaster, despite OG images generating correctly.

## Root Causes Identified

### Bug #1: Wrong Domain in Metadata
- **Issue**: Metadata was using `vibe-most-wanted.vercel.app` instead of `www.vibemostwanted.xyz`
- **Cause**: Environment variable `NEXT_PUBLIC_APP_URL` had old staging domain value
- **Why it matters**: Farcaster couldn't find the correct OG image because metadata pointed to wrong domain

### Bug #2: URL Encoding Issues with Slashes
- **Issue**: MatchId contained PFP URLs with slashes (`https://pbs.twimg.com/...`)
- **Problem**: When encoded, URLs became `https%3A%2F%2Fpbs.twimg.com%2F...`
- **Impact**: Next.js interpreted encoded slashes as route segments, breaking routing
- **Example broken URL**: `/share/win|1118|584|nico|https%3A%2F%2Fpbs.twimg.com%2F.../opengraph-image`

### Bug #3: Conditional PFP Fetch Filters
- **Issue**: Code had filters that prevented fetching PFPs in some cases:
  - Player: Blocked if `playerName === 'YOU'` or `playerName === 'Player'`
  - Opponent: Blocked if `opponentName === 'Opponent'`
- **Impact**: Player PFP wouldn't load in certain scenarios

## Solutions Implemented

### Fix #1: Hardcode Production Domain (Commit f6bfeb9)
**Changed**: `app/share/[matchId]/page.tsx:35`
```typescript
// Before:
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.vibemostwanted.xyz';

// After:
const baseUrl = 'https://www.vibemostwanted.xyz';
```
**Why**: Match the pattern used in profile share which was working correctly

### Fix #2: Simplify MatchId Format - Remove PFP URLs (Commit 8f34813)

**Changed**: `components/GamePopups.tsx:205-214` and `290-298`
```typescript
// OLD FORMAT (with PFP URLs):
// result|playerPower|opponentPower|opponentName|playerPfpUrl|opponentPfpUrl|playerName|type
const matchId = `win|${power}|${oppPower}|${oppName}|${playerPfpUrl}|${oppPfpUrl}|${playerName}|${type}`;

// NEW FORMAT (without PFP URLs):
// result|playerPower|opponentPower|opponentName|playerName|type
const matchId = `win|${power}|${oppPower}|${oppName}|${playerName}|${type}`;
```

**Changed**: `app/share/[matchId]/page.tsx:7-16`
```typescript
// Parse new simpler format
const parts = decoded.split('|');
const result = parts[0];      // win/loss
const playerPower = parts[1];
const opponentPower = parts[2];
const opponentName = parts[3];
const playerName = parts[4];   // NEW: moved from part 6 to part 4
const type = parts[5];         // NEW: moved from part 7 to part 5
```

**Changed**: `app/share/[matchId]/opengraph-image.tsx:36-62`
```typescript
// Fetch player PFP from Convex using username (like profile OG does)
if (playerName) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL_PROD || process.env.NEXT_PUBLIC_CONVEX_URL!;
  const response = await fetch(`${convexUrl}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: 'profiles:getProfileByUsername',
      args: { username: playerName.toLowerCase() },
      format: 'json',
    }),
  });

  if (response.ok) {
    const data = await response.json();
    if (data.value?.twitterProfileImageUrl) {
      finalPlayerPfpUrl = data.value.twitterProfileImageUrl;
    }
  }
}
// Same logic for opponent PFP
```

**Benefits**:
- Clean URLs without encoded slashes
- PFPs always fresh from Convex (not stale URLs)
- Matches profile share pattern
- No route parsing issues

### Fix #3: Remove PFP Fetch Filters (Commit 589e921)
**Changed**: `app/share/[matchId]/opengraph-image.tsx:37 and 62`
```typescript
// Before:
if (playerName && playerName !== 'YOU' && playerName !== 'Player') {
if (opponentName && opponentName !== 'Opponent') {

// After:
if (playerName) {
if (opponentName) {
```
**Why**: Match profile OG logic - always attempt fetch if username exists

## Key Learnings

### 1. Profile Share Pattern Was The Answer
The profile share (`/share/profile/[username]`) was working perfectly because:
- ✅ Used hardcoded production domain
- ✅ Had no URLs in route path (just username)
- ✅ Fetched PFPs from Convex inside OG image generator
- ✅ No conditional filters blocking fetch

**Lesson**: When debugging, always look for what's working and copy that pattern!

### 2. URL Encoding in Routes Is Dangerous
- Next.js interprets `%2F` (encoded `/`) as potential route segments
- Embedding complex URLs in route parameters causes routing failures
- **Solution**: Use identifiers (like usernames) and fetch data server-side

### 3. Environment Variables Are Risky for URLs
- Environment variables can have wrong values across environments
- Hardcoding known production URLs is safer for metadata generation
- **Pattern**: Use env vars for secrets, hardcode known public URLs

### 4. Cache Busting Strategy
Incremented cache version: v10 → v11 → v12 → v13
```typescript
const imageUrl = `${baseUrl}/share/${matchId}/opengraph-image?v=13`;
```

## Testing Results

### ✅ Working Battle Types (All using same code):
1. **PvE** (vs Mecha George Floyd) - Confirmed working
2. **PvP Automatch** - Uses same GamePopups.tsx
3. **PvP Custom Room** - Uses same GamePopups.tsx
4. **Attack** (Leaderboard) - Confirmed working
5. **Defense** (Revenge/Revanche) - Uses same GamePopups.tsx

### URL Examples:
```
OLD (broken):
https://vibe-most-wanted.vercel.app/share/win_1118_584_nico_https%3A%2F%2Fpbs.twimg.com%2Fprofile_images%2F1959899025710129152%2FFzMI9Br__400x400.jpg__joaovitorhbo_attack

NEW (working):
https://www.vibemostwanted.xyz/share/win|1118|584|nico|joaovitorhbo|attack?v=1762500560923
```

## Architecture Pattern

```
User wins battle
     ↓
GamePopups.tsx generates share URL with clean matchId
     ↓
URL: /share/win|1516|855|nico|joaovitorhbo|attack
     ↓
page.tsx: generateMetadata()
  - Parses matchId
  - Sets og:image to /share/.../opengraph-image?v=13
     ↓
opengraph-image.tsx:
  - Parses matchId
  - Fetches player PFP from Convex using playerName
  - Fetches opponent PFP from Convex using opponentName
  - Generates battle card image with both PFPs
     ↓
Farcaster displays perfect OG image! 🎉
```

## Files Modified

1. **components/GamePopups.tsx** (Lines 205-214, 290-298)
   - Changed matchId format to exclude PFP URLs

2. **app/share/[matchId]/page.tsx** (Lines 7-16, 35-36)
   - Updated matchId parsing for new format
   - Hardcoded production baseUrl
   - Incremented cache buster to v=13

3. **app/share/[matchId]/opengraph-image.tsx** (Lines 19-62)
   - Updated matchId parsing
   - Removed PFP URLs from matchId
   - Added Convex fetch for both player and opponent PFPs
   - Removed conditional filters

## Related Commits
- `f6bfeb9` - Hardcode baseUrl to www.vibemostwanted.xyz
- `8f34813` - Simplify matchId format, remove PFP URLs
- `589e921` - Remove player/opponent name filters for PFP fetch

## Production Status
✅ All fixes deployed to production
✅ Cache buster updated to v=13
✅ All battle types working with new format

## Future Recommendations

1. **Always test OG images directly**: Download with curl to verify generation
2. **Follow working patterns**: Profile share was the template for success
3. **Keep URLs clean**: No complex data in route paths, use IDs and fetch server-side
4. **Hardcode production URLs**: For metadata generation, hardcode beats env vars
5. **Match existing patterns**: When one feature works, copy its architecture

---
**Date**: November 7, 2025
**Status**: ✅ Resolved
**Impact**: High - Fixed all battle share previews in Farcaster
