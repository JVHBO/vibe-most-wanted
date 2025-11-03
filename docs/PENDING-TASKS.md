# ⏳ PENDING TASKS - Vibe Most Wanted

**Data**: 2025-11-01
**Atualizado por**: Claude Code

---

## 🎯 RESUMO EXECUTIVO

| Categoria | Critical | High | Medium | Low | Total |
|-----------|----------|------|--------|-----|-------|
| **Bugs/Issues** | 0 | 1 | 3 | 1 | **5** |
| **Features** | 0 | 1 | 0 | 2 | **3** |
| **Technical Debt** | 0 | 0 | 2 | 1 | **3** |
| **TOTAL** | **0** | **2** | **5** | **4** | **11** |

**✅ Completed Today (2025-11-01)**: Task #2 - Atomic transaction for attack flow

---

## 🔴 HIGH PRIORITY

### 1. Race Condition - Profile Stats Update
**Status**: ⏳ PENDING
**Severity**: HIGH
**Location**: `app/page.tsx` lines 2414-2436

**Problema**: Multiple concurrent `updateStats()` calls can overwrite each other

**Impacto**:
- Stats mostram valores incorretos
- Profile data fica desatualizado
- Possível perda de progresso

**Solução Sugerida**:
```typescript
const isUpdatingRef = useRef(false);

useEffect(() => {
  if (isUpdatingRef.current) return;

  isUpdatingRef.current = true;
  ConvexProfileService.updateStats(...)
    .finally(() => {
      isUpdatingRef.current = false;
    });
}, [nfts]);
```

**Estimativa**: 1 hora
**Prioridade**: ⚠️ Deve ser feito antes de scaling

---

### 2. Missing Transaction Grouping - Attack Flow
**Status**: ✅ COMPLETED (2025-11-01)
**Severity**: HIGH
**Location**: `convex/economy.ts` lines 932-1154, `app/page.tsx` lines 3777-3807

**Problema**: Attack flow had 3 separate DB calls without transaction

**Impacto**:
- ~~Partial updates if one fails~~
- ~~Attack count incremented but match not recorded~~
- ~~Stats mismatch between attacker/defender~~

**Solução Implementada**:
Created atomic `recordAttackResult()` mutation that combines:
1. Award/deduct coins (with ranking bonuses)
2. Record match history
3. Update profile stats

All operations now execute in ONE transaction atomically.

**Estimativa**: 2 horas ✅
**Prioridade**: ⚠️ Importante para data integrity - **RESOLVED**

---

### 3. Weekly Rewards System
**Status**: ⏳ NOT IMPLEMENTED
**Severity**: HIGH (Feature)
**Location**: `convex/economy.ts` (to be created)

**O que falta**:
- [ ] Implementar `distributeWeeklyRewards()` mutation
- [ ] Configurar cron job semanal (domingo 00:00 UTC)
- [ ] Criar UI de "Weekly Rewards" na home
- [ ] Adicionar histórico de rewards recebidos
- [ ] Testar distribuição manualmente

**Rewards Propostos**:
```typescript
const WEEKLY_REWARDS = {
  rank1: 1000,   // 1º lugar
  rank2: 750,    // 2º lugar
  rank3: 500,    // 3º lugar
  top10: 300,    // 4º-10º
  top20: 150,    // 11º-20º
  top50: 75,     // 21º-50º
};
```

**Estimativa**: 4-6 horas
**Prioridade**: 🎯 Nice to have, mas vai aumentar engajamento

---

## 🟡 MEDIUM PRIORITY

### 4. Error Handling - PvP Room Creation
**Status**: ⏳ PENDING
**Severity**: MEDIUM
**Location**: `app/page.tsx` lines 1470-1489

**Problema**: PvP room creation doesn't handle errors properly

**Solução**: Add try/catch + user feedback

**Estimativa**: 30 min

---

### 5. Hardcoded HAND_SIZE Constant
**Status**: ⏳ PENDING
**Severity**: MEDIUM
**Location**: `app/page.tsx` (multiple locations)

**Problema**: HAND_SIZE=5 is hardcoded in 10+ places

**Solução**: Centralize in constants file

**Estimativa**: 30 min

---

### 6. Pattern Inconsistency - CardViewer Modal
**Status**: ⏳ PENDING
**Severity**: MEDIUM
**Location**: `app/page.tsx` lines 4670-4700

**Problema**: CardViewer modal uses different pattern than other modals

**Solução**: Standardize modal pattern

**Estimativa**: 1 hora

---

### 7. Farcaster Notifications - Backend Processing
**Status**: 🟢 PARTIALLY DONE
**Severity**: MEDIUM
**Location**: `app/api/notifications/send/route.ts`

**O que falta**:
- [x] Add `coinsChange` to notification data
- [ ] Test notification delivery
- [ ] Add notification preferences UI
- [ ] Implement notification history

**Estimativa**: 2 horas

---

### 8. PvE Gigachad Reward Bug Investigation
**Status**: 🔍 DEBUGGING
**Severity**: MEDIUM
**Location**: `app/page.tsx` line 1892

**Problema**: User reported receiving 5 coins (gey) instead of 120 (gigachad)

**Debug Logs Added**:
```typescript
devLog(`🎯 PvE Difficulty: ${aiDifficulty}`);
devLog(`💰 PvE ${aiDifficulty}: Awarded ${coinsEarned} $TESTVBMS`);
```

**Próximos Passos**:
- [ ] User testa novamente e verifica console
- [ ] Se bug persiste, verificar DifficultyModal state

**Estimativa**: TBD (waiting for user feedback)

---

## 🟢 LOW PRIORITY

### 9. Code Organization
**Status**: 🟢 PLAN CREATED
**Severity**: LOW
**Location**: Root directory

**Ação**: Execute `reorganize-project.sh` script

**Estimativa**: 30 min + testing

---

### 10. Documentation Updates
**Status**: ⏳ PENDING
**Severity**: LOW

**O que falta**:
- [ ] Update README.md with new folder structure
- [ ] Document Weekly Rewards system (after implementation)
- [ ] Add API documentation for economy endpoints

**Estimativa**: 1-2 horas

---

### 11. Performance Optimization
**Status**: ⏳ PENDING
**Severity**: LOW

**Oportunidades**:
- [ ] Memoize expensive card calculations
- [ ] Add virtualization for long lists
- [ ] Optimize image loading
- [ ] Review bundle size

**Estimativa**: 4-6 horas

---

### 12. Testing Infrastructure
**Status**: ⏳ PENDING
**Severity**: LOW

**O que falta**:
- [ ] Add unit tests for economy calculations
- [ ] Add E2E tests for critical flows
- [ ] Add integration tests for Convex mutations

**Estimativa**: 8-10 horas

---

## 📅 SPRINT SUGGESTION

### Week 1 (Urgente)
1. ✅ Fix race condition (1h)
2. ✅ Fix attack transaction grouping (2h)
3. ✅ Execute project reorganization (1h)
4. ✅ Test + deploy

### Week 2 (Features)
1. 🎯 Implement Weekly Rewards System (6h)
2. 🎯 Add notification preferences (2h)
3. 🎯 Fix error handling + constants (1h)

### Week 3 (Polish)
1. 🟢 Performance optimizations (6h)
2. 🟢 Documentation updates (2h)
3. 🟢 Testing infrastructure (10h)

---

## 🔗 REFERENCES

- **Code Issues**: See `docs/CODE-KNOTS.md` (after reorganization)
- **Economy System**: See `docs/ECONOMY-IMPROVEMENTS.md`
- **Security**: See `docs/SECURITY.md`
- **Reorganization**: See `REORGANIZATION-PLAN.md`

---

## ✅ RECENTLY COMPLETED

### Today (2025-11-01)
- ✅ **Atomic transaction for attack flow** (HIGH PRIORITY - Data integrity)
- ✅ Economy rebalancing (rank difference system)
- ✅ Farcaster notifications (coins added)
- ✅ PvE debug logging
- ✅ Bug #12-15 fixed (4 bugs)
- ✅ Preview modal implemented
- ✅ UseConvex hook integration
- ✅ Project reorganization (51 files organized)

### This Week
- ✅ Bug #10: Username normalization
- ✅ Bug #11: Revealed cards filter
- ✅ Economy preview modal
- ✅ Ranking-based rewards system
