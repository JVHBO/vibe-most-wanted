# Tukka Slots — Documentação do Sistema

> Atualizado: 2026-04-23

---

## Arquivos

| Arquivo | Papel |
|---------|-------|
| `lib/slot/config.ts` | Tipos, pool de cartas, suit/rank map, shapes/patterns, pesos, `isDeveloperSlotAddress` |
| `lib/slot/engine.ts` | Lógica de spin, detecção de combos por shape, cascade, wildcards |
| `components/SlotMachine.tsx` | UI, animações, i18n, lógica cliente |
| `app/slot/page.tsx` | Página principal, VBMS deposit/withdraw, settings |
| `convex/slot.ts` | Backend: spin, freespins, boost diário, audit log |

---

## Grid

- **5 colunas × 3 linhas = 15 células** (índices 0–14)
- Layout:
  ```
  [ 0][ 1][ 2][ 3][ 4]
  [ 5][ 6][ 7][ 8][ 9]
  [10][11][12][13][14]
  ```
- Cada carta tem: `baccarat` (nome), `rarity`, `suit`, `rank`, `hasFoil`

---

## Fluxo de um Spin

```
Usuário clica SPIN
  → SlotMachine.tsx chama spinMut (api.slot.spinSlot)
  → Convex verifica: dev guard, saldo, free spins, custo
  → Convex calcula combo boost + pity
  → Convex chama resolveSlotSpin() (engine)
  → Resultado salvo no DB (slotSpins) com spinId único
  → Resposta retorna ao cliente: comboSteps, finalGrid, bonusState, spinId, winAmount
  → Cliente salva spinId em sessionStorage (recovery de F5)
  → Animação de spin (reels)
  → Animação de combos + highlight de shapes
  → Win screen se win ≥ 2× bet
  → Botão de share (cast Farcaster)
```

**Recovery (F5):** se `slot_pending_spin` existe no sessionStorage com timestamp < 2 min, exibe toast com os coins ganhos.

---

## Sistema de Combos

### Shapes (padrões válidos)

Todo combo precisa formar um dos 23 shapes no grid 5×3:

| Tipo | Quantidade | Exemplos |
|------|------------|---------|
| Horizontal | 6 | fileiras top/mid/bottom, deslocadas 1 |
| Diagonal | 4 | ↘ ↙ ↗ ↖ |
| Vertical | 5 | colunas 1–5 |
| L-shape | 8 | cantos e meios, 4 orientações |

### Tipo 1 — Rank Combo

4 cartas do **mesmo rank**, cada uma de um naipe diferente (♥♦♣♠), formando um shape válido.

| Rank | Payout (% da aposta) | Nome do Combo |
|------|----------------------|---------------|
| A    | 400% | The Anon Council |
| K    | 200% | Kings of Vibe |
| Q    | 160% | Goofy's Revenge |
| J    | 120% | The Degens |
| 10   | 100% | — |
| 9    | 80%  | — |
| 8    | 60%  | — |
| 7    | 40%  | — |
| 6    | 25%  | — |
| 5    | 18%  | — |
| 4    | 14%  | — |
| 3    | 10%  | — |
| 2    | 8%   | — |

> Payout mínimo por combo = 1× bet (independente do rank).

### Tipo 2 — Quad Combo

4 cartas **idênticas** (mesmo `baccarat`) em shape válido. Paga **3× o Rank Combo** correspondente.

Especiais:
- `neymar` → "Neymar's Miracle" 🌟
- `clawdmoltopenbot` → "Bot Singularity" 🌟
- `dragukka` (4x) → "Dragukka Storm" 🐉 → paga 1200% da aposta

### Cascade

Após combo, as cartas consumidas saem e novas caem do topo. Se o novo grid forma outro combo → cascade continua (máx 20 steps). **Sem multiplicador de cascade — payout flat por combo.**

---

## Wildcards

| Carta | Modo | Comportamento |
|-------|------|---------------|
| **Neymar** | Normal | Wildcard — completa qualquer rank combo como carta faltando; desaparece após uso |
| **Clawdmoltopenbot** | Normal | Mesmo que Neymar |
| **Dragukka** | Bonus Mode apenas | Joker — substitui qualquer carta; fica no grid todos os 10 spins; máx 1 uso por spin |

> Mínimo 1 carta real (não wildcard) para ativar qualquer combo.
> Em Bonus Mode: Neymar e Clawdmoltopenbot são re-rolados (não aparecem).

---

## Foil & Bonus Mode

- **Foil (FOIL):** cartas douradas — NÃO são destruídas no combo, acumulam no grid
- Chance de foil: 15% por carta no modo normal, 7% no Bonus Mode
- **4+ foils** no grid final → ativa Bonus Mode (10 giros grátis)
- Durante o bonus: re-trigger se 4+ foils novamente (+10 spins)
- Em Bonus Mode: Dragukka pode spawnar (2% por célula, garantido após 5 spins sem aparecer, máx 1 nova por spin)
- **Bonus Mode boost de raridade:** Mythic/Legendary 2×, Epic 1.5×

---

## Boost Diário (Convex server-side)

| Spins do dia (total) | Chance base de combo |
|----------------------|----------------------|
| < 3 | 75% |
| 3–5 | 55% |
| 6–9 | 40% |
| 10–19 | 28% |
| 20+ | 20% |

**Pity:** +12% por spin sem combo, máximo +50%.  
**Hard pity:** 4 spins seguidos sem combo → força combo (re-roll até 5 tentativas).

---

## Win Screens

| Label | Threshold (do bet) |
|-------|--------------------|
| Nice Win | ≥ 2× |
| Great Win | ≥ 5× |
| Big Win | ≥ 20× |
| Max Win | ≥ 100× |

- Auto-fecha em 4s, dispensável por clique
- Max Win encerra bonus spins imediatamente
- Botão de share → cast Farcaster com OG image `/api/og/slot-win`

---

## Custos

| Tipo | Custo |
|------|-------|
| Normal spin | `betMultiplier` coins |
| Free daily spin | 0 (10/dia) |
| Bonus spin | 0 (já pago na entrada) |
| Buy Bonus entry | 20× betMultiplier |

**VBMS ↔ Coins:** 1 VBMS = 10 coins (deposit/withdraw via contrato Base)

---

## Dev Guard

O slot está restrito a wallets autorizadas em `lib/slot/config.ts → SLOT_DEV_ALLOWED_ADDRESSES`.  
Verificado server-side em `convex/slot.ts:spinSlot` — checa tanto a wallet conectada quanto a wallet do perfil vinculado.

> **Remover antes do launch:** `convex/slot.ts:~204` + `SlotMachine.tsx:27` (import `isDeveloperSlotAddress`)

---

## Mapa Suit/Rank das Cartas

```
Rank A (Mythic):    anon♥  linda xied♦  vitalik♣  jesse♠
Rank K (Legendary): miguel♥  naughty santa♦  ye♣  nico♠
Rank Q (Legendary): antonio♥  goofy romero♦  tukka♣  chilipepper♠
Rank J (Epic):      zurkchad♥  slaterg♦  brian armstrong♣  nftkid♠
Rank 10 (Epic):     jack the sniper♥  beeper♦  horsefarts♣  jc denton♠
Rank 9 (Epic):      sartocrates♥  0xdeployer♦  lombra jr♣  vibe intern♠
Rank 8 (Rare):      betobutter♥  qrcodo♦  loground♣  melted♠
Rank 7 (Rare):      smolemaru♥  ventra♦  bradymck♣  shills♠
Rank 6 (Common):    pooster♥  john porn♦  scum♣  vlady♠
Rank 5 (Common):    landmine♥  linux♦  joonx♣  don filthy♠
Rank 4 (Common):    brainpasta♥  gaypt♦  dan romero♣  morlacos♠
Rank 3 (Common):    casa♥  groko♦  rizkybegitu♣  thosmur♠
Rank 2 (Common):    rachel♥  claude♦  gozaru♣  ink♠

Special (sem rank/suit): dragukka, neymar, clawdmoltopenbot
```

---

## Weights (probabilidade de spawn)

| Rarity    | Weight normal | Bonus Mode |
|-----------|---------------|------------|
| Special   | 5 | 5 |
| Mythic    | 1 | 2 |
| Legendary | 4 | 8 |
| Epic      | 10 | 15 |
| Rare      | 20 | 20 |
| Common    | 35 | 35 |

> Algumas Common têm weight=0 (rachel, landmine, pooster) — não dropam.

---

## Como Adicionar Nova Carta

1. `data/vmw-tcg-cards.json` → adicionar objeto com suit e rank
2. `lib/slot/config.ts` → `SLOT_CARD_POOL` + `SLOT_CARD_SUIT_RANK` + `SLOT_CARD_LABELS`
3. Se rank novo → adicionar em `SLOT_RANK_ORDER` (engine) + `RANK_COMBO_PAYOUT` (engine) + `RANK_COMBO_INFO` (engine)
4. Deploy Convex + push GitHub

---

## Funções Convex (slot.ts)

| Função | Chamada por |
|--------|------------|
| `spinSlot` | `SlotMachine.tsx` (mutation) |
| `getSlotDailyStats` | `SlotMachine.tsx` + `app/slot/page.tsx` (query) |
| `depositVBMS` | `app/slot/page.tsx` |
| `prepareWithdraw` | `app/api/slot/prepare-withdraw/route.ts` |
| `getSpinsBySession` | OG image, share/slot, replay via HTTP raw path |
| `getSlotConfig` | ⚠️ não chamada — dead code |
| `getSpinById` | ⚠️ não chamada — dead code |
| `getLastSpinResult` | ⚠️ não chamada — dead code |
| `getSlotHistory` | ⚠️ não chamada — dead code |
