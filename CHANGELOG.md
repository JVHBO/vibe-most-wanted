# Changelog — Vibe Most Wanted

## [2026-04-24]

### Slot Machine — Replay Mode
- Modo replay completo dentro do `SlotMachine.tsx` — usa o mesmo pipeline de animação real (`slowAndStopCol` → `playComboResolution` → `finishSpinVisuals`)
- `/slot?replay=SID&user=USER` carrega spins do Convex e auto-avança
- Share page (`/slot/replay/[sid]`) agora busca pfp via Neynar e passa ao componente
- Botão "Ver Replay" no share navega para o SlotMachine real (não simulação)
- `fc:frame` / `fc:miniapp` apontam para `/slot?replay=SID`

### Slot Machine — UI de Sorte Visível
- Badge de boost diário na balance bar: 🔥 75% (primeiras 3 spins), 🔥 55% (3-5), ✨ 40% (6-9)
- Badge de free spins restantes: 🎰 N FREE
- `freeLeft` agora é exibido (antes estava calculado mas não renderizado)

### Segurança
- API key Wield movida para proxy server-side (`/api/vibe/marketcap`) — não exposta no bundle do cliente
- `NEYNAR_API_KEY` prefere variável server-side em `/profile/[username]`
- `.gitignore` atualizado: `progress.md`, `skills-lock.json`, `.agents/skills/`, `.openclaude/`, `convex/_generated/ai/` removidos do repositório público

### Fixes
- `isBaseAppWebView()` retorna false dentro do iframe Farcaster (ambos usavam `ReactNativeWebView`)
- `/docs` não retornava 404 mais — removida entrada `docs/` do `.vercelignore`
- `getSlotCardRarity` duplicada removida de `config.ts` (causava erro TS2323)
- Grid do slot: `object-contain` → `object-cover` (eliminava barras pretas acima/abaixo das cartas)

---

## [2026-04-22]

### Slot Machine
- Replay route `/slot/replay/[sid]` com OG image, `fc:frame` e `fc:miniapp`
- Display do saldo da carteira no slot
- Suit icons nas cartas
- Grid min-height corrigido
- Base App: sem GIFs, sem filtros pesados (via `isFrameMode` prop)

### Fixes
- Playlist do slot: restart correto ao trocar faixa
- Nonce `0x` prefix no `prepareWithdraw`
- GIF title: `mix-blend-mode:screen` no texto, cor `#FFD400`

---

## [2026-04-20]

### OpenAds
- Integração OpenAds no miniapp sem bloquear UI
- Grid home acima dos iframes OpenAds
- OpenAds oculto em páginas mobile do miniapp

### Raffle
- Múltiplos vencedores exibidos corretamente na UI

### Farcaster
- Caminho de claim tx via Farcaster SDK restaurado
