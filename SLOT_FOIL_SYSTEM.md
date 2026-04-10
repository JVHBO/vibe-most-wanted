# Slot Machine - Sistema de Bônus Foil

## 🎰 Visão Geral

O sistema de slot machine agora possui:

1. **Grid 5x2** (10 células) - layout de cassino
2. **VBMS Special** ocupa 2 colunas centrais com GIF animado de cassino
3. **Efeito de Foil** - cartas podem ter shimmer animado (borda dourada brilhante)
4. **Bônus de 4 Foil** - ao obter 4+ cartas com foil em um mesmo spin, ganha **10 free spins** extras
5. **Free Spins de Bônus** - durante esses spins, chance aumentada de cartas especiais raras (Mythic/Legendary 3x peso)
6. **Cartas Especiais Animadas** - Wildcards (Gen-4 Turbo) que aparecem durante o bônus e funcionam como curingas

## 📁 Estrutura de Arquivos

```
public/slot-gifs/
├── casino-slot-animation.gif      # GIF para VBMS Special (cassino)
├── gen4-turbo-idle-breathing.gif  # GIF para wildcard Gen-4 Turbo
└── (outros wildcards)
```

## 🎯 Mecânicas

### Foil System
- **Chance normal:** 20% de aparecer foil
- **Modo bônus:** 40% de aparecer foil
- **Efeito visual:** shimmer dourado + borda brilhante

### Bonus Trigger
- **4+ cartas com foil** em um único spin → +10 free spins
- Free spins de bônus são **acumulativos** e **não contam** contra o limite diário
- Prioridade: Bonus Spins > Free Spins Diários > Spins Pagos

### Wildcards
- Aparecem apenas durante **modo bônus** (15% chance por célula)
- Cartas: `gen4_turbo`, `idle_breathing`
- Funcionam como curingas nas combinações (combinam com qualquer carta)
- Tratadas como Mythic para pagamentos
- Sempre vêm com foil

### Pagamentos (5x2 grid)
- **Rows:** 5 cartas na mesma linha
- **Columns:** 2 cartas na mesma coluna (precisam ser iguais)
- **VBMS Special scatter:** 2+ appearances = pagamento (2=100, 3=1500, 4=30000, 5=50000)
- **Mythics espalhados:** 3+ mythics em qualquer posição = +500

## 🛠️ Configuração

### 1. Adicionar GIFs
Coloque os GIFs animados em `public/slot-gifs/`:

```bash
public/slot-gifs/casino-slot-animation.gif
public/slot-gifs/gen4-turbo-idle-breathing.gif
```

### 2. Rotear Convex Schema
O campo `slotBonusSpins` já foi adicionado ao schema `profiles`.

### 3. Deploy Backend
```bash
npx convex deploy --env-file .env.prod
```

### 4. Build Frontend
```bash
node node_modules/next/dist/bin/next build
```

## 🎨 Cores e Estilos

- **Foil Shimmer:** gradiente branco translúcido animado
- **VBMS Special:** Dourado com GIF de cassino
- **Botão Bônus:** Verde (free spins), Roxo (bonus spins), Dourado (pago)
- **Contador de Foil:** Mostra quantas cartas com foil no último spin

## 📊 Estatísticas

A query `getSlotDailyStats` agora retorna:
- `bonusSpinsAvailable`: número de free spins de bônus acumulados

## 🔄 Fluxo do Jogo

1. **Spin Normal** → cartas aparecem com chance de foil
2. **Verifica foilCount** → se >= 4, adiciona 10 bonus spins
3. **Próximo spin** → usa bonus spins primeiro (se não houver free spins diários)
4. **Modo Bônus** → 3x peso para Mythic/Legendary, 40% foil, 15% wildcards
5. **Repetir** → novos 4+ foil geram mais 10 bonus spins

## ⚠️ Notas Técnicas

- Grid 5x2: 10 células (2 rows × 5 cols)
- Backend Convex usa `GRID_SIZE = 10`
- Frontend usa `COLS=5, ROWS=2`
- VBMS Special nas colunas 2-3 (índices 2,3 e 7,8) ocupa 2 colunas via `gridColumn: span 2`
- Wildcards são `gen4_turbo` e `idle_breathing` (alias)

## 🐛 Troubleshooting

- **GIFs não aparecem:** Verificar se os arquivos estão em `public/slot-gifs/` e os nomes batem com as constantes
- **Foil não aparece:** Verificar se `hasFoil` está sendo setado no backend (20%/40% chance)
- **Bônus não ativa:** Contar quantas cartas têm `hasFoil: true` no grid resultante
- **Grid size mismatch:** Garantir que backend gera 10 cartas e frontend espera 10 (5x2)
