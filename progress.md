# Progress — Sessão Abr/2026

> Atualizado: 2026-04-16

---

## Slot Machine (Tukka Slots)

### Música
- [x] Remover modo "custom" — manter só **default** e **playlist**
- [x] Mostrar nome da faixa na playlist
- [x] Controle de volume (barra de 10 + botões − / +) para todos os modos

### Performance
- [x] `isFrameMode` prop — animações sem `filter:blur/brightness` para BaseApp WebView

### Spin ID + Recovery
- [x] Cada giro recebe `spinId` único
- [x] Resultado salvo server-side antes da animação (padrão cassino)
- [x] SessionStorage — F5 recupera giro pendente (toast)

### Win Screens
- [x] Nice Win (≥ 2×), Great Win (≥ 5×), Big Win (≥ 20×), Max Win (≥ 100×) — base na bet atual
- [x] Mostra multiplicador (X) e quantidade de coins
- [x] Mostra nome do jogador (@username)
- [x] Auto-fecha em 4s, dispensável por clique
- [x] Max Win encerra bonus spins imediatamente (cap real)

### Share Win
- [x] Botão de share após win screen
- [x] OG image estilo meme (angry kid) — 1200×800 3:2 (padrão Farcaster)
- [x] `WIN Xk $VBMS` top-right, `CONGRATS` centro, `@username` bottom
- [x] `/share/slot` com `fc:miniapp` + `fc:frame` → botão "Play Tukka Slots" no cast
- [x] Embed URL inclui params (amount, x, user) → OG dinâmico por win
- [ ] **Landing page do link** — ao abrir o link, mostrar a win e botão jogar/ver replay

### Combos e Frequência
- [x] 4 cartas obrigatórias (mantido)
- [x] Payout mínimo por combo = 1× bet (rank 2 com bet=10 não paga mais 0)
- [x] **Combo boost server-side**: primeiros spins do dia têm maior chance de forçar combo
  - Spin 1-3: 60% | Spin 4-6: 40% | Spin 7-10: 25% | Spin 11-20: 15% | 21+: 8%
- [x] `forceNearestRankCombo()` completa o rank mais próximo no grid quando boost ativa

### Limpeza de código
- [x] Remover `bonusMultiplier`, `nearMiss`, cascade multiplier (dead code)
- [x] Fix Server Error: `winAdded`/`bonusMultiplier` undefined em `convex/slot.ts`
- [x] Texto PLAY BONUS: "A Wildcard permanece no grid durante todo o bônus!"
- [ ] **Remover bloqueio dev-only** antes do launch:
  - `convex/slot.ts:196` — remove guard de dev
  - `SlotMachine.tsx:264` — remove guard de dev

---

## Notificações

- [x] Dois canais: **Farcaster (Hypersnap)** + **BaseApp**
- [x] Cron diário envia para ambos via `sendDailyTip`
- [x] Notificação quando recebe VibeMailm
- [x] Notificação quando boss de raid morre
- [x] Notificação semanal de leaderboard (domingo 23:50 UTC)
- [x] Cron de reset semanal de aura (segunda 00:00 UTC)

---

## OG Images (todas 3:2 = 1200×800 — padrão Farcaster embed)

- [x] `api/og/slot-win` — angry kid meme, info dinâmica
- [x] `share/fid/[fid]` — já era 800
- [x] `share/raid` — já era 800
- [x] `share/mecha`, `share/pack`, `share/profile`, `share/vibe`, `share/[matchId]` — corrigidos de 630 → 800

---

## Wallet Gate (todas as páginas)

- [x] `/slot`, `/roulette`, `/baccarat`, `/tcg`, `/raid`, `/quests`, `/shop`, `/raffle`

---

## Pendentes / A fazer

- [ ] **Landing page share win** — `/share/slot` já existe mas só redireciona; precisa mostrar a win e opção "Ver replay"
- [ ] **Remover guards dev-only** antes do launch (`convex/slot.ts:196` + `SlotMachine.tsx:264`)
- [ ] **Verificar slot usa ProfileContext/PlayerCardsContext** igual à home

---

## Commits desta sessão

| Hash | Descrição |
|------|-----------|
| `6c90622e` | feat: Tukka Slots overhaul + notification refactor + wallet gates |
| `7616bd9a` | fix: OG slot-win 3:2 (1200×800) + visual redesign |
| `bdd6790e` | fix: all OG images 1200×800 (3:2) — padrão Farcaster |
| `f312d930` | fix: win screen thresholds relativos à bet |
| `556a9c3c` | feat: max win cap para bonus spins + overlay mostra player name |
| `78e611fe` | feat: OG slot-win fundo angry kid |
| `965457c0` | fix: remove URL/emojis/TAP TO PLAY da OG |
| `3623512b` | feat: /share/slot com fc:miniapp button |
| `448dc0b8` | fix: combo frequência + win screen threshold |
| `e9a364fb` | revert: 4 cartas obrigatórias restaurado |
| `e71ab771` | redesign: OG meme style |
| `819105e6` | fix: Nice Win threshold de volta a 2× |
