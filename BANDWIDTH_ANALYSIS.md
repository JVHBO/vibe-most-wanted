# Bandwidth Analysis - VIBE Most Wanted

## Executive Summary

Encontrei **96 chamadas `.collect()`** no codebase. Muitas são queries públicas que podem ser abusadas ou cron jobs que rodam frequentemente.

---

## Top 5 Funções por Bandwidth (do Dashboard)

| # | Função | Bandwidth | Status |
|---|--------|-----------|--------|
| 1 | `profiles.updateLeaderboardFullCache` | 1.14 GB | ⚠️ Analisar |
| 2 | `profiles.upsertProfileFromFarcaster` | 933 MB | ✅ **CORRIGIDO** |
| 3 | `profiles.getLeaderboardLite` | 493 MB | ⚠️ Analisar |
| 4 | `raidBoss.processAutoAttacks` | 261 MB | ⚠️ Analisar |
| 5 | `farcasterCards.getAllFarcasterCards` | 153 MB | ⚠️ Analisar |

---

## Análise Detalhada

### 1. `updateLeaderboardFullCache` (1.14 GB) - CRON

**Frequência:** A cada 10 minutos (144x/dia)
**Problema:** Carrega profiles completos para top 200

```typescript
// profiles.ts:212-216
const topProfiles = await ctx.db
  .query("profiles")
  .withIndex("by_defense_aura", (q) => q.eq("hasFullDefenseDeck", true))
  .order("desc")
  .take(200);  // Retorna profiles COMPLETOS com todos os campos
```

**Solução:** Já está usando `.take(200)` com índice - OK!
O problema é que profiles são ENORMES (defenseDeck, inventory, etc.)

**Fix Proposto:**
```typescript
// Criar view materializada só com campos do leaderboard
// OU projetar apenas campos necessários no cache
```

---

### 2. `upsertProfileFromFarcaster` (933 MB) - ✅ CORRIGIDO

**Status:** Removemos o legacy fallback que fazia full table scan.
**Economia estimada:** ~920 MB/dia

---

### 3. `getLeaderboardLite` (493 MB) - QUERY PÚBLICA

**Problema:** Cache miss faz query pesada

```typescript
// profiles.ts:159-163 (fallback quando cache expira)
const topProfiles = await ctx.db
  .query("profiles")
  .withIndex("by_defense_aura", (q) => q.eq("hasFullDefenseDeck", true))
  .order("desc")
  .take(limit);  // Retorna profiles COMPLETOS
```

**Frequência:** Chamada a cada página load do leaderboard
**Causa do alto uso:** Muitos cache misses ou cache de 5 min muito curto

**Fix Proposto:**
- Aumentar TTL do cache para 10 minutos
- Garantir que cron atualiza ANTES do cache expirar

---

### 4. `processAutoAttacks` (261 MB) - CRON

**Frequência:** A cada 7 minutos (205x/dia)

```typescript
// raidBoss.ts:683-686
const allDecks = await ctx.db
  .query("raidAttacks")
  .withIndex("by_last_updated", (q) => q.gt("lastUpdated", twoHoursAgo))
  .collect();  // Pode retornar centenas de decks

// raidBoss.ts:771-774 - DENTRO DO LOOP!
const profile = await ctx.db
  .query("profiles")
  .withIndex("by_address", (q) => q.eq("address", deck.address))
  .first();
```

**Problema Principal:** Query de profile DENTRO do loop de decks!
Se há 100 decks ativos, são 100 queries de profile por execução.

**Fix Proposto:**
```typescript
// Batch-load todos os profiles necessários ANTES do loop
const addresses = allDecks.map(d => d.address);
const profiles = await Promise.all(
  [...new Set(addresses)].map(addr =>
    ctx.db.query("profiles").withIndex("by_address", q => q.eq("address", addr)).first()
  )
);
const profileMap = new Map(profiles.filter(Boolean).map(p => [p.address, p]));

// Depois no loop:
const profile = profileMap.get(deck.address);
```

---

### 5. `getAllFarcasterCards` (153 MB) - QUERY PÚBLICA ⚠️

```typescript
// farcasterCards.ts:238-248
export const getAllFarcasterCards = query({
  args: {},
  handler: async (ctx) => {
    const allCards = await ctx.db
      .query("farcasterCards")
      .collect();  // RETORNA TODAS AS CARTAS!
    return allCards.sort((a, b) => b._creationTime - a._creationTime);
  },
});
```

**Problema:** Retorna TODAS as cartas sem paginação - pode ser abusada!

**Fix Proposto:**
1. Adicionar paginação obrigatória
2. Limitar a 50-100 cartas por request
3. Converter para `internalQuery` se só usada internamente

---

## Outras Queries Problemáticas

### Queries Públicas Perigosas

| Query | Arquivo | Problema |
|-------|---------|----------|
| `debugAllCards` | cardPacks.ts:348 | ⚠️ DEBUG público! Retorna TUDO |
| `listAllMintedCards` | farcasterCardsAdmin.ts:135 | Admin sem proteção? |
| `getAllAuditLogs` | coinAudit.ts:250 | Pode ser enorme |
| `getExploiterShameCounts` | blacklist.ts:347 | `.collect()` sem limite |
| `getAllCollections` | nftCollections.ts:14 | `.collect()` geral |
| `getAllRefundRequests` | castAuctions.ts:995 | `.collect()` sem limite |

### Cron Jobs e Frequência

| Cron | Frequência | Função |
|------|------------|--------|
| Auto attacks | 7 min | `raidBoss.processAutoAttacks` |
| Boss transition | 2 min | `raidBoss.defeatBossAndSpawnNext` |
| Leaderboard cache | 10 min | `profiles.updateLeaderboardFullCache` |
| Leaderboard top10 | 10 min | `quests.updateLeaderboardCache` |
| Auction lifecycle | 2 min | `castAuctions.processAuctionLifecycle` |
| Poker cleanup | 15 min | `pokerBattle.cleanupOldPokerRooms` |

---

## Plano de Ação

### Prioridade 1: Alto Impacto (Fazer AGORA)

1. **[FEITO]** `upsertProfileFromFarcaster` - Remover legacy fallback
2. **[FAZER]** `processAutoAttacks` - Batch-load profiles
3. **[FAZER]** `getAllFarcasterCards` - Adicionar paginação

### Prioridade 2: Médio Impacto

4. **[FAZER]** `debugAllCards` - Converter para internalQuery ou remover
5. **[FAZER]** `getLeaderboardLite` - Aumentar TTL cache
6. **[FAZER]** Auditar todas queries com `.collect()` sem limite

### Prioridade 3: Otimizações de Longo Prazo

7. Criar índices compostos para queries frequentes
8. Implementar cursor-based pagination em todas as listas
9. Adicionar rate limiting em queries públicas
10. Criar sistema de cache distribuído

---

## Métricas de Sucesso

| Métrica | Atual | Meta |
|---------|-------|------|
| Bandwidth/dia | ~3 GB | <1 GB |
| Queries sem limite | 96 | <20 |
| Cache hit rate | ~80% | >95% |
| Avg query time | 500ms | <100ms |

---

*Criado: 2025-12-22*
*Última atualização: 2025-12-22*
