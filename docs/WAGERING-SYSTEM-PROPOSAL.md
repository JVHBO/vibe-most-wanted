# 🎰 SISTEMA DE APOSTAS P2P - WAGERING BATTLES

**Status**: 💡 PROPOSTA PARA FUTURO
**Prioridade**: ALTA (Natural Sink + Engagement)
**Estimativa**: 3-5 dias desenvolvimento

---

## 🎯 CONCEITO

Sistema peer-to-peer onde jogadores apostam assets antes de batalhas:
- **VBMS tokens** (in-game currency)
- **USDC** (stablecoin real)
- **NFT Cards** (cartas do jogo)

**Winner takes all** (menos fee da casa)

---

## 🏗️ ARQUITETURA

### Novo Game Mode: "Wager Battles"

```
Player A cria desafio:
  ├─ Escolhe asset (VBMS, USDC, ou NFT)
  ├─ Define quantidade/carta
  ├─ Escolhe oponente (ou open challenge)
  └─ Lock asset em contrato

Player B aceita desafio:
  ├─ Match asset type e quantidade
  ├─ Lock asset em contrato
  └─ Batalha começa

Batalha termina:
  ├─ Winner: Recebe ambos assets - 5% fee
  ├─ House: Recebe 5% fee (burn ou treasury)
  └─ Assets automaticamente transferidos
```

---

## 💰 TIPOS DE APOSTAS

### 1. VBMS Wagers

**Quantidades sugeridas**:
- Small: 100-500 VBMS
- Medium: 500-2,000 VBMS
- Large: 2,000-10,000 VBMS
- Whale: 10,000+ VBMS

**Fee**: 5% (burned)

**Exemplo**:
```
Player A aposta: 1,000 VBMS
Player B aposta: 1,000 VBMS
Total pot: 2,000 VBMS

Winner recebe: 1,900 VBMS (2,000 - 5%)
Burned: 100 VBMS
```

**Deflationary Effect**: 🔥 Burns tokens!

### 2. USDC Wagers

**Quantidades sugeridas**:
- Micro: $1-5 USDC
- Small: $5-20 USDC
- Medium: $20-100 USDC
- Large: $100-500 USDC

**Fee**: 5% (treasury para development)

**Exemplo**:
```
Player A aposta: $10 USDC
Player B aposta: $10 USDC
Total pot: $20 USDC

Winner recebe: $19 USDC
Treasury: $1 USDC (5%)
```

**Revenue Stream**: 💸 Sustenta desenvolvimento!

### 3. NFT Card Wagers

**Card-for-Card battles**:
- Apostar 1 carta específica
- Loser transfere carta para winner
- Fee: 5% em VBMS do valor estimado da carta

**Exemplo**:
```
Player A aposta: Legendary Foil (value ~2,000 VBMS)
Player B aposta: Legendary Foil (value ~2,000 VBMS)

Winner recebe: Ambas cartas
Fee: 200 VBMS (5% do valor total, 4,000 VBMS)
```

**High Stakes**: 🃏 Ultimate risk/reward!

### 4. Mixed Wagers (Future)

**Cross-asset betting**:
```
Player A: 1,000 VBMS
Player B: Legendary Card (valued 1,000 VBMS)

Winner: Recebe asset do loser
```

---

## 🔐 SMART CONTRACT: VBMSWager.sol

### Core Functions

```solidity
contract VBMSWager {
    struct Wager {
        address challenger;
        address opponent;
        WagerType wagerType; // VBMS, USDC, NFT
        uint256 amount; // For VBMS/USDC
        uint256 tokenId; // For NFT
        bool accepted;
        bool completed;
        address winner;
    }

    // Create wager
    function createWager(
        address opponent,
        WagerType wagerType,
        uint256 amount
    ) external payable;

    // Accept wager
    function acceptWager(uint256 wagerId) external payable;

    // Resolve wager (called by backend after battle)
    function resolveWager(
        uint256 wagerId,
        address winner,
        bytes signature
    ) external;

    // Cancel wager (if not accepted)
    function cancelWager(uint256 wagerId) external;
}
```

### Security Features

1. **Escrow System**: Assets locked até resultado
2. **Backend Verification**: Signature do backend confirma winner
3. **Timeout Protection**: Auto-cancel se não aceito em 24h
4. **Dispute Resolution**: Manual override pelo owner (emergência)
5. **Pausable**: Emergency stop se bug detectado

---

## 🎮 GAME FLOW

### 1. Criação do Desafio

**Frontend**:
```typescript
// Player A cria wager
<CreateWagerModal>
  <WagerTypeSelector>
    - VBMS (amount input)
    - USDC (amount input)
    - NFT (card selector)
  </WagerTypeSelector>

  <OpponentSelector>
    - Specific player (address/username)
    - Open challenge (anyone can accept)
  </OpponentSelector>

  <ConfirmButton>
    onClick: Lock asset + Create wager
  </ConfirmButton>
</CreateWagerModal>
```

**Backend**:
```typescript
// convex/wagers.ts
export const createWager = mutation({
  args: {
    challenger: v.string(),
    opponent: v.optional(v.string()),
    wagerType: v.union(
      v.literal("vbms"),
      v.literal("usdc"),
      v.literal("nft")
    ),
    amount: v.optional(v.number()),
    tokenId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Verify challenger has asset
    // 2. Lock asset (deduct from balance or lock NFT)
    // 3. Create wager record
    // 4. Return wagerId
  }
})
```

### 2. Aceitação do Desafio

**UI: Wager Challenges Tab**
```
Open Challenges:
┌─────────────────────────────────────────┐
│ @player123 challenges YOU              │
│ 💰 1,000 VBMS                          │
│ [Accept] [Decline]                     │
├─────────────────────────────────────────┤
│ @whale_trader challenges ANYONE        │
│ 💵 $50 USDC                            │
│ [Accept]                               │
├─────────────────────────────────────────┤
│ @collector challenges @nft_pro         │
│ 🃏 Legendary Foil Card                 │
│ (Waiting for acceptance)               │
└─────────────────────────────────────────┘
```

### 3. Batalha

**Special Battle Screen**:
```
╔═══════════════════════════════════════╗
║        WAGER BATTLE                   ║
║  💰 POT: 2,000 VBMS                   ║
║  🏆 Winner takes: 1,900 VBMS          ║
╠═══════════════════════════════════════╣
║  @player_a  VS  @player_b             ║
║  [Select Cards]                       ║
╚═══════════════════════════════════════╝
```

**Countdown**: 30s para selecionar cartas
**Pressure**: Real money on the line!

### 4. Resolução

**Backend**:
```typescript
export const resolveWager = mutation({
  args: {
    wagerId: v.string(),
    winner: v.string(),
    battleResult: v.object({ /* battle data */ })
  },
  handler: async (ctx, args) => {
    // 1. Verify battle resultado legítimo
    // 2. Calcular fee (5%)
    // 3. Transferir asset para winner
    // 4. Burn/treasury fee
    // 5. Atualizar stats (wagers won/lost)
    // 6. Notify players
    // 7. Call smart contract resolveWager()
  }
})
```

**Smart Contract**:
```solidity
function resolveWager(
    uint256 wagerId,
    address winner,
    bytes signature
) external {
    // Verify backend signature
    require(recoverSigner(signature) == authorizedBackend);

    Wager storage w = wagers[wagerId];
    require(!w.completed, "Already resolved");

    // Transfer assets
    if (w.wagerType == WagerType.VBMS) {
        uint256 fee = w.amount * 2 * 5 / 100; // 5%
        uint256 winnings = (w.amount * 2) - fee;

        vbmsToken.transfer(winner, winnings);
        vbmsToken.transfer(burnAddress, fee); // Burn fee
    }
    // ... similar for USDC/NFT

    w.completed = true;
    w.winner = winner;

    emit WagerResolved(wagerId, winner, winnings);
}
```

---

## 📊 ECONOMIA DO SISTEMA

### Revenue/Sink Calculator

**Cenário Conservador** (100 wagers/day):
```
VBMS Wagers:
  50 wagers × 1,000 VBMS avg × 5% = 2,500 VBMS/day burned

USDC Wagers:
  30 wagers × $10 avg × 5% = $15/day revenue

NFT Wagers:
  20 wagers × 2,000 VBMS value × 5% = 2,000 VBMS/day burned

Total: 4,500 VBMS burned/day + $15 revenue
```

**Cenário Realista** (500 wagers/day):
```
VBMS: 250 × 1,500 × 5% = 18,750 VBMS/day burned
USDC: 150 × $15 × 5% = $112.50/day revenue
NFT: 100 × 2,500 × 5% = 12,500 VBMS/day burned

Total: 31,250 VBMS burned/day + $112.50 revenue
```

**Cenário Viral** (2,000 wagers/day):
```
VBMS: 1,000 × 2,000 × 5% = 100,000 VBMS/day burned
USDC: 600 × $20 × 5% = $600/day revenue
NFT: 400 × 3,000 × 5% = 60,000 VBMS/day burned

Total: 160,000 VBMS burned/day + $600 revenue
```

### Impacto na Sustentabilidade

**Sem Wagers**:
```
2,000 players earn: 67,600 VBMS/day
Pool depletes in: 148 days
```

**Com Wagers (Viral)**:
```
2,000 players earn: 67,600 VBMS/day
Wagers burn: 160,000 VBMS/day
Net: -92,400 VBMS/day (DEFLATIONARY!)

Pool: NEVER DEPLETES (auto-balancing)
```

🎉 **Wagers tornam economia sustentável!**

---

## 🛡️ PROTEÇÕES ANTI-ABUSE

### 1. Cooldown System

```typescript
const WAGER_COOLDOWN = 5 * 60 * 1000; // 5 minutos

// Após cada wager, player espera 5min
if (now - lastWagerTime < WAGER_COOLDOWN) {
  throw new Error("Cooldown not elapsed");
}
```

**Previne**: Spam de wagers

### 2. Daily Wager Limits

```typescript
const DAILY_WAGER_LIMIT = {
  vbms: 50_000, // Max 50K VBMS/day
  usdc: 500,    // Max $500 USDC/day
  nft: 10,      // Max 10 NFTs/day
}
```

**Previne**: Lavagem de dinheiro, exploits

### 3. Minimum Wager Amounts

```typescript
const MIN_WAGER = {
  vbms: 100,   // Min 100 VBMS
  usdc: 1,     // Min $1 USDC
}
```

**Previne**: Micro-wagers spam

### 4. Reputation System

```typescript
// Track wager stats
type WagerStats = {
  totalWagers: number;
  wonWagers: number;
  lostWagers: number;
  totalWagered: number;
  totalWon: number;
  winRate: number;
}

// Display on profile
// Players can filter challenges by rep
```

**Incentiva**: Fair play, skill-based competition

### 5. Dispute Window

```typescript
const DISPUTE_WINDOW = 5 * 60 * 1000; // 5 minutos

// Após resultado, players têm 5min para disputar
// Admin pode revisar e reverter se necessário
```

**Protege**: Contra bugs, exploits

---

## 🎨 UI/UX FEATURES

### Wager Lobby

```
╔════════════════════════════════════════════╗
║  WAGER BATTLES                             ║
╠════════════════════════════════════════════╣
║  [My Wagers] [Open Challenges] [History]  ║
╠════════════════════════════════════════════╣
║                                            ║
║  💰 VBMS Wagers                            ║
║  ┌─────────────────────────────────────┐  ║
║  │ @whale_01 → ANYONE                  │  ║
║  │ 10,000 VBMS • Win: 19,000          │  ║
║  │ [Accept Challenge]                  │  ║
║  └─────────────────────────────────────┘  ║
║                                            ║
║  💵 USDC Wagers                            ║
║  ┌─────────────────────────────────────┐  ║
║  │ @pro_player → @you                  │  ║
║  │ $50 USDC • Win: $95                 │  ║
║  │ [Accept] [Decline]                  │  ║
║  └─────────────────────────────────────┘  ║
║                                            ║
║  🃏 NFT Wagers                             ║
║  ┌─────────────────────────────────────┐  ║
║  │ @collector → ANYONE                 │  ║
║  │ Legendary Foil #1234                │  ║
║  │ [View Card] [Accept]                │  ║
║  └─────────────────────────────────────┘  ║
║                                            ║
║  [+ Create Wager]                          ║
╚════════════════════════════════════════════╝
```

### Wager History

```
Your Wager History:
┌─────────────────────────────────────────────┐
│ ✅ WON vs @player_a • 1,900 VBMS           │
│ ❌ LOST vs @whale_01 • -1,000 VBMS         │
│ ✅ WON vs @newbie • 950 VBMS               │
│ ⏳ PENDING vs @pro • 5,000 VBMS            │
└─────────────────────────────────────────────┘

Stats:
  Total Wagers: 15
  Win Rate: 60% (9W - 6L)
  Total Wagered: 25,000 VBMS
  Net Profit: +3,500 VBMS
```

### Leaderboards

```
🏆 Top Wager Warriors (All-Time)
1. @whale_king    150W - 50L (75%)  +500K VBMS
2. @card_master   200W - 100L (67%) +350K VBMS
3. @skill_lord    100W - 50L (67%)  +200K VBMS

💸 Highest Stakes
1. @billionaire  $1,000 USDC wager (WON)
2. @yolo_trader  50K VBMS wager (LOST)
3. @nft_whale    Mythic Foil wager (WON)
```

---

## 📋 IMPLEMENTATION ROADMAP

### Phase 1: VBMS Wagers Only (2 dias)
- [ ] Backend: Wager mutations (create, accept, resolve)
- [ ] Smart contract: VBMSWager.sol (deploy testnet)
- [ ] Frontend: Basic wager UI
- [ ] Testing: End-to-end flow

### Phase 2: USDC Wagers (1 dia)
- [ ] Integrate USDC token
- [ ] Payment flow (wallet → contract → winner)
- [ ] Treasury management
- [ ] Testing

### Phase 3: NFT Wagers (2 dias)
- [ ] NFT escrow system
- [ ] Card valuation logic
- [ ] Transfer mechanics
- [ ] Testing

### Phase 4: Advanced Features (3 dias)
- [ ] Wager lobby UI
- [ ] History tracking
- [ ] Leaderboards
- [ ] Reputation system
- [ ] Dispute resolution
- [ ] Admin dashboard

### Phase 5: Polish & Launch (2 dias)
- [ ] Security audit
- [ ] Gas optimization
- [ ] Mobile responsive
- [ ] Tutorial/onboarding
- [ ] Marketing materials
- [ ] Mainnet deploy

**Total Time**: ~10 dias de desenvolvimento

---

## 💡 FUTURE ENHANCEMENTS

### 1. Team Wagers (2v2, 3v3)
```
Team A (3 players) vs Team B (3 players)
Each player contributes 1,000 VBMS
Total pot: 6,000 VBMS
Winning team splits: 5,700 VBMS (1,900 each)
```

### 2. Tournament Wagers
```
Entry: 500 VBMS per player
8 players = 4,000 VBMS pot
1st place: 2,000 VBMS
2nd place: 1,200 VBMS
3rd place: 600 VBMS
```

### 3. Spectator Betting
```
Watch live wager battles
Bet on who will win (like Twitch predictions)
Small VBMS bets for fun
```

### 4. Streaming Integration
```
Streamers create high-stakes wagers
Viewers watch live on Twitch
Clips/highlights for marketing
```

### 5. Seasonal Leagues
```
Wager Warrior Season 1
Track stats, win rate, profit
Top 10 get extra rewards
Exclusive badges/titles
```

---

## ⚠️ LEGAL CONSIDERATIONS

### Compliance Checklist

- [ ] **Not Gambling**: Skill-based game (not chance)
- [ ] **Terms of Service**: Clear rules, age restrictions
- [ ] **KYC/AML**: For USDC wagers >$X (TBD)
- [ ] **Geo-blocking**: Block restricted jurisdictions
- [ ] **Disclaimers**: Risks clearly stated
- [ ] **Legal Review**: Consult lawyer before USDC wagers

**IMPORTANTE**: USDC wagers podem requerer licenças dependendo da jurisdição. Consultar advogado especializado em crypto/gaming.

---

## 🎯 SUCCESS METRICS

### KPIs to Track

1. **Daily Wagers**: # of wagers created/day
2. **Wager Volume**: Total VBMS/USDC wagered/day
3. **Burn Rate**: VBMS burned via wager fees
4. **Revenue**: USDC fees collected
5. **Player Retention**: % of players who wager regularly
6. **Win Rate Distribution**: Check for exploits
7. **Dispute Rate**: % of wagers disputed

### Target Goals (Month 1)

- 500+ wagers/day
- 50K+ VBMS burned/day
- $200+ revenue/day
- <1% dispute rate
- 30%+ player adoption

---

## 🚀 LAUNCH STRATEGY

### Beta Testing (Week 1)
- Invite 50 top players
- VBMS wagers only
- Low limits (max 1K VBMS)
- Gather feedback

### Soft Launch (Week 2-3)
- Open to all players
- Increase limits (max 10K VBMS)
- Add USDC wagers (max $50)
- Marketing campaign

### Full Launch (Week 4+)
- No limits (within daily caps)
- NFT wagers enabled
- Leaderboards live
- Influencer partnerships

---

**Status**: 📋 PROPOSTA COMPLETA
**Next Steps**: Revisar com time e decidir prioridade
**Impacto**: 🔥 TORNA ECONOMIA DEFLATIONARY
