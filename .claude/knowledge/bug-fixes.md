# Bug Fixes - Vibe Most Wanted

## Bug #6 - Twitter Profile Pictures Not Loading (Nov 4, 2025)

### Problem
- User profile pictures from Twitter were not loading on the site
- Only 1 out of 4 users with Twitter connected had a profile image URL set
- The URL that was set used `unavatar.io`, which was frequently returning 503 Service Unavailable errors
- System was showing DiceBear generated avatars instead of real Twitter photos

### Root Causes
1. **unavatar.io Unreliable**: Service frequently down with 503 errors
2. **Missing Database Field**: `twitterProfileImageUrl` field existed in schema but was not populated for most users
3. **OAuth Not Saving Photos**: Twitter OAuth callback was requesting `profile_image_url` but users who connected before the full implementation didn't have URLs saved

### Solution Implemented

#### 1. Code Changes
- **app/page.tsx:61-83**: Updated `getAvatarUrl()` to ONLY use real Twitter CDN URLs (`pbs.twimg.com`)
  - Skips any URLs from `unavatar.io` (unreliable)
  - Falls back to DiceBear if no real Twitter URL exists
  - Upgrades image quality from `_normal` (48x48) to `_400x400`

#### 2. Schema Already Ready
- **convex/schema.ts:108**: `twitterProfileImageUrl: v.optional(v.string())` field exists
- **convex/profiles.ts:119**: Mutation already accepts `twitterProfileImageUrl` parameter
- **app/api/auth/twitter/callback/route.ts:91-104**: OAuth callback already fetches and saves `profile_image_url`

#### 3. Manual Profile Picture Update
Used Playwright browser automation to:
1. Visit each Twitter profile page
2. Extract real `pbs.twimg.com` image URLs
3. Update all 4 users in Convex database

**URLs Updated:**
- `@Lowprofile_eth`: `https://pbs.twimg.com/profile_images/1959899025710129152/FzMI9Br__400x400.jpg`
- `@0xsweets`: `https://pbs.twimg.com/profile_images/1880036873260675072/9MOlEZhr_400x400.jpg`
- `@jayabs_eth`: `https://pbs.twimg.com/profile_images/1866404302337515520/2KG_-R-O_400x400.jpg`
- `@claudeIAbyjvhbo`: `https://pbs.twimg.com/profile_images/1982225853766356992/0Bzwsidt_400x400.png`

### Files Modified
- `app/page.tsx` - Updated avatar URL logic to skip unavatar.io (home page)
- `app/profile/[username]/page.tsx:650-692` - Updated avatar URL logic to match home page (profile pages)
- `update-all-pfps-final.cjs` - Script to update all profile pictures (temporary, can be deleted)

### Testing
1. Verified all 4 users now have real `pbs.twimg.com` URLs in database
2. Confirmed images load correctly from Twitter CDN on home page
3. Confirmed images load correctly from Twitter CDN on profile pages
4. Hard refresh (Ctrl+Shift+R) shows real profile pictures everywhere

### Future OAuth Connections
When new users connect Twitter (or existing users reconnect):
1. OAuth callback in `app/api/auth/twitter/callback/route.ts` automatically fetches `profile_image_url`
2. Real Twitter CDN URL is saved to `twitterProfileImageUrl` field
3. No manual intervention needed

### Lessons Learned
1. **Don't rely on third-party avatar services** - Use official CDN URLs when available
2. **Test OAuth flow end-to-end** - Verify data is actually saved to database
3. **Fallback strategy is critical** - DiceBear works as reliable fallback when real photos unavailable

### Related Commits
- `c92ddf5` - fix: Skip unavatar.io URLs due to 503 errors, only use pbs.twimg.com
- `039ff2d` - feat: Add regional language background music files
- `2936573` - fix: Add twitterProfileImageUrl to upsertProfile mutation args
- `c8046ca` - feat: Load real Twitter profile pictures instead of generated avatars
- `d0003e3` - fix: Show real Twitter profile pictures on profile pages
