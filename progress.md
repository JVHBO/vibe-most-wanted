# Progress — Sessão Abr/2026

> Atualizado: 2026-04-16

---

## Slot Machine (Tukka Slots)

### Música
- [x] Remover modo "custom" — manter só **default** e **playlist**
- [x] Mostrar nome da faixa na playlist
- [x] Controle de volume (barra de 10 + botões − / +) para todos os modos

### Performance
- [x] `isFrameMode` prop — animações leves sem `filter:blur/brightness` para BaseApp WebView

### Spin ID + Recovery
- [x] Cada giro recebe `spinId` único
- [x] Resultado salvo server-side antes da animação (padrão cassino)
- [x] SessionStorage — se o player der F5, recupera o giro pendente (toast de aviso)

### Win Screens
- [x] Nice Win (≥150×) overlay
- [x] Great Win (≥500×) overlay
- [x] Big Win (≥2000×) overlay
- [x] Max Win (≥10000×) overlay
- [x] Mostra multiplicador (X) e quantidade de coins
- [x] Auto-fecha em 4s, dispensável por clique

### Share Win
- [x] Botão de share aparece após big win
- [x] OG image gerada via `app/api/og/slot-win/route.tsx` (mostra label, X, amount)
- [x] Compose URL para Warpcast com texto + embed
- [x] Usa `sdk.actions.openUrl` com fallback `window.open`
- [ ] **Landing page do link compartilhado** — quem abre o link vê a OG image e escolhe:
  - "Jogar" → vai para `/slot`
  - "Ver a win" → reproduz a animação da win (replay do resultado)

### Limpeza de código
- [x] Remover `bonusMultiplier`, `nearMiss`, cascade multiplier (dead code)
- [x] Fix Server Error: `winAdded`/`bonusMultiplier` undefined em `convex/slot.ts`
- [x] Texto PLAY BONUS: "A Wildcard permanece no grid durante todo o bônus!"
- [ ] **Remover bloqueio dev-only** antes do launch:
  - `convex/slot.ts:196` — remove guard de dev
  - `SlotMachine.tsx:264` — remove guard de dev

---

## Notificações

- [x] Refatorar `convex/notifications.ts` — dois canais: **Farcaster (Hypersnap)** + **BaseApp**
- [x] Cron diário envia para ambos os canais via `sendDailyTip`
- [x] Notificação quando recebe VibeMailm
- [x] Notificação quando boss de raid morre
- [x] Notificação semanal de leaderboard (domingo 23:50 UTC)
- [x] Cron de reset semanal de aura (segunda 00:00 UTC)
- [x] Remover todo código morto / confusão de métodos

---

## Wallet Gate (todas as páginas)

- [x] `/slot` — WalletGateScreen + LoadingSpinner
- [x] `/roulette` — WalletGateScreen + LoadingSpinner
- [x] `/baccarat` — WalletGateScreen
- [x] `/tcg` — WalletGateScreen + LoadingSpinner
- [x] `/raid` — WalletGateScreen (já existia)
- [x] `/quests` — WalletGateScreen (já existia)
- [x] `/shop` — WalletGateScreen (já existia)
- [x] `/raffle` — WalletGateScreen + LoadingSpinner

---

## Pendentes / A fazer

- [ ] **Landing page share win** — `/slot/win/[spinId]` ou `/share/slot/[spinId]`
  - Buscar resultado pelo spinId via `getSpinById`
  - Mostrar OG image + botões "Jogar" / "Ver a win"
  - Replay da animação vencedora

- [ ] **Remover guards dev-only do slot** antes de ir para produção

- [ ] **Slot puxa perfil/wallet do contexto da home** — verificar se usa os mesmos providers (ProfileContext, PlayerCardsContext)

---

## Commits desta sessão

| Hash | Descrição |
|------|-----------|
| `6c90622e` | feat: Tukka Slots overhaul + notification refactor + wallet gates |
