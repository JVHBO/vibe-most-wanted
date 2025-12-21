# Security Incident Report

## Overview

This document details security incidents that occurred in the VIBE Most Wanted platform between November-December 2025, the vulnerabilities exploited, and the comprehensive fixes implemented.

---

## Incident Timeline

| Date | Incident | Impact | Status |
|------|----------|--------|--------|
| Dec 10-12, 2025 | Race Condition Exploit | ~12.5M VBMS | **Patched** |
| Dec 21, 2025 | Referral System Abuse | ~38.5M VBMS | **Patched** |

---

## Incident #1: Race Condition in Token Conversion

### Vulnerability Description

A race condition existed in the TESTVBMS-to-VBMS conversion endpoint. The system generated blockchain signatures before deducting the user's balance, allowing attackers to submit multiple simultaneous requests and receive valid signatures for the same balance multiple times.

### Attack Vector

```
1. Attacker has balance of X tokens
2. Attacker sends N parallel requests to /api/convert
3. All N requests read the same balance X (before any deduction)
4. All N requests generate valid signatures
5. Attacker claims N * X tokens on-chain
```

### Resolution

- **Immediate balance deduction**: Balance is now deducted atomically before signature generation
- **Pending conversion tracking**: Failed claims can be recovered without re-exploitation
- **3-minute cooldown**: Rate limiting between conversion attempts

```typescript
// Before: Vulnerable
const signature = await generateSignature(balance);
await deductBalance(balance); // Too late!

// After: Secure
await deductBalance(balance); // Deduct first
const signature = await generateSignature(balance);
```

---

## Incident #2: Referral System Abuse

### Vulnerability Description

The referral system awarded 25,000 TESTVBMS per successful referral without adequate verification. Attackers created networks of fake Farcaster accounts to farm referral bonuses.

### Attack Vector

```
1. Create fake Farcaster account (minimal requirements)
2. Use referral link from main account
3. Claim 25,000 TESTVBMS bonus
4. Repeat with new fake accounts
5. Convert accumulated TESTVBMS to VBMS
```

### Resolution

- **Referral system disabled**: Temporarily removed pending redesign
- **FID verification required**: All claims require authenticated Farcaster identity
- **Profile creation restrictions**: New profiles require valid Farcaster authentication

---

## Security Measures Implemented

### 1. Authentication Requirements

All sensitive operations now require Farcaster FID verification:

```typescript
if (!fid) {
  throw new Error("Farcaster authentication required");
}
```

### 2. Rate Limiting

- **Claim cooldown**: 3 minutes between conversion attempts
- **API rate limits**: Request throttling on all endpoints

### 3. Transaction Limits

| Limit Type | Value |
|------------|-------|
| Minimum claim | 100 VBMS |
| Maximum claim | 500,000 VBMS |

### 4. Blacklist System

Exploiter addresses are permanently blocked from:
- Token claims
- Economy participation
- Defense deck registration

### 5. Audit Logging

All transactions are logged with:
- Timestamp
- Wallet address
- Farcaster FID
- Amount
- Transaction hash
- IP metadata

---

## Affected Accounts

A total of **109 addresses** were identified as exploiters and permanently blacklisted.

### Distribution

| Incident | Addresses | Total Exploited |
|----------|-----------|-----------------|
| Race Condition | 23 | ~12.5M VBMS |
| Referral Abuse | 86 | ~38.5M VBMS |
| **Total** | **109** | **~51M VBMS** |

---

## Current System Status

| Component | Status |
|-----------|--------|
| Token Claims | Active (with security) |
| Blacklist Enforcement | Active |
| Rate Limiting | Active |
| Audit Logging | Active |
| Referral System | Disabled |

---

## Recommendations for Similar Projects

1. **Deduct before signing**: Never generate blockchain signatures before modifying database state
2. **Implement cooldowns**: All value-transfer endpoints need rate limiting
3. **Verify server-side**: Never trust client-provided identity claims
4. **Monitor patterns**: Set up alerts for unusual activity (rapid claims, high volumes)
5. **Require authentication**: Social features should require verified accounts

---

## Disclosure

This report is published for transparency and to help other projects avoid similar vulnerabilities. The VIBE Most Wanted team is committed to maintaining a secure platform for all users.

---

*Last updated: December 21, 2025*
