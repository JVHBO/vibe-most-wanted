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

### Exploiters (23 addresses)

| Username | Address | Amount Stolen | Claims |
|----------|---------|---------------|--------|
| faqih | 0x0395df57f73ae2029fc27a152cd87070bcfbd4a4 | 1,283,500 | 156 |
| aliselalujp | 0xbb367d00000f5e37ac702aab769725c299be2fc3 | 1,096,804 | 128 |
| fvgf | 0x0e14598940443b91d097b5fd6a89b5808fe35a6b | 1,094,400 | 132 |
| ndmcm | 0x0230cf1cf5bf2537eb385772ff72edd5db45320d | 1,094,400 | 132 |
| ral | 0x9ab292251cfb32b8f405ae43a9851aba61696ded | 1,094,400 | 132 |
| fransiska | 0xd4c3afc6adce7622400759d5194e5497b162e39d | 1,090,100 | 124 |
| jessica | 0xa43ae3956ecb0ce00c69576153a34db42d265cc6 | 993,303 | 114 |
| khajoel | 0x04c6d801f529b8d4f118edb2722d5986d25a6ebf | 991,800 | 114 |
| azwar | 0xff793f745cb0f1131f0614bf54f4c4310f33f0ce | 991,800 | 114 |
| uenxnx | 0x4ab24dac98c86778e2c837e5fa37ec5a2fdbffc0 | 803,900 | 97 |
| rapoer | 0xf73e59d03d45a227e5a37aace702599c15d7e64d | 455,900 | 47 |
| desri | 0xc85a10e41fdea999556f8779ea83e6cd1c5d0ded | 303,400 | 37 |
| venombaseeth | 0x0f6cfb4f54fec1deca1f43f9c0294ff945b16eb9 | 270,700 | 34 |
| hdhxhx | 0x8cc9746c2bb68bd8f51e30ad96f67596b25b141b | 98,400 | 12 |
| jxjsjsjxj | 0xdeb2f2f02d2d5a2be558868ca8f31440c73d3091 | 98,400 | 12 |
| aaggwgxgch | 0x2cb84569b69265eea55a8ceb361549548ca99749 | 98,400 | 12 |
| nxnckck | 0xcd890b0f59d7d1a98ffdf133d6b99458324e6621 | 98,400 | 12 |
| hshdjxjck | 0xcda1b44a39cd827156334c69552d8ecdc697646f | 98,400 | 12 |
| jsjxjxjd | 0x32c3446427e4481096dd96e6573aaf1fbbb9cff8 | 98,400 | 12 |
| 9 | 0xce1899674ac0b4137a5bb819e3849794a768eaf0 | 98,400 | 12 |
| komeng | 0x0d2450ada31e8dfd414e744bc3d250280dca202e | 95,700 | 11 |
| miya | 0x1915a871dea94e538a3c9ec671574ffdee6e7c45 | 95,700 | 11 |
| wow | 0x705d7d414c6d94a8d1a06aeffc7cd92882480bd9 | 60,900 | 7 |

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

### Exploiters (86 addresses)

| Username | Address | Amount Stolen | Claims |
|----------|---------|---------------|--------|
| dobronx | 0x93ab9ef9c10bdd9db53e8ec325a42118e0ac1486 | 4,115,000 | 100 |
| pakhaji | 0x94e7f886caf987a0029e37ac820982c80a13c148 | 4,115,000 | 100 |
| yolo | 0x42a6b996b0547d2d3743b79dde377d98818abd32 | 1,490,000 | 59 |
| gm | 0x844a8e4da76bd08761f36bdba1f9746d58f9480d | 1,202,500 | 52 |
| dbd | 0x1a2495bf4ed2aaf46e4834ea21d66109fa243f33 | 1,152,500 | 50 |
| tyrionn | 0x4a2ba466a447d6a2010f4acfa7625db3c3c7cfc9 | 925,000 | 46 |
| berly | 0x986686aced770960fe8a55d37545ebd90102ca97 | 832,500 | 43 |
| anonnux | 0x8f1af8261edae03a3680d1359228d2dac34eaec5 | 790,000 | 52 |
| nody69 | 0xb4909a4c636c45943c72921542ece5cd5d228cdb | 750,000 | 40 |
| ycbibvcyrvyb | 0x8c84464ac8a4110285cf83d76b0c91d50ecf5fd9 | 750,000 | 45 |
| jamie | 0xe95dd130f8a1ac6e6c6fd8ac0dd9d14a80b3bc4c | 750,000 | 40 |
| gyfjiybyb | 0x4d1ef290857226044b0a9c6916ef4b624967bb12 | 675,000 | 38 |
| basreng | 0xc48e66a008cc7195c048d8b3a95bc48f96c26fd2 | 675,000 | 38 |
| ofkdbd | 0x8dcfeaba1109ab99d11069c33c8e20bfd64a3ced | 632,500 | 37 |
| xenna | 0xbcfbc3e9d1eac6684bc92d9ab6d117bf1c83675f | 632,500 | 37 |
| raees18 | 0xf494e397fd54efea84f39b51df06811b1657c373 | 632,500 | 37 |
| rendy | 0x03bf270d1c8429a0b378410c0ca9a07ca258cf79 | 592,500 | 35 |
| tayyeba | 0x2e4078e117fc3cf837042f063c522d6521f8baa3 | 592,500 | 35 |
| basdabonezzz | 0x9a50ff911c2500b494995e4419be65df3214d1d4 | 592,500 | 35 |
| tkjfjf | 0x72fe79e122f447a3ba3d600d33cb74e5e01f2649 | 555,000 | 34 |
| bdbs | 0x92deaf8a0d953cdd64df5232939ab04ab5699604 | 555,000 | 34 |
| boli | 0xa24f8ca04e013911c4af840822119836f1624050 | 555,000 | 34 |
| raa | 0x5dfc840a696e207ea58f8c87be8fa808aaab366d | 555,000 | 34 |
| foom | 0x6e3b59af52ce6f21fdb29ca2f730331f13a1952a | 555,000 | 34 |
| xennaberryl | 0x4c7c8691b50dd0f070c25165b6ae839c8bcf3ee9 | 555,000 | 34 |
| bdbsvdvs | 0x2b0e2df099eee131becf3f4549a87944227c64e9 | 555,000 | 37 |
| tsaqieff | 0x79189269b91c91d3db41d33e3c266f4b704230b0 | 555,000 | 34 |
| irurh | 0x5678fb8b977d85a499b3d979fad7f38282d1441d | 555,000 | 34 |
| ltot | 0xfc84fc61ef5cc8677118a56f9c1b155fe3db97ea | 555,000 | 34 |
| bsbsbsur | 0x27471fb793704bfa67e00e357258c40880b2d9d5 | 555,000 | 34 |
| oyykbt | 0xf5fa00bc2ad069b8d1e06770ee640b3f53b73e4d | 555,000 | 34 |
| vavsvs | 0xc16f0b36e296d4fa710a1cde7a7cc73033b45875 | 555,000 | 34 |
| bsbshs | 0xe98d89c1c63ca79f75260fb48003aad4a63ff303 | 555,000 | 34 |
| pyynf | 0x7ebc13e06ad0e52ec74c58aa2cc8eebf43e1cd23 | 555,000 | 38 |
| tare | 0x3b2848c24046708b86bea8f86a69fbd942ebcf3e | 520,000 | 33 |
| haji | 0x7de544a076e163a8050d4b7cd0d67464836b54e9 | 520,000 | 33 |
| kulay | 0xbb3d7721ab44d5a2e4d509d0223d77581d18911b | 520,000 | 33 |
| soft | 0xcbf6e8efc0720c7fd99bce14b7fa5578af75a870 | 520,000 | 33 |
| uma | 0x9a9eaa9c7569ac36087b9685c989aeb5ae89ea8a | 520,000 | 32 |
| omaga | 0x588dcd65f44572f3e5ce323b4570e30025da755a | 520,000 | 32 |
| berryl | 0x987d2f1cf8ea90a75ad11851ad356380124eda4c | 520,000 | 34 |
| bebehd | 0x9d56d4e3ff49ccca7e0f9590c64ffd262e8c83c0 | 520,000 | 35 |
| haha | 0x8dd19c3f844095ca321a10f6d95d621f6bd26ba3 | 520,000 | 32 |
| gilame | 0xe9cf12695d5613143f5c90f98dec50299648cf91 | 520,000 | 33 |
| bsbs | 0xd68b474126ab6042391db26cdf86e6a4da12ce36 | 520,000 | 32 |
| bankrbot | 0x826acbaf69cb9878fb1188e07558908285f556ae | 520,000 | 32 |
| khaleed | 0x6216b24345b8ad3b8fbcaf5c37262b07781a29ef | 520,000 | 33 |
| jonsnow | 0x17b0e93e326f5221fad0b9f8f873a40303a3565a | 520,000 | 32 |
| kim | 0x067a3c235b8c7f2127c5ea504ab253ac7bd3ab18 | 520,000 | 32 |
| haruto | 0x5c51fb6fb7dbd99aa0c3ff05b6b33cd1fcd0e1c0 | 457,500 | 30 |
| renz420 | 0x40bc7906e5dd887d0df7a04c125b8ee99ffb999b | 422,500 | 29 |
| mexxeth | 0x34d1163f8f3d44c38bacbb6a8c86acb62cd7e4fb | 390,000 | 42 |
| ombray | 0xc1fc1b3c4818ba8d93b1ecfe3363c967d44efe6c | 322,500 | 23 |
| gunvir | 0x0d8c3bdc2ed9e10668ec802cd704e724376158fc | 322,500 | 25 |
| qowhec | 0xb5387885faa8194b59837549b67ad6fe97697dcb | 322,500 | 34 |
| pythvsvs | 0xbde56569fbdce28d41291b46ca4f028e38f99253 | 270,000 | 34 |
| yeowheidh | 0xa813827e94fe2b454eda32659c80bf36d6b0ae74 | 192,500 | 17 |
| clode | 0xf61738769e634185320e5dad9666cbb2dd065c32 | 125,000 | 13 |
| bcbxhdud | 0xc4bf1e049382d321cbbed969a9204729709eba2f | 107,500 | 11 |
| dimes | 0x324c6c79d03220912261ca5c386446090f6bdc4c | 107,500 | 11 |
| sabarud | 0xd32dde19b55d0c632cd304c730ef5f3417969424 | 107,500 | 11 |
| hrvssv | 0xd9b2247601de128197000f38c930826bdc62fa4c | 107,500 | 11 |
| bbvv | 0xdff23fcd7af0f1fbb918b47d59c14479040dcc9a | 107,500 | 11 |
| moxiee1 | 0x125197f8aa760f88172f436b566ded5a47d74c7f | 107,500 | 11 |
| raes2 | 0xaef2bf99f130643e81326f8dac7d7ab766c8bdc5 | 107,500 | 11 |
| jrbdbx | 0xa2c94b5516eaad532767faaec8a66072b98420fc | 107,500 | 11 |
| bevsvs | 0x6d1c81460fa07ca4f394b0071aca07826139ac62 | 107,500 | 11 |
| yegevs | 0x192de512fd906d4dc2b2fba88efef5c6964060dd | 107,500 | 11 |
| poytr | 0x54e4e67954cbcec69e1e6b1c14ddba2b15eb837e | 107,500 | 11 |
| uevsvs | 0x804dae25c43e679ff852b3fd8a626d3f190862d3 | 107,500 | 11 |
| hrrgvee | 0xb6f5270216adde7896b4a026af92dae9bf0a1b6f | 107,500 | 12 |
| bsbsvawjd | 0x27a9deac0fd33059251a29217c6f558fa0460f0e | 107,500 | 11 |
| rose | 0x68fba4da5b56b5a72f80d2e737e64d636fb4f3b0 | 107,500 | 12 |
| vdvsvs | 0xf147fedadcf61b49d9e71e0c747fdc1b67cc78d1 | 107,500 | 11 |
| ulane | 0x05414727a5ad7dbef2cc8bcc1548424803d87e27 | 107,500 | 11 |
| prhevsbz | 0xa45a920f28725a48d8efece069182f72e804880a | 107,500 | 11 |
| gesvvsvw | 0x04016e6017b45eb96bbdd045225458e90315f5bf | 107,500 | 11 |
| nius | 0x5072d874d43f3b35ba830e45daab1cc3f6fb462c | 107,500 | 12 |
| hanzwwe | 0xc7afb4a1a2f821ad160c29e7370cd73824ec5b58 | 92,500 | 13 |
| fasheng | 0x14e9915cc24eafa11c304a6d53eb142fc0dee55a | 92,500 | 17 |
| kebejj | 0x384636c26ea99d347196dd8339bab542e15a44da | 35,000 | 5 |
| ansatt | 0xb8d364933c26a82b46e9533742fe15c20264881a | 35,000 | 5 |
| salmane | 0x3ae4fa9293265527f9c8d76b83910eaaba20f1cb | 22,500 | 4 |

---

## Forensic Analysis - Incident #2

### Pattern Analysis (December 21, 2025)

Investigation of the referral farming accounts revealed a coordinated attack using fake accounts created without Farcaster authentication.

### Top Exploiter Analysis

| Exploiter | FID | Referrals | VBMS Earned | Pattern |
|-----------|-----|-----------|-------------|---------|
| dobronx | 338015 | 100 | 4,115,000 | Fake accounts |
| pakhaji | (unknown) | 100 | 4,115,000 | Fake accounts |
| mexxeth | 444473 | 42 | 390,000 | Mixed (some real FIDs) |

### Fake Account Characteristics

Accounts referred by top exploiters share these characteristics:

| Account | FID | Coins | Activity |
|---------|-----|-------|----------|
| iyumzz | **NONE** | 100 | 0 wins |
| novaclark | **NONE** | 100 | 0 wins |
| vangall | **NONE** | 100 | 0 wins |
| Reiner | **NONE** | 100 | 0 wins |
| karep | **NONE** | 100 | 0 wins |
| icecubee | **NONE** | 100 | 0 wins |

**Pattern detected:**
- All referred accounts have **NO Farcaster FID**
- All have exactly **100 coins** (welcome bonus only)
- All have **0 wins** (never played the game)
- Created in **bulk within hours** of each other

### mexxeth Case Study

The account `mexxeth` (0x34d1163f8f3d44c38bacbb6a8c86acb62cd7e4fb) showed a mixed pattern:

- **42 referrals** completed in one day
- Some referrals had real FIDs (Farcaster accounts)
- Some referrals had no FID (fake accounts)
- None of the referred accounts played the game
- One referred account (`hanzwwe`) is also on the blacklist

**Sample of mexxeth's referrals:**

| Referred User | FID | Coins | Played? |
|---------------|-----|-------|---------|
| mezzolitikum | 585787 | 0 | No |
| allinbtc | 377789 | 0 | No |
| hanzwwe | 447459 | 95,600 | No (EXPLOITER) |
| Vitalk | **NONE** | 0 | No |
| cz | **NONE** | 0 | No |
| Ufi | 290163 | 0 | No |

### Conclusion

The referral farming attack was coordinated, using:
1. **Bulk account creation** without Farcaster authentication
2. **Immediate referral bonus claiming**
3. **No actual game engagement** by referred accounts
4. **Cross-referencing between exploiter accounts**

The vulnerability allowed accounts to be created and complete referrals without verified Farcaster identity, enabling mass farming of referral bonuses.

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

## Summary

| Metric | Value |
|--------|-------|
| Total Exploiters | 109 |
| Total VBMS Stolen | ~51,000,000 |
| Total Fraudulent Claims | ~4,000 |
| Incident #1 (Race Condition) | 23 addresses, ~12.5M VBMS |
| Incident #2 (Referral Abuse) | 86 addresses, ~38.5M VBMS |

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
4. **Monitor patterns**: Set up alerts for unusual activity (rapid claims, high volumes) - **IMPLEMENTED**
5. **Require authentication**: Social features should require verified accounts

---

## Real-Time Security Monitoring (Implemented)

The following monitoring system is now active:

### Alert Thresholds

| Metric | Threshold | Severity |
|--------|-----------|----------|
| Claims per minute | 3+ | Critical |
| Claims per hour | 10+ | Warning |
| Single claim amount | 100,000+ VBMS | Warning |
| Claims per hour (volume) | 500,000+ VBMS | Critical |
| Transactions per minute | 15+ | Critical |
| Earning rate (5 min) | 10,000+ TESTVBMS | Warning |

### Risk Scoring

Accounts are automatically flagged based on:
- High claim count (50+): +30 risk score
- High total claimed (1M+): +40 risk score
- High transaction count (200+): +20 risk score
- Burst patterns detected: +50 risk score

Accounts with risk score >= 30 are flagged for review.

### Queries Available

```typescript
// Get real-time security alerts
coinAudit:getSecurityAlerts

// Get flagged accounts with risk scores
coinAudit:getFlaggedAccounts

// Get suspicious activity in last N hours
coinAudit:getRecentSuspiciousActivity
```

---

## Disclosure

This report is published for transparency and to help other projects avoid similar vulnerabilities. The VIBE Most Wanted team is committed to maintaining a secure platform for all users.

---

*Last updated: December 21, 2025*
