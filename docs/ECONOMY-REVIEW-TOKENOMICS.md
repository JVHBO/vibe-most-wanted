# 💰 REVISÃO DA ECONOMIA - TOKENOMICS VBMS

**Data**: 2025-11-06
**Status**: 📊 ANÁLISE PARA TOKEN REAL
**Objetivo**: Revisar distribuição de coins antes de migrar para token real

---

## 📊 DISTRIBUIÇÃO ATUAL (testVBMS Virtual)

### PvE Rewards (Player vs AI)

| Difficulty | Coins/Win | Daily Limit | Max Daily |
|-----------|-----------|-------------|-----------|
| Gey | 5 | 30 wins | 150 |
| Goofy | 15 | 30 wins | 450 |
| Gooner | 30 | 30 wins | 900 |
| Gangster | 60 | 30 wins | 1,800 |
| **Gigachad** | **120** | 30 wins | **3,600** |

**Daily Cap**: 3,500 coins (hard limit)
**Reality**: ~29 Gigachad wins = 3,480 coins (hits cap)

### PvP Rewards (Player vs Player)

| Mode | Entry Fee | Win | Loss | Daily Limit |
|------|-----------|-----|------|-------------|
| **Ranked** | 20 | +100 | -20 | 10 matches |
| **Attack** | 0 | +100 | -20 | 5 attacks |
| Casual | 0 | 0 | 0 | Unlimited |

**Ranking Multipliers**:
- 50+ ranks difference: **2.0x** (200 coins win)
- 20-49 ranks: **1.5x** (150 coins)
- 10-19 ranks: **1.3x** (130 coins)
- 5-9 ranks: **1.15x** (115 coins)

### Daily Bonuses (Missions)

| Bonus | Coins | Frequency |
|-------|-------|-----------|
| First PvE Win | 50 | Daily |
| First PvP Match | 100 | Daily |
| Login Bonus | 25 | Daily |
| 3-Win Streak | 150 | Daily |
| 5-Win Streak | 300 | Daily |
| 10-Win Streak | 750 | Daily |

**Total Bonuses**: 1,425 coins/day (if all achieved)

### Weekly Rewards (Leaderboard)

| Rank | Reward | Total/Week |
|------|--------|------------|
| #1 | 1,000 | 1,000 |
| #2 | 750 | 750 |
| #3 | 500 | 500 |
| #4-10 | 300 each | 2,100 |
| #11-20 | 150 each | 1,500 |
| #21-50 | 75 each | 2,250 |

**Total Weekly Pool**: 8,100 coins (distributed to top 50)

### Achievements (One-Time)

| Category | Total Coins | Notes |
|----------|-------------|-------|
| Rarity Collectors | 1,925 | 6 achievements |
| Wear Collectors | 24,950 | 10 achievements |
| Foil Collectors | 23,950 | 9 achievements |
| Progressive | ~251,000 | 39 achievements |

**Total**: ~302,000 coins (one-time, collection-based)

---

## 📈 EARNINGS ANALYSIS

### Maximum Daily Earnings (Perfect Grind)

```
PvE (Gigachad 29 wins):        3,500 coins (capped)
Attack (5 vs top 5):           1,000 coins (5 × 200)
PvP Ranked (10 matches):         800 coins (10 × 80 net)
Daily Bonuses (all):           1,425 coins
────────────────────────────────────────────
TOTAL:                         6,725 coins/day
```

### Realistic Daily Earnings (Average Player)

```
PvE (Gigachad 20 wins):        2,400 coins
Attack (3 wins):                 300 coins
PvP (5 matches, 60% WR):         200 coins (3 wins, 2 losses)
Daily Bonuses (login + 1st):     175 coins
────────────────────────────────────────────
TOTAL:                         3,075 coins/day
```

### Weekly Earnings (No Leaderboard Rewards)

| Player Type | Daily | Weekly (7 days) |
|-------------|-------|-----------------|
| **Grinder** | 6,725 | 47,075 |
| **Active** | 4,000 | 28,000 |
| **Casual** | 1,500 | 10,500 |

### Monthly Earnings

| Player Type | Monthly (30 days) | + Achievements |
|-------------|-------------------|----------------|
| **Grinder** | 201,750 | 503,750 |
| **Active** | 120,000 | 422,000 |
| **Casual** | 45,000 | 347,000 |

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 1. 🚨 Pool Depletion Rate (CRÍTICO)

**Pool Total**: 10,000,000 VBMS

**Cenário Conservador** (100 jogadores ativos):
```
100 players × 3,000 coins/day = 300,000 coins/day
Pool: 10M ÷ 300K = 33 dias até esgotamento
```

**Cenário Realista** (500 jogadores):
```
500 players × 2,000 coins/day = 1,000,000 coins/day
Pool: 10M ÷ 1M = 10 dias até esgotamento
```

**Cenário Viral** (2,000 jogadores):
```
2,000 players × 1,500 coins/day = 3,000,000 coins/day
Pool: 10M ÷ 3M = 3.3 dias até esgotamento
```

### 2. 💸 Inflação Exponencial

**Achievements** = 302K one-time per jogador
- 100 jogadores = 30.2M coins (3x pool!)
- 500 jogadores = 151M coins (15x pool!)

**Problema**: Achievements sozinhos drenam pool em dias.

### 3. 🎯 Distribuição Desbalanceada

| Source | % of Daily Max |
|--------|----------------|
| PvE | 52% (3,500/6,725) |
| Bonuses | 21% (1,425/6,725) |
| PvP | 15% (1,000/6,725) |
| Attack | 12% (800/6,725) |

**Problema**: PvE farming é dominante (low-skill, high-reward)

### 4. 📊 Ranking Bonuses (Unsustainable)

**Attack top players** = 200 coins (2.0x)
- 5 attacks/day = 1,000 extra coins
- 100 players attacking = 100K extra/day

**Problema**: Multipliers inflacionam além do esperado.

### 5. 🏆 Weekly Rewards (Escalação)

**Current**: 8,100 coins/week para top 50
**100 players**: 8,100/week
**1,000 players**: 8,100/week (mas 950 não ganham nada)

**Problema**: Top-heavy, não escala com player base.

---

## 🔧 PROPOSTA DE AJUSTES (TOKENOMICS V2)

### Filosofia

1. **Sustentabilidade**: Pool deve durar 1+ ano com crescimento
2. **Skill-based**: Recompensar skill > grind time
3. **Deflationary**: Introduzir sinks para burn tokens
4. **Escalável**: Sistema deve funcionar com 100 ou 10,000 jogadores

### Ajustes de Rewards

#### PvE Rewards (REDUZIR 60%)

| Difficulty | Atual | Proposta | Razão |
|-----------|-------|----------|-------|
| Gey | 5 | **2** | -60% |
| Goofy | 15 | **6** | -60% |
| Gooner | 30 | **12** | -60% |
| Gangster | 60 | **24** | -60% |
| Gigachad | 120 | **48** | -60% |

**Daily Cap**: 3,500 → **1,500** coins

**Justificativa**:
- Reduz farming dominance
- 29 Gigachad wins = 1,392 coins (mais razoável)
- Ainda permite progressão casual

#### PvP Rewards (AUMENTAR SKILL PREMIUM)

| Mode | Atual | Proposta | Razão |
|------|-------|----------|-------|
| Win Base | 100 | **80** | Reduzir base |
| Loss Penalty | -20 | **-15** | Menos punitivo |
| Entry Fee | 20 | **10** | Mais acessível |

**Net Earnings** (similar ranks):
- Win: +70 coins (80 - 10)
- Loss: -25 coins (-15 - 10)

**Ranking Multipliers** (REDUZIR):
- 50+ ranks: 2.0x → **1.5x** (120 coins)
- 20-49: 1.5x → **1.3x** (104 coins)
- 10-19: 1.3x → **1.2x** (96 coins)
- 5-9: 1.15x → **1.1x** (88 coins)

**Justificativa**:
- Incentiva PvP skill-based
- Reduz inflação de multipliers
- Mantém competitivo

#### Daily Bonuses (AJUSTAR)

| Bonus | Atual | Proposta | Razão |
|-------|-------|----------|-------|
| First PvE | 50 | **30** | -40% |
| First PvP | 100 | **60** | -40% |
| Login | 25 | **15** | -40% |
| Streak 3 | 150 | **80** | -47% |
| Streak 5 | 300 | **150** | -50% |
| Streak 10 | 750 | **350** | -53% |

**Total**: 1,425 → **685** coins/day

**Justificativa**:
- Mantém incentivos
- Reduz inflação passiva
- Streaks ainda rewarding

#### Weekly Rewards (ESCALAR COM BASE)

**Opção A**: Percentage-based

| Rank | Reward | Calculation |
|------|--------|-------------|
| #1 | 0.5% of weekly pool claims | Dynamic |
| #2 | 0.35% | Dynamic |
| #3 | 0.25% | Dynamic |

**Opção B**: Fixed + Percentage

| Rank | Base | + Bonus |
|------|------|---------|
| #1 | 500 | 0.2% pool |
| #2 | 350 | 0.15% pool |
| #3 | 250 | 0.1% pool |

**Justificativa**:
- Escala com player base
- Mantém competitividade
- Não drena pool fixed amount

#### Achievements (REDUZIR 70%)

| Category | Atual | Proposta | Razão |
|----------|-------|----------|-------|
| Rarity | 1,925 | **580** | -70% |
| Wear | 24,950 | **7,500** | -70% |
| Foil | 23,950 | **7,200** | -70% |
| Progressive | 251,000 | **75,000** | -70% |

**Total**: 302K → **90K** coins per player

**Justificativa**:
- Achievements agora: ~90K vs Daily grind: ~2K
- Ratio mais sustentável (45:1 vs 150:1)
- Ainda rewarding para collectors

---

## 💡 NOVOS SINKS (DEFLAÇÃO)

### 1. Token Burning

**Shop de Items** (burns VBMS):
- Profile customization: 100-1,000 VBMS
- Special badges: 500-5,000 VBMS
- Card effects/animations: 1,000-10,000 VBMS
- Exclusive titles: 5,000-50,000 VBMS

### 2. Tournament Entry Fees

**Weekly Tournaments**:
- Entry: 200 VBMS (burned)
- Prize pool: New minted VBMS (controlled)
- Net effect: Deflationary if <50% win rate

### 3. Premium Features

**Subscriptions** (monthly burn):
- Ad-free: 100 VBMS/month
- Extra daily limits: 200 VBMS/month
- Exclusive modes: 500 VBMS/month

### 4. NFT Marketplace Fees

**Trading Fee**: 2% VBMS (burned)
- Buy/sell NFTs with VBMS
- Fee goes to burn address

---

## 📊 IMPACTO DOS AJUSTES

### Maximum Daily Earnings (NEW)

```
PvE (Gigachad 29 wins):        1,392 coins (capped at 1,500)
Attack (5 vs top 5):             600 coins (5 × 120)
PvP Ranked (10 matches):         700 coins (10 × 70 net)
Daily Bonuses (all):             685 coins
────────────────────────────────────────────
TOTAL:                         3,377 coins/day (-50% from 6,725)
```

### Pool Sustainability (NEW)

**Cenário Conservador** (100 jogadores):
```
100 × 1,500/day = 150K/day
Pool: 10M ÷ 150K = 66 dias (vs 33 antes)
```

**Cenário Realista** (500 jogadores):
```
500 × 1,000/day = 500K/day
Pool: 10M ÷ 500K = 20 dias (vs 10 antes)
```

**Cenário Viral** (2,000 jogadores):
```
2,000 × 800/day = 1.6M/day
Pool: 10M ÷ 1.6M = 6.25 dias (vs 3.3 antes)
```

**Com Sinks** (25% burn rate):
```
Net inflation: 1.6M × 0.75 = 1.2M/day
Pool: 10M ÷ 1.2M = 8.3 dias
```

### Ainda Não é Suficiente! 🚨

**Precisamos de mais ajustes...**

---

## 🔥 PROPOSTA RADICAL (V3)

### Opção 1: Aumentar Pool

**10M → 50M VBMS**
- Dura 5x mais tempo
- Dilui valor do token
- Mais tokens em circulação

### Opção 2: Reduzir Rewards Agressivamente

**Todos rewards -80%**:
- PvE: 5 → 1, 120 → 24
- PvP: 100 → 20
- Bonuses: -80%
- Achievements: -80%

**Max Daily**: 6,725 → **1,345** coins/day

**Sustentabilidade**:
```
2,000 players × 600/day = 1.2M/day
Pool: 10M ÷ 1.2M = 8.3 dias
```

Ainda ruim! 😰

### Opção 3: Hybrid System

**70% Virtual + 30% Claimable**

Jogadores ganham 100% coins virtuais, mas:
- Apenas **30%** pode ser claimed como VBMS real
- 70% fica virtual (in-game currency)
- Pool dura 3.3x mais tempo

**Exemplo**:
- Ganha 1,000 virtual coins
- Pode claimar 300 VBMS reais
- 700 fica virtual para usar in-game

**Vantagens**:
- Pool sustentável
- Players ainda sentem progressão
- In-game economy funciona normal

### Opção 4: Time-Locked Claims

**Vesting Schedule**:
- Ganha 1,000 coins hoje
- Pode claimar 25% imediatamente (250 VBMS)
- Resto veste linearmente por 30 dias (25/dia)

**Vantagens**:
- Distribui pressure no pool
- Incentiva retention
- Previne dump imediato

### Opção 5: Dynamic Rewards

**Supply-based Multiplier**:
```
Reward = Base × (Pool Remaining / 10M)

Exemplo:
- Pool em 8M (80% restante)
- PvE Gigachad: 48 × 0.8 = 38.4 coins
- Pool em 2M (20% restante)
- PvE Gigachad: 48 × 0.2 = 9.6 coins
```

**Vantagens**:
- Auto-balancing
- Prolonga vida do pool
- Transparente para players

---

## 🎯 RECOMENDAÇÃO FINAL

### Combinação de Estratégias

1. **Reduzir Rewards (V2)**: -50% em tudo
2. **Hybrid 70/30**: 30% claimable como VBMS real
3. **Vesting 30 dias**: Claims lineares
4. **Token Sinks**: Shop, tournaments, fees
5. **Dynamic Rewards**: Ajusta com pool remaining

### Matemática Final

**Effective Daily per Player**:
- Ganha: 3,377 virtual coins
- Claimable: 1,013 VBMS real (30%)
- Vesting: 33.8 VBMS/dia por 30 dias

**Pool Sustainability** (2,000 players):
```
2,000 × 33.8 VBMS/day = 67,600/day
Pool: 10M ÷ 67.6K = 148 dias (~5 meses)

Com 25% burn rate:
Net: 67.6K × 0.75 = 50.7K/day
Pool: 10M ÷ 50.7K = 197 dias (~6.5 meses)

Com dynamic rewards (pool decay 50%):
Average: 50.7K × 0.75 = 38K/day
Pool: 10M ÷ 38K = 263 dias (~8.7 meses)
```

**🎉 Pool dura quase 9 meses com 2K jogadores!**

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Ajustar Rewards (-50%)
- [ ] Atualizar `PVE_REWARDS` no código
- [ ] Atualizar `PVP_WIN_REWARD`
- [ ] Atualizar `BONUSES`
- [ ] Atualizar `DAILY_CAP`
- [ ] Reduzir achievements rewards
- [ ] Atualizar documentação

### Fase 2: Implementar Hybrid (70/30)
- [ ] Adicionar campo `virtualCoins` no schema
- [ ] Adicionar campo `claimableCoins` (30%)
- [ ] Separar earnings: 70% virtual, 30% claimable
- [ ] UI mostrar ambos balances
- [ ] Claims só funcionam com claimableCoins

### Fase 3: Vesting System
- [ ] Adicionar `vestingSchedule` no schema
- [ ] Mutation para criar vesting entry
- [ ] Cron job para liberar vested daily
- [ ] UI mostrar vesting progress
- [ ] Claim apenas unlocked amount

### Fase 4: Token Sinks
- [ ] Criar shop de items
- [ ] Implementar burning mechanism
- [ ] Tournament system com entry fees
- [ ] Marketplace trading fees

### Fase 5: Dynamic Rewards
- [ ] Query para pool remaining %
- [ ] Aplicar multiplier em rewards
- [ ] UI mostrar current multiplier
- [ ] Transparent communication

---

## ⚠️ COMUNICAÇÃO COM PLAYERS

### Antes do Launch

**Mensagem**: "testVBMS → VBMS Real"
- Sistema novo de claim
- Rewards ajustados para sustentabilidade
- 30% claimable como token real
- 70% virtual para in-game use
- Vesting 30 dias para estabilidade
- Novos sinks e features

### Durante Transição

**Transparência**:
- Pool remaining visible
- Current multipliers shown
- Vesting schedule clara
- FAQs atualizados
- Suporte ativo

---

## 🤔 PERGUNTAS PARA DECIDIR

1. **Aceita redução -50% em rewards?**
   - Pro: Pool sustentável
   - Con: Players ganham menos

2. **Aceita hybrid 70/30?**
   - Pro: Pool dura 3.3x mais
   - Con: Confuso (2 currencies)

3. **Aceita vesting 30 dias?**
   - Pro: Distribui pressure
   - Con: Players querem instant

4. **Qual pool size?**
   - 10M (current)
   - 50M (5x mais tempo)
   - 100M (10x mais tempo)

5. **Prioridade: Growth ou Sustainability?**
   - Growth: Rewards altos, pool esgota rápido
   - Sustainability: Rewards baixos, pool dura meses

---

**Status**: ⏳ AGUARDANDO DECISÕES
**Próximo passo**: Definir estratégia final
