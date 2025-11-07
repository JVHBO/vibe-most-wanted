# 📚 Vibe Most Wanted - Documentation

**Complete documentation for the Vibe Most Wanted NFT card battle game**

**Last Updated**: 2025-11-07

---

## 🎯 Quick Start

New to the project? Start here:

1. [**Project Overview**](#project-overview) - What is Vibe Most Wanted?
2. [**Development Setup**](../README.md) - Get the project running locally
3. [**Farcaster Miniapp Guide**](./guides/FARCASTER-MINIAPP-DEVELOPMENT-GUIDE.md) - Build Farcaster miniapps
4. [**Economy Guide**](./ECONOMY-GUIDE.md) - Understand the game economy

---

## 📖 Documentation Index

### 🎮 Game Systems

| Document | Description |
|----------|-------------|
| [Economy Guide](./ECONOMY-GUIDE.md) | Complete economy system documentation |
| [Achievements System](./ACHIEVEMENTS-SYSTEM.md) | All 63 achievements and rewards |
| [Economy Review & Tokenomics](./ECONOMY-REVIEW-TOKENOMICS.md) | Token economics analysis |

### 🚀 Development Guides

| Document | Description |
|----------|-------------|
| [**Farcaster Miniapp Development Guide**](./guides/FARCASTER-MINIAPP-DEVELOPMENT-GUIDE.md) | **Complete guide to building Farcaster miniapps** |
| [Farcaster Miniapp Checklist](./setup/FARCASTER-MINIAPP-CHECKLIST.md) | Deployment checklist (Portuguese) |
| [Farcaster Fix Summary](./setup/FARCASTER-FIX-SUMMARY.md) | Common fixes (Portuguese) |
| [Foil Effects Implementation](./guides/FOIL-EFFECTS-IMPLEMENTATION.md) | How to implement foil card effects |
| [Visual Upgrade Guide](./guides/VISUAL-UPGRADE-GUIDE.md) | UI/UX improvements guide |
| [Design Versions](./guides/DESIGN-VERSIONS.md) | Design iteration history |

### 🔧 Technical Documentation

| Document | Description |
|----------|-------------|
| [Code Knots Analysis](./CODE-KNOTS.md) | Known issues and technical debt |
| [Technical Debt](./TECHNICAL-DEBT.md) | Areas needing refactoring |
| [What's Missing](./WHATS-MISSING.md) | Pending features and improvements |
| [Known Bugs](./KNOWN-BUGS.md) | Bug tracker |
| [Pending Tasks](./PENDING-TASKS.md) | Current TODO list |

### 🔐 Security & Infrastructure

| Document | Description |
|----------|-------------|
| [Security Audit Master](./SECURITY-AUDIT-MASTER.md) | Security analysis and recommendations |
| [Security](./SECURITY.md) | Security policies |
| [Gas Analysis](./GAS-ANALYSIS-REAL.md) | Blockchain gas optimization |
| [Gas Limit Reference](./GAS-LIMIT-REFERENCE.md) | Gas limits for operations |
| [High Frequency Claims Solution](./HIGH-FREQUENCY-CLAIMS-SOLUTION.md) | Handling high-volume claims |

### 💰 Economy & Features

| Document | Description |
|----------|-------------|
| [Wagering System Proposal](./WAGERING-SYSTEM-PROPOSAL.md) | PvP betting system design |
| [Circular Economy VBMS](./CIRCULAR-ECONOMY-VBMS.md) | Token circulation model |
| [VBMS Token Migration Plan](./VBMS-TOKEN-MIGRATION-PLAN.md) | Token migration strategy |
| [Inbox Implementation Guide](./INBOX-IMPLEMENTATION-GUIDE.md) | Coins inbox system |
| [Coins Inbox Integration](./COINS-INBOX-INTEGRATION-GUIDE.md) | Integration steps |
| [Elimination Mode Notes](./ELIMINATION-MODE-NOTES.md) | Battle mode concept |
| [PvP Modes Ideas](./PVP-MODES-IDEAS.md) | Future PvP features |

### 📊 Reports & Summaries

| Document | Description |
|----------|-------------|
| [Session Summary 2025-10-26](./reports/SESSION-SUMMARY-2025-10-26.md) | Development session notes |
| [AI Decks Report](./reports/AI-DECKS-REPORT.md) | AI opponent analysis |
| [Share OG Image Fix](./reports/SHARE-OG-IMAGE-FIX-2025-11-07.md) | Social sharing fix |
| [Daily Tips System](./reports/DAILY-TIPS-SYSTEM-2025-11-07.md) | Daily tips implementation |

### 📝 Setup & Configuration

| Document | Description |
|----------|-------------|
| [SimpleHash Configuration](./setup/COMO-CONFIGURAR-SIMPLEHASH.md) | NFT API setup (Portuguese) |
| [Farcaster Setup (Portuguese)](./setup/LEIA-ISTO-FARCASTER.md) | Quick Farcaster guide |
| [Image Resize Instructions](./setup/RESIZE-IMAGE-INSTRUCTIONS.md) | Image optimization steps |
| [Achievements Deploy Guide](./ACHIEVEMENTS-DEPLOY-GUIDE.md) | Deploy achievement system |

---

## 🌟 Featured Guides

### 🎯 For Developers Building Farcaster Apps

**[📱 Farcaster Miniapp Development Guide](./guides/FARCASTER-MINIAPP-DEVELOPMENT-GUIDE.md)**

A comprehensive, production-tested guide covering:
- ✅ Meta tags configuration (with examples)
- ✅ Manifest file setup
- ✅ Asset requirements (dimensions, formats)
- ✅ Next.js configuration (CORS, headers)
- ✅ Detection & optimization strategies
- ✅ Complete deployment checklist
- ✅ Testing & validation steps
- ✅ Troubleshooting common issues
- ✅ Best practices from production app

**Perfect for**: Anyone building a Farcaster miniapp from scratch or debugging an existing one.

### 💰 For Understanding Game Economics

**[💵 Economy Guide](./ECONOMY-GUIDE.md)**

Complete breakdown of:
- Coin earning mechanics (PvE, PvP, Attack mode)
- Daily limits and caps
- Achievement rewards (302K total coins available)
- Weekly rewards system
- Quest mechanics
- Anti-abuse measures

### 🏆 For Achievement Hunters

**[🎖️ Achievements System](./ACHIEVEMENTS-SYSTEM.md)**

All 63 achievements documented:
- Rarity achievements (27 types)
- Wear condition achievements (18 types)
- Foil achievements (6 types)
- Progressive collection achievements (12 types)
- Total rewards: 302,300 coins

---

## 🗂️ Documentation Organization

```
docs/
├── README.md                          # This file - documentation index
├── guides/                            # Step-by-step guides
│   ├── FARCASTER-MINIAPP-DEVELOPMENT-GUIDE.md  # 🎯 Featured
│   ├── FOIL-EFFECTS-IMPLEMENTATION.md
│   ├── VISUAL-UPGRADE-GUIDE.md
│   └── DESIGN-VERSIONS.md
├── setup/                             # Configuration guides
│   ├── FARCASTER-MINIAPP-CHECKLIST.md
│   ├── FARCASTER-FIX-SUMMARY.md
│   ├── LEIA-ISTO-FARCASTER.md
│   ├── COMO-CONFIGURAR-SIMPLEHASH.md
│   └── RESIZE-IMAGE-INSTRUCTIONS.md
├── reports/                           # Session reports & fixes
│   ├── SESSION-SUMMARY-2025-10-26.md
│   ├── AI-DECKS-REPORT.md
│   ├── SHARE-OG-IMAGE-FIX-2025-11-07.md
│   └── DAILY-TIPS-SYSTEM-2025-11-07.md
└── [root docs]                        # Core documentation
    ├── ECONOMY-GUIDE.md
    ├── ACHIEVEMENTS-SYSTEM.md
    ├── CODE-KNOTS.md
    ├── KNOWN-BUGS.md
    └── ... (see index above)
```

---

## 🎯 Common Tasks

### I want to...

**...understand how the game economy works**
→ Read [Economy Guide](./ECONOMY-GUIDE.md)

**...build a Farcaster miniapp**
→ Read [Farcaster Miniapp Development Guide](./guides/FARCASTER-MINIAPP-DEVELOPMENT-GUIDE.md)

**...deploy the project**
→ Follow steps in [main README](../README.md) + [Achievements Deploy Guide](./ACHIEVEMENTS-DEPLOY-GUIDE.md)

**...fix a Farcaster issue**
→ Check [Farcaster Fix Summary](./setup/FARCASTER-FIX-SUMMARY.md) or [Troubleshooting section](./guides/FARCASTER-MINIAPP-DEVELOPMENT-GUIDE.md#troubleshooting)

**...understand technical debt**
→ Read [Code Knots](./CODE-KNOTS.md) + [What's Missing](./WHATS-MISSING.md)

**...know what's broken**
→ Check [Known Bugs](./KNOWN-BUGS.md)

**...optimize gas costs**
→ Read [Gas Analysis](./GAS-ANALYSIS-REAL.md) + [Gas Limit Reference](./GAS-LIMIT-REFERENCE.md)

**...implement a new feature**
→ Check [Technical Debt](./TECHNICAL-DEBT.md) + [Pending Tasks](./PENDING-TASKS.md)

---

## 🔍 Search Tips

Use GitHub's search or your editor's search functionality:

- Search for error codes: `"Error 500"`, `"TypeError"`
- Search for features: `"achievement"`, `"daily quest"`, `"PvP"`
- Search for files: `"layout.tsx"`, `"economy.ts"`
- Search for configurations: `"CORS"`, `"meta tag"`, `"manifest"`

---

## 🆕 Recent Updates

### 2025-11-07
- ✅ Created comprehensive [Farcaster Miniapp Development Guide](./guides/FARCASTER-MINIAPP-DEVELOPMENT-GUIDE.md)
- ✅ Organized documentation with this README
- ✅ Fixed security issues (removed exposed API keys)

### 2025-11-03
- ✅ Fixed achievement claim bug (Bug #6)
- ✅ Implemented custom toast notification system
- ✅ Migrated to performance hooks library
- ✅ Added weekly rewards UI

### 2025-11-01
- ✅ Fixed Farcaster miniapp meta tags
- ✅ Updated manifest configuration
- ✅ Improved documentation structure

---

## 📞 Getting Help

### Documentation Issues

If you find outdated documentation or errors:
1. Check if there's a newer version in [reports/](./reports/)
2. Search for related issues in [KNOWN-BUGS.md](./KNOWN-BUGS.md)
3. Create an issue on GitHub

### Technical Issues

1. Check [Known Bugs](./KNOWN-BUGS.md) first
2. Review [Troubleshooting](./guides/FARCASTER-MINIAPP-DEVELOPMENT-GUIDE.md#troubleshooting) sections
3. Check [Code Knots](./CODE-KNOTS.md) for known technical issues

### Feature Requests

1. Check [What's Missing](./WHATS-MISSING.md) to see if it's planned
2. Review [Pending Tasks](./PENDING-TASKS.md)
3. Check [PvP Modes Ideas](./PVP-MODES-IDEAS.md) for future features

---

## 🤝 Contributing to Documentation

### Documentation Standards

1. **Use English for technical guides** (like Farcaster guide)
2. **Portuguese OK for internal docs** (if needed)
3. **Include code examples** with proper syntax highlighting
4. **Add timestamps** to all documents
5. **Update this README** when adding new docs

### File Naming Convention

```
guides/           # How-to guides (step-by-step)
setup/           # Configuration instructions
reports/         # Session summaries and fixes
[root]/          # Core reference documentation
```

### Adding a New Document

1. Create the file in appropriate directory
2. Add entry to this README in correct category
3. Include table of contents for long docs
4. Add cross-references to related docs
5. Update "Recent Updates" section

---

## 📚 External Resources

### Farcaster Development

- [Farcaster Official Docs](https://docs.farcaster.xyz)
- [Mini Apps Documentation](https://miniapps.farcaster.xyz/docs)
- [Farcaster Discord](https://discord.gg/farcaster) - #miniapps channel

### Next.js

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)

### Web3 / NFTs

- [SimpleHash API Docs](https://docs.simplehash.com)
- [Base Network Docs](https://docs.base.org)

### Deployment

- [Vercel Documentation](https://vercel.com/docs)
- [Convex Documentation](https://docs.convex.dev)

---

## 📊 Documentation Stats

- **Total Documents**: 38
- **Guides**: 5
- **Setup Docs**: 4
- **Reports**: 4
- **Core Docs**: 25
- **Last Major Update**: 2025-11-07

---

**Maintained By**: Vibe Most Wanted Team
**Repository**: [GitHub](https://github.com/your-repo)
**Live Site**: [vibemostwanted.xyz](https://www.vibemostwanted.xyz)

**Questions?** Check the relevant guide or create an issue on GitHub.
