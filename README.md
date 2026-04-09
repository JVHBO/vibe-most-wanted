# 🎴 Vibe Most Wanted

A competitive NFT card battle game built on Base blockchain, featuring PvE, PvP, and leaderboard attacks with an in-game economy powered by $TESTVBMS coins.

[![Next.js](https://img.shields.io/badge/Next.js-15.5.6-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![Convex](https://img.shields.io/badge/Convex-Backend-orange)](https://convex.dev/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 🎮 Features

### Game Modes

- **🤖 PvE (Player vs AI)** - Battle against AI opponents across 5 difficulty levels
  - Gey, Goofy, Gooner, Gangster, Gigachad
  - Two battle modes: Normal (total power) and Elimination (round-by-round)
  - Earn 5-120 coins per win (difficulty scaled)
  - Daily limit: 30 wins, 3,500 coins cap

- **⚔️ PvP (Player vs Player)** - Real-time multiplayer battles
  - **Ranked Mode**: Entry fee 20 coins, earn 100+ coins per win
  - **Casual Mode**: Free practice mode, no rewards
  - Auto-matchmaking system
  - Custom rooms with invite codes
  - Daily limit: 10 matches

- **🎯 Attack Mode** - Challenge top players on the leaderboard
  - FREE entry (no cost)
  - Earn up to 200 coins per win (rank bonuses)
  - Strategic gameplay with ranking multipliers
  - Daily limit: 5 attacks

### Economy System ($TESTVBMS)

- **💰 Daily Missions** - Claimable bonuses
  - Daily Login: 25 coins
  - First PvE Win: 50 coins
  - First PvP Match: 100 coins
  - Win Streaks: 150/300/750 coins (3/5/10 wins)
  - Welcome Gift: 500 coins (one-time)

- **📊 Daily & Weekly Quests** - Progressive challenges
  - Daily Quests: 3 rotating objectives (50-100 coins each)
  - Weekly Quests: 4 major challenges (200-800 coins each)
  - Quest types: Total matches, attack wins, defense wins, PvE streaks

- **🏆 Achievement System** - 64 total achievements, ~302K coins available
  - **Rarity Collectors**: Unlock by owning specific rarity cards (6 achievements)
  - **Wear Collectors**: Collect cards in pristine condition (10 achievements)
  - **Foil Collectors**: Hunt for shiny and prize foil variants (9 achievements)
  - **Progressive Challenges**: Milestone-based collection goals (39 achievements)
  - Rewards: 10-50,000 coins per achievement
  - Track progress and claim rewards in the Achievements tab

- **💸 Weekly Rewards** - Automated leaderboard rewards (Sundays 00:00 UTC)
  - 🥇 1st Place: 1,000 coins
  - 🥈 2nd Place: 750 coins
  - 🥉 3rd Place: 500 coins
  - 4th-10th: 300 coins
  - 11th-20th: 150 coins
  - 21st-50th: 75 coins

- **🎯 Ranking Bonuses** - Up to 2.5x multiplier for defeating higher-ranked players
- **💸 Entry Fees** - PvP: 20 coins | Attack: FREE

See [ECONOMY-GUIDE.md](docs/ECONOMY-GUIDE.md) for complete details.

### NFT Integration

- **NFT Collection** on Base Mainnet
- Rarity system: Common, Rare, Epic, Legendary, Mythic
- Wear system: Pristine, Mint, Lightly Played, Moderately Played, Heavily Played
- Foil effects: Standard Foil (2.5x), Prize Foil (5x)
- Power calculation based on rarity × wear × foil

### Web3 Features

- **Wallet Connection** - RainbowKit integration
- **Multi-wallet Support** - MetaMask, Coinbase Wallet, WalletConnect
- **Farcaster Integration** - Mini app with notifications
- **Profile System** - Username, stats, defense deck
- **Internationalization** - Multi-language support (Portuguese, English, Spanish, Hindi)

## 🚀 Getting Started

### Prerequisites

```bash
Node.js >= 18
npm or yarn
```

### Installation

```bash
# Clone the repository
git clone https://github.com/JVHBO/vibe-most-wanted.git
cd vibe-most-wanted

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

### Environment Variables

Create `.env.local` with the required environment variables.

See [docs/setup/](docs/setup/) for detailed setup guides and configuration.

## 📁 Project Structure

```
vibe-most-wanted/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main game page (~3,400 lines after Mar/2026 refactor)
│   ├── (game)/            # Game route group
│   │   ├── components/    # Extracted game components
│   │   │   ├── battle/    # BattleArena, BattleResults, PowerDisplay
│   │   │   ├── modals/    # DefenseDeckModal, MyCardsModal, LeaderboardRewardsModal, ChainSelectionModal
│   │   │   └── ui/        # Modal (reusable)
│   │   └── hooks/         # Game-specific hooks
│   │       ├── battle/    # usePowerCalculation
│   │       └── game/      # useCardSelection
│   ├── tcg/               # TCG card game mode (~5,300 lines)
│   ├── profile/           # User profiles
│   ├── shop/              # Card shop
│   ├── share/             # Match sharing
│   └── api/               # API routes (50+ routes)
├── components/            # Shared React components
│   ├── cards/             # CardDisplay
│   ├── game/              # CardSelector
│   ├── home/              # HomeHeader, GameGrid, BottomNavigation
│   ├── CpuArenaModal.tsx  # Mecha Arena
│   ├── BaccaratModal.tsx  # Baccarat Casino
│   └── ...                # 40+ components
├── contexts/              # React contexts
│   ├── LanguageContext.tsx
│   ├── MusicContext.tsx
│   ├── PlayerCardsContext.tsx
│   └── Web3Provider.tsx
├── hooks/                 # Performance-optimized hooks
│   ├── useCardCalculations.ts
│   └── ...
├── convex/                # Backend (Convex)
│   ├── economy.ts         # Economy system (74KB)
│   ├── missions.ts        # Daily missions
│   ├── quests.ts          # Daily/weekly quests
│   ├── profiles.ts        # User profiles
│   ├── matches.ts         # Match history
│   ├── achievements.ts    # Achievement system
│   ├── tcg.ts             # TCG game logic (131KB)
│   ├── weeklyRewards.ts   # Automated reward distribution
│   └── rooms.ts           # PvP rooms
├── lib/                   # Utilities & services
│   ├── config/keys.ts     # TODAS as API keys (centralizado)
│   ├── power-utils.ts     # Power calculations with collection multipliers (FONTE)
│   ├── collections/       # NFT collection configs (14 collections)
│   ├── nft/               # NFT fetcher, attributes, card logic
│   ├── audio-manager.ts   # Sound effects system
│   ├── translations.ts    # i18n (880KB)
│   └── hooks/             # useSessionLock, useVBMSContracts, etc.
├── tests/                 # Test suite
│   ├── unit/              # Unit tests (Vitest + Testing Library)
│   │   ├── components/    # Component tests
│   │   └── hooks/         # Hook tests
│   └── setup.ts           # Test setup (jsdom, mocks)
├── docs/                  # Documentation
├── contracts/             # Solidity smart contracts
├── scripts/               # Utility scripts
└── .github/workflows/     # CI pipeline (lint, test, e2e)
```

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (Turbopack)
- **React**: 19
- **Backend**: Convex (real-time database)
- **Web3**: RainbowKit + Wagmi + ethers.js
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Testing**: Vitest + React Testing Library + Playwright (e2e)
- **CI/CD**: GitHub Actions (lint, typecheck, unit tests, e2e)
- **Deployment**: Vercel (frontend) + Convex Cloud (backend)

## 📊 Game Balance

### PvE Rewards
| Difficulty | Coins/Win | Max Power |
|-----------|-----------|-----------|
| Gey       | 5         | 200       |
| Goofy     | 15        | 400       |
| Gooner    | 30        | 600       |
| Gangster  | 60        | 800       |
| Gigachad  | 120       | 1,000     |

### Daily Limits
- **PvE**: 30 wins/day, 3,500 coins cap
- **PvP**: 10 matches/day, no cap
- **Attack**: 5 attacks/day, no cap

### Max Daily Earnings
- PvE: 3,500 coins
- Attack: 1,000+ coins (with bonuses)
- PvP: 800+ coins
- Bonuses: 1,425 coins
- **Total**: ~6,725 coins/day (theoretical max)

## 📚 Documentation

- [Economy Guide](docs/ECONOMY-GUIDE.md) - Complete economy system breakdown
- [Achievement System](docs/ACHIEVEMENTS-SYSTEM.md) - 64 achievements documentation
- [What's Missing](docs/WHATS-MISSING.md) - Current development status & roadmap
- [Elimination Mode](docs/ELIMINATION-MODE-NOTES.md) - Battle mechanics explained
- [Code Knots](docs/CODE-KNOTS.md) - Technical debt documentation
- [Farcaster Setup](docs/setup/FARCASTER-MINIAPP-CHECKLIST.md) - Integration guide
- [Performance Hooks](hooks/README.md) - Optimized React hooks library
- [Technical Debt](docs/TECHNICAL-DEBT.md) - Refactoring status and plans

## 🚧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
npm run test         # Run unit tests (watch mode)
npm run test:ci      # Run unit tests (CI mode)
npm run test:coverage # Run tests with coverage report
npm run test:e2e     # Run Playwright e2e tests
```

### Testing

The project uses **Vitest** for unit testing with **React Testing Library** for component tests.

```bash
# Run all 377 tests
npm run test:ci

# Run with coverage (current: 92%+ statements)
npm run test:coverage
```

**Test structure:**
- `tests/unit/components/` - Component tests (BattleArena, PowerDisplay, Modal, etc.)
- `tests/unit/hooks/` - Hook tests (usePowerCalculation, useCardSelection)
- `lib/utils/__tests__/` - Utility function tests (card calculations, economy, quests)

See [docs/setup/](docs/setup/) for detailed development guides.

## 🔒 Security

- Signature verification for wallet authentication
- Nonce system to prevent replay attacks
- Input validation and sanitization
- Rate limiting on critical endpoints

See [SECURITY.md](docs/SECURITY.md) for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live App**: [https://vibemostwanted.xyz](https://vibemostwanted.xyz)
- **Farcaster**: [https://warpcast.com/vibegame](https://warpcast.com/vibegame)

## 👥 Team

Built with ❤️ by the Vibe team

---

**Version**: 2.1.0
**Last Updated**: 2026-04-08

## 🎉 Recent Updates (Mar/Apr 2026)

- ✅ **Aura XP Levels** (v0.3.6) - Dragon Ball inspired tiers with weeklyAura reset, aura spin bonuses, and daily limits
- ✅ **Social Quests Carousel** - Auto-rotating VBMS (gold) and arb_creators (blue) quest groups
- ✅ **ARB TX Flow** - wallet_switchEthereumChain before eth_sendTransaction with useArbValidator hook
- ✅ **VibeMail Fixes** - Myinstants proxy, color tag regex with spaces, voice recording in design editor, hidden /img= /sound= commands
- ✅ **neobrutalism.css Animações** - Removed global rules killing animations, TCG card flip now working
- ✅ **MiniappFrame Desktop Detection** - Threshold 480px → 1440px, force miniapp mode, Farcaster SDK integration
- ✅ **Pending Conversion Recovery** - recoverPendingConversion mutation (awaits 30min) and adminRecoverPendingByUsername
- ✅ **TCG Refactor Phase 1-3** - tcg/page.tsx: 9454 → 5298 linhas, app/page.tsx: 4110 → 3404 linhas
- ✅ **Security Fixes Mar/26** - Removed hardcoded WIELD_API_KEY from 4 arquivos, centralized in lib/config/keys.ts
- ✅ **Component Architecture** - Extracted BattleArena, modals, hooks from monolithic page.tsx (~1,000 lines removed)
- ✅ **Test Infrastructure** - 377 unit tests, 92%+ coverage (Vitest + React Testing Library)
- ✅ **CI Pipeline** - GitHub Actions with lint, typecheck, unit tests, and e2e
- ✅ **TCG Mode** - Turn-based card game with lanes, abilities, and staked matches
- ✅ **Mecha Arena** - CPU vs CPU card battles with spectating
- ✅ **Defense Pool System** - Stake coins to defend leaderboard position
- ✅ **14 NFT Collections** - VBMS, VibeFID, Banger, Cumio, Tarot, and more
- ✅ **Power Multipliers** - VibeFID 5x (10x leaderboard), VBMS 2x, Nothing 0.5x

### Previous Updates (Nov 2025)

- ✅ **Achievement System** - 64 achievements with ~302K total coins
- ✅ **Weekly Rewards** - Automated distribution every Sunday (cron job)
- ✅ **i18n Support** - 4 languages (pt-BR, en, es, hi)
