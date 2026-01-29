# Análise Completa: Sistema PvE vs PvP - Vibe Most Wanted

## 📋 Resumo Executivo

Este documento analisa o sistema de batalha PvE (Player vs Environment/CPU) e PvP (Player vs Player) do Vibe Most Wanted, identificando as funcionalidades presentes no PvE que podem melhorar o PvP.

---

## 🎮 Sistema PvE - Componentes Principais

### 1. **PokerBattleTable.tsx** (Componente Principal de Batalha)

Este é o componente central que gerencia AMBOS os modos (PvE e PvP).

#### Características do Sistema:

**A. Sistema de Rounds Completo:**
```typescript
// Estado de Rounds
const [currentRound, setCurrentRound] = useState(1);
const [roundHistory, setRoundHistory] = useState<Array<{
  round: number;
  winner: 'player' | 'opponent' | 'tie';
  playerScore: number;
  opponentScore: number;
}>>([]);

// Controle de Phases
type GamePhase = 'deck-building' | 'card-selection' | 'reveal' |
                 'card-reveal-animation' | 'resolution' | 'game-over';
```

**B. Sistema de Timer por Round:**
```typescript
// Timer de Ação
const [timeRemaining, setTimeRemaining] = useState(30); // 30s por ação
const timerRef = useRef<NodeJS.Timeout | null>(null);

// Timers diferentes por fase:
- 'card-selection': 30 segundos
- 'reveal': 90 segundos (para escolher boost/shield)

// Auto-seleção ao acabar o tempo
if (timeRemaining <= 1) {
  if (phase === 'card-selection' && !playerSelectedCard && playerHand.length > 0) {
    const randomCard = playerHand[Math.floor(Math.random() * playerHand.length)];
    selectCard(randomCard);
  } else if (phase === 'reveal' && !playerAction) {
    setPlayerAction('PASS'); // Auto-pass
  }
}
```

**C. Histórico de Rounds (Logs):**
```typescript
// CPU Mode (local state)
const [cpuRoundHistory, setCpuRoundHistory] = useState<Array<{
  round: number;
  winner: 'player' | 'opponent' | 'tie';
  playerScore: number;
  opponentScore: number;
}>>([]);

// PvP Mode (synced from room)
const roundHistory = !isCPUMode && room?.roundHistory
  ? room.roundHistory
  : cpuRoundHistory;

// Adiciona ao histórico após cada round
setCpuRoundHistory(history => [...history, {
  round: currentRound,
  winner: 'player',
  playerScore: newScore,
  opponentScore: opponentScore
}]);
```

**D. Visual do Round Winner:**
```typescript
// Exibe vencedor do round
const [showRoundWinner, setShowRoundWinner] = useState(false);
const [roundWinner, setRoundWinner] = useState<'player' | 'opponent' | null>(null);

// Lógica de exibição (4 segundos de delay)
setShowRoundWinner(true);
setTimeout(() => {
  setShowRoundWinner(false);
  setRoundWinner(null);
  nextRound(); // Próximo round
}, 4000);
```

**E. Sistema de Pontuação:**
```typescript
const [playerScore, setPlayerScore] = useState(0);
const [opponentScore, setOpponentScore] = useState(0);

// Vitória: primeiro a chegar em 4 pontos
if (newPlayerScore >= 4 || newOpponentScore >= 4) {
  setPhase('game-over');
}
```

**F. Sistema de Boost Coins:**
```typescript
// Moeda virtual para comprar boosts durante a partida
const [playerBoostCoins, setPlayerBoostCoins] = useState(0);
const [opponentBoostCoins, setOpponentBoostCoins] = useState(0);

// Início do jogo: 1000 boost coins para cada
const initialBoostCoins = 1000;
setPlayerBoostCoins(initialBoostCoins);
setOpponentBoostCoins(initialBoostCoins);

// Preços dos boosts
const getBoostPrice = (boostType: CardAction): number => {
  switch (boostType) {
    case 'BOOST': return 100;  // +30% power
    case 'SHIELD': return 80;   // Block opponent boost
    case 'DOUBLE': return 200;  // x2 power
    default: return 0;
  }
};
```

**G. Animações e Sons:**
```typescript
// Sons específicos por evento
AudioManager.buttonSuccess(); // Player vence round
AudioManager.buttonError();   // Player perde round
AudioManager.tie();          // Empate
AudioManager.cardBattle();   // Reveal de cartas

// Animação de reveal
setPhase('card-reveal-animation');
setTimeout(() => {
  resolveRound();
}, 2500); // 2.5s de animação
```

---

## 🆚 Comparação: PvE vs PvP

### ✅ O QUE O PvE TEM:

1. **Timer Visual Claro**
   - Countdown de 30s para seleção de carta
   - Countdown de 90s para escolha de ação
   - Auto-seleção quando tempo acaba

2. **Histórico de Rounds Completo**
   - Array com todos os rounds jogados
   - Vencedor de cada round
   - Pontuação acumulada

3. **Feedback Visual Imediato**
   - Exibe vencedor do round com animação
   - 4 segundos de pausa para ver resultado
   - Sons diferentes para vitória/derrota/empate

4. **Sistema de Phases Bem Definido**
   - `card-selection` → escolha de carta (30s)
   - `reveal` → escolha de boost/shield (90s)
   - `card-reveal-animation` → animação (2.5s)
   - `resolution` → cálculo do vencedor (1s)
   - Transição automática entre phases

5. **Boost Coins Integrado**
   - Sistema econômico durante a partida
   - Preços fixos e claros
   - Feedback visual do saldo

6. **Debug Logs Completos**
   - Console.log em cada ação importante
   - Facilita debugging e entendimento do fluxo

---

### ⚠️ O QUE O PvP ATUAL TEM DE DIFERENTE:

**PvP usa O MESMO componente (PokerBattleTable)**, mas com algumas diferenças:

1. **Sincronização com Backend**
   - PvP envia ações para servidor via mutations
   - Room state sincronizado via Convex real-time
   - CPU mode usa state local

2. **Timer Compartilhado**
   - Ambos jogadores veem o mesmo timer
   - Backend pode ter lógica de timeout

3. **Histórico no Room**
   - `room.roundHistory` ao invés de state local
   - Sincronizado entre jogadores

4. **Espectadores (Mecha Arena)**
   - Modo especial para assistir CPU vs CPU
   - Sistema de apostas em rounds
   - Betting window timer diferente

---

## 🎯 MELHORIAS SUGERIDAS PARA PvP

### Prioridade ALTA:

#### 1. **Garantir Timer Visível no PvP**
Atualmente o timer já existe no código, mas precisa verificar se está sendo exibido corretamente:

```typescript
// Linha 2777-2810 do PokerBattleTable.tsx
// Timer está no header do jogo
{/* Timer Display */}
<div className="text-vintage-gold font-display font-bold">
  {timeRemaining > 0 ? `${timeRemaining}s` : 'REVEALING...'}
</div>
```

**Ação:** Verificar se o timer está visível e funcionando no modo PvP.

#### 2. **Exibir Histórico de Rounds no PvP**
O sistema já existe (`room.roundHistory`), precisa apenas adicionar UI:

```typescript
// Adicionar painel lateral mostrando histórico
<div className="round-history-panel">
  <h3>ROUNDS</h3>
  {roundHistory.map((round, i) => (
    <div key={i} className={`round-entry ${round.winner}`}>
      R{round.round}: {round.winner === 'player' ? '✓' : '✗'}
    </div>
  ))}
</div>
```

**Ação:** Criar componente visual para exibir o roundHistory do room.

#### 3. **Melhorar Feedback Visual de Round**
O sistema já tem `showRoundWinner` e animações, verificar se estão ativas no PvP:

```typescript
// Linha 1377-1395
// Sistema de feedback já existe
setRoundWinner(isTie ? null : (playerWins ? 'player' : 'opponent'));
setShowRoundWinner(true);

// Sons para spectadores
if (isSpectator) {
  if (isTie) {
    AudioManager.tie();
  } else {
    AudioManager.win();
  }
}
```

**Ação:** Confirmar que o feedback de round winner está funcionando no PvP.

---

### Prioridade MÉDIA:

#### 4. **Unificar Logs de Debug**
Adicionar mais logs no fluxo PvP para facilitar debug:

```typescript
// Exemplo de logs úteis (já existentes no CPU mode)
console.log('[PokerBattle] Round resolution', {
  finalPlayerPower: playerPower,
  finalOpponentPower: opponentPower,
  isTie,
  playerWins,
  pot
});
```

#### 5. **Adicionar Visual de "Royal Casino"**
O código menciona "copy PvE royal casino visual to PvP battle screen" no git log.

**Ação:** Verificar o visual do PvE e replicar no PvP se necessário.

---

## 📊 Backend (Convex)

### Arquivo: `convex/pokerBattle.ts`

O backend do PvP já tem suporte para:

1. **Room State com Round History:**
```typescript
gameState: {
  currentRound: number,
  roundHistory: Array<{
    round: number,
    winner: string,
    playerScore: number,
    opponentScore: number
  }>,
  // ...
}
```

2. **Mutations Importantes:**
   - `selectCard` - Jogador seleciona carta
   - `useCardAction` - Jogador escolhe boost/shield
   - `resolveRound` - Resolve round e atualiza histórico
   - `initializeGame` - Inicia jogo

3. **Queries:**
   - `getPokerRoom` - Pega estado da room em tempo real

**Conclusão:** O backend já está preparado para suportar todas as features do PvE no PvP.

---

## 🔧 PLANO DE AÇÃO

### Fase 1: Correções Críticas ✅ COMPLETO (2026-01-28)
1. ✅ **Bug: Timer não aparecia no PvP** - CORRIGIDO
   - Adicionado sync de phase do servidor
   - Timer agora reseta corretamente (30s card-selection, 90s reveal)
   - Logs de debug adicionados

2. ✅ **Bug: Rounds infinitos (não avançavam)** - CORRIGIDO
   - Adicionado sync de currentRound do servidor
   - Adicionado sync de scores (hostScore/guestScore)
   - Frontend agora segue o backend para prevenir desyncs

3. ✅ **Painel de Histórico de Rounds** - IMPLEMENTADO
   - Painel lateral direito mostrando R1-R7
   - Visual: ✓ (vitória), ✗ (derrota), = (empate), ▶ (atual), - (futuro)
   - Score ao vivo embaixo do painel

**Commit:** `3ec84e37` - "fix: PvP poker - add timer, round sync and history panel"

### Fase 2: Ajustes de UI (2-3 horas) - PRÓXIMA
1. ⚙️ Melhorar destaque visual do timer
2. ⚙️ Melhorar animação de round winner
3. ⚙️ Verificar sons apropriados

### Fase 3: Visual "Royal Casino" (2-4 horas) - OPCIONAL
1. 🎨 Identificar diferenças visuais PvE vs PvP
2. 🎨 Copiar elementos visuais do PvE para PvP
3. 🎨 Testar e ajustar

### Fase 4: Testes (1-2 horas) - NECESSÁRIO
1. 🧪 Testar fluxo completo PvP
2. 🧪 Verificar sincronização entre jogadores
3. 🧪 Testar edge cases (timeout, disconnect, etc.)

**TEMPO ESTIMADO RESTANTE: 3-6 horas**

---

## 📝 NOTAS IMPORTANTES

### Código Compartilhado

O componente `PokerBattleTable.tsx` é usado por **AMBOS** modos (PvE e PvP). A diferença está principalmente na flag `isCPUMode`:

```typescript
if (isCPUMode) {
  // Lógica local - CPU seleciona carta aleatoriamente
  const aiCard = opponentHand[Math.floor(Math.random() * opponentHand.length)];
  setOpponentSelectedCard(aiCard);
} else {
  // Lógica PvP - envia para servidor
  await selectCardMutation({
    roomId,
    address: playerAddress,
    card: cardData,
  });
}
```

### Mecha Arena (CPU vs CPU)

Existe um terceiro modo: **Spectator Mode** (Mecha Arena), onde jogadores assistem CPU vs CPU e apostam nos rounds.

Features especiais:
- Betting window timer
- Round betting system
- Instant payouts por round
- Conversão de credits para TESTVBMS no final

Este modo **JÁ TEM** todas as features visuais que queremos no PvP normal.

---

## 🎯 CONCLUSÃO

O sistema PvE **já está implementado e funcionando** no mesmo componente que o PvP usa. A maioria das funcionalidades (timer, rounds, logs) **já existem no código**, só precisam ser:

1. ✅ **Verificadas** - confirmar que estão funcionando no PvP
2. 🎨 **Melhoradas visualmente** - tornar mais destacadas/claras
3. 📊 **Testadas** - garantir sincronização entre jogadores

**NÃO é necessário reescrever ou criar novos sistemas**, apenas ajustar e melhorar o que já existe.

---

## 🔗 Arquivos Relevantes

- `components/PokerBattleTable.tsx` - Componente principal (ambos modos)
- `convex/pokerBattle.ts` - Backend PvP
- `convex/pokerCpu.ts` - Backend PvE (daily limits)
- `components/PvPInRoomModal.tsx` - Modal de seleção de cartas PvP
- `lib/convex-pvp.ts` - Service layer PvP
