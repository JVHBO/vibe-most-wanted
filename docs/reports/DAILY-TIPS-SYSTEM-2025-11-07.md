# Daily Gaming Tips System - November 7, 2025

## Summary
Implemented automated daily gaming tip notifications sent via Farcaster to all players who have enabled notifications. Tips rotate through 8 different messages to keep content fresh.

## Implementation

### 1. Tip Rotation Function
**File**: `convex/notifications.ts` (lines 252-381)

Added `sendPeriodicTip` internal mutation that:
- Fetches all notification tokens from database
- Maintains rotation state to track which tip was sent last
- Sends current tip to all users
- Rotates to next tip for tomorrow
- Handles errors, rate limits, and invalid tokens

### 2. Gaming Tips Array
Created 8 rotating tips covering different game features:

1. **Chinese Language Bonus** - "Playing in Chinese (中文) gives you more coins AND changes the music! Try it now! 🎵"
2. **Attack Strategy** - "Attack players from the leaderboard to steal their coins! The higher their rank, the bigger the reward! 👑"
3. **Defense Strategy** - "Set up your Defense Deck to protect your coins when offline! Choose your 5 best cards wisely! 🃏"
4. **Power Boost** - "Open more packs to get stronger cards! Higher power = more wins = more coins! 💰"
5. **PvP Master** - "Challenge other players in PvP rooms for epic battles! Win or lose, you always earn coins! 🏆"
6. **Daily Rewards** - "Log in every day to claim your daily coins! The more you play, the more you earn! 🎁"
7. **Card Collection** - "Collect all rare cards to dominate battles! Each card has unique power - find your favorites! ✨"
8. **Music Easter Egg** - "Switch languages to discover different music tracks! Each language has its own vibe! 🌍"

### 3. Cron Job Schedule
**File**: `convex/scheduledTips.ts`

```typescript
crons.daily(
  "send-periodic-tip",
  { hourUTC: 18, minuteUTC: 0 }, // 6 PM UTC = 2 PM EST / 11 AM PST
  internal.notifications.sendPeriodicTip
);
```

**Schedule**:
- **Time**: 6:00 PM UTC (18:00)
- **Frequency**: Daily
- **Different from login reminder**: Login reminder runs at 4:05 AM UTC
- **Reasoning**: Afternoon time when players are likely active

### 4. Database Schema
**File**: `convex/schema.ts` (lines 247-251)

Added `tipRotationState` table:
```typescript
tipRotationState: defineTable({
  currentTipIndex: v.number(), // Index of the next tip to send (0-7)
  lastSentAt: v.number(), // Timestamp of last tip sent
})
```

## How It Works

1. **Daily at 6 PM UTC**, Convex cron job triggers `sendPeriodicTip`
2. Function retrieves or initializes tip rotation state
3. Gets current tip based on `currentTipIndex % 8`
4. Fetches all notification tokens from database
5. Sends notification to each user via Farcaster API
6. Tracks success/failure for each send
7. Updates `currentTipIndex` to next tip (wraps around after tip 8)
8. Logs results: sent count, failed count, total users

## Initial Test Results

Successfully tested with one-time notification (Chinese tip):
- **Script**: `scripts/send-chinese-tip-notification.js`
- **Results**: 139 successful, 1 failed out of 140 total tokens
- **Success rate**: 99.3%

## Deployment

Deployed to production Convex:
```bash
CONVEX_DEPLOYMENT=prod:scintillating-crane-430 npx convex deploy
```

**Status**: ✅ Deployed successfully

## Future Improvements

1. **Add more tips** - Expand from 8 to 12-15 tips for more variety
2. **Tip categories** - Group tips by feature (economy, combat, social)
3. **A/B testing** - Track which tips drive most engagement
4. **Personalized tips** - Send tips based on player activity/level
5. **Seasonal tips** - Special tips for events or updates
6. **User feedback** - Let players rate tips to improve content

## Files Modified

1. `convex/notifications.ts` (lines 252-381)
   - Added `GAMING_TIPS` array with 8 tips
   - Added `sendPeriodicTip` internal mutation

2. `convex/scheduledTips.ts` (entire file)
   - Created cron job for daily 6 PM UTC schedule

3. `convex/schema.ts` (lines 247-251)
   - Added `tipRotationState` table

4. `scripts/send-chinese-tip-notification.js` (created)
   - One-time test script for Chinese language tip

## Related Systems

- **Login Reminder**: Runs at 4:05 AM UTC (`convex/crons.ts` line 84)
- **Notification Tokens**: Managed in `notificationTokens` table
- **Farcaster API**: Uses tokens and URLs from `notificationTokens`

## Key Learnings

1. **Timing Matters**: Scheduled tips at different time than login reminder (6 PM vs 4 AM) to avoid notification fatigue
2. **State Management**: Rotating tips requires persistent state (`tipRotationState` table)
3. **Error Handling**: Must handle invalid tokens, rate limits, and network failures gracefully
4. **Content Quality**: Tips should be actionable, specific, and provide value
5. **Testing First**: One-time script validated system before automating

---
**Date**: November 7, 2025
**Status**: ✅ Deployed and Active
**Next Tip**: Will be sent at 6:00 PM UTC today
