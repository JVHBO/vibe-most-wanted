# Elimination Mode - Implementation Notes

## Overview
Implementação completa do modo de eliminação para o jogo Vibe Most Wanted, onde jogadores batalham com cartas em rounds sequenciais 1v1 ao invés de comparar poder total.

## Data: 2025-10-31

---

## 🎮 Funcionalidades Implementadas

### 1. Estados de Gerenciamento (app/page.tsx:792-800)
```typescript
const [battleMode, setBattleMode] = useState<'normal' | 'elimination'>('normal');
const [eliminationPhase, setEliminationPhase] = useState<'ordering' | 'battle' | null>(null);
const [orderedPlayerCards, setOrderedPlayerCards] = useState<any[]>([]);
const [orderedOpponentCards, setOrderedOpponentCards] = useState<any[]>([]);
const [currentRound, setCurrentRound] = useState<number>(1);
const [roundResults, setRoundResults] = useState<('win' | 'loss' | 'tie')[]>([]);
const [eliminationPlayerScore, setEliminationPlayerScore] = useState<number>(0);
const [eliminationOpponentScore, setEliminationOpponentScore] = useState<number>(0);
```

**Aprendizado:** Precisamos de múltiplos estados para rastrear:
- Modo de batalha atual (normal vs elimination)
- Fase do modo eliminação (ordenação vs batalha)
- Ordem das cartas de ambos os jogadores
- Round atual e histórico de resultados
- Placar acumulado

---

### 2. UI de Ordenação de Cartas (app/page.tsx:2481-2594)

**Características:**
- Modal full-screen com tema roxo
- Exibe 5 cartas em lista vertical
- Cada carta mostra: posição (#1-#5), imagem, nome, poder, raridade, desgaste
- Botões ↑↓ para reordenar (troca posições adjacentes)
- Botões "START ELIMINATION BATTLE" e "CANCEL"

**Aprendizado Importante:**
- **ERRO CRÍTICO ENCONTRADO:** Tentei usar `calculatePower(rarity, wear, foil)` mas essa função não existe
- **SOLUÇÃO:** Usar `card.power` diretamente - as cartas já vêm com poder calculado do backend
- Location: app/page.tsx:2719

**Código de Reordenação:**
```typescript
const moveCardUp = (index: number) => {
  if (index === 0) return;
  const newOrder = [...orderedPlayerCards];
  [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
  setOrderedPlayerCards(newOrder);
};

const moveCardDown = (index: number) => {
  if (index === orderedPlayerCards.length - 1) return;
  const newOrder = [...orderedPlayerCards];
  [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
  setOrderedPlayerCards(newOrder);
};
```

---

### 3. Estratégias de IA por Dificuldade (app/page.tsx:1338-1414)

Função `generateAIHand(difficulty)`:

**Seleção de Cartas (mesmo que modo normal):**
- **GEY:** 5x cartas de 15 PWR (total: 75)
- **GOOFY:** 5x cartas de 18-21 PWR (total: ~90-105)
- **GOONER:** 5x cartas de 60-72 PWR (total: ~300-360)
- **GANGSTER:** 5x cartas de 240 PWR (total: 1200)
- **GIGACHAD:** Top 5 cartas mais fortes (total: ~855)

**Ordenação Estratégica (NOVO):**
- **GEY/GOOFY:** Ordem aleatória (sem estratégia)
- **GOONER:** Weak-first (sacrifica cartas fracas primeiro)
- **GANGSTER:** Strong-first (força esmagadora desde o início)
- **GIGACHAD:** Padrão balanceado (forte-fraco-forte-fraco-forte)

**Aprendizado:** Cada dificuldade tem personalidade diferente:
- Iniciantes jogam aleatoriamente
- Intermediários sacrificam propositalmente
- Avançados pressionam desde o início
- Expert usa táticas psicológicas

**Código Gigachad (mais complexo):**
```typescript
case 'gigachad':
  const sortedByPower = [...pickedCards].sort((a, b) => (b.power || 0) - (a.power || 0));
  orderedCards = [
    sortedByPower[0], // strongest
    sortedByPower[4], // weakest
    sortedByPower[1], // 2nd strongest
    sortedByPower[3], // 2nd weakest
    sortedByPower[2]  // middle
  ];
  break;
```

---

### 4. Lógica de Batalha Round-by-Round (app/page.tsx:1560-1697)

**Fluxo Modificado:**
1. Detecta se `battleMode === 'elimination'`
2. Se sim, executa lógica round-by-round
3. Se não, executa lógica normal (comparação de poder total)

**Sequência de Eventos (Elimination Mode):**
```
Timeline:
+0ms:    Cartas reveladas (setBattlePhase('cards'))
+2500ms: Clash animation (setBattlePhase('clash'))
+3500ms: Resultado do round (setBattlePhase('result'))
+5500ms: Verifica se acabou ou próximo round
  Se acabou (round 5 ou 3 vitórias):
    +7500ms: Fecha batalha, mostra popup
  Se não acabou:
    +5500ms: Incrementa currentRound
    +6500ms: Próximo clash
```

**Condições de Vitória:**
- Primeiro a ganhar 3 rounds (early finish)
- Ou mais vitórias após 5 rounds completos
- Empate se 2-2-1 ou scores iguais

**Aprendizado Crítico sobre State:**
```typescript
// ❌ ERRADO - currentRound já foi atualizado
const nextPlayerCard = orderedPlayerCards[currentRound];

// ✅ CORRETO - usar índice baseado no round atual
const playerCard = orderedPlayerCards[currentRound - 1];
```

**Round Result Tracking:**
```typescript
setRoundResults([...roundResults, roundResult]); // Adiciona resultado
setEliminationPlayerScore(newPlayerScore);       // Atualiza placar
setEliminationOpponentScore(newOpponentScore);   // Atualiza placar
```

---

### 5. UI da Tela de Batalha (app/page.tsx:2596-2890)

**Diferenças do Modo Normal:**

#### Header:
```typescript
// Normal: "BATTLE!" em amarelo
// Elimination: "⚔️ ELIMINATION MODE" em roxo + placar

<div className="text-center mb-6 md:mb-8">
  <h2 className="text-2xl md:text-4xl font-bold text-purple-400">
    ⚔️ ELIMINATION MODE
  </h2>
  <div className="flex items-center justify-center gap-4">
    <span className="text-cyan-400">Round {currentRound}/5</span>
    <span>You {eliminationPlayerScore} - {eliminationOpponentScore} Opponent</span>
  </div>
</div>
```

#### Exibição de Cartas:
```typescript
// Normal: Grid 5 colunas (todas as cartas pequenas)
// Elimination: Card único grande + mini histórico

{battleMode === 'elimination' ? (
  // Mostra apenas carta do round atual (grande)
  <div className="w-48 md:w-64 aspect-[2/3]">
    <img src={selectedCards[currentRound - 1]?.imageUrl} />
  </div>

  // Mini preview de rounds anteriores (abaixo)
  {currentRound > 1 && (
    <div className="flex gap-1">
      {orderedPlayerCards.slice(0, currentRound - 1).map((card, i) => (
        <div className={roundResults[i] === 'win' ? 'border-green-500' : 'border-red-500'}>
          {/* Mini card */}
        </div>
      ))}
    </div>
  )}
) : (
  // Grid normal
)}
```

**Cores de Borda (Mini Cards):**
- Verde: Vitória
- Vermelho: Derrota
- Amarelo: Empate

#### Mensagens de Resultado:
```typescript
// Normal: "You Win!" / "Dealer Wins!"
// Elimination: "🏆 ROUND WIN!" / "💀 ROUND LOST" / "🤝 ROUND TIE"

{battleMode === 'elimination' && currentRound <= 5
  ? (result === t('playerWins') ? '🏆 ROUND WIN!' : '💀 ROUND LOST')
  : result
}
```

---

### 6. Integração com Difficulty Modal (components/DifficultyModal.tsx:201-208)

**Adicionado:**
```typescript
interface DifficultyModalProps {
  // ... existing props
  onEliminationBattle?: (difficulty: Difficulty) => void; // NOVO
}

// Botão Roxo
{onEliminationBattle && (
  <button
    onClick={() => onEliminationBattle(tempSelected)}
    className="bg-gradient-to-r from-purple-600 to-purple-700"
  >
    ⚔️ Elimination Mode
  </button>
)}
```

**Handler no page.tsx (lines 4533-4547):**
```typescript
onEliminationBattle={(difficulty) => {
  setAiDifficulty(difficulty);
  setIsDifficultyModalOpen(false);

  // Configura elimination mode
  setBattleMode('elimination');
  setEliminationPhase('ordering');
  setOrderedPlayerCards(pveSelectedCards);

  // Mostra UI de ordenação
  setShowPveCardSelection(false);
}}
```

---

## 🐛 Erros Encontrados e Soluções

### Erro 1: Convex Schema Validation Failed
```
Document in "profiles" does not match schema
Path: .defenseDeck[0]
Value: "2522"
Expected: v.object({tokenId, power, imageUrl, name, rarity, foil})
```

**Causa:** Dados antigos no banco tinham `defenseDeck` como array de strings (apenas tokenIds) ao invés de objetos completos.

**Solução (convex/schema.ts:42-55):**
```typescript
// Tornar schema flexível para aceitar formato antigo E novo
defenseDeck: v.optional(v.array(
  v.union(
    v.string(),           // Legacy: apenas tokenId
    v.object({            // Novo: objeto completo
      tokenId: v.string(),
      power: v.number(),
      imageUrl: v.string(),
      name: v.string(),
      rarity: v.string(),
      foil: v.optional(v.string()),
    })
  )
)),
```

**Aprendizado:** Sempre usar `v.union()` para suportar migração de dados gradual.

---

### Erro 2: calculatePower is not defined
```
ReferenceError: calculatePower is not defined
at page.tsx:2719
```

**Causa:** Tentei calcular poder manualmente usando `calculatePower(rarity, wear, foil)` mas essa função não existe no código.

**Solução:**
```typescript
// ❌ ERRADO
const power = calculatePower(rarity, wear, foil);

// ✅ CORRETO
const power = card?.power || 0;
```

**Aprendizado:** As cartas vindas da API já têm `power` calculado - não precisa recalcular no frontend.

---

### Erro 3: Convex functions not synced
```
Could not find public function for 'matches:getMatchHistory'
```

**Causa:** Rodando app local com deployment DEV mas sem `npx convex dev` rodando em paralelo.

**Solução:**
```bash
# Terminal 1
npm run dev

# Terminal 2
npx convex dev
```

**Aprendizado:** Sempre rodar Convex dev server junto com Next.js dev server para desenvolvimento local.

---

## 📊 Arquitetura de Dados

### Estados Temporários (apenas durante batalha):
```typescript
battleMode: 'normal' | 'elimination'
eliminationPhase: 'ordering' | 'battle' | null
currentRound: 1-5
eliminationPlayerScore: 0-3
eliminationOpponentScore: 0-3
roundResults: ['win', 'loss', 'tie', ...]
```

### Estados Persistentes (arrays ordenados):
```typescript
orderedPlayerCards: Card[]  // Ordem escolhida pelo jogador
orderedOpponentCards: Card[] // Ordem estratégica da IA
```

### Estrutura de Card:
```typescript
{
  tokenId: string
  power: number         // JÁ CALCULADO
  imageUrl: string
  name: string
  rarity: string
  foil?: string

  // Metadata crua disponível em:
  raw.metadata.attributes: [
    {trait_type: 'rarity', value: 'legendary'},
    {trait_type: 'wear', value: 'Mint'},
    {trait_type: 'foil', value: 'holo'}
  ]
}
```

---

## 🎯 Fluxo Completo do Usuário

1. **Seleção:** Usuário seleciona 5 cartas
2. **Modo:** Clica "PLAY vs AI" → Abre Difficulty Modal
3. **Dificuldade:** Escolhe dificuldade (GEY → GIGACHAD)
4. **Escolha de Modo:**
   - Botão azul "START BATTLE" → Modo normal
   - Botão roxo "⚔️ Elimination Mode" → Modo eliminação
5. **Ordenação:** (apenas elimination)
   - Tela mostra 5 cartas verticalmente
   - Usa ↑↓ para reordenar
   - Clica "START ELIMINATION BATTLE"
6. **Batalha:** (round-by-round)
   - Round 1: Posição #1 vs Posição #1
   - Mostra resultado: 🏆/💀/🤝
   - Round 2-5: Repete sequencialmente
   - Early finish se alguém chegar a 3 vitórias
7. **Resultado Final:**
   - Popup de vitória/derrota
   - XP/stats atualizados
   - Match gravado no Convex

---

## 🔧 Dependências do useCallback

**playHand deve incluir:**
```typescript
const playHand = useCallback((cardsToPlay?: any[]) => {
  // ...
}, [
  selectedCards,
  nfts,
  t,
  soundEnabled,
  isBattling,
  aiDifficulty,
  address,
  userProfile,
  // IMPORTANTE: Estados do elimination mode
  battleMode,
  orderedPlayerCards,
  orderedOpponentCards,
  currentRound,
  eliminationPlayerScore,
  eliminationOpponentScore,
  roundResults
]);
```

**Aprendizado:** Se usar estados dentro de useCallback, deve incluir nas dependências ou usar refs.

---

## 🎨 Temas Visuais

### Modo Normal:
- Cor primária: Amarelo (`text-yellow-400`)
- Título: "BATTLE!"
- Todas as cartas visíveis em grid

### Modo Elimination:
- Cor primária: Roxo (`text-purple-400`, `from-purple-600`)
- Título: "⚔️ ELIMINATION MODE"
- Header mostra "Round X/5" e placar
- Uma carta grande por vez
- Mini cards mostram histórico

### Feedback Visual:
- Borda verde: Vitória no round
- Borda vermelha: Derrota no round
- Borda amarela: Empate no round
- Animações: `battleGlowBlue`, `battleGlowRed`, `battlePowerPulse`

---

## 📝 Checklist de Implementação

- [x] Estados de gerenciamento
- [x] UI de ordenação de cartas
- [x] Função generateAIHand com estratégias
- [x] Lógica round-by-round no playHand
- [x] UI de batalha modificada para elimination
- [x] Botão no DifficultyModal
- [x] Correção de schema do Convex
- [x] Correção do erro calculatePower
- [x] Testes locais
- [ ] Deploy para produção (pendente)
- [ ] Drag & drop para ordenação (melhoria futura)

---

## 🚀 Próximos Passos

### Melhorias Futuras:
1. **Drag & Drop:** Substituir botões ↑↓ por arrastar e soltar
2. **Animações:** Transições mais suaves entre rounds
3. **Replay System:** Ver replay da batalha depois
4. **Statistics:** Tracking de win rate por estratégia de ordenação
5. **Tournament Mode:** Bracket-style elimination entre múltiplos jogadores
6. **AI Learning:** IA que aprende padrões de ordenação do jogador

### Performance:
- Considerar memoização com `useMemo` para `orderedPlayerCards`
- Lazy loading de imagens das cartas

### Acessibilidade:
- Keyboard shortcuts para reordenar (Arrow keys + Enter)
- Screen reader support para round announcements

---

## 💡 Lições Aprendidas

1. **State Management:** Múltiplos estados interconectados precisam de careful tracking
2. **Schema Migration:** Sempre usar `v.union()` para suportar dados legados
3. **Dev Environment:** Convex dev server DEVE rodar junto com Next.js
4. **Pre-calculated Data:** Não recalcular dados que já vêm do backend
5. **Timing:** setTimeout chains são delicados - documentar timeline claramente
6. **Conditional Rendering:** Manter lógica de UI clara com early returns
7. **Testing Strategy:** Testar cada dificuldade separadamente (estratégias diferentes)

---

## 📞 Comandos Úteis

```bash
# Desenvolvimento local
npm run dev                  # Next.js server (porta 3000-3003)
npx convex dev              # Convex sync server

# Limpar cache
rm -rf .next                # Next.js cache
rm -rf node_modules/.cache  # Node cache

# Deploy (produção)
git add .
git commit -m "Add elimination mode"
git push
npx convex deploy --prod    # Deploy Convex functions
# Vercel deploys automatically via GitHub
```

---

## 🎮 Easter Eggs & Fun Facts

- GIGACHAD strategy é inspirada em jogos de pôquer (bluffing pattern)
- Timing de 2.5s, 3.5s, 5.5s foi ajustado para sentir "cinematográfico"
- Emoji choices: ⚔️ (combat), 🏆 (victory), 💀 (defeat), 🤝 (tie)
- Purple color scheme escolhido para diferenciar de PvP (azul) e PvE (amarelo)

---

**Implementado por:** Claude (Sonnet 4.5)
**Data:** 2025-10-31
**Commit Status:** Local apenas (não commitado ainda)
**Tempo Total:** ~2-3 horas de desenvolvimento + debugging
