# 💰 ECONOMY SYSTEM IMPROVEMENTS

**Data**: 2025-11-01
**Status**: ✅ Backend Implemented | ⏳ Frontend Pending

---

## 🎯 Objetivos Implementados

### ✅ 1. Ranking-Based PvP Rewards

Players agora ganham **mais moedas** ao derrotar oponentes de ranking alto e **perdem menos** ao perder para eles.

**Multiplicadores de Vitória:**
- 🥇 Top 3: **2.5x** rewards (100 → 250 coins)
- 🥈 Top 10: **2.0x** rewards (100 → 200 coins)
- 🥉 Top 20: **1.5x** rewards (100 → 150 coins)
- 🏅 Top 50: **1.2x** rewards (100 → 120 coins)

**Redução de Penalidade (Derrota):**
- 🥇 Perder para Top 3: **70% menos** penalidade (-20 → -6 coins)
- 🥈 Perder para Top 10: **50% menos** penalidade (-20 → -10 coins)
- 🥉 Perder para Top 20: **30% menos** penalidade (-20 → -14 coins)

### ✅ 2. Preview de Rewards/Penalties

Função `previewPvPRewards()` criada para calcular ganhos/perdas antes da batalha.

**Retorna:**
```typescript
{
  opponentRank: number,
  currentStreak: number,
  playerRank: number,
  playerCoins: number,

  win: {
    baseReward: 100,
    rankingBonus: number,      // Bonus por ranking
    rankingMultiplier: number, // 1.0 - 2.5
    firstPvpBonus: number,     // 100 se primeira vitória do dia
    streakBonus: number,       // 150, 300, ou 750
    streakMessage: string,
    totalReward: number,       // TOTAL que vai ganhar
  },

  loss: {
    basePenalty: -20,
    penaltyReduction: number,  // Redução por ranking
    rankingMultiplier: number, // 0.3 - 1.0
    totalPenalty: number,      // TOTAL que vai perder
  }
}
```

### ✅ 3. Analytics de Economia

Script `analyze-economy.js` criado para visualizar distribuição de moedas:

**Métricas:**
- Total de moedas em circulação
- Distribuição por faixas de coins
- Top 10 jogadores mais ricos
- Top 10 lifetime earners
- Gini coefficient (desigualdade econômica)
- Atividade diária (PvE/PvP)

**Exemplo de Output:**
```
📈 OVERALL STATS
Total Players: 17
Total Coins: 5,115 $TESTVBMS
Average: 300.88 per player
Gini Coefficient: 0.079 (excelente igualdade!)
```

---

## ⏳ Próximos Passos (Frontend)

### 1. Modal de Preview de Ganhos/Perdas

**Localização:** `app/page.tsx` linha ~3656 (botão de ATTACK)

**Implementação:**
```typescript
// Estado
const [showPvPPreview, setShowPvPPreview] = useState(false);
const [pvpPreview, setPvpPreview] = useState<any>(null);

// Modificar onClick do botão ATTACK:
onClick={async () => {
  // ... validações ...

  // ✅ NOVO: Buscar preview antes de atacar
  const preview = await client.query(api.economy.previewPvPRewards, {
    playerAddress: address || '',
    opponentAddress: targetPlayer.address
  });

  setPvpPreview(preview);
  setShowPvPPreview(true); // Mostra modal de preview
}}

// ✅ NOVO: Modal de preview
{showPvPPreview && pvpPreview && (
  <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[200]">
    <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold p-8 max-w-2xl">
      <h2>⚔️ BATTLE PREVIEW</h2>

      {/* Rankings */}
      <div>
        <p>Your Rank: #{pvpPreview.playerRank}</p>
        <p>Opponent Rank: #{pvpPreview.opponentRank}</p>
      </div>

      {/* Win Scenario */}
      <div className="bg-green-900/30 p-4">
        <h3>🏆 IF YOU WIN</h3>
        <p className="text-3xl text-green-400">+{pvpPreview.win.totalReward} coins</p>
        {pvpPreview.win.rankingBonus > 0 && (
          <p className="text-sm text-green-300">
            +{pvpPreview.win.rankingBonus} ranking bonus ({pvpPreview.win.rankingMultiplier}x)
          </p>
        )}
        {pvpPreview.win.streakBonus > 0 && (
          <p className="text-sm text-yellow-300">
            +{pvpPreview.win.streakBonus} {pvpPreview.win.streakMessage}
          </p>
        )}
      </div>

      {/* Loss Scenario */}
      <div className="bg-red-900/30 p-4">
        <h3>💀 IF YOU LOSE</h3>
        <p className="text-3xl text-red-400">{pvpPreview.loss.totalPenalty} coins</p>
        {pvpPreview.loss.penaltyReduction > 0 && (
          <p className="text-sm text-orange-300">
            Penalty reduced by {pvpPreview.loss.penaltyReduction} ({Math.round(pvpPreview.loss.rankingMultiplier * 100)}%)
          </p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-4">
        <button onClick={() => {
          setShowPvPPreview(false);
          // Continuar com o ataque...
        }}>
          ⚔️ CONFIRM ATTACK
        </button>
        <button onClick={() => setShowPvPPreview(false)}>
          CANCEL
        </button>
      </div>
    </div>
  </div>
)}
```

### 2. Atualizar Chamadas de awardPvPCoins

**Localização:** Onde `awardPvPCoins` é chamado após battles

**Mudança Necessária:**
```typescript
// ❌ ANTES:
const reward = await awardPvPCoins({
  address: address || '',
  won: matchResult === 'win'
});

// ✅ DEPOIS:
const reward = await awardPvPCoins({
  address: address || '',
  won: matchResult === 'win',
  opponentAddress: targetPlayer.address // ✅ ADICIONAR ISSO
});

// ✅ Mostrar ranking bonus no resultado
if (reward.rankingMultiplier > 1.0) {
  console.log(`Ranking bonus: ${reward.bonuses}`);
}
```

### 3. Sistema de Distribuição Semanal (Leaderboard Rewards)

**Implementação Futura:**

```typescript
// convex/economy.ts

const WEEKLY_REWARDS = {
  rank1: 1000,   // 1º lugar
  rank2: 750,    // 2º lugar
  rank3: 500,    // 3º lugar
  top10: 300,    // 4º-10º
  top20: 150,    // 11º-20º
  top50: 75,     // 21º-50º
};

export const distributeWeeklyRewards = mutation({
  args: {},
  handler: async (ctx) => {
    const leaderboard = await ctx.db
      .query("profiles")
      .filter((q) => q.gte(q.field("stats.totalPower"), 0))
      .collect();

    const sorted = leaderboard.sort((a, b) =>
      (b.stats?.totalPower || 0) - (a.stats?.totalPower || 0)
    );

    for (let i = 0; i < sorted.length; i++) {
      const profile = sorted[i];
      const rank = i + 1;
      let reward = 0;

      if (rank === 1) reward = WEEKLY_REWARDS.rank1;
      else if (rank === 2) reward = WEEKLY_REWARDS.rank2;
      else if (rank === 3) reward = WEEKLY_REWARDS.rank3;
      else if (rank <= 10) reward = WEEKLY_REWARDS.top10;
      else if (rank <= 20) reward = WEEKLY_REWARDS.top20;
      else if (rank <= 50) reward = WEEKLY_REWARDS.top50;

      if (reward > 0) {
        await ctx.db.patch(profile._id, {
          coins: (profile.coins || 0) + reward,
          lifetimeEarned: (profile.lifetimeEarned || 0) + reward,
        });
        console.log(`💰 Rank #${rank} ${profile.username}: +${reward} weekly reward`);
      }
    }

    return { success: true, playersRewarded: sorted.length };
  },
});

// Cron job para rodar todo domingo às 00:00 UTC
export const weeklyRewardsCron = cronJobs.weekly(
  "sunday 00:00",
  async (ctx) => {
    await ctx.runMutation(api.economy.distributeWeeklyRewards);
  }
);
```

---

## 📊 Estado Atual da Economia

**Análise de 2025-11-01:**
- 17 jogadores ativos
- 5,115 moedas em circulação
- Média: 300.88 moedas/player
- Gini: 0.079 (distribuição muito igual - saudável!)
- 88.2% dos players têm ≥300 moedas
- Apenas 7 vitórias PvE e 2 partidas PvP hoje

**Recomendações:**
1. ✅ Sistema de ranking bonus incentivará mais PvP
2. ⏳ Distribuição semanal aumentará engajamento
3. ⏳ Modal de preview aumentará transparência
4. ⏳ Considerar adicionar coin sinks futuros (marketplace, cosmetics)

---

## 🎮 Como Usar (Para Desenvolvedores)

### Testar Preview de Rewards

```bash
cd vibe-most-wanted
npx convex run economy:previewPvPRewards '{
  "playerAddress": "0x...",
  "opponentAddress": "0x..."
}'
```

### Rodar Analytics

```bash
node analyze-economy.js
```

### Ver Distribuição de Moedas

```bash
npx convex run profiles:getLeaderboard '{"limit": 50}' | grep coins
```

---

## ✅ Checklist de Implementação

### Backend (Convex)
- [x] Adicionar ranking bonus constants
- [x] Implementar getOpponentRanking()
- [x] Implementar calculateRankingMultiplier()
- [x] Modificar awardPvPCoins() para aceitar opponentAddress
- [x] Criar previewPvPRewards() query
- [x] Criar analytics script
- [x] Deploy para produção
- [x] Documentar no KNOWLEDGE-BASE

### Frontend (Next.js)
- [ ] Adicionar estado showPvPPreview
- [ ] Criar modal customizado de preview
- [ ] Integrar previewPvPRewards() no botão de ataque
- [ ] Passar opponentAddress para awardPvPCoins()
- [ ] Mostrar ranking bonuses no resultado da batalha
- [ ] Adicionar preview no PvP auto-match também
- [ ] Testar com diferentes rankings

### Sistema de Distribuição Semanal
- [ ] Implementar distributeWeeklyRewards()
- [ ] Configurar cron job semanal
- [ ] Criar UI de "Weekly Rewards" na home
- [ ] Adicionar histórico de rewards recebidos
- [ ] Testar distribuição manualmente
- [ ] Documentar sistema de rewards

---

## 🔧 Troubleshooting

### Preview não está funcionando
```typescript
// Verifique se o address está correto:
console.log('Player:', address);
console.log('Opponent:', targetPlayer.address);

// Teste a query diretamente:
const preview = await client.query(api.economy.previewPvPRewards, {
  playerAddress: address.toLowerCase(),
  opponentAddress: targetPlayer.address.toLowerCase()
});
```

### Ranking bonus não está sendo aplicado
```typescript
// Verifique se opponentAddress foi passado:
const reward = await awardPvPCoins({
  address,
  won: true,
  opponentAddress: targetPlayer.address // ← NECESSÁRIO
});

console.log('Opponent rank:', reward.opponentRank);
console.log('Multiplier:', reward.rankingMultiplier);
```

---

## 📚 Referências

- Convex Economy Mutations: `convex/economy.ts`
- Analytics Script: `analyze-economy.js`
- Attack Flow: `app/page.tsx` linha ~3565
- Knowledge Base: `KNOWLEDGE-BASE.md`
