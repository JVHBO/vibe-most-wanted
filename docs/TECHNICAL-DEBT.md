# 🔧 Technical Debt & Refactoring TODO

**Data:** 2025-11-04
**Status:** Para revisar quinta-feira quando resetar limite do Claude

---

## 🚨 CRÍTICO - Alta Prioridade

### 1. app/page.tsx é GIGANTE (7.116 linhas)
- **Problema:** Arquivo monolítico com 134 hooks, difícil manutenção
- **Impacto:** Alto risco de bugs, dificuldade de debug
- **Solução:** Dividir em componentes:
  ```
  app/
    page.tsx (container - 500 linhas)
    components/
      CardGrid.tsx
      BattleArena.tsx
      LeaderboardTab.tsx
      MissionsTab.tsx
      ProfileSection.tsx
  ```

### 2. Polling Manual vs Convex Reactive Queries
- **Problema:** `setInterval` para leaderboard (linha 2853)
- **Impacto:** Consome mais recursos, possíveis memory leaks
- **Solução:** Migrar para `useQuery` do Convex
  ```typescript
  // ❌ Atual
  const interval = setInterval(loadLeaderboard, 30 * 60 * 1000);

  // ✅ Ideal
  const leaderboard = useQuery(api.profiles.getLeaderboardLite, { limit: 100 });
  ```

### 3. Memory Leaks Potenciais
- **Problema:** Vários `setInterval` sem cleanup garantido
- **Solução:** Revisar todos os useEffect com intervals/timers

---

## ⚠️ IMPORTANTE - Média Prioridade

### 4. Console Logs em Produção
- **Localização:**
  - convex/economy.ts: 13 logs
  - convex/profiles.ts: 14 logs
- **Solução:** Garantir que `devLog` não apareça em prod

### 5. TODO Pendente
- **Arquivo:** convex/quests.ts:470
- **Item:** `reward: 300, // TODO: Ajustar valores depois`

### 6. Otimização de Bandwidth Convex
- **Status:** Já otimizado (47% redução) ✅
- **Oportunidade:** Adicionar cache client-side com React Query

---

## 💡 MELHORIAS SUGERIDAS

### 7. Error Boundaries
- Adicionar error boundaries para componentes críticos
- Prevenir crash total do app

### 8. Memoization
- Memoizar componentes pesados (CardGrid, BattleArena)
- `React.memo()` em componentes que re-renderizam muito

### 9. Lazy Loading
- Lazy load tabs (Missions, Achievements, Leaderboard)
- Reduz bundle inicial

### 10. React Server Components
- Next.js 15 suporta RSC
- Considerar migração gradual

---

## 📊 MÉTRICAS ATUAIS

```
Total arquivos TypeScript: 53
Maior arquivo: app/page.tsx (7.116 linhas) ⚠️
Segundo maior: convex/economy.ts (1.417 linhas)
Hooks no page.tsx: 134 ⚠️
TODOs pendentes: 1
Console logs: 28 (backend)
```

---

## ✅ PONTOS POSITIVOS

1. ✅ Sem vulnerabilidades (eval, dangerouslySetInnerHTML)
2. ✅ Custom hooks já existem (useCardCalculations)
3. ✅ Componentes isolados (Badge, DifficultyModal)
4. ✅ TypeScript bem tipado
5. ✅ Convex otimizado (getLeaderboardLite)
6. ✅ Logging condicional (IS_DEV)

---

## 🎯 PLANO DE AÇÃO (Quinta-feira)

**Fase 1: Refatoração app/page.tsx (4-6 horas)**
1. Criar pasta `app/components/game/`
2. Extrair CardGrid
3. Extrair BattleArena
4. Extrair tabs (Leaderboard, Missions, Achievements)

**Fase 2: Migrar para Convex Reactive (2-3 horas)**
1. Substituir polling manual por useQuery
2. Remover setIntervals
3. Testar atualização reativa

**Fase 3: Performance (1-2 horas)**
1. Adicionar React.memo nos componentes pesados
2. Lazy load de tabs
3. Adicionar error boundaries

**Estimativa total: 7-11 horas**

---

**Última atualização:** 2025-11-04
**Próxima revisão:** Quinta-feira (após reset do limite Claude)
