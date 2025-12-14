# Plano de Otimização do Convex - Vibe Most Wanted

## Resumo Executivo

**Problema:** Alto uso de database bandwidth no Convex com poucos usuários
**Causa raiz:** Queries sem índice, .collect() sem limite, dados duplicados, subscriptions pesadas
**Solução:** Otimização em 3 fases + migração de dados estáticos para CDN/cache externo

---

## Fase 1: Correções Imediatas (JÁ IMPLEMENTADO ✅)

### Índices Adicionados
- [x] `pokerRooms.by_room_id` - Reduz 99% das leituras em queries de sala
- [x] `rooms.by_room_id` - Mesma otimização para PvP rooms

### Queries Convertidas para Internal
- [x] `backup.ts` - Todas as 7 queries (bloqueou 500MB+ de dados públicos)
- [x] `profiles.listAll` - Era pública, agora internalQuery
- [x] `raidBoss.getAllContributions` - Era pública
- [x] `notifications.getAllTokens` - Era pública
- [x] `notifications.getAllRaidDecks` - Era pública
- [x] `stats.getAllProfiles` - Era pública
- [x] `pokerBattle.listAllRooms` - Era pública
- [x] `shopAnnouncement.sendShopAnnouncement` - Era pública

### .collect() Limitados
- [x] `economy.resetDailyLimits` - .take(100)
- [x] `profiles.cleanOldDefenseDecks` - .take(100)
- [x] `pokerBattle.cleanupOldPokerRooms` - .take(50)
- [x] `notifications.triggerPeriodicTip` - .take(200)
- [x] `notifications.triggerDailyLoginReminder` - .take(200)
- [x] `admin.ts` - Todos os .collect() limitados

### Queries Lite Criadas
- [x] `profiles.getProfileLite` - Economiza ~95% bandwidth por profile

---

## Fase 2: Migração de Dados Estáticos (PRÓXIMO PASSO)

### 2.1 Mover arenaCardsData.ts para CDN

**Problema:** 500KB de dados estáticos importados em cada função Convex
**Solução:** Criar JSON estático servido pelo Vercel/CDN

```
Arquivos a criar:
/public/data/arena-cards.json (500KB)
/public/data/collections.json (10KB)
```

**Benefício:** Reduz 500KB por cold start do Convex

### 2.2 Mover Achievement Definitions para JSON

```
/public/data/achievements.json (100KB)
```

### 2.3 Mover Boss Rotation para JSON

```
/public/data/boss-rotation.json (50KB)
```

---

## Fase 3: Cache Externo (RECOMENDADO)

### Opções de Cache

#### Opção A: Vercel KV (Redis)
- **Custo:** $0 até 30K requests/dia, depois $0.2/100K
- **Latência:** ~50ms
- **Ideal para:** Leaderboard, raid boss state, profile cache

```typescript
// Exemplo de uso
import { kv } from '@vercel/kv';

// Cache leaderboard por 60 segundos
const leaderboard = await kv.get('leaderboard');
if (!leaderboard) {
  const data = await convex.query(api.profiles.getLeaderboardLite);
  await kv.set('leaderboard', data, { ex: 60 });
}
```

#### Opção B: Upstash Redis
- **Custo:** $0 até 10K requests/dia
- **Latência:** ~100ms
- **Ideal para:** Mesmo uso que Vercel KV

#### Opção C: Client-side Cache (SWR/React Query)
- **Custo:** $0
- **Latência:** 0ms após primeira carga
- **Ideal para:** Dados que mudam pouco (leaderboard, boss info)

```typescript
// Exemplo com SWR
const { data: leaderboard } = useSWR(
  'leaderboard',
  () => convex.query(api.profiles.getLeaderboardLite),
  {
    refreshInterval: 60000, // Refresh a cada 60s
    revalidateOnFocus: false
  }
);
```

### Dados para Cachear

| Dado | TTL | Cache | Economia |
|------|-----|-------|----------|
| Leaderboard | 60s | Vercel KV | 99% reads |
| Raid Boss State | 30s | Vercel KV | 90% reads |
| Daily Quest | 1h | Vercel KV | 99% reads |
| Profile (próprio) | 10s | Client | 80% reads |
| Arena Cards | ∞ | CDN | 100% |
| Achievements Defs | ∞ | CDN | 100% |

---

## Fase 4: Arquitetura de Longo Prazo

### 4.1 Separar Dados por Frequência de Acesso

```
HOT DATA (Convex - real-time):
- Game state (poker rooms, battles)
- Player actions (bets, attacks)
- Live matchmaking

WARM DATA (Redis cache, 30-60s TTL):
- Leaderboards
- Profile summaries
- Raid boss state

COLD DATA (CDN/Static):
- Card metadata
- Achievement definitions
- Boss rotation
- UI constants
```

### 4.2 Remover Dados Duplicados

**Problema atual:** Card data duplicado em 6+ lugares

```
profiles.defenseDeck[] → Full card objects
profiles.revealedCardsCache[] → Duplicate metadata
pokerRooms.hostDeck[] → Another full copy
raidAttacks.deck[] → Yet another full array
matches.playerCards[] → Historical snapshots
```

**Solução:** Armazenar apenas `tokenId + collection`, buscar metadata do CDN

```typescript
// Antes (2.5KB por card)
defenseDeck: [{
  tokenId: "123",
  power: 500,
  imageUrl: "https://...",
  name: "Card Name",
  rarity: "Epic",
  foil: "Holo",
  collection: "vibe"
}]

// Depois (50 bytes por card)
defenseDeck: [{
  tokenId: "123",
  collection: "vibe"
}]
// Metadata vem do CDN: /data/cards/vibe/123.json
```

### 4.3 Polling vs Subscriptions

**Queries para converter de subscription para polling:**

| Query | Atual | Proposta | Economia |
|-------|-------|----------|----------|
| getLeaderboardLite | Subscription | Poll 60s | 99% |
| getCurrentRaidBoss | Subscription | Poll 30s | 97% |
| getDailyQuest | Subscription | Poll 1h | 99.9% |
| getPlayerMissions | Subscription | Poll 60s | 99% |

---

## Estimativa de Economia

### Antes das Otimizações
- Database reads: ~5M/dia
- Bandwidth: ~10GB/dia
- Custo estimado: Alto

### Após Fase 1 (Implementado)
- Database reads: ~500K/dia (-90%)
- Bandwidth: ~1GB/dia (-90%)

### Após Fase 2+3 (Proposto)
- Database reads: ~50K/dia (-99%)
- Bandwidth: ~100MB/dia (-99%)

---

## Próximos Passos Imediatos

1. **Deploy das correções atuais** ✅
2. **Implementar cache client-side com SWR** (2h)
3. **Mover arenaCardsData.ts para /public/data/** (1h)
4. **Configurar Vercel KV para leaderboard** (2h)
5. **Migrar frontend para usar getProfileLite** (4h)

---

---

## Fase 2: Cache Client-Side (IMPLEMENTADO ✅)

### Arquivos Criados

#### 1. `/public/data/arena-cards.json` (118KB)
- Dados estáticos de todas as cartas
- Carregado do CDN em vez do Convex

#### 2. `/public/data/collections.json` (0.5KB)
- Lista de coleções disponíveis

#### 3. `/lib/arena-cards-client.ts`
Hooks para carregar dados de cartas:
```typescript
import { useArenaCards, useCollections } from '@/lib/arena-cards-client';

// Uso:
const { cards, isLoading } = useArenaCards();
const { availableCollections } = useCollections();
```

#### 4. `/lib/convex-cache.ts`
Hooks SWR para cache de queries frequentes:
```typescript
import {
  useCachedLeaderboard,
  useCachedRaidBoss,
  useCachedProfileLite,
  useCachedDailyQuest,
  useCachedMissions
} from '@/lib/convex-cache';

// Antes (subscription contínua):
const leaderboard = useQuery(api.profiles.getLeaderboardLite);

// Depois (polling com cache de 60s):
const { leaderboard, refresh } = useCachedLeaderboard();
```

### Como Migrar o Frontend

1. **Leaderboard** - Substituir `useQuery(api.profiles.getLeaderboardLite)` por `useCachedLeaderboard()`
2. **Raid Boss** - Substituir `useQuery(api.raidBoss.getCurrentRaidBoss)` por `useCachedRaidBoss()`
3. **Profile** - Substituir `useQuery(api.profiles.getProfile)` por `useCachedProfileLite()`
4. **Missions** - Substituir `useQuery(api.missions.getPlayerMissions)` por `useCachedMissions()`

---

## Comandos Úteis

```bash
# Deploy para produção
npx convex deploy --yes

# Verificar uso de bandwidth
# Dashboard: https://dashboard.convex.dev

# Testar queries localmente
npx convex dev
```

---

## Arquivos Modificados

```
convex/schema.ts - Adicionados 2 índices
convex/pokerBattle.ts - ~25 queries otimizadas
convex/rooms.ts - 6 queries otimizadas
convex/economy.ts - resetDailyLimits limitado
convex/profiles.ts - listAll interno, getProfileLite criado
convex/raidBoss.ts - getAllContributions interno
convex/notifications.ts - Várias queries internas
convex/backup.ts - Todas internas com paginação
convex/admin.ts - .collect() limitados
convex/stats.ts - getAllProfiles interno
convex/shopAnnouncement.ts - sendShopAnnouncement interno
convex/notificationsHelpers.ts - getAllTokens interno
```

---

## Fase 3: Migração Frontend para Hooks Cacheados (IMPLEMENTADO ✅)

### Hooks SWR Corrigidos em `/lib/convex-cache.ts`
- `useCachedDailyQuest()` - Corrigido: não precisa de address (query global)
- `useCachedMissions()` - Corrigido: usa `playerAddress` em vez de `address`
- `useCachedYesterdayPrices()` - Novo hook para preços (dados diários)

### Arquivos Migrados

1. **PriceTicker.tsx**
   - Antes: `useQuery(api.priceSnapshots.getYesterdayPrices)` - subscription constante
   - Depois: `useCachedYesterdayPrices()` - polling 10 min (dados mudam 1x/dia!)
   - Economia: ~99% bandwidth

2. **app/page.tsx**
   - Antes: `useQuery(api.quests.getDailyQuest, {})` - subscription constante
   - Depois: `useCachedDailyQuest()` - polling 5 min (dados mudam 1x/dia!)
   - Economia: ~99% bandwidth

3. **QuestPanel.tsx**
   - Mesmo: `useCachedDailyQuest()` em vez de `useQuery`
   - Economia: ~99% bandwidth

4. **ShopView.tsx**
   - Removido: `useQuery(api.profiles.getProfile)` - query nunca usada!
   - Economia: 100% (query desnecessária)
