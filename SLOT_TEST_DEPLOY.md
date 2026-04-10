# Slot Machine - Teste e Deploy

## 🧪 Modo de Teste (PROBABILIDADES ALTAS)

Para testar o sistema facilmente, as probabilidades estão aumentadas:

### Configuração de Teste Atual:
- ✅ **Bônus Foil:** Apenas 2+ cartas com foil (normalmente seria 4+)
- ✅ **Chance Foil:** 40% normal, 60% no bônus (normal: 20%/40%)
- ✅ **Wildcards:** 30% chance no bônus (normal: 15%)
- ✅ **Peso Raridade:** 5x para Mythic/Legendary no bônus (normal: 3x)

### Como Testar:
1. Acesse `/slot` com uma wallet autorizada
2. Faça spins pagos ou use free spins
3. Observe o contador de foil no canto superior direito (mostra quantas foil no último spin)
4. Quando aparecer **4+ foil**, você receberá **10 BONUS FREE SPINS**
5. No modo bônus, as cartas raras e wildcards aparecem MUITO mais Often

## 📁 Arquivos GIF Necessários

```
public/slot-gifs/
├── casino-slot-animation.gif      ✅ (2369 KB - criado do vídeo WhatsApp)
└── gen4-turbo-idle-breathing.gif ✅ (2.3 MB - fornecido)
```

## 🚀 Deploy

### 1. Backend (Convex)
```bash
cd vibe-most-wanted
npx convex deploy --env-file .env.prod
```

### 2. Frontend (Next.js)
```bash
node node_modules/next/dist/bin/next build
# ou se estiver no PowerShell:
npx next build
```

### 3. Git push (auto-deploy Vercel)
```bash
git add -A
git commit -m "feat(slot): add foil bonus system with animated GIFs"
git push origin main
```

## 🔍 Verificação Pós-Deploy

1. **Acesse** `https://agile-orca-761.vercel.app/slot`
2. **Conecte wallet** (precisa ser da whitelist)
3. **Clique em SPIN** e observe:
   - Contador de foil aparece no canto superior direito
   - Cartas com foil têm shimmer dourado animado
   - VBMS Special mostra GIF de cassino (ocupa 2 colunas)
   - Se conseguir 4+ foil: aparece mensagem "+10 FREE SPINS BÔNUS!"
   - Botão SPIN muda para **"BONUS"** roxo quando há bonus spins

## 🐛 Troubleshooting

### Foil não aparece:
- Verificar se `hasFoil` está sendo setado (debug: console.log do grid)
- Checar se CSS `@keyframes foil-shimmer` está carregando

### Bônus não ativa:
- Verificar `foilCount` retornado pelo backend
- Teste com 2+ foil (modo teste) para confirmar lógica

### GIFs não carregam:
- Verificar caminhos em `public/slot-gifs/`
- Abrir devtools → Network → ver se os GIFs retornam 200

### Botão BONUS não aparece:
- Verificar `bonusSpinsRemaining` state
- Checar se `statsQ?.bonusSpinsAvailable` está retornando dados

## 🎯 Comandos Úteis

### Resetar stats de slot (para teste):
```bash
npx convex run slot.resetDailyStats '{"address": "0x..."}' --env-file .env.prod
```

### Ver stats de um jogador:
```bash
npx convex run slot.getSlotDailyStats '{"address": "0x..."}' --env-file .env.prod
```

### Adicionar bonus spins manualmente:
```bash
npx convex run slot.adminAddBonusSpins '{"address": "0x...", "count": 10}' --env-file .env.prod
```

## 📊 O que mudou:

**Arquivos modificados:**
- `convex/slot.ts` - backend com foil system e wildcards
- `convex/schema.ts` - adicionado `slotBonusSpins` no perfil
- `components/SlotMachine.tsx` - frontend com efeitos visuais e GIFs
- `public/slot-gifs/` - GIFs animados

**Novas features:**
1. Foil mechanic (shimmer visual + contador)
2. Bônus trigger: 4+ foil → +10 free spins
3. Wildcards especiais (Gen-4 Turbo) no bônus
4. VBMS Special com GIF de cassino (2 colunas)
5. Prioridade de spins: Bonus > Free > Pago

## ⚠️ Notas

- Grid é 5x2 (10 células) - layout cassino tradicional
- Backend gera 10 cartas, frontend espera 10
- Wildcards atuam como curingas nas linhas/colunas
- Teste com probabilidades altas, depois normalize para produção
