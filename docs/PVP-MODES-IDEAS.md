# 🎮 PVP MODES IDEAS - Vibe Most Wanted

Documentação de todas as ideias de modos PvP discutidas.

**Data:** 2025-11-04
**Constraint:** Usar APENAS traits existentes (foil, rarity, wear)

---

## 📋 MODOS SEM TURNOS (Trait-Based)

### 1. TRAIT ROULETTE (RNG + Estratégia)
**Complexidade:** ⭐ (1-2 dias)
**Estratégia:** ⭐⭐⭐

**Conceito:**
- Sistema sorteia 1 trait que recebe boost massivo
- Players têm tempo para montar deck sabendo o boost
- Batalha normal com poder modificado

**Boosts:**
```
FOIL FRENZY:     Prize 3x, Standard 2x
PRISTINE PERFECT: Pristine 2x, Mint 1.5x
RARITY RUSH:     Mythic 2x, Legendary 1.5x
DAMAGE REDEMPTION: Damaged 2x (normalmente 1x)
COMMON CHAOS:    Common 10x, Rare 5x
```

**Vantagens:**
- Força diversidade de deck
- RNG mantém jogo fresh
- Muito rápido de implementar

---

### 2. TRAIT DRAFT (Ban + Pick)
**Complexidade:** ⭐⭐⭐⭐ (4-5 dias)
**Estratégia:** ⭐⭐⭐⭐⭐

**Conceito:**
- Phase 1: Players banem 1 trait cada ("Ban Prize Foils")
- Phase 2: Ambos montam deck SEM traits banidas
- Phase 3: Batalha normal

**Bans possíveis:**
```
"Ban all Prize foils"
"Ban all Standard foils"
"Ban all Mythic rarity"
"Ban all Legendary rarity"
"Ban all Pristine wear"
"Ban all Mint wear"
```

**Vantagens:**
- Counter-play (bane strengths do oponente)
- Altamente estratégico
- Chess-like mind games

---

### 3. TRAIT SYNERGY (Sistema de Combos)
**Complexidade:** ⭐⭐ (2-3 dias)
**Estratégia:** ⭐⭐⭐⭐

**Conceito:**
- Ganhe bonus por combinar traits similares

**Synergies:**
```
ROYAL FLUSH:      All 5 same rarity → +50%
MINT CONDITION:   All 5 Pristine/Mint → +30%
FOIL COLLECTION:  All 5 foiled → +40%
RAINBOW DECK:     All 5 different rarities → +20%
DAMAGED GOODS:    All 5 damaged → +35%
LEGENDARY TRIO:   3+ Legendaries → +15%
MYTHIC PAIR:      2+ Mythics → +25%
PRIZE DOUBLE:     2 Prize foils → +60%
```

**Vantagens:**
- Múltiplas build strategies
- Recompensa deck building
- Fácil de entender

---

### 4. TRAIT BATTLE ROYALE (3 Rounds)
**Complexidade:** ⭐⭐⭐ (3-4 dias)
**Estratégia:** ⭐⭐⭐⭐

**Conceito:**
- 3 rounds, cada um julga 1 trait
- Best 2 out of 3 ganha

**Rounds:**
```
ROUND 1: RARITY SHOWDOWN
  → Soma base rarity values
  → Mythic=800, Legendary=240, Epic=80, Rare=20, Common=5

ROUND 2: FOIL FACE-OFF
  → Conta foils: Prize=3pts, Standard=1pt, None=0

ROUND 3: WEAR WAR
  → Soma wear quality: Pristine=1.8, Mint=1.4, etc
```

**Vantagens:**
- Estratégia de especialização (dominar 2 rounds)
- Impossível empatar
- Todas 3 traits são importantes

---

### 5. TRAIT RESTRICTIONS (Budget System)
**Complexidade:** ⭐⭐⭐⭐⭐ (5-6 dias)
**Estratégia:** ⭐⭐⭐⭐⭐

**Conceito:**
- Cada card tem custo baseado em traits
- Budget: 1000 pontos
- Monte deck dentro do budget

**Pricing:**
```
RARITY:
  Mythic: 400 pts
  Legendary: 200 pts
  Epic: 80 pts
  Rare: 30 pts
  Common: 10 pts

FOIL:
  Prize: +300 pts
  Standard: +80 pts
  None: +0 pts

WEAR:
  Pristine: +100 pts
  Mint: +50 pts
  Others: +0 pts
```

**Twist:**
- Cada 100 pts não gastos = +5% power bonus
- Gastou só 500? +25% bonus!

**Vantagens:**
- Resource management
- Viabiliza cartas "ruins"
- Alto skill ceiling

---

## ⚔️ MODOS COM TURNOS

### 1. TURNOS SIMULTÂNEOS (Commitment System)
**Complexidade:** ⭐⭐⭐⭐ (4-5 dias)
**Estratégia:** ⭐⭐⭐⭐⭐

**Conceito:**
- Turno 1: Ambos escolhem 5 cartas secretamente
- Turno 2: Veem cartas do oponente, aplicam modificadores
- Reveal: Batalha com modificadores

**Modificadores:**
```
RARITY BOOST:  +30% (só Rare+)
FOIL POLISH:   +50% (só com foil)
RESTORE WEAR:  +40% (só Pristine/Mint)
SACRIFICE:     -100% nesta, +30% em outra
TRAIT STEAL:   Copia trait mais forte do oponente
```

**Vantagens:**
- Blind pick tension
- Counter-play no turno 2
- Async-friendly

---

### 2. TURNOS ALTERNADOS (Chess-Style)
**Complexidade:** ⭐⭐⭐⭐⭐⭐ (2-3 semanas)
**Estratégia:** ⭐⭐⭐⭐⭐⭐

**Conceito:**
- Grid 2x3 (Front row + Back row)
- Turnos alternados: Move OU ativa habilidade
- Cards em posições específicas batalham

**Grid:**
```
┌───────┬───────┬───────┐
│ Back1 │ Back2 │ Back3 │  +20% def
├───────┼───────┼───────┤
│Front1 │Front2 │Front3 │  +30% atk
└───────┴───────┴───────┘
```

**Habilidades por Trait:**
```
FOIL:
  Prize: "BLIND" - Oculta carta por 1 turno
  Standard: "SWAP" - Troca posições

RARITY:
  Mythic: "DOMINATE" - +50% em 1 carta
  Legendary: "INSPIRE" - +20% adjacentes
  Epic: "DEFEND" - +30% defense
  Rare: "SCOUT" - Revela posição
  Common: "RUSH" - Move 2 espaços

WEAR:
  Pristine: "PERFECT FORM" - Immune debuffs
  Mint: "QUICK DRAW" - Age primeiro
  Damaged: "DESPERATION" - +40% quando HP<50%
```

**Vantagens:**
- Profundidade estratégica máxima
- Xadrez-like gameplay
- Replay value alto

**Desvantagens:**
- Implementação complexa
- Balancing difícil

---

### 3. CARD-BY-CARD REVEAL (Poker Style) ⭐ RECOMENDADO
**Complexidade:** ⭐⭐⭐ (5-7 dias)
**Estratégia:** ⭐⭐⭐⭐⭐

**Conceito:**
- Turno 0: Ambos ordenam 5 cartas (1º→5º)
- Turnos 1-5: Revelam 1 carta por vez
- Cada turno: Decisão (Boost/Sacrifice/Keep)
- Final: Compara power total

**Decisões:**
```
BOOST:     +20% nesta carta (max 2 no jogo)
SACRIFICE: -50% nesta, +25% na próxima
KEEP:      Não faz nada, guarda recursos
```

**Trait Interactions:**
```
FOIL vs FOIL:
  Ambas Prize: +30% cada
  Ambas Standard: +15% cada

RARITY DOMINATION:
  Mythic vs Legendary: +10% para Mythic
  Legendary vs Epic: +10% para Legendary

WEAR COMPARISON:
  Pristine vs Damaged: +20% para Pristine
  Mint vs Lightly Played: +10% para Mint
```

**Vantagens:**
- Drama building (tensão crescente)
- Timing strategy (quando usar boosts?)
- Similar a Elimination Mode (reuse code!)
- Perfeito para async

**Por que é o recomendado:**
- ✅ Balance perfeito de complexidade/estratégia
- ✅ Usa as 3 traits igualmente
- ✅ Async-friendly (Convex)
- ✅ Código reutilizável
- ✅ UX familiar

---

### 4. PHASE-BASED TURNS (Hearthstone Style)
**Complexidade:** ⭐⭐⭐⭐⭐⭐ (2-3 semanas)
**Estratégia:** ⭐⭐⭐⭐⭐⭐

**Conceito:**
- 3 fases por turno, alternado
- Deploy → Enhance → Attack

**Fases:**
```
DEPLOYMENT:
  - Adiciona 1 carta ao campo (max 3)
  - OU remove 1 carta

ENHANCEMENT:
  - Boost: "Boost Foil" (+30% foils)
  - OU Debuff: "Rust Foils" (-15% opp foils)

ATTACK:
  - 1v1 sua carta vs carta oponente
  - Perdedor removido
```

**Victory:**
- Elimine todas 5 cartas do oponente
- OU maior power após 8 turnos

**Vantagens:**
- Máxima profundidade estratégica
- Eliminations progressivas
- Resource management

**Desvantagens:**
- Mais lento
- Complexidade muito alta

---

### 5. TRAIT TRIANGLE (Rock-Paper-Scissors)
**Complexidade:** ⭐⭐ (3-4 dias)
**Estratégia:** ⭐⭐⭐

**Conceito:**
- Traits contram outras em ciclo
- 5 rounds (best of 5)
- Cada round: 1v1 com trait advantage

**Triangle:**
```
     FOIL
      ↑ ↓
      ↓ ↑
RARITY ← → WEAR

FOIL beats RARITY (+30%)
RARITY beats WEAR (+25%)
WEAR beats FOIL (+35%)
```

**Primary Trait:**
```
Prize foil → FOIL
Mythic/Legendary → RARITY
Pristine (sem prize) → WEAR
Standard foil → FOIL
Default → RARITY
```

**Vantagens:**
- Fácil de entender (RPS)
- Mind games (predição)
- Implementação rápida

---

## 📊 COMPARAÇÃO

### Por Implementação (Mais fácil → Mais difícil):
1. ⭐ Trait Roulette (1-2 dias)
2. ⭐⭐ Trait Synergy (2-3 dias)
3. ⭐⭐ Trait Triangle (3-4 dias)
4. ⭐⭐⭐ Battle Royale (3-4 dias)
5. ⭐⭐⭐ Card-by-Card ⭐ RECOMENDADO (5-7 dias)
6. ⭐⭐⭐⭐ Simultâneo (4-5 dias)
7. ⭐⭐⭐⭐ Trait Draft (4-5 dias)
8. ⭐⭐⭐⭐⭐ Budget System (5-6 dias)
9. ⭐⭐⭐⭐⭐⭐ Alternado (2-3 semanas)
10. ⭐⭐⭐⭐⭐⭐ Phase-Based (2-3 semanas)

### Por Estratégia (Mais → Menos):
1. Phase-Based, Alternado ⭐⭐⭐⭐⭐⭐
2. Simultâneo, Budget, Card-by-Card ⭐⭐⭐⭐⭐
3. Draft, Battle Royale, Synergy ⭐⭐⭐⭐
4. Roulette, Triangle ⭐⭐⭐

### Por Fun/Replayability:
1. Card-by-Card (drama progressivo)
2. Trait Triangle (mind games)
3. Alternado (xadrez)
4. Roulette (RNG excitement)
5. Synergy (deck building)

### Melhor Tech-Fit (Convex Async):
1. ✅ Simultâneo (perfeito)
2. ✅ Card-by-Card (excelente)
3. ✅ Triangle (muito bom)
4. ⚠️ Alternado (precisa polling)
5. ⚠️ Phase-Based (precisa muito polling)

---

## 🎯 RECOMENDAÇÃO FINAL

**Implementar CARD-BY-CARD REVEAL primeiro** porque:

1. ✅ Balance perfeito (complexidade × estratégia × tempo)
2. ✅ Drama building natural (tensão crescente)
3. ✅ Usa as 3 traits igualmente
4. ✅ Async-friendly (Convex)
5. ✅ Código reutilizável (similar a Elimination)
6. ✅ Tempo viável (1 semana)

**Depois adicionar:**
- Semana 2: Trait Roulette (quick win, RNG)
- Semana 3: Trait Synergy (combo system)
- Semana 4: Trait Triangle (casual fun)

---

## 📝 NOTAS TÉCNICAS

**Constraints do projeto:**
- ✅ Só usar traits existentes: foil, rarity, wear
- ✅ Backend: Convex (async-first)
- ✅ Sem WebSockets (não precisa)
- ✅ Reactive queries (auto-update)

**Viabilidade:**
- Todos os modos listados são tecnicamente viáveis
- Alguns mais complexos (Alternado, Phase-Based) exigem mais tempo
- Modos mais simples (Roulette, Triangle) são quick wins

**Economy Integration:**
- Entry fees: 20-50 coins
- Win rewards: 100-200 coins
- Daily limits: 10 matches/day
- Ranking bonuses aplicáveis

---

**Última atualização:** 2025-11-04
**Status:** Aguardando decisão do usuário
