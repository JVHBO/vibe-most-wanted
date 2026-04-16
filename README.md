# 🎴 Vibe Most Wanted

A competitive NFT card battle game built on Base blockchain, featuring PvE, PvP, and leaderboard attacks with an in-game economy powered by $TESTVBMS coins.

[![Next.js](https://img.shields.io/badge/Next.js-15.5.6-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![Convex](https://img.shields.io/badge/Convex-Backend-orange)](https://convex.dev/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 🔗 Links

- **Live App**: [https://vibemostwanted.xyz](https://vibemostwanted.xyz)
- **Farcaster**: [https://warpcast.com/vibegame](https://warpcast.com/jvhbo)

## 👥 Team

Built by jvhbo and claude code

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
