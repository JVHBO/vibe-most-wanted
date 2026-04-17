# 🎯 VBMS Contracts - Deployed on Base Mainnet

**Deployment Date:** 2025-11-11  
**Network:** Base Mainnet (Chain ID: 8453)

---

## 📝 Contract Addresses

### VBMS Token (ERC20)
```
0xb03439567cd22f278b21e1ffcdfb8e1696763827
```
🔗 [View on Basescan](https://basescan.org/address/0xb03439567cd22f278b21e1ffcdfb8e1696763827)

### VBMSPoolTroll (Claims Distribution)
```
0x062b914668f3fD35c3Ae02e699cB82e1cF4bE18b
```
🔗 [View on Basescan](https://basescan.org/address/0x062b914668f3fD35c3Ae02e699cB82e1cF4bE18b)

### VBMSPokerBattle V5 (PvP Stakes) ⭐ CURRENT
```
0x01090882A1Cb18CFCA89cB91edE798F0308aB950
```
🔗 [View on Basescan](https://basescan.org/address/0x01090882A1Cb18CFCA89cB91edE798F0308aB950)
🔗 [View on Blockscout](https://base.blockscout.com/address/0x01090882A1Cb18CFCA89cB91edE798F0308aB950)

**V5 Improvements:**
- 🎯 **MAJOR FIX:** Removed activeBattles check - players never get stuck!
- ✅ Players can create new battles immediately (no TX needed at end)
- ✅ Backend Convex validates "one active battle per player"
- ✅ All V4 features maintained:
  - ✅ No cancel cooldown (can cancel immediately!)
  - ✅ Admin emergency functions for orphaned battles
  - ✅ Better event emissions
  - ✅ Guaranteed cleanup in all code paths
  - 🆕 **Emergency withdraw function** - Owner can rescue stuck tokens

**Constructor Parameters:**
- VBMS Token: `0xb03439567cd22f278b21e1ffcdfb8e1696763827`
- Pool Address: `0x062b914668f3fD35c3Ae02e699cB82e1cF4bE18b`
- Backend Signer: `0xd99624896203B1dd1AaED4945bF4C76e489B7009`

**Previous Versions (deprecated):**
- V4: `0xce766404d1C4788078C4E77D12B13793afceD867`
- V3: `0xD72A5B7139224D5041d0eE2a8AD837747E24Ec37`
- V2: `0x954af331cc23642978Cbdbdbd7c28B13A510952E`

### VBMSBetting (Spectator Bets)
```
0x668c8d288b8670fdb9005fa91be046e4c2585af4
```
🔗 [View on Basescan](https://basescan.org/address/0x668c8d288b8670fdb9005fa91be046e4c2585af4)

---

## 🔧 Configuration

### Owner & Backend Signer
```
0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52
```

---

## 📊 Contract Status

| Contract | Status | Verified |
|----------|--------|----------|
| VBMSPoolTroll | ✅ Deployed | ✅ Yes |
| VBMSPokerBattle | ✅ Deployed | ✅ Yes |
| VBMSBetting | ✅ Deployed | ✅ Yes |

---

## 🌐 Frontend Environment Variables

Add these to your `.env.local`:

```bash
NEXT_PUBLIC_VBMS_TOKEN=0xb03439567cd22f278b21e1ffcdfb8e1696763827
NEXT_PUBLIC_VBMS_POOL_TROLL=0x062b914668f3fD35c3Ae02e699cB82e1cF4bE18b
NEXT_PUBLIC_POKER_BATTLE_V4=0xce766404d1C4788078C4E77D12B13793afceD867
NEXT_PUBLIC_VBMS_BETTING=0x668c8d288b8670fdb9005fa91be046e4c2585af4
```

---

## 📝 Next Steps

- [ ] Fund VBMSPoolTroll with VBMS tokens
- [ ] Test claim functionality
- [ ] Test poker battle creation
- [ ] Test betting functionality
- [ ] Update frontend with new contract addresses
- [ ] Deploy frontend to production

---

## 🔒 Security Notes

- All contracts verified on Basescan ✅
- Owner wallet secured ✅
- Backend signer private key stored securely ✅
- ReentrancyGuard enabled on all contracts ✅
- SafeERC20 used for all token transfers ✅

---

**LETS FUCKING GO! 🚀**

## SlotCoinShop (Base)
- Address: `0xFE3d768829b15146719CD4AeCa94c617D4B51C06`
- USDC: `undefined`
- packPriceETH: 307277179952346 wei
- packPriceUSDC: 720000

## SlotCoinShop (Arbitrum One)
- Address: `0x3479E9304175cDdCE327CF16b1e928194d61e7b0`
- USDC: `undefined`
- packPriceETH: 307277179952346 wei
- packPriceUSDC: 720000
