# ⚡ ESTRATÉGIA DE OTIMIZAÇÃO DE GAS - VBMS

**Problema**: Sistema circular exige transações frequentes ($$$ gas)
**Solução**: Batch + Virtual + Smart timing
**Data**: 2025-11-06

---

## 🚨 PROBLEMA IDENTIFICADO

### Cenário Atual (Circular System)

**Player perde 20 coins** (PvP loss):
```
1. Backend deduz virtual coins
2. Se player tem VBMS claimed:
   → Frontend chama returnToPool(20)
   → Player paga gas (~$0.50)
   → 20 VBMS volta para pool
```

**Player ativo**:
```
10 PvP matches/day
5 losses × 20 coins = 100 coins loss
5 transactions × $0.50 gas = $2.50/day
Monthly: $75 em gas fees! 😰
```

**Problema**: Insustentável! Players vão odiar pagar gas toda hora.

---

## ✅ SOLUÇÃO: DEBT SYSTEM

### Conceito: Track "Debt to Pool"

Em vez de devolver VBMS imediatamente, **acumular debt**:

```typescript
// Backend
profile.coins -= 20; // Virtual balance reduz
profile.poolDebt += 20; // Debt aumenta

// Não chama contrato (0 gas!)
```

**Player só paga quando claim novo VBMS**:

```typescript
// Player quer claimar 1,000 VBMS
if (profile.poolDebt > 0) {
  // Deduzir debt do claim
  actualClaim = 1,000 - poolDebt;

  // Exemplo:
  // Claim: 1,000 VBMS
  // Debt: 200 VBMS
  // Recebe: 800 VBMS
  // Debt: 0

  // 1 transação em vez de 10+!
}
```

### Matemática

**Tradicional** (sem debt):
```
10 losses → 10 transactions → $5 gas
1 claim → 1 transaction → $0.50 gas
Total: $5.50 gas
```

**Com Debt System**:
```
10 losses → 0 transactions → $0 gas
1 claim (net claim) → 1 transaction → $0.50 gas
Total: $0.50 gas

Saving: $5/claim (90% redução!)
```

---

## 🏗️ IMPLEMENTAÇÃO

### Schema Update (Convex)

```typescript
// convex/schema.ts
profiles: defineTable({
  // ... existing fields ...

  // Virtual balance
  coins: v.number(),

  // Claimed VBMS (em wallet)
  claimedTokens: v.optional(v.number()),

  // 🆕 Debt to pool
  poolDebt: v.optional(v.number()),

  // 🆕 Last debt settlement
  lastDebtSettlement: v.optional(v.number()),
})
```

### Deduct Coins (Com Debt)

```typescript
// convex/economy.ts
export const deductCoins = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, { address, amount, reason }) => {
    const profile = await getProfile(ctx, address);

    // Deduzir virtual coins
    const newCoins = Math.max(0, profile.coins - amount);

    // Adicionar debt (se tem claimed VBMS)
    const claimedTokens = profile.claimedTokens || 0;
    let newDebt = profile.poolDebt || 0;

    if (claimedTokens > 0) {
      // Player tem VBMS claimed, adiciona debt
      newDebt += amount;
    }

    await ctx.db.patch(profile._id, {
      coins: newCoins,
      poolDebt: newDebt,
      lifetimeSpent: (profile.lifetimeSpent || 0) + amount,
    });

    return {
      newCoins,
      poolDebt: newDebt,
      gasUsed: 0, // 🎉 Zero gas!
    };
  },
});
```

### Claim com Debt Settlement

```typescript
// convex/economy.ts
export const prepareClaimWithDebt = mutation({
  args: {
    address: v.string(),
    requestedAmount: v.number(),
  },
  handler: async (ctx, { address, requestedAmount }) => {
    const profile = await getProfile(ctx, address);

    const claimableBalance = profile.coins - (profile.claimedTokens || 0);
    const currentDebt = profile.poolDebt || 0;

    // Calcular net claim
    const netClaimAmount = Math.max(0, requestedAmount - currentDebt);
    const debtSettled = Math.min(requestedAmount, currentDebt);
    const remainingDebt = Math.max(0, currentDebt - debtSettled);

    // Verificações
    if (requestedAmount > claimableBalance) {
      throw new Error("Insufficient claimable balance");
    }

    return {
      requestedAmount,
      currentDebt,
      debtSettled,
      netClaimAmount,
      remainingDebt,

      // Message para assinar
      message: `Claim ${netClaimAmount} VBMS (debt settled: ${debtSettled})`,
    };
  },
});
```

### Frontend Claim Flow

```typescript
// components/ClaimVBMSButton.tsx
async function handleClaim() {
  // 1. Preparar claim com debt
  const claimData = await prepareClaimWithDebt({
    address: playerAddress,
    requestedAmount: claimableBalance,
  });

  // 2. Mostrar breakdown
  if (claimData.currentDebt > 0) {
    toast.info(
      `Claim: ${claimData.requestedAmount} VBMS\n` +
      `Debt settled: ${claimData.debtSettled} VBMS\n` +
      `You receive: ${claimData.netClaimAmount} VBMS`
    );
  }

  // 3. Assinar e claimar
  const signature = await signMessage(claimData.message);

  // 4. Smart contract - apenas 1 transação
  await claimContract.claim(
    ethers.utils.parseEther(claimData.netClaimAmount.toString()),
    nonce,
    signature
  );

  // 5. Atualizar backend
  await recordClaim({
    address: playerAddress,
    grossAmount: claimData.requestedAmount,
    debtSettled: claimData.debtSettled,
    netAmount: claimData.netClaimAmount,
  });

  toast.success(`Claimed ${claimData.netClaimAmount} VBMS!`);
}
```

---

## 📊 CENÁRIOS

### Cenário 1: Player sem Debt

```typescript
Virtual coins: 5,000
Claimed: 2,000
Debt: 0

Claim 1,000:
  ├─ Net claim: 1,000 VBMS
  ├─ Debt settled: 0
  └─ Gas: $0.50 (1 tx)
```

### Cenário 2: Player com Debt Pequeno

```typescript
Virtual coins: 5,000
Claimed: 2,000
Debt: 150 (de PvP losses)

Claim 1,000:
  ├─ Net claim: 850 VBMS (1,000 - 150)
  ├─ Debt settled: 150
  ├─ New debt: 0
  └─ Gas: $0.50 (1 tx)

Economia: 7-8 transactions × $0.50 = $3.50-4.00 saved!
```

### Cenário 3: Player com Debt Grande

```typescript
Virtual coins: 5,000
Claimed: 3,000
Debt: 1,200 (muitas losses)

Claim 1,000:
  ├─ Net claim: 0 VBMS (1,000 < 1,200 debt)
  ├─ Debt settled: 1,000
  ├─ New debt: 200
  └─ Transaction: REJECTED (net claim = 0)

Error: "Cannot claim, debt exceeds claim amount.
       Debt: 1,200 VBMS. Claim at least 1,201 to receive 1 VBMS"
```

### Cenário 4: Debt Reset (Raro)

```typescript
Virtual coins: 1,000
Claimed: 500
Debt: 2,000 (muitas losses, rekt)

Player não pode claimar nada!

Opções:
  A) Jogar mais, ganhar coins, claim maior depois
  B) "Debt forgiveness" event (1x/ano?)
  C) Pagar debt com USDC (buy VBMS, settle debt)
```

---

## 💡 OTIMIZAÇÕES EXTRAS

### 1. Batch Claims (Weekly)

**Incentivo para claim menos frequente**:
```typescript
// Bonus por esperar
const daysSinceLastClaim = (now - profile.lastClaimTimestamp) / (24 * 60 * 60);

if (daysSinceLastClaim >= 7) {
  // +5% bonus por esperar 1 semana
  netClaimAmount *= 1.05;

  toast.success("🎉 +5% Weekly Claim Bonus!");
}
```

**Benefício**: Menos claims = menos gas coletivo

### 2. Claim Threshold

**Mínimo para claim**:
```typescript
const MIN_CLAIM_AMOUNT = 500; // Min 500 VBMS

if (netClaimAmount < MIN_CLAIM_AMOUNT) {
  throw new Error(`Minimum claim: ${MIN_CLAIM_AMOUNT} VBMS`);
}
```

**Benefício**: Evita micro-claims (desperdiça gas)

### 3. Meta-Transactions (Gasless)

**Backend paga gas** (avançado):
```typescript
// Player assina meta-transaction
// Backend submete para chain
// Backend paga gas

// Player: $0 gas
// Backend: $0.50 gas (bulk)
```

**Implementação**: Requer GSN ou Biconomy

### 4. Layer 2 (L2)

**Deploy em L2 chain**:
- Base (Layer 2 sobre Ethereum)
- Arbitrum
- Optimism
- Polygon

**Gas cost**: $0.01-0.05 por tx (vs $0.50-5.00 em L1)

**Recomendado**: Base (você já usa Base para NFTs?)

---

## 📋 DEBT MANAGEMENT UI

### Player Dashboard

```
╔═══════════════════════════════════════╗
║  YOUR VBMS BALANCE                    ║
╠═══════════════════════════════════════╣
║  💰 Virtual Coins: 5,230              ║
║  🪙 Claimed VBMS: 2,150               ║
║  ⚠️  Pool Debt: 340                   ║
╠═══════════════════════════════════════╣
║  📊 Claimable Balance                 ║
║  ┌─────────────────────────────────┐  ║
║  │ Virtual earned: 3,080           │  ║
║  │ Less debt: -340                 │  ║
║  │ Net claimable: 2,740 ✅         │  ║
║  └─────────────────────────────────┘  ║
║                                       ║
║  [Claim 2,740 VBMS]                   ║
║  (1 transaction, ~$0.50 gas)          ║
╚═══════════════════════════════════════╝
```

### Debt Breakdown

```
⚠️ Pool Debt Details:
┌─────────────────────────────────────┐
│ PvP Losses: 200 VBMS               │
│ Entry Fees: 100 VBMS               │
│ Wager Losses: 40 VBMS              │
│ ─────────────────────────────────   │
│ Total Debt: 340 VBMS               │
│                                     │
│ ℹ️ Debt will be deducted from      │
│   your next claim automatically     │
└─────────────────────────────────────┘
```

---

## 🔢 GAS COST ANALYSIS

### Estimativas (Base Network)

| Action | Gas Units | Cost (@0.001 gwei) |
|--------|-----------|-------------------|
| Claim (no debt) | ~50K | $0.05 |
| Claim (with debt) | ~55K | $0.06 |
| Return to pool | ~40K | $0.04 |
| Wager | ~80K | $0.08 |

### Comparação: Com vs Sem Debt System

**Sem Debt** (10 losses + 1 claim):
```
10 × returnToPool() = 10 × $0.04 = $0.40
1 × claim() = 1 × $0.05 = $0.05
Total: $0.45 gas
```

**Com Debt** (10 losses + 1 claim):
```
10 × returnToPool() = 0 (virtual)
1 × claimWithDebt() = 1 × $0.06 = $0.06
Total: $0.06 gas

Saving: $0.39 (87% redução!)
```

### Monthly Cost (Active Player)

**Tradicional**:
```
30 days × 5 losses/day = 150 losses
150 × $0.04 = $6.00/month

Claims: 4/month × $0.05 = $0.20
Total: $6.20/month
```

**Com Debt System**:
```
150 losses = $0 (virtual)
4 claims × $0.06 = $0.24/month

Saving: $5.96/month (96% redução!)
```

---

## ⚖️ PRÓS E CONTRAS

### Debt System

#### Prós ✅
- **90%+ gas savings** para players
- **Simple UX**: Losses são invisíveis (no tx)
- **Batch efficient**: 1 tx em vez de many
- **Scaling**: Funciona com milhares de players
- **Fair**: Debt é tracked precisamente

#### Contras ❌
- **Complexidade**: Backend precisa track debt
- **Delayed settlement**: Debt só settle no claim
- **Pode acumular**: Players com muito debt ficam presos
- **Not pure circular**: Não é imediato return to pool

---

## 🎯 RECOMENDAÇÃO FINAL

### Implementar Debt System

**Por quê**:
1. **Gas savings massivo** (90%+)
2. **Better UX** (invisible losses)
3. **Escalável** (funciona com 10K+ players)
4. **Ainda circular** (debt eventually settles)

**Como**:
1. Track `poolDebt` no schema
2. Deduzir debt de claims
3. UI mostra breakdown
4. Opcional: Debt forgiveness events

### Hybrid Approach (Best of Both)

**Normal losses** → Debt system (gas-free)
**Large amounts** → Immediate return (se > 1,000 VBMS)

```typescript
if (lossAmount > 1000) {
  // Large loss, immediate return
  await returnToPool(lossAmount);
} else {
  // Small loss, add to debt
  profile.poolDebt += lossAmount;
}
```

**Benefício**: Balance entre gas efficiency e pool health

---

## 📊 POOL HEALTH COM DEBT SYSTEM

### Tracking Real vs Virtual

```typescript
// Pool metrics
const poolMetrics = {
  // Actual VBMS in contract
  contractBalance: 8,500,000,

  // Claimed by players
  claimedByPlayers: 1,500,000,

  // Owed back (debt)
  totalPlayerDebt: 250,000,

  // Effective pool
  effectivePool: contractBalance + totalPlayerDebt,
  // = 8,500,000 + 250,000 = 8,750,000

  // Supply check
  total: contractBalance + claimedByPlayers,
  // = 8,500,000 + 1,500,000 = 10,000,000 ✅
};
```

**Dashboard**:
```
Pool Status:
  Contract: 8.5M VBMS
  + Debt owed: 250K VBMS
  = Effective: 8.75M VBMS

  Claimed: 1.5M VBMS
  Total: 10M VBMS ✅
```

---

**Status**: ⚡ SOLUÇÃO PARA GAS PRONTA
**Próximo**: Implementar debt system no schema + logic
