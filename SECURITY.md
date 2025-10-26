# 🔒 SECURITY - Web3 Authentication System

## ⚠️ CRITICAL: READ BEFORE WEB3 INTEGRATION

This document explains the security measures implemented to protect user data and prevent unauthorized access when integrating with Web3 contracts.

## 🎯 Threat Model

### Attacks Prevented:
1. **Impersonation** - Only wallet owners can sign messages
2. **Replay Attacks** - Nonces ensure each signature is used only once
3. **Man-in-the-Middle** - Cryptographic signatures provide proof
4. **Expired Signatures** - 5-minute timeout on all signed messages
5. **Stat Manipulation** - Cannot fake wins/losses without wallet signature

### Current Vulnerabilities:
- ⚠️ **TODO**: Full ECDSA verification (currently format validation only)
- ⚠️ **TODO**: Rate limiting on mutations (prevent spam)
- ⚠️ **TODO**: Audit logging for suspicious activity

## 🔐 How It Works

### 1. Nonce System
Each wallet has a nonce (counter) that increments with every signed action:
- Prevents replay attacks
- Stored in `nonces` table in Convex
- Must match expected nonce or action is rejected

### 2. Message Signing
```
Format: "{Action}: {address} nonce:{N} at {timestamp}"
Example: "Update stats: 0x123...abc nonce:5 at 1704067200000"
```

### 3. Verification Flow
```
User Action → Sign Message → Send to Convex
                ↓
            Convex Mutation:
            1. Verify signature (ECDSA)
            2. Check timestamp (< 5min)
            3. Verify nonce (prevent replay)
            4. Execute action
            5. Increment nonce
```

## 🛡️ Protected Mutations

### Profiles (convex/profiles.ts)
- ✅ `updateStatsSecure` - Update player stats
- ✅ `updateDefenseDeckSecure` - Update defense deck
- ✅ `incrementStatSecure` - Increment wins/losses

### PvP Rooms (TODO)
- ⏳ `createRoomSecure` - Create game room
- ⏳ `joinRoomSecure` - Join game room
- ⏳ `updateCardsSecure` - Select cards for battle

## 📝 Usage Example

### Frontend (React/Next.js)
```typescript
import { useWalletClient } from 'wagmi';
import { SecureConvexClient } from '@/lib/web3-auth';

function MyComponent() {
  const { data: walletClient } = useWalletClient();
  const address = walletClient?.account.address;

  async function updateMyStats() {
    // Create secure client
    const client = new SecureConvexClient(walletClient, address);

    // Update stats (automatically signs and verifies)
    await client.updateStats({
      totalPower: 1000,
      totalCards: 10,
      // ... other stats
    });
  }
}
```

### Direct API Usage
```typescript
import { createAuthPayload } from '@/lib/web3-auth';
import { api } from '@/convex/_generated/api';

// Get signature
const auth = await createAuthPayload(signer, address, "Update stats");

// Call secure mutation
await convex.mutation(api.profiles.updateStatsSecure, {
  address,
  signature: auth.signature,
  message: auth.message,
  stats: { ... }
});
```

## 🚨 Migration Plan

### Phase 1: Add Secure Mutations (DONE)
- ✅ Created `convex/auth.ts` with verification logic
- ✅ Added `nonces` table to schema
- ✅ Created secure versions of critical mutations
- ✅ Created frontend helpers in `lib/web3-auth.ts`

### Phase 2: Gradual Migration (IN PROGRESS)
- ⏳ Keep old mutations working (backward compatibility)
- ⏳ Update frontend to use secure mutations gradually
- ⏳ Monitor for any issues
- ⏳ Document all changes

### Phase 3: Enforce Security (BEFORE WEB3 CONTRACTS)
- ⏳ Make secure mutations mandatory
- ⏳ Remove old insecure mutations
- ⏳ Add rate limiting
- ⏳ Implement full ECDSA verification
- ⏳ Security audit

## 🔍 Testing Security

### Test Invalid Signature
```bash
# Should FAIL with "Invalid signature"
await convex.mutation(api.profiles.updateStatsSecure, {
  address: "0x123",
  signature: "0xFAKE",
  message: "Update stats: 0x123 nonce:0 at 1704067200000",
  stats: { ... }
});
```

### Test Replay Attack
```bash
# Use same signature twice - second should FAIL
const auth = await createAuthPayload(...);

await convex.mutation(..., auth); // ✅ Works
await convex.mutation(..., auth); // ❌ Fails (nonce mismatch)
```

### Test Expired Signature
```bash
# Create message with old timestamp - should FAIL
const oldMessage = "Update stats: 0x123 nonce:0 at 1000000000";
// Will fail: "Expired signature"
```

## 📊 Monitoring

### Convex Logs
```bash
cd vibe-most-wanted
npx convex logs --prod

# Look for:
# ✅ SECURE: Stats updated for 0x...
# ❌ Unauthorized: Invalid signature
# ❌ Invalid nonce - possible replay attack
```

### Security Metrics (TODO)
- Failed authentication attempts per address
- Average nonce increment rate (detect abnormal activity)
- Expired signature attempts (may indicate attack)

## 🔧 Troubleshooting

### "Invalid nonce" Error
**Cause**: Nonce in message doesn't match database
**Fix**: Get fresh nonce with `getNonce(address)` before signing

### "Expired signature" Error
**Cause**: Timestamp in message is > 5 minutes old
**Fix**: Create new message with current timestamp

### "Invalid signature" Error
**Cause**: Signature doesn't match message or address
**Fix**:
1. Ensure wallet is connected
2. Sign correct message format
3. Check that address matches signer

## 🚀 Production Checklist

Before enabling Web3 contracts:

- [ ] Full ECDSA signature verification implemented
- [ ] All critical mutations use secure versions
- [ ] Old insecure mutations removed
- [ ] Rate limiting enabled (prevent spam)
- [ ] Audit logging configured
- [ ] Security testing completed
- [ ] Penetration testing done
- [ ] Bug bounty program considered

## 📚 Resources

- Ethereum Signature Standards: https://eips.ethereum.org/EIPS/eip-191
- ECDSA Verification: https://docs.ethers.org/v6/api/crypto/#Signature
- Convex Security Best Practices: https://docs.convex.dev/

## 🐛 Report Security Issues

**NEVER** report security vulnerabilities publicly!

Contact: [Add secure contact method]

---

**Last Updated**: 2025-10-26
**Status**: ⚠️ SECURE MUTATIONS AVAILABLE - MIGRATION IN PROGRESS
