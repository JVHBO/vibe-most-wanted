# Architecture Overview

**Last Updated**: 2026-02-03

---

## Frontend Architecture

### page.tsx Refactoring Progress

The main `app/page.tsx` was originally 7,100+ lines. It has been progressively refactored by extracting components and hooks into dedicated modules.

**Current state**: ~5,480 lines (down from 7,100+)

| Extraction | Lines Removed | Location |
|------------|---------------|----------|
| BattleArena (+ AvatarBadge, BattleCardGrid, EliminationCard) | ~270 | `app/(game)/components/battle/BattleArena.tsx` |
| BattleResults | ~15 | `app/(game)/components/battle/BattleResults.tsx` |
| PowerDisplay | ~24 | `app/(game)/components/battle/PowerDisplay.tsx` |
| DefenseDeckModal | ~220 | `app/(game)/components/modals/DefenseDeckModal.tsx` |
| MyCardsModal | ~65 | `app/(game)/components/modals/MyCardsModal.tsx` |
| LeaderboardRewardsModal | ~70 | `app/(game)/components/modals/LeaderboardRewardsModal.tsx` |
| ChainSelectionModal | ~55 | `app/(game)/components/modals/ChainSelectionModal.tsx` |
| usePowerCalculation hook | ~20 | `app/(game)/hooks/battle/usePowerCalculation.ts` |
| useCardSelection hook | ~40 | `app/(game)/hooks/game/useCardSelection.ts` |

### Component Organization

```
app/(game)/
  components/
    battle/
      BattleArena.tsx      # Full battle screen (normal + elimination modes)
      BattleResults.tsx     # Win/loss/tie result display
      PowerDisplay.tsx      # Power value with color coding
    modals/
      DefenseDeckModal.tsx  # Card selection for defense deck
      MyCardsModal.tsx      # NFT collection display
      LeaderboardRewardsModal.tsx  # Weekly ranking rewards
      ChainSelectionModal.tsx      # Base/Arbitrum network selection
    ui/
      Modal.tsx             # Reusable modal (overlay, ESC, scroll lock)
  hooks/
    battle/
      usePowerCalculation.ts  # Memoized power calculation with collection multipliers
    game/
      useCardSelection.ts     # Card selection with toggle, clear, strongest

components/
  cards/
    CardDisplay.tsx         # Card with image, power badge, selection state
  game/
    CardSelector.tsx        # Card grid with selection and sorting
  home/
    HomeHeader.tsx          # Top navigation bar
    GameGrid.tsx            # Game mode selection grid
    BottomNavigation.tsx    # Mobile bottom nav
```

### Power Calculation System

Collection multipliers applied to card power:

| Collection | Battle Multiplier | Leaderboard Multiplier |
|------------|-------------------|------------------------|
| VibeFID    | 5x                | 10x                   |
| VBMS       | 2x                | 2x                    |
| Nothing    | 0.5x              | 0.5x                  |
| Others     | 1x                | 1x                    |

Implementation: `lib/power-utils.ts` (pure functions), wrapped by `usePowerCalculation` hook.

### Game Modes

| Mode | Route | Description |
|------|-------|-------------|
| PvE (Battle AI) | `/` | 5 difficulties, normal + elimination modes |
| PvP | `/` | Real-time multiplayer via Convex rooms |
| Attack | `/` | Challenge leaderboard players |
| Mecha Arena | `/` | CPU vs CPU with spectating |
| Baccarat | `/` | Casino card game |
| TCG | `/tcg` | Turn-based card game with lanes and abilities |
| Raid Boss | `/raid` | Cooperative boss battles |

---

## Backend Architecture (Convex)

### Key Modules

| File | Purpose |
|------|---------|
| `convex/economy.ts` | Coin economy, rewards, daily limits |
| `convex/profiles.ts` | User profiles, stats, defense decks |
| `convex/matches.ts` | Match history, leaderboard |
| `convex/rooms.ts` | PvP room management |
| `convex/quests.ts` | Daily/weekly quest system |
| `convex/achievements.ts` | 64 achievement definitions |
| `convex/tcg.ts` | TCG game state, turns, staked matches |
| `convex/weeklyRewards.ts` | Automated Sunday reward distribution |
| `convex/pokerBattle.ts` | Mecha Arena CPU battles |

### Deployment

- **Production**: `prod:agile-orca-761`
- **Deploy**: `CONVEX_DEPLOY_KEY=... npx convex deploy --cmd "echo skip"`
- Frontend deploys via GitHub push to main (Vercel auto-deploy)
- Convex must be deployed separately

---

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`):

1. **Lint & Typecheck** - ESLint + TypeScript compiler
2. **Unit Tests** - Vitest (377 tests, 92%+ coverage)
3. **E2E Tests** - Playwright (chromium)

Triggered on push to `main` and pull requests.
