# ⛽ GAS LIMIT REFERENCE - VBMS CLAIM

**Gas Limit**: Máximo de gas que você aloca para a transação
**Gas Used**: Quanto gas realmente foi consumido

---

## 📊 CLAIM FUNCTION GAS BREAKDOWN

### Cenário 1: First Time Claim (Cold Storage)

**Operações**:
- SLOAD × 5 (cold): 2,100 × 5 = **10,500**
- SSTORE × 4 (cold): 20,000 × 4 = **80,000**
- ECRECOVER: **3,000**
- Keccak256 × 2: 30 × 2 = **60**
- ERC20 transfer (cold): **50,000**
- Memory operations: **5,000**
- Event emission: **3,000**
- Base transaction: **21,000**

**Total Gas Used**: ~**172,560 gas**

### Cenário 2: Subsequent Claims (Warm Storage)

**Operações**:
- SLOAD × 5 (warm): 100 × 5 = **500**
- SSTORE × 4 (warm): 2,900 × 4 = **11,600**
- ECRECOVER: **3,000**
- Keccak256 × 2: 30 × 2 = **60**
- ERC20 transfer (warm): **30,000**
- Memory operations: **5,000**
- Event emission: **3,000**
- Base transaction: **21,000**

**Total Gas Used**: ~**154,160 gas**

---

## 🎯 RECOMMENDED GAS LIMITS

### Safe Gas Limits (With Buffer)

| Scenario | Gas Used | Recommended Limit | Buffer |
|----------|----------|-------------------|--------|
| First claim | 172,560 | **200,000** | +16% |
| Subsequent | 154,160 | **180,000** | +17% |
| **Standard** | ~155,000 | **200,000** | +29% |

### Why Add Buffer?

1. **Network congestion**: Gas costs can spike
2. **ERC20 variations**: Some tokens cost more to transfer
3. **Future upgrades**: Contract might add features
4. **Safety margin**: Prevent out-of-gas errors

---

## 💡 GAS LIMIT RECOMMENDATIONS

### Option A: Conservative (RECOMMENDED)

```typescript
// Frontend
const gasLimit = 200000; // 200K gas

await claimContract.claim(amount, nonce, signature, {
  gasLimit: gasLimit
});
```

**Pros**:
- ✅ Never runs out of gas
- ✅ Handles all scenarios
- ✅ Future-proof

**Cons**:
- ❌ Slightly higher gas reservation (but unused gas is refunded!)

### Option B: Optimized

```typescript
// Estimate gas first, then add 20% buffer
const estimated = await claimContract.estimateGas.claim(
  amount,
  nonce,
  signature
);

const gasLimit = Math.ceil(estimated * 1.2); // +20% buffer

await claimContract.claim(amount, nonce, signature, {
  gasLimit: gasLimit
});
```

**Pros**:
- ✅ Uses exact amount needed
- ✅ Dynamic adjustment

**Cons**:
- ❌ Extra call to estimate
- ❌ Can fail if estimation is off

### Option C: Fixed Per Scenario

```typescript
// Check if first claim
const playerData = await claimContract.players(address);
const isFirstClaim = playerData.totalClaimed == 0;

const gasLimit = isFirstClaim ? 220000 : 180000;

await claimContract.claim(amount, nonce, signature, {
  gasLimit: gasLimit
});
```

---

## 📊 COST COMPARISON

### Base Network (Current Gas Price: 0.01 gwei)

| Gas Limit | Gas Used | Refunded | Cost (ETH) | Cost (USD) |
|-----------|----------|----------|------------|------------|
| 200,000 | 155,000 | 45,000 | 0.00000155 | $0.0054 |
| 180,000 | 155,000 | 25,000 | 0.00000155 | $0.0054 |
| 250,000 | 155,000 | 95,000 | 0.00000155 | $0.0054 |

**Key Point**: Unused gas is **REFUNDED**!
- You only pay for gas actually used
- Higher limit doesn't cost more (if not used)

---

## 🧪 TESTING GAS LIMITS

### Hardhat Test

```javascript
describe("Gas Limit Tests", () => {

  it("Should succeed with 200K gas limit", async () => {
    const tx = await claimContract.claim(
      amount,
      nonce,
      signature,
      { gasLimit: 200000 }
    );

    const receipt = await tx.wait();
    console.log("Gas used:", receipt.gasUsed.toString());

    expect(receipt.gasUsed).to.be.lt(200000);
  });

  it("Should fail with too low gas limit", async () => {
    await expect(
      claimContract.claim(
        amount,
        nonce,
        signature,
        { gasLimit: 100000 } // Too low!
      )
    ).to.be.reverted;
  });

  it("Should estimate gas correctly", async () => {
    const estimated = await claimContract.estimateGas.claim(
      amount,
      nonce,
      signature
    );

    console.log("Estimated:", estimated.toString());
    expect(estimated).to.be.lt(180000);
  });
});
```

---

## 🎮 FRONTEND IMPLEMENTATION

### React + wagmi Example

```typescript
// hooks/useClaimVBMS.ts
import { useContractWrite, usePrepareContractWrite } from 'wagmi';
import { parseEther } from 'ethers/lib/utils';

export function useClaimVBMS() {
  const { config } = usePrepareContractWrite({
    address: VBMS_CLAIM_ADDRESS,
    abi: VBMSClaimABI,
    functionName: 'claim',
    args: [amount, nonce, signature],
    gas: 200000n, // 200K gas limit
  });

  const { write, data, isLoading } = useContractWrite(config);

  return {
    claim: write,
    txData: data,
    isLoading,
  };
}
```

### Manual Gas Limit

```typescript
// If not using wagmi prepare hook
const { write } = useContractWrite({
  address: VBMS_CLAIM_ADDRESS,
  abi: VBMSClaimABI,
  functionName: 'claim',
});

// Call with custom gas limit
await write({
  args: [amount, nonce, signature],
  gasLimit: 200000, // or use estimateGas
});
```

---

## 🚨 ERROR SCENARIOS

### Out of Gas Error

```
Error: Transaction ran out of gas
Provided: 150,000
Used: 155,000
```

**Solution**: Increase gas limit to 200,000

### Gas Estimation Failed

```
Error: cannot estimate gas; transaction may fail
```

**Causes**:
1. Invalid signature
2. Daily cap exceeded
3. Cooldown not elapsed
4. Insufficient pool balance

**Solution**: Check requirements before estimating

---

## 📈 GAS LIMIT BY NETWORK

### Different Networks Have Different Costs

| Network | Block Gas Limit | Recommended Claim Limit |
|---------|-----------------|-------------------------|
| **Base** | 30,000,000 | 200,000 |
| Ethereum | 30,000,000 | 200,000 |
| Arbitrum | 32,000,000 | 200,000 |
| Optimism | 30,000,000 | 200,000 |
| Polygon | 30,000,000 | 200,000 |

**Note**: Block limit is per block, not per transaction!

---

## 💰 COST ANALYSIS WITH DIFFERENT LIMITS

### Gas Price Scenarios (Base Network)

#### Low Activity (0.001 gwei)
```
Gas Limit: 200,000
Gas Used: 155,000
Cost: 155,000 × 0.001 × 0.000000001 × $3,500 = $0.00054
≈ $0.0005 (half a penny!)
```

#### Medium Activity (0.01 gwei)
```
Gas Limit: 200,000
Gas Used: 155,000
Cost: 155,000 × 0.01 × 0.000000001 × $3,500 = $0.0054
≈ $0.005 (half a cent!)
```

#### High Activity (0.1 gwei)
```
Gas Limit: 200,000
Gas Used: 155,000
Cost: 155,000 × 0.1 × 0.000000001 × $3,500 = $0.054
≈ $0.05 (5 cents)
```

**Even in worst case**: Only 5 cents!

---

## 🎯 FINAL RECOMMENDATIONS

### For Production

```typescript
// config/contracts.ts
export const VBMS_CLAIM_CONFIG = {
  address: process.env.NEXT_PUBLIC_VBMS_CLAIM_ADDRESS,
  abi: VBMSClaimABI,

  // Gas configuration
  gasLimit: {
    claim: 200000,        // Standard claim
    firstClaim: 220000,   // First time (cold storage)
    emergency: 300000,    // If network congested
  },

  // Gas price multiplier (for fast tx)
  gasPriceMultiplier: 1.1, // +10% for priority
};
```

### Usage in Components

```typescript
// components/ClaimButton.tsx
async function handleClaim() {
  try {
    // Check if first claim
    const stats = await claimContract.getPlayerStats(address);
    const isFirstClaim = stats.total === 0;

    // Select appropriate gas limit
    const gasLimit = isFirstClaim
      ? VBMS_CLAIM_CONFIG.gasLimit.firstClaim
      : VBMS_CLAIM_CONFIG.gasLimit.claim;

    // Execute claim
    const tx = await claimContract.claim(
      amount,
      nonce,
      signature,
      { gasLimit }
    );

    // Wait for confirmation
    const receipt = await tx.wait();

    console.log(`✅ Claimed! Gas used: ${receipt.gasUsed.toString()}`);

  } catch (error) {
    if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      // Requirements not met (cooldown, cap, etc)
      console.error('Cannot claim:', error.reason);
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('Not enough ETH for gas');
    } else {
      console.error('Claim failed:', error);
    }
  }
}
```

---

## 📊 MONITORING

### Track Gas Usage in Production

```typescript
// Track actual gas used
const receipt = await tx.wait();

// Log to analytics
analytics.track('vbms_claim', {
  gasLimit: 200000,
  gasUsed: receipt.gasUsed.toString(),
  gasSaved: 200000 - receipt.gasUsed,
  costUSD: calculateCost(receipt.gasUsed),
  isFirstClaim: stats.total === 0,
});

// Alert if gas usage is abnormal
if (receipt.gasUsed > 180000) {
  console.warn('⚠️ High gas usage detected:', receipt.gasUsed);
}
```

---

## ✅ CHECKLIST

### Before Mainnet Deploy

- [ ] Test with 200K gas limit on testnet
- [ ] Verify first claim uses < 220K
- [ ] Verify subsequent claims use < 180K
- [ ] Test with different gas prices
- [ ] Test gas estimation function
- [ ] Monitor gas usage in production
- [ ] Set up alerts for abnormal usage

---

## 🎯 FINAL ANSWER

### **Recommended Gas Limit: 200,000**

**Why**:
- ✅ Covers all scenarios (first + subsequent)
- ✅ Safe buffer (+29% above typical usage)
- ✅ Unused gas is refunded
- ✅ Future-proof for contract upgrades
- ✅ Still very cheap ($0.005 on Base)

**Usage**:
```typescript
await claimContract.claim(amount, nonce, signature, {
  gasLimit: 200000
});
```

**Actual Cost**: ~$0.005 per claim (155K gas used)
**Max Cost**: ~$0.007 per claim (200K gas if all used)

---

**Status**: ✅ RECOMENDAÇÃO FINAL
**Gas Limit**: **200,000 gas**
**Typical Usage**: 155,000 gas (77.5%)
**Cost**: $0.005 per claim
