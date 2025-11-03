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
- **🏆 Ranking Bonuses** - Up to 2.5x multiplier for defeating higher-ranked players
- **💸 Entry Fees** - PvP: 20 coins | Attack: FREE

See [ECONOMY-GUIDE.md](docs/ECONOMY-GUIDE.md) for complete details.

### NFT Integration

- **JC NFT Collection** (Base Mainnet)
- **Contract**: `0xf14c1dc8ce5fe65413379f76c43fa1460c31e728`
- Rarity system: Common, Uncommon, Rare, Epic, Legendary
- Wear system: Mint, Near Mint, Slight Wear, Worn, Rekt
- Foil effects for premium cards
- Power calculation based on rarity + wear

### Web3 Features

- **Wallet Connection** - RainbowKit integration
- **Multi-wallet Support** - MetaMask, Coinbase Wallet, WalletConnect
- **Farcaster Integration** - Mini app with notifications
- **Profile System** - Username, stats, defense deck

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

Create `.env.local` with the following:

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud

# Alchemy (NFT data)
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
NEXT_PUBLIC_ALCHEMY_CHAIN=base-mainnet

# Contracts
NEXT_PUBLIC_VIBE_CONTRACT=0xf14c1dc8ce5fe65413379f76c43fa1460c31e728
NEXT_PUBLIC_JC_CONTRACT=0xf14c1dc8ce5fe65413379f76c43fa1460c31e728

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Twitter OAuth (optional)
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret
```

See [docs/setup/](docs/setup/) for detailed setup guides.

## 📁 Project Structure

```
vibe-most-wanted/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main game page (6,694 lines)
│   ├── profile/           # User profiles
│   ├── share/             # Match sharing
│   └── api/               # API routes
├── components/            # React components
│   ├── Badge.tsx
│   ├── DifficultyModal.tsx
│   └── FoilCardEffect.tsx
├── contexts/              # React contexts
│   ├── LanguageContext.tsx
│   ├── MusicContext.tsx
│   └── Web3Provider.tsx
├── convex/                # Backend (Convex)
│   ├── economy.ts         # Economy system
│   ├── missions.ts        # Daily missions
│   ├── quests.ts          # Daily/weekly quests
│   ├── profiles.ts        # User profiles
│   ├── matches.ts         # Match history
│   └── rooms.ts           # PvP rooms
├── lib/                   # Utilities & services
│   ├── config.ts          # Centralized configuration
│   ├── convex-profile.ts  # Profile service
│   ├── convex-pvp.ts      # PvP service
│   ├── nft-fetcher.ts     # NFT metadata
│   └── badges.ts          # Badge system
├── docs/                  # Documentation
│   ├── ECONOMY-GUIDE.md
│   ├── PENDING-TASKS.md
│   ├── CODE-KNOTS.md
│   ├── setup/             # Setup guides
│   └── guides/            # Implementation guides
├── scripts/               # Utility scripts
│   ├── debug/
│   ├── data-fetching/
│   └── utils/
└── data/                  # JSON data
    ├── cards/             # Card data
    └── backups/           # Backups
```

## 🛠️ Tech Stack

- **Framework**: Next.js 15.5.6 (Turbopack)
- **React**: 19
- **Backend**: Convex (real-time database)
- **Web3**: RainbowKit + Wagmi + ethers.js
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Deployment**: Vercel

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
- [Elimination Mode](docs/ELIMINATION-MODE-NOTES.md) - Battle mechanics explained
- [Pending Tasks](docs/PENDING-TASKS.md) - Development roadmap
- [Code Knots](docs/CODE-KNOTS.md) - Technical debt documentation
- [Farcaster Setup](docs/setup/FARCASTER-MINIAPP-CHECKLIST.md) - Integration guide

## 🚧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Convex Development

```bash
npx convex dev       # Start Convex dev server
npx convex deploy    # Deploy to production
```

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
- **Farcaster Frame**: [https://warpcast.com/vibegame](https://warpcast.com/vibegame)
- **Contract**: [Base Scan](https://basescan.org/address/0xf14c1dc8ce5fe65413379f76c43fa1460c31e728)

## 👥 Team

Built with ❤️ by the Vibe team

---

**Version**: 1.0.0
**Last Updated**: 2025-01-02
