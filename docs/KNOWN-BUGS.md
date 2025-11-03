# 🐛 Known Bugs - Vibe Most Wanted

Historical record of bugs discovered and fixed during development.

---

## Bug #6: Achievement Claim Server Error (Address Case Mismatch)

**Date Discovered**: 2025-11-03
**Date Fixed**: 2025-11-03
**Severity**: CRITICAL
**Status**: ✅ FIXED
**Commit**: `5fcfb38`

### Symptom
```
[CONVEX M(achievements:claimAchievementReward)] Server Error
```

Achievement claim would throw generic "Server Error" with no details. The claim button would execute but fail silently in the backend.

### Root Cause

**Address case mismatch between save and query operations:**

1. `checkAndUpdateAchievements` was saving achievements with **original address case** (`0xABC...`)
2. `claimAchievementReward` was querying with **lowercase address** (`0xabc...`)
3. Result: Achievement existed in DB but query couldn't find it!

**Code before fix:**
```typescript
// checkAndUpdateAchievements - SAVING
await ctx.db.insert("achievements", {
  playerAddress,  // ❌ 0xABC... (original case from wallet)
  achievementId: id,
  ...
});

// claimAchievementReward - QUERYING
const normalizedAddress = playerAddress.toLowerCase();
const achievement = await ctx.db
  .query("achievements")
  .withIndex("by_player_achievement", (q) =>
    q.eq("playerAddress", normalizedAddress)  // ❌ 0xabc... (lowercase)
  )
  .first();

// RESULT: achievement === null (not found!)
```

### Why This Was Hard to Debug

1. **Generic error message**: Convex only returned "Server Error" to client
2. **Worked in missions**: `missions.ts` normalized addresses correctly, so the pattern wasn't obvious
3. **Hidden in logs**: Error logs didn't show the specific cause initially
4. **Multiple functions**: Had to normalize 5 different functions consistently

### The Fix

Normalized **ALL** playerAddress fields to lowercase in the entire achievements system:

```typescript
// ✅ ALL FUNCTIONS NOW DO THIS:
handler: async (ctx, args) => {
  const { playerAddress } = args;
  const normalizedAddress = playerAddress.toLowerCase();

  // Use normalizedAddress for ALL DB operations
  await ctx.db.insert("achievements", {
    playerAddress: normalizedAddress,  // ✅ Always lowercase
    ...
  });

  await ctx.db.query("achievements")
    .withIndex("by_player_achievement", (q) =>
      q.eq("playerAddress", normalizedAddress)  // ✅ Always lowercase
    );
}
```

### Functions Updated

1. ✅ `checkAndUpdateAchievements` - Insert + query with lowercase
2. ✅ `claimAchievementReward` - Query with lowercase
3. ✅ `getPlayerAchievements` - Query with lowercase
4. ✅ `getAchievementStats` - Query with lowercase
5. ✅ `getUnclaimedAchievements` - Query with lowercase

### Files Modified

- `convex/achievements.ts` (lines 22, 63, 110, 130, 165, 237, 304)

### Testing

**Before fix:**
- Click "Claim" on completed achievement → "Server Error"
- Convex logs: `ReferenceError: ACHIEVEMENTS_MAP is not defined` (separate issue)
- Achievement exists in DB with uppercase address
- Query returns null

**After fix:**
- Click "Claim" on completed achievement → Success! 🎉
- Coins awarded correctly
- Achievement marked as claimed
- Toast notification shows reward

### Lessons Learned

1. **Always normalize user input**: Wallet addresses should ALWAYS be lowercased
2. **Consistency is key**: All functions touching the same data must use same normalization
3. **Pattern from working code**: Used `missions.ts` as reference (it worked correctly)
4. **Better error messages**: Generic "Server Error" made debugging harder

### Related Bugs

- This bug was initially confused with Bug #5 (ACHIEVEMENTS_MAP issue)
- Both were fixed in same session but had different root causes

### Prevention

To prevent similar issues in the future:

1. **Add helper function** for address normalization:
   ```typescript
   const normalizeAddress = (address: string) => address.toLowerCase();
   ```

2. **Type system**: Consider creating a branded type:
   ```typescript
   type NormalizedAddress = string & { __brand: 'normalized' };
   ```

3. **Database schema**: Document that playerAddress field must ALWAYS be lowercase

4. **Code review**: Check all DB operations use normalized addresses

---

**Previous Bugs:**
- [Bug #5: Deployment Environment Mistake](WHATS-MISSING.md#bug-5)
- [Bug #4: Attack System Freeze](WHATS-MISSING.md#bug-4)
- [Bug #3: Tutorial Blocking Bottom Nav](WHATS-MISSING.md#bug-3)
- [Bug #2: Race Condition](WHATS-MISSING.md#bug-2)
- [Bug #1: PvE Difficulty State](WHATS-MISSING.md#bug-1)

---

**Last Updated**: 2025-11-03
