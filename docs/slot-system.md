# Tukka Slots — Documentação do Sistema

## Arquivos

| Arquivo | Papel |
|---------|-------|
| `lib/slot/config.ts` | Tipos, pool de cartas, suit/rank map, pesos |
| `lib/slot/engine.ts` | Lógica de spin, detecção de combos, cascade |
| `components/SlotMachine.tsx` | UI, animações, lógica cliente |
| `app/slot/page.tsx` | Página principal, VBMS deposit/withdraw |
| `convex/slot.ts` | Backend: spin, freespins, créditos |

---

## Grid

- **5 colunas × 3 linhas = 15 células**
- Cada carta tem: `baccarat` (nome), `rarity`, `suit`, `rank`, `hasFoil`

---

## Sistema de Combos (atualizado Abr/2026)

### Tipos de combo

#### 1. Four-of-a-Kind (por rank)
4 cartas do **mesmo rank** em qualquer posição do grid = combo.

Exemplo: Miguel (K♥) + Naughty Santa (K♦) + Ye (K♣) + Nico (K♠) = **Four Kings!**

| Rank | Payout (% da aposta) |
|------|----------------------|
| A    | 1000% |
| K    | 500%  |
| Q    | 400%  |
| J    | 300%  |
| 10   | 250%  |
| 9    | 200%  |
| 8    | 150%  |
| 7    | 100%  |
| 6    | 60%   |
| 5    | 40%   |
| 4    | 30%   |
| 3    | 20%   |
| 2    | 15%   |

#### 2. Flush (por naipe/suit)
4+ cartas do **mesmo naipe** em qualquer posição do grid = combo.

| Qtd | Nome        | Payout |
|-----|-------------|--------|
| 4   | Small Flush | 35%    |
| 5   | Flush       | 80%    |
| 6   | Big Flush   | 150%   |
| 7+  | Royal Flush | 300%   |

Naipes: ♥ hearts (vermelho) | ♦ diamonds (laranja) | ♣ clubs (verde) | ♠ spades (azul)

### Joker (Dragukka)
- Substitui qualquer **rank** ou **naipe** em qualquer combo
- Em modo normal: neymar e clawdmoltopenbot NÃO são wildcards
- Em bonus mode: apenas dragukka age como wildcard (neymar/clawdmoltopenbot re-rolados)
- Mínimo: pelo menos 2 cartas reais (sem joker) para ativar o combo

### Cascade
Após um combo, as cartas removidas são substituídas por novas (caem do topo).
Se o novo grid forma outro combo → cascade continua.

Multiplicador de cascade: 1x → 2x → 3x → 5x → 8x

---

## Foil & Bonus Mode

- Cartas **foil** não são destruídas no combo — acumulam entre cascades
- **4+ foils** no grid final → ativa Bonus Mode (10 giros grátis)
- Em Bonus Mode: dragukka spawn mais frequente, crece de nível a cada combo

---

## Mapa Suit/Rank das Cartas

```
Rank A (Mythic):    anon♥  linda xied♦  vitalik jumpterin♣  jesse♠
Rank 2 (Common):    rachel♥  claude♦  gozaru♣  ink♠
Rank 3 (Common):    casa♥  groko♦  rizkybegitu♣  thosmur♠
Rank 4 (Common):    brainpasta♥  gaypt♦  dan romero♣  morlacos♠
Rank 5 (Common):    landmine♥  linux♦  joonx♣  don filthy♠
Rank 6 (Common):    pooster♥  john porn♦  scum♣  vlady♠
Rank 7 (Rare):      smolemaru♥  ventra♦  bradymck♣  shills♠
Rank 8 (Rare):      betobutter♥  qrcodo♦  loground♣  melted♠
Rank 9 (Epic):      sartocrates♥  0xdeployer♦  lombra jr♣  vibe intern♠
Rank 10 (Epic):     jack the sniper♥  beeper♦  horsefarts♣  jc denton♠
Rank J (Epic):      zurkchad♥  slaterg♦  brian armstrong♣  nftkid♠
Rank Q (Legendary): antonio♥  goofy romero♦  tukka♣  chilipepper♠
Rank K (Legendary): miguel♥  naughty santa♦  ye♣  nico♠

Special (sem rank/suit): dragukka, neymar, clawdmoltopenbot
```

---

## Como Adicionar Nova Carta

1. `data/vmw-tcg-cards.json` → adicionar com suit e rank
2. `lib/slot/config.ts` → `SLOT_CARD_POOL` + `SLOT_CARD_SUIT_RANK` + `SLOT_CARD_LABELS`
3. Se for rank novo → adicionar em `SLOT_RANK_ORDER` e `RANK_COMBO_PAYOUT` no engine

---

## Weights (probabilidade)

| Rarity    | Weight | Nota |
|-----------|--------|------|
| Special   | 5      | wildcards |
| Mythic    | 1      | muito raro |
| Legendary | 4      | inclui naughty santa |
| Epic      | 10     | 12 cartas |
| Rare      | 20     | 8 cartas |
| Common    | 35     | 18 cartas (alguns weight=0: rachel, landmine, pooster) |

Em bonus mode: Mythic/Legendary têm 2× boost, Epic 1.5× boost.
