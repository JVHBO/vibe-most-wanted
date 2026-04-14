# Progresso das Mudanças - Fluxo de Acesso e Criação de Conta

## Estado Atual

✅ Atualizado e publicado no `main`  
- Commit: `1ebdb54c`  
- Escopo: fluxo de conexão wallet + criação de perfil (Base App/web + Farcaster)

## Entregas Concluídas

### 1) Fluxo de conexão (home)
- Arquivos:
  - `C:\Users\zoboo\vibe-most-wanted\app\page.tsx`
  - `C:\Users\zoboo\vibe-most-wanted\components\ConnectScreen.tsx`
- Implementado:
  - Tela de conexão centralizada, sem navbar e sem header no estado desconectado
  - Removido excesso de opções de wallet
  - Dedupe de conectores e lista curada:
    - Continue with Base
    - Connect Coinbase Wallet
    - Connect MetaMask
    - Connect WalletConnect
  - Fluxo Farcaster mantido separado quando há contexto/FID real

### 2) Compatibilidade Base App (standard web app)
- Arquivo:
  - `C:\Users\zoboo\vibe-most-wanted\lib\wagmi.ts`
- Implementado:
  - Adicionado conector `baseAccount` no config do wagmi
  - Mantido `farcasterMiniApp()` para o host Farcaster

### 3) Detecção Farcaster vs Base/web
- Arquivos:
  - `C:\Users\zoboo\vibe-most-wanted\hooks\fid\useFarcasterContext.ts`
  - `C:\Users\zoboo\vibe-most-wanted\lib\hooks\useFarcasterContext.ts`
- Implementado:
  - Só considera Farcaster quando existe contexto com `user.fid`
  - Sem FID/contexto real => cai no fluxo web/Base (wallet-first)

### 4) Modal de criação de perfil
- Arquivo:
  - `C:\Users\zoboo\vibe-most-wanted\components\CreateProfileModal.tsx`
- Implementado:
  - Botões de criar/cancelar sempre visíveis (inclusive no fluxo Farcaster)
  - Idiomas: mostra todas as opções (sem corte)
  - Corrigido texto hardcoded/chave crua (`createAccount`)
  - Fallback de tradução para labels ausentes
  - Farcaster: respeita username digitado pelo player na criação

### 5) Username padrão e auto-abertura
- Arquivo:
  - `C:\Users\zoboo\vibe-most-wanted\app\page.tsx`
- Implementado:
  - Sem FID: username inicial por abreviação da wallet (`user_xxxx...`)
  - Com Farcaster: username inicial do Farcaster (sanitizado)
  - Modal autoabre só no primeiro acesso por wallet no device (`localStorage`)

## Verificações Técnicas

✅ `npm run type:check`  
✅ `npm run build`

## Pendências Reais (Próximo Ciclo)

- [ ] Revisar UX final de idioma no modal para telas muito pequenas (compactação visual)
- [ ] Unificar e limpar pontos legados de Farcaster fora do fluxo da home (escopo maior)
- [ ] Decidir estratégia de persistência de "primeiro acesso" (hoje está local por navegador/device)

## Observações

- O fluxo principal agora está funcional para:
  - Farcaster (com FID/contexto real)
  - Base App / web padrão (sem depender de FID)
- Mudanças de slot/TCG estão fora deste documento e seguem em trilha separada.

---

## Fixes Base App - Roulette & TXs (Abr/2026)

### Contexto
- `wagmi.isConnected` fica `false` durante reconnecting mesmo com `address` presente
- `sdk.wallet.getEthereumProvider()` **trava para sempre** sem throw no Base App
- `sessionStorage` limpa no F5 em WebView (usar `localStorage`)

### ✅ Create Profile button para linked wallet
**Arquivo:** `lib/hooks/usePrimaryAddress.ts` — removido `isConnected` das condições

### ✅ Roulette idle rotation travando
**Fix:** CSS @keyframes compositor (zero JS)

### ✅ Roulette spin animation travando (setBallOrbit)
**Fix:** Ball position via direct DOM refs (`updateBallDOM`), zero setState durante 5s de spin

### ✅ Bola caindo em segmento errado
**Fix:** `targetBallAngle = -90 + (targetIndex + offset) * SEGMENT_ANGLE`

### ✅ Claim roulette travado em "Claiming" no Base App
**Causa:** `sdk.wallet.getEthereumProvider()` em `handleClaim` trava para sempre no Base App  
**Fix:** `isBaseApp` check + `Promise.race(1500ms)` — Base App usa `address` direto

### ✅ Raffle 3D card travando
**Fix:** Removido `backdropFilter: blur(12px)`

### Auditoria TXs sdk.wallet
`shouldUseFarcasterSDK()` em `lib/utils/miniapp.ts` retorna `false` no Base App via `ReactNativeWebView` check. Todos os outros fluxos de TX (InboxModal, CoinsInboxModal, VibeMail, quests, missionTx, useWeeklyLeaderboardClaim) estão protegidos.

### Pendentes
- [ ] Testar claim roulette no Base App
- [ ] Testar animação bolinha no Base App
