# 🎯 Arquitetura do Sistema VBMS On-Chain

## 📊 Visão Geral

Sistema de 3 contratos inteligentes projetado para **maximizar transações on-chain** e aumentar o ranking do Farcaster miniapp.

```
┌─────────────────────────────────────────────────────────────┐
│                    VBMS Token (Base)                        │
│            0xb03439567cd22f278b21e1ffcdfb8e1696763827       │
└─────────────────────────────────────────────────────────────┘
                              │
                 ┌────────────┼────────────┐
                 │            │            │
        ┌────────▼──────┐ ┌──▼──────────┐ ┌▼───────────────┐
        │ VBMSPoolTroll │ │ PokerBattle │ │  VBMSBetting   │
        │   (Claims)    │ │  (Stakes)   │ │ (Spectators)   │
        └───────────────┘ └─────────────┘ └────────────────┘
             │ 1 TX           │ 3+ TX         │ 2+ TX
             │                │               │
        ┌────▼────────────────▼───────────────▼────┐
        │         Players & Spectators              │
        └───────────────────────────────────────────┘
```

---

## 🎮 1. VBMSPoolTroll (Claims Simples)

**Propósito:** Distribuir VBMS de missões, PvE, PvP

**Transações Geradas:**
- ✅ 1 TX por claim
- ✅ ~30-50 claims/dia estimado

**Fluxo:**
```solidity
1. Backend cria signature: hash(address, amount, nonce)
2. User chama: claimVBMS(amount, nonce, signature)
3. Contrato verifica signature
4. Contrato transfere VBMS
```

**Features:**
- Claims pausáveis (emergência)
- Blacklist de endereços
- Limites min/max configuráveis
- Estatísticas de claims
- Emergency withdraw (owner)

**Exemplo de Uso:**
```javascript
// Backend (Node.js)
const nonce = ethers.id(`claim-${userId}-${Date.now()}`);
const messageHash = ethers.solidityPackedKeccak256(
  ["address", "uint256", "bytes32"],
  [userAddress, amount, nonce]
);
const signature = await backendSigner.signMessage(
  ethers.getBytes(messageHash)
);

// Frontend
await poolContract.claimVBMS(amount, nonce, signature);
```

---

## ⚔️ 2. VBMSPokerBattle (Stakes)

**Propósito:** Poker battles com apostas em VBMS

**Transações Geradas:**
- ✅ 3 TX por battle (create, join, finish)
- ✅ +1 TX se cancelar
- ✅ 10 battles/dia = 30 TX
- ✅ 50 battles/dia = 150 TX

**Fluxo Completo:**
```solidity
// TX 1: Player 1 cria battle
createBattle(stake: 100 VBMS)
├─ Transfer 100 VBMS → contrato
├─ Salva battle com status WAITING
└─ Emit BattleCreated

// TX 2: Player 2 entra
joinBattle(battleId)
├─ Transfer 100 VBMS → contrato
├─ Status → ACTIVE
└─ Emit BattleJoined

// [Partida acontece off-chain no Convex]

// TX 3: Backend finaliza
finishBattle(battleId, winner, signature)
├─ Verifica signature
├─ Calcula: totalPot = 200 VBMS
├─ Fee (5%) = 10 VBMS → poolAddress
├─ Winnings (95%) = 190 VBMS → winner
├─ Status → FINISHED
└─ Emit BattleFinished

// TX 4 (opcional): Cancelar se ninguém entrar
cancelBattle(battleId) // após 10 minutos
├─ Verifica tempo
├─ Devolver 100 VBMS → player1
└─ Emit BattleCancelled
```

**Fee Distribution:**
```
Total Pot: 200 VBMS
├─ 5% (10 VBMS) → VBMSPoolTroll (recicla pro jogo)
└─ 95% (190 VBMS) → Winner
```

**Stats Trackadas:**
```solidity
mapping(address => uint256) public totalWins;
mapping(address => uint256) public totalEarned;
```

**Admin Functions:**
```solidity
setFeePercentage(500)      // 5% (max 10%)
setStakeLimits(1e18, 10000e18) // 1-10k VBMS
setPoolAddress(newPool)
setBackendSigner(newSigner)
```

---

## 🎲 3. VBMSBetting (Apostas de Espectadores)

**Propósito:** Espectadores apostam no resultado das battles

**Transações Geradas:**
- ✅ 1 TX por aposta
- ✅ 1 TX por claim de winnings
- ✅ 100 espectadores apostando = 100 TX
- ✅ 30 winners claiming = 30 TX
- ✅ **Total: 130 TX por battle popular!**

**Fluxo Completo:**
```solidity
// TX 1-N: Espectadores apostam
placeBet(battleId, predictedWinner: player1, amount: 50 VBMS)
├─ Transfer 50 VBMS → contrato
├─ Salva bet
├─ Incrementa totalBettors
└─ Emit BetPlaced

// [Battle acontece e termina]

// Backend resolve
resolveBets(battleId, winner: player1, player1, player2, signature)
├─ Verifica signature
├─ Marca battleBets[battleId].resolved = true
├─ Salva actualWinner = player1
└─ Emit BetsResolved

// TX (N+1) até (N+M): Winners fazem claim
claimWinnings(battleId)
├─ Verifica: apostou no winner correto
├─ Calcula payout = betAmount * 3 (3x)
├─ Transfer payout → bettor
├─ Marca bet.claimed = true
└─ Emit WinningsClaimed

// Owner envia losing bets pro pool
sendLosingBetsToPool(battleId)
├─ Calcula losing bets
├─ 10% → poolAddress
└─ 90% fica para payouts
```

**Payouts:**
```
Exemplo Battle:
- 100 espectadores apostam 10 VBMS cada = 1000 VBMS total
- 30 apostaram no player1 (winner)
- 70 apostaram no player2 (loser)

Winners recebem:
- Cada um ganha: 10 VBMS × 3 = 30 VBMS
- Total pago: 30 × 30 = 900 VBMS

Losing bets (700 VBMS):
- 10% → pool = 70 VBMS
- Resto (630 VBMS) fica no contrato para cobrir payouts

Contrato lucra: 1000 - 900 = 100 VBMS
```

**Stats Trackadas:**
```solidity
mapping(address => uint256) public totalWinnings;
mapping(address => uint256) public totalBetsPlaced;
mapping(address => uint256) public correctPredictions;

// Win rate em basis points (7500 = 75%)
winRate = (correctPredictions * 10000) / totalBetsPlaced
```

**Admin Functions:**
```solidity
setBetLimits(1e18, 1000e18)  // 1-1000 VBMS
setPoolFeePercentage(1000)   // 10% losing bets
setPayoutMultiplier(3)       // 3x payout
setBackendSigner(newSigner)
```

---

## 📈 Maximização de Transações

### Cenário Real: 100 Usuários Ativos

```
DAILY BREAKDOWN:

VBMSPoolTroll (Claims):
├─ 50 claims de missões     = 50 TX
├─ 20 claims de PvE         = 20 TX
└─ 10 claims de PvP         = 10 TX
                              ------
                              80 TX/dia

VBMSPokerBattle:
├─ 20 battles criadas       = 20 TX
├─ 20 battles joined        = 20 TX
├─ 20 battles finalizadas   = 20 TX
└─ 2 battles canceladas     = 2 TX
                              ------
                              62 TX/dia

VBMSBetting:
├─ 15 battles com apostas
├─ 8 bettors por battle     = 120 TX (bets)
└─ ~30 winners claiming     = 30 TX
                              ------
                              150 TX/dia

═══════════════════════════════════════
TOTAL: 292 TX/DIA
═══════════════════════════════════════

MONTHLY: ~8,760 TX
YEARLY: ~106,580 TX
```

### Estratégias de Boost:

1. **Daily Bonus (VBMSPoolTroll)**
   - Adicionar `claimDailyBonus()` → 1 VBMS grátis/dia
   - 100 users × 1 TX = +100 TX/dia
   - **Total diário: 392 TX**

2. **Micro-Stakes Battles**
   - Permitir battles de 1-10 VBMS
   - Mais battles = mais TX
   - **Potencial: 100+ battles/dia = 300 TX**

3. **Betting Incentives**
   - Free bet diário de 1 VBMS
   - Todos apostam = +100 TX/dia
   - **Total diário: 492 TX**

4. **Achievement Claims (futuro)**
   - VBMSAchievements.sol
   - NFT achievements on-chain
   - **+50 TX/dia estimado**

---

## 🔐 Segurança

### Proteções Implementadas:

✅ **ReentrancyGuard** - Previne ataques de reentrada
✅ **SafeERC20** - Transfer seguro de tokens
✅ **Ownable** - Funções admin protegidas
✅ **Nonces** - Previne replay de signatures
✅ **ECDSA Signatures** - Backend valida todas ações críticas
✅ **Custom Errors** - Gas eficiente
✅ **Limits** - Min/max configuráveis

### Pontos de Atenção:

⚠️ **Backend Signer**
- Guardar private key com MUITO cuidado
- Nunca commitar no git
- Usar variável de ambiente
- Considerar multi-sig no futuro

⚠️ **Pool Funding**
- VBMSPoolTroll precisa ter VBMS para distribuir
- Monitorar balance
- Implementar alertas quando < 10% da capacidade

⚠️ **Gas Limits**
- `getActiveBattles()` pode ser caro com muitas battles
- Usar `limit` parameter
- Backend deve indexar via events

⚠️ **Signature Validation**
- Backend DEVE validar:
  - Usuário existe
  - Quantidade é válida
  - Nonce não foi usado
  - Battle terminou realmente

---

## 🚀 Deploy Order

```bash
# 1. Deploy VBMSPoolTroll
constructor(
  vbmsToken: 0xb03439567cd22f278b21e1ffcdfb8e1696763827,
  backendSigner: <BACKEND_WALLET>
)

# 2. Deploy VBMSPokerBattle
constructor(
  vbmsToken: 0xb03439567cd22f278b21e1ffcdfb8e1696763827,
  poolAddress: <VBMSPOOLTROLL_ADDRESS>,
  backendSigner: <BACKEND_WALLET>
)

# 3. Deploy VBMSBetting
constructor(
  vbmsToken: 0xb03439567cd22f278b21e1ffcdfb8e1696763827,
  poolAddress: <VBMSPOOLTROLL_ADDRESS>,
  backendSigner: <BACKEND_WALLET>,
  pokerBattleContract: <VBMSPOKERBATTLE_ADDRESS>
)

# 4. Fund VBMSPoolTroll
vbmsToken.transfer(
  <VBMSPOOLTROLL_ADDRESS>,
  1_000_000 * 10**18 // 1M VBMS
)
```

---

## 🔗 Integração Backend

### Environment Variables:
```bash
# .env (NUNCA commitar!)
BACKEND_SIGNER_PRIVATE_KEY=0x...
VBMS_TOKEN=0xb03439567cd22f278b21e1ffcdfb8e1696763827
VBMS_POOL_TROLL=0x...
VBMS_POKER_BATTLE=0x...
VBMS_BETTING=0x...
```

### Convex Actions:

```typescript
// convex/vbms.ts

// Claim simples
export const createClaimSignature = action({
  args: { userId: v.string(), amount: v.number() },
  handler: async (ctx, { userId, amount }) => {
    const user = await ctx.runQuery(api.users.get, { userId });

    // Validar que user tem esse amount no inbox
    if (user.inboxBalance < amount) {
      throw new Error("Insufficient inbox balance");
    }

    // Criar signature
    const nonce = ethers.id(`claim-${userId}-${Date.now()}`);
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "bytes32"],
      [user.walletAddress, ethers.parseEther(amount.toString()), nonce]
    );

    const signature = await backendSigner.signMessage(
      ethers.getBytes(messageHash)
    );

    return { signature, nonce };
  }
});

// Finish poker battle
export const finishPokerBattle = action({
  args: { battleId: v.string(), winnerId: v.string() },
  handler: async (ctx, { battleId, winnerId }) => {
    const battle = await ctx.runQuery(api.battles.get, { battleId });
    const winner = await ctx.runQuery(api.users.get, { userId: winnerId });

    // Criar signature
    const messageHash = ethers.solidityPackedKeccak256(
      ["uint256", "address"],
      [battle.onChainBattleId, winner.walletAddress]
    );

    const signature = await backendSigner.signMessage(
      ethers.getBytes(messageHash)
    );

    return { signature };
  }
});

// Resolve betting
export const resolveBattleBets = action({
  args: { battleId: v.string() },
  handler: async (ctx, { battleId }) => {
    const battle = await ctx.runQuery(api.battles.get, { battleId });
    const player1 = await ctx.runQuery(api.users.get, { userId: battle.player1Id });
    const player2 = await ctx.runQuery(api.users.get, { userId: battle.player2Id });
    const winner = battle.winnerId === battle.player1Id ? player1 : player2;

    // Criar signature
    const messageHash = ethers.solidityPackedKeccak256(
      ["uint256", "address", "address", "address"],
      [
        battle.onChainBattleId,
        winner.walletAddress,
        player1.walletAddress,
        player2.walletAddress
      ]
    );

    const signature = await backendSigner.signMessage(
      ethers.getBytes(messageHash)
    );

    return { signature };
  }
});
```

---

## 📊 Event Indexing

### Eventos Importantes:

```solidity
// VBMSPoolTroll
event VBMSClaimed(address indexed user, uint256 amount, bytes32 nonce);

// VBMSPokerBattle
event BattleCreated(uint256 indexed battleId, address indexed player1, uint256 stake);
event BattleJoined(uint256 indexed battleId, address indexed player2);
event BattleFinished(uint256 indexed battleId, address indexed winner, uint256 winnings);

// VBMSBetting
event BetPlaced(uint256 indexed battleId, address indexed bettor, address predictedWinner, uint256 amount);
event BetsResolved(uint256 indexed battleId, address indexed winner, uint256 totalPot);
event WinningsClaimed(uint256 indexed battleId, address indexed bettor, uint256 amount);
```

### Backend Listener:

```typescript
// Backend service para indexar events
const poolContract = new ethers.Contract(POOL_ADDRESS, POOL_ABI, provider);
const battleContract = new ethers.Contract(BATTLE_ADDRESS, BATTLE_ABI, provider);
const bettingContract = new ethers.Contract(BETTING_ADDRESS, BETTING_ABI, provider);

// Listen to claims
poolContract.on("VBMSClaimed", async (user, amount, nonce) => {
  await ctx.runMutation(api.claims.recordClaim, {
    userAddress: user,
    amount: ethers.formatEther(amount),
    nonce: nonce,
    timestamp: Date.now()
  });
});

// Listen to battles
battleContract.on("BattleFinished", async (battleId, winner, winnings) => {
  await ctx.runMutation(api.battles.updateOnChain, {
    battleId: battleId.toString(),
    winner: winner,
    winnings: ethers.formatEther(winnings)
  });

  // Trigger betting resolution
  await bettingContract.resolveBets(battleId, winner, ...signature);
});
```

---

## ✅ Checklist de Deploy

### Pré-Deploy:
- [ ] Testei todos contratos localmente
- [ ] Revisei todo código de segurança
- [ ] Tenho ETH na Base para gas (~$20-30)
- [ ] Tenho $VBMS para fundar pool (~100k-1M)
- [ ] Criei carteira para backend signer
- [ ] Guardei private key do signer com segurança
- [ ] Configurei .env corretamente

### Deploy:
- [ ] Deployed VBMSPoolTroll
- [ ] Verified no Basescan
- [ ] Deployed VBMSPokerBattle
- [ ] Verified no Basescan
- [ ] Deployed VBMSBetting
- [ ] Verified no Basescan
- [ ] Transferi VBMS pro pool
- [ ] Testei claim no pool
- [ ] Testei battle creation
- [ ] Testei betting

### Post-Deploy:
- [ ] Atualizei .env.local com addresses
- [ ] Configurei backend listeners
- [ ] Testei integração completa
- [ ] Monitorei primeiras transações
- [ ] Documentei endereços dos contratos

---

## 🎯 Objetivo Final

**MAXIMIZAR TRANSAÇÕES ON-CHAIN = FARCASTER RANKING UP 📈**

Com 100 usuários ativos:
- **300+ TX/dia** garantido
- **9,000+ TX/mês**
- **100k+ TX/ano**

🚀 **LETS FUCKING GO!** 🚀
