# 🔄 ECONOMIA CIRCULAR - VBMS (SEM BURN)

**Conceito**: Pool fechada onde VBMS **nunca sai do sistema**
**Status**: 🔄 REVISÃO COMPLETA
**Data**: 2025-11-06

---

## 🎯 MODELO: CIRCULAR POOL

### Conceito Base

```
         ┌─────────────────────┐
         │   POOL CONTRACT     │
         │   10M VBMS          │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │                     │
    PLAYERS CLAIM          PLAYERS LOSE
    (Pool → Player)       (Player → Pool)
         │                     │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │   POOL CONTRACT     │
         │   Balance Varies    │
         └─────────────────────┘
```

**Regra de Ouro**: VBMS nunca é mintado ou queimado, apenas circula!

---

## 💰 COMO FUNCIONA

### 1. Pool Inicial (Deploy)

```solidity
VBMSToken: 10,000,000 VBMS mintado
VBMSClaim: Recebe todo supply (10M)

Inicial:
  Pool balance: 10M VBMS
  Players balance: 0 VBMS
  Em circulação: 0 VBMS
```

### 2. Players Ganham Coins (Virtual)

**Convex Backend** rastreia ganhos virtuais:
```typescript
// Player ganha 1,000 coins no jogo
profile.coins += 1,000; // Virtual (ainda não claimed)

// Pool não muda ainda
// Pool: 10M VBMS
// Player claimed: 0 VBMS
```

### 3. Player Faz Claim

**Smart Contract** transfere da pool:
```solidity
function claim(uint256 amount) {
    // Player tinha 1,000 virtual coins
    // Claim 1,000 VBMS reais

    poolBalance: 10M → 9,999,000 VBMS
    playerWallet: 0 → 1,000 VBMS
}
```

### 4. Player Perde Coins

#### Opção A: Loss Return to Pool (RECOMENDADO)

**PvP Loss** (-20 coins):
```typescript
// Backend
profile.coins -= 20; // Virtual balance reduz

// Smart contract - player retorna VBMS
if (player has claimed VBMS) {
  player.transfer(poolContract, 20); // Volta para pool
  poolBalance: 9,999,000 → 9,999,020 VBMS
}
```

#### Opção B: Entry Fees Return to Pool

**PvP Entry Fee** (20 coins):
```typescript
// Player paga entry fee
profile.coins -= 20; // Deduct virtual

// Se player já claimed esses coins:
player.transfer(poolContract, 20); // Volta para pool
```

### 5. Sistema Auto-Balancing

```
Total Supply: 10M VBMS (nunca muda)

Distribuição:
  Pool Contract: X VBMS
  Players Wallets: Y VBMS
  X + Y = 10M (sempre!)

Exemplo após 1 mês:
  Pool: 7M VBMS (3M claimed pelos players)
  Players: 3M VBMS total
  Total: 10M ✅
```

---

## 🔄 FLUXOS DE VBMS

### SAÍDA da Pool (Players Ganham)

| Ação | Coins Ganhos | Pool Reduz |
|------|--------------|------------|
| PvE Win (Gigachad) | +120 virtual | 0 (ainda não claimed) |
| PvP Win | +100 virtual | 0 |
| Daily Bonus | +50 virtual | 0 |
| **Claim VBMS** | **-1,000 virtual** | **-1,000 real** |

### ENTRADA na Pool (Players Perdem)

| Ação | Coins Perdidos | Pool Aumenta |
|------|----------------|--------------|
| PvP Loss | -20 coins | +20 VBMS (se claimed) |
| PvP Entry Fee | -20 coins | +20 VBMS |
| Attack Loss | -20 coins | +20 VBMS |
| **Wager Loss** | **-X coins** | **+X VBMS** |

### NEUTRO (Apenas Transfere Entre Players)

| Ação | Efeito |
|------|--------|
| P2P Wager | Winner +X, Loser -X (pool não muda) |
| Gift/Trade | Player A → Player B (pool não muda) |

---

## 🎮 WAGERING SYSTEM (REVISADO)

### Sem Fee/Burn - Winner Takes All

```javascript
// Wager Battle
Player A aposta: 1,000 VBMS
Player B aposta: 1,000 VBMS

Scenario 1: Ambos claimed VBMS
  ├─ Assets locked em contrato
  ├─ Batalha acontece
  ├─ Winner: +2,000 VBMS (direto wallet to wallet)
  └─ Pool: Não muda (0 change)

Scenario 2: Coins virtuais
  ├─ Virtual coins transferidos no Convex
  ├─ Winner: +2,000 virtual coins
  ├─ Loser: -1,000 virtual coins
  └─ Pool: Não muda até claim
```

### Opcional: Small Fee Volta para Pool

```javascript
Player A: 1,000 VBMS
Player B: 1,000 VBMS
Total pot: 2,000 VBMS

Winner: 1,900 VBMS (95%)
Pool: +100 VBMS (5% fee)

// Fee volta para pool (não burn!)
// Pool cresce ligeiramente
```

**Efeito**: Pool cresce um pouco, dura mais tempo!

---

## 📊 SUSTENTABILIDADE DO SISTEMA

### Modelo Matemático

**Variáveis**:
- `P` = Pool balance
- `C` = Total claimed pelos players
- `E` = Earnings rate (coins/day)
- `L` = Loss rate (coins returned/day)
- `CR` = Claim rate (% of virtual claimed)

**Equação**:
```
dP/dt = L - (E × CR)

Onde:
  L = Loss rate (losses + fees + wager losses)
  E × CR = Claim rate (earnings × % claimed)
```

**Sistema Sustentável Se**:
```
L ≥ E × CR

Loss rate ≥ Claim rate
```

### Cenário Exemplo (1,000 Players)

#### Earnings (Saída da Pool)
```
1,000 players × 2,000 virtual coins/day = 2M virtual/day
Claim rate: 30% (players claim 30% do que ganham)
Actual claims: 2M × 0.3 = 600K VBMS/day SAEM da pool
```

#### Losses (Entrada na Pool)
```
PvP Losses:
  500 matches/day × 20 coins × 50% = 5K/day

Entry Fees:
  500 PvP matches × 20 coins = 10K/day

Wager Losses (com 5% fee):
  200 wagers/day × 1,000 avg × 5% = 10K/day

Total: 25K VBMS/day VOLTAM para pool
```

#### Net Flow
```
Saída: 600K/day
Entrada: 25K/day
Net: -575K/day (Pool depletes!)

Pool: 10M ÷ 575K = 17 dias até esgotamento
```

**Problema**: Ainda não sustentável! 😰

---

## ✅ SOLUÇÕES PARA SUSTENTABILIDADE

### Solução 1: Aumentar Loss Rate (Mais Fees)

**Aumentar entry fees**:
```
PvP Entry: 20 → 50 coins
Attack Entry: 0 → 20 coins

New losses:
  500 PvP × 50 = 25K/day
  200 Attack × 20 = 4K/day
  Wagers: 10K/day

Total entrada: 39K + 25K original = 64K/day

Net: -536K/day (ainda ruim)
```

### Solução 2: Reduzir Claim Rate (Vesting)

**30-day vesting**:
```
Player ganha: 1,000 coins hoje
Pode claimar: 33 coins/dia por 30 dias

Claim rate: 3.3% daily (vs 30% instant)
Actual claims: 2M × 0.033 = 66K/day

Net: -41K/day (melhor mas ainda negativo)
```

### Solução 3: Hybrid System (70/30)

**70% Virtual, 30% Claimable**:
```
Player ganha: 1,000 virtual coins
Virtual: 700 (in-game only, não claimable)
Claimable: 300 (pode virar VBMS real)

Effective earnings: 2M × 0.3 = 600K claimable/day
Claim rate: 50% (players claim half)
Actual claims: 600K × 0.5 = 300K/day

Net: -275K/day (melhor mas ainda mal)
```

### Solução 4: Fees AGRESSIVOS (Nuclear)

**High sink rates**:
```
PvP Entry: 100 coins
Attack Entry: 50 coins
Wager Fee: 20%
Shop Items: Todas custam VBMS (volta pool)

Entrada na pool: 500K+/day

Net: POSITIVO! Pool CRESCE!
```

**Problema**: Players não vão gostar de fees altos 😠

### Solução 5: Recarregar Pool (Minting)

**Mint mais VBMS quando necessário**:
```
if (poolBalance < 2M) {
  mint(5M); // Adiciona 5M à pool
  totalSupply: 10M → 15M
}
```

**Problema**: Inflacionário, dilui valor

### ⭐ Solução 6: COMBINAÇÃO (RECOMENDADO)

**Multi-approach**:
1. **Rewards -50%** (menos earnings)
2. **Hybrid 70/30** (30% claimable)
3. **Vesting 30 dias** (3.3% claim rate)
4. **Wager fees 5%** (volta pool)
5. **Shop items** (volta pool)
6. **Entry fees moderados** (PvP: 30, Attack: 10)

**Matemática**:
```
Earnings: 2M × 0.5 = 1M/day (reduced)
Claimable: 1M × 0.3 = 300K/day (hybrid)
Claim rate: 300K × 0.033 = 10K/day (vesting)

Losses:
  Entry fees: 40K/day
  Wager fees: 10K/day
  Shop: 5K/day
  Total: 55K/day

Net: +45K/day (POOL CRESCE!)
```

🎉 **Sistema sustentável!**

---

## 🏗️ IMPLEMENTAÇÃO

### Smart Contract Atualizado

```solidity
// VBMSClaim.sol (REVISADO - Sem Burn)
contract VBMSClaim {
    IERC20 public vbmsToken;
    uint256 public dailyClaimCap = 10_000 * 10**18;

    // Claim: Pool → Player
    function claim(uint256 amount) external {
        // Transfer da pool para player
        vbmsToken.transfer(msg.sender, amount);

        emit Claimed(msg.sender, amount);
    }

    // Return: Player → Pool
    function returnToPool(uint256 amount) external {
        // Player devolve VBMS para pool
        vbmsToken.transferFrom(msg.sender, address(this), amount);

        emit ReturnedToPool(msg.sender, amount);
    }

    // Wager fee: Volta para pool
    function collectWagerFee(uint256 amount) external onlyAuthorized {
        // Fee já está no contrato (locked durante wager)
        emit FeeCollected(amount);
    }

    // Pool balance (público)
    function poolBalance() external view returns (uint256) {
        return vbmsToken.balanceOf(address(this));
    }
}
```

### Backend Logic (Convex)

```typescript
// convex/economy.ts

// Quando player perde coins
export const deductCoins = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
    reason: v.union(
      v.literal("pvp_loss"),
      v.literal("entry_fee"),
      v.literal("wager_loss"),
      v.literal("shop_purchase")
    )
  },
  handler: async (ctx, { address, amount, reason }) => {
    const profile = await getProfile(ctx, address);

    // 1. Deduzir virtual coins
    await ctx.db.patch(profile._id, {
      coins: profile.coins - amount,
      lifetimeSpent: profile.lifetimeSpent + amount
    });

    // 2. Se player tem VBMS claimed, retornar para pool
    const claimedBalance = profile.claimedTokens || 0;
    if (claimedBalance >= amount) {
      // Player deve retornar VBMS real para pool
      // Frontend chama returnToPool() no contrato
      return {
        mustReturnToPool: true,
        amountToReturn: amount,
        reason
      };
    }

    // 3. Se não tem claimed suficiente, apenas virtual
    return {
      mustReturnToPool: false,
      virtualOnly: true
    };
  }
});
```

### Frontend Flow (Wager Example)

```typescript
// Wager loss flow
async function handleWagerLoss(amount: number) {
  // 1. Deduzir coins no backend
  const result = await deductCoins({
    address: playerAddress,
    amount,
    reason: "wager_loss"
  });

  // 2. Se precisa retornar VBMS para pool
  if (result.mustReturnToPool) {
    // Chamar contrato
    await claimContract.returnToPool(
      ethers.utils.parseEther(amount.toString())
    );

    toast.success(`${amount} VBMS returned to pool`);
  } else {
    // Apenas virtual coins deduzidos
    toast.info(`${amount} virtual coins deducted`);
  }
}
```

---

## 📊 DASHBOARD DO SISTEMA

### Pool Health Monitor

```
╔═══════════════════════════════════════╗
║     VBMS POOL HEALTH DASHBOARD        ║
╠═══════════════════════════════════════╣
║  💰 Pool Balance: 8,523,450 VBMS     ║
║  👥 Claimed by Players: 1,476,550     ║
║  📊 Total Supply: 10,000,000 (100%)   ║
╠═══════════════════════════════════════╣
║  📈 Daily Flows (Last 24h)            ║
║  ┌─────────────────────────────────┐  ║
║  │ Claims (Out):  -45,230 VBMS    │  ║
║  │ Returns (In):  +52,100 VBMS    │  ║
║  │ Net Flow:      +6,870 VBMS ✅   │  ║
║  └─────────────────────────────────┘  ║
╠═══════════════════════════════════════╣
║  🔮 Projections                       ║
║  Current trend: Pool growing          ║
║  At this rate: Sustainable ∞          ║
╚═══════════════════════════════════════╝
```

### Player View

```
Your VBMS:
┌─────────────────────────────────────┐
│ 💰 Virtual Coins: 5,230             │
│   ├─ Claimable: 1,569 (30%)        │
│   └─ Virtual Only: 3,661 (70%)     │
│                                     │
│ 🪙 Claimed VBMS: 1,200              │
│   (In your wallet)                  │
│                                     │
│ 📊 Vesting Schedule:                │
│   Next 30 days: +470 claimable     │
│   (15.7 VBMS/day)                   │
└─────────────────────────────────────┘
```

---

## ⚖️ VANTAGENS vs DESVANTAGENS

### Sistema Circular (Sem Burn)

#### Vantagens ✅
- **Supply constante**: 10M forever
- **Preço estável**: Não inflaciona nem deflaciona supply
- **Sistema fechado**: Fácil de entender
- **Redistributivo**: VBMS reciclado, não perdido
- **Fair**: Losses voltam para novos players

#### Desvantagens ❌
- **Difícil balancear**: Earnings vs losses delicado
- **Pode esgotar**: Pool pode drenar se mal calibrado
- **Não deflationary**: Não cria pressure de preço up
- **Complexo**: Players têm que devolver VBMS às vezes

### Sistema com Burn (Alternativa)

#### Vantagens ✅
- **Deflationary**: Supply diminui, preço tende a subir
- **Simples**: Perdeu = gone forever
- **Não precisa devolver**: Players nunca retornam VBMS
- **Escassez**: Cria value accrual

#### Desvantagens ❌
- **Supply diminui**: Eventualmente pode ficar escasso demais
- **Precisa reposição**: Mint novo supply às vezes
- **Inflacionário**: Mint novo = dilui holders

---

## 💡 MINHA RECOMENDAÇÃO

### Opção A: Circular Puro (Seu Pedido)
```
✅ Supply: 10M constante
✅ Losses: Voltam para pool
✅ Fees: Voltam para pool
✅ Wagers: Winner takes all (ou fee → pool)
❌ Difícil: Balancear earnings vs losses
❌ Complexo: Players devolvem VBMS às vezes
```

### Opção B: Hybrid (Semi-Circular)
```
✅ Supply: 10M constante
✅ Losses: 50% volta pool, 50% burn
✅ Fees: Volta para pool
✅ Wagers: Winner takes 95%, 5% burn
✅ Balanced: Easier to sustain
❌ Technically não é "circular puro"
```

### Opção C: Circular + Mint Reserve
```
✅ Supply: 10M inicial
✅ Losses: Voltam para pool
✅ Reserve: 10M extra mintable se pool < 20%
✅ Safety net: Nunca esgota
❌ Inflacionário: Se precisar mint
```

---

## 🎯 PRÓXIMOS PASSOS

1. **Decidir modelo**:
   - [ ] Circular puro (sem burn, sem mint)
   - [ ] Hybrid (semi-circular)
   - [ ] Circular + reserve

2. **Calibrar economia**:
   - [ ] Definir rewards finais
   - [ ] Definir fees/losses
   - [ ] Testar matemática

3. **Atualizar contratos**:
   - [ ] Remover burn logic
   - [ ] Adicionar returnToPool()
   - [ ] Testar fluxos

4. **Implementar backend**:
   - [ ] Logic para devolver VBMS
   - [ ] Track pool balance
   - [ ] Dashboard monitoring

---

**Status**: 🔄 MODELO CIRCULAR DOCUMENTADO
**Aguardando**: Decisão final sobre modelo preferido
