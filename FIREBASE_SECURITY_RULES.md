# Firebase Realtime Database Security Rules

## Current Status: ⚠️ INSECURE - Public Read/Write

**IMPORTANT:** The current Firebase setup likely has public read/write access for development. This MUST be changed before production!

## Recommended Security Rules

```json
{
  "rules": {
    // Profiles - anyone can read, only owner can write
    "profiles": {
      "$address": {
        ".read": true,
        ".write": "auth != null && auth.token.address.toLowerCase() === $address.toLowerCase()"
      }
    },

    // Usernames - anyone can read, system can write
    "usernames": {
      ".read": true,
      "$username": {
        ".write": "auth != null"
      }
    },

    // Player Matches - anyone can read, only owner can write
    "playerMatches": {
      "$address": {
        ".read": true,
        ".write": "auth != null && auth.token.address.toLowerCase() === $address.toLowerCase()"
      }
    },

    // PvP Rooms - participants can read/write, auto-deleted after 1 hour
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": "auth != null"
      }
    },

    // Matchmaking Queue - players can add/remove themselves
    "matchmaking": {
      "$address": {
        ".read": true,
        ".write": "auth != null && auth.token.address.toLowerCase() === $address.toLowerCase()"
      }
    }
  }
}
```

## Why These Rules?

### 1. Profiles
- **Read: Public** - Anyone can view profiles and leaderboard
- **Write: Owner Only** - Prevents cheating by editing other players' stats

### 2. Usernames
- **Read: Public** - Anyone can check username availability
- **Write: Authenticated** - Only logged-in users can claim usernames

### 3. Player Matches
- **Read: Public** - Match history is public (like on blockchain)
- **Write: Owner Only** - Only you can record your own matches

### 4. Rooms
- **Read: Public** - Players need to see room status
- **Write: Authenticated** - Any authenticated player can update room state
- **Note:** Should add auto-cleanup for rooms older than 1 hour

### 5. Matchmaking
- **Read: Public** - System needs to find waiting players
- **Write: Owner Only** - You can only add/remove yourself from queue

## Authentication Setup

Currently, the app uses wallet addresses as identity but Firebase doesn't have built-in wallet auth. You have two options:

### Option A: Firebase Custom Tokens (Recommended)
Create an API endpoint that verifies wallet signature and issues Firebase custom token:

```typescript
// app/api/auth/firebase/route.ts
import { getAuth } from 'firebase-admin/auth';

export async function POST(req: Request) {
  const { address, signature, message } = await req.json();

  // Verify signature proves ownership of wallet
  const isValid = verifySignature(address, signature, message);

  if (isValid) {
    const customToken = await getAuth().createCustomToken(address, {
      address: address.toLowerCase()
    });
    return Response.json({ token: customToken });
  }

  return Response.json({ error: 'Invalid signature' }, { status: 401 });
}
```

### Option B: Temporary Public Access (NOT FOR PRODUCTION)
For development/testing only:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## Anti-Cheat Measures

Even with security rules, clients can still cheat since they control the game logic. Consider:

1. **Server-Side Validation**
   - Move game logic to Cloud Functions
   - Validate card powers match on-chain metadata
   - Verify match results before recording

2. **On-Chain Verification**
   - Query Alchemy API to verify NFT ownership
   - Check actual card attributes from contract
   - Prevent fake card data

3. **Rate Limiting**
   - Limit matches per hour per player
   - Prevent spam attacks on Firebase

4. **Anomaly Detection**
   - Flag suspiciously high win rates
   - Detect impossible power levels
   - Alert admins to cheaters

## Implementation Steps

1. **Set up Firebase Admin SDK** (for custom tokens)
2. **Create auth endpoint** to issue tokens
3. **Update client** to get token before Firebase operations
4. **Apply security rules** in Firebase Console
5. **Test thoroughly** before deploying

## Current Risks Without Auth

❌ Players can edit other players' profiles
❌ Players can fake match results
❌ Players can manipulate leaderboard
❌ Players can spam database with fake data
❌ No way to ban cheaters

## Migration Plan

1. Deploy security rules gradually:
   - Start with read-only rules
   - Add write restrictions one collection at a time
   - Test after each change

2. Monitor Firebase Console for denied requests

3. Update app to handle auth errors gracefully

---

**Status:** 🔴 NOT IMPLEMENTED - Development only
**Priority:** 🚨 CRITICAL - Must fix before production
**Effort:** ~2-4 hours for basic implementation
