# Technical Debt & Refactoring Status

**Last Updated**: 2026-02-03

---

## Refactoring Progress

### 1. app/page.tsx Size Reduction - IN PROGRESS

**Original**: 7,116 lines | **Current**: ~5,480 lines | **Removed**: ~1,636 lines

| Extracted Component | Lines | Status |
|---------------------|-------|--------|
| BattleArena (+ AvatarBadge, BattleCardGrid, EliminationCard) | ~270 | Done |
| DefenseDeckModal | ~220 | Done |
| LeaderboardRewardsModal | ~70 | Done |
| MyCardsModal | ~65 | Done |
| ChainSelectionModal | ~55 | Done |
| BattleResults | ~15 | Done |
| PowerDisplay | ~24 | Done |
| usePowerCalculation hook | ~20 | Done |
| Battle Poker mode removal | ~200 | Done |
| **Total extracted** | **~940** | |

**Remaining candidates for extraction:**
- PvP Preview Modal (~319 lines) - Pre-battle aura comparison
- Attack Card Selection flow (~200+ lines)
- Leaderboard Tab content (~300+ lines)
- Missions Tab content (~200+ lines)
- Profile Section (~150+ lines)

**Goal**: Reduce page.tsx to ~3,000 lines.

---

## Remaining Technical Debt

### HIGH - Polling Manual vs Convex Reactive Queries
- **Problem**: `setInterval` for leaderboard polling
- **Impact**: Higher resource usage, potential memory leaks
- **Fix**: Migrate to `useQuery` from Convex

### HIGH - Memory Leak Potential
- **Problem**: Multiple `setInterval` without guaranteed cleanup
- **Fix**: Audit all useEffect with intervals/timers

### MEDIUM - Console Logs in Production
- **Location**: convex/economy.ts, convex/profiles.ts
- **Fix**: Ensure `devLog` is silent in production

### MEDIUM - Error Boundaries
- No error boundaries around critical components
- A single component crash can take down the whole app

### LOW - Lazy Loading
- Tabs (Missions, Achievements, Leaderboard) load eagerly
- Could reduce initial bundle size with `React.lazy()`

---

## Completed Items

- [x] Extract BattleArena component from page.tsx
- [x] Extract battle sub-components (BattleResults, PowerDisplay)
- [x] Extract modal components (DefenseDeckModal, MyCardsModal, LeaderboardRewardsModal, ChainSelectionModal)
- [x] Create reusable Modal component
- [x] Extract power calculation into usePowerCalculation hook
- [x] Extract card selection into useCardSelection hook
- [x] Create CardDisplay and CardSelector components
- [x] Remove Battle Poker mode (dead code)
- [x] Set up test infrastructure (Vitest + React Testing Library)
- [x] Achieve 92%+ test coverage (377 tests)
- [x] Create CI pipeline (GitHub Actions)
- [x] Convex bandwidth optimization (47% reduction)
- [x] Custom hooks for card calculations
- [x] TypeScript strict typing
- [x] Conditional logging (IS_DEV)

---

## Current Metrics

```
app/page.tsx:        ~5,480 lines (down from 7,116)
convex/tcg.ts:       ~4,800 lines
convex/economy.ts:   ~1,400 lines
Unit tests:          377 (21 test files)
Statement coverage:  92.36%
Branch coverage:     78.98%
```

---

**Last Updated**: 2026-02-03
