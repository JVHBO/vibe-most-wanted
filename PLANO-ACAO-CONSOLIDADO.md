# 🎯 PLANO DE AÇÃO CONSOLIDADO - Vibe Most Wanted

**Data:** 2025-11-06
**Baseado em:** 3 análises completas do codebase
**Tempo Total Estimado:** 84-110 horas (2-3 semanas)

---

## 📊 RESUMO EXECUTIVO

**Status do Projeto:** B- (Boa fundação, problemas críticos)

| Categoria | Problemas | Tempo Estimado |
|-----------|-----------|----------------|
| 🔴 Críticos (Segurança) | 12 | 24-32h |
| 🟠 Maiores (Arquitetura) | 8 | 20-28h |
| 🟡 Significativos (Qualidade) | 15 | 16-24h |
| 🔵 Menores (Melhorias) | 11 | 12-18h |
| **TOTAL** | **46** | **72-102h** |

---

## 🚨 FASE 1: CRÍTICO - SEGURANÇA (24-32 horas)

### **🔴 URGENTE - DIA 1-2 (Fazer IMEDIATAMENTE)**

#### P1.1 - Rotacionar Todas as Chaves de API Expostas
**Severidade:** CRÍTICA 10/10
**Tempo:** 2 horas
**Impacto:** Prevenir abuso de APIs e roubo de credenciais

**Chaves Expostas em 14+ arquivos:**
```env
NEXT_PUBLIC_ALCHEMY_API_KEY=Y4XuYCtUIN1ArerfvN83lI2IgS8AJQyh (EXPOSTO)
TWITTER_CLIENT_SECRET=h7oxTipPWpJuUQkmzeUJz-L8lawHJzZ9aVzG8vtP-egujPWhWL
FIREBASE_API_KEY=AIzaSyDLczdwnFDempReMc4FIVi7a6RbDVkHduY
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=925c3c3ff15267c5b5ad367984db55cb
```

**Passos:**
1. [ ] Alchemy: https://dashboard.alchemy.com → Create new key
2. [ ] Twitter: https://developer.twitter.com/en/portal → Regenerate secret
3. [ ] Firebase: Firebase Console → Regenerate API key
4. [ ] WalletConnect: https://cloud.walletconnect.com → New project
5. [ ] Atualizar todos os `.env*` com novas chaves
6. [ ] Testar se serviços funcionam
7. [ ] Remover arquivos `.env*` do git history:
```bash
git rm --cached .env*
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env*" \
  --prune-empty -- --all
```

**Arquivos Afetados:**
- `scripts/fix-placeholder-images.js:5`
- `scripts/data-fetching/*.js` (10+ arquivos)
- `.env.local`, `.env.production`
- `KNOWLEDGE-BASE.md`

---

#### P1.2 - Adicionar Verificação de Assinatura nas Funções de Claim
**Severidade:** CRÍTICA 10/10
**Tempo:** 6-8 horas
**Impacto:** Prevenir roubo de recompensas de qualquer jogador

**Problema Atual:**
```typescript
// convex/missions.ts:236-313 - SEM VERIFICAÇÃO
export const claimMission = mutation({
  args: {
    playerAddress: v.string(), // ❌ Qualquer um pode chamar com qualquer endereço
    missionType: v.string(),
  },
  handler: async (ctx, args) => {
    // Sem verificar se o caller possui o wallet!
    await awardCoins(ctx, args.playerAddress, 500);
  },
});
```

**Vetor de Ataque:**
```javascript
// Atacante rouba recompensas de qualquer jogador
await convex.mutation(api.missions.claimMission, {
  playerAddress: "0xVITIM_ADDRESS", // Endereço da vítima
  missionType: "first_pve_win"
});
// Resultado: Rouba 50 coins da vítima
```

**Solução:**
```typescript
export const claimMission = mutation({
  args: {
    playerAddress: v.string(),
    missionType: v.string(),
    signature: v.string(),     // ✅ Novo
    message: v.string(),        // ✅ Novo
    timestamp: v.number(),      // ✅ Novo
  },
  handler: async (ctx, args) => {
    // ✅ Verificar assinatura
    const isValid = await authenticateActionWithBackend(ctx, {
      address: args.playerAddress,
      signature: args.signature,
      message: args.message,
      timestamp: args.timestamp,
    });

    if (!isValid) {
      throw new Error("Invalid signature - you don't own this wallet");
    }

    // Agora seguro para processar
    await awardCoins(ctx, args.playerAddress, 500);
  },
});
```

**Funções para Corrigir:**
1. [ ] `convex/missions.ts:236` - `claimMission()`
2. [ ] `convex/missions.ts:313` - `claimAllMissions()`
3. [ ] `convex/quests.ts:297` - `claimQuestReward()`
4. [ ] `convex/quests.ts:881` - `claimWeeklyReward()`
5. [ ] `convex/achievements.ts` - `claimAchievementReward()`

**Impacto Estimado de Ataque:**
- Atacante individual: **220,000+ coins/semana**
- Ataque organizado: **500,000+ coins**
- Quebra completa do sistema econômico

---

#### P1.3 - Proteger JSON.parse() no OAuth Callback
**Severidade:** CRÍTICA 10/10
**Tempo:** 30 minutos
**Impacto:** Prevenir crash da aplicação

**Arquivo:** `app/api/auth/twitter/callback/route.ts:20`

**Problema:**
```typescript
function decodeState(encoded: string): any {
  const json = Buffer.from(encoded, 'base64url').toString('utf8');
  return JSON.parse(json); // ❌ Sem try-catch
}
```

**Solução:**
```typescript
function decodeState(encoded: string): any {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch (error) {
    throw new Error('Invalid state parameter - corrupted or malformed');
  }
}
```

---

#### P1.4 - Validação Server-Side de Vitórias no Jogo
**Severidade:** CRÍTICA 9/10
**Tempo:** 8-10 horas
**Impacto:** Prevenir geração ilimitada de coins

**Problema Atual:**
```typescript
// convex/economy.ts:562 - CONFIA NO CLIENTE
export const awardPvECoins = mutation({
  args: {
    playerAddress: v.string(),
    difficulty: v.string(),
    won: v.boolean(), // ❌ CLIENTE PODE MENTIR
  },
  handler: async (ctx, args) => {
    if (!args.won) return; // Cliente diz "won: true" sempre

    // Prêmio dado sem verificar se realmente ganhou
    await awardCoins(ctx, args.playerAddress, 120);
  },
});
```

**Vetor de Ataque:**
```javascript
// Atacante ganha coins sem jogar
for (let i = 0; i < 30; i++) {
  await convex.mutation(api.economy.awardPvECoins, {
    playerAddress: "0xATTACKER",
    difficulty: "gigachad",
    won: true, // ❌ FAKE - nunca jogou
  });
}
// Resultado: 30 × 120 = 3,600 coins em segundos
```

**Escala do Ataque:**
- Rate limit: 10 segundos entre chamadas
- Máximo por dia: **1,036,800 coins** (120 × 8,640 calls)

**Solução:**
```typescript
// Opção 1: Validação Server-Side
export const completePvEBattle = mutation({
  args: {
    battleId: v.string(),
    playerAddress: v.string(),
    playerCards: v.array(v.any()),
    opponentCards: v.array(v.any()),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    // ✅ Calcular vencedor no servidor
    const playerPower = calculateTotalPower(args.playerCards);
    const opponentPower = calculateTotalPower(args.opponentCards);
    const won = playerPower > opponentPower;

    // ✅ Verificar ownership das cartas
    const ownedCards = await fetchPlayerNFTs(args.playerAddress);
    for (const card of args.playerCards) {
      if (!ownedCards.some(c => c.tokenId === card.tokenId)) {
        throw new Error(`Card ${card.tokenId} not owned`);
      }
    }

    if (won) {
      await awardCoins(ctx, args.playerAddress, 120, "pve_win");
    }

    return { won, playerPower, opponentPower };
  },
});
```

**Arquivos para Corrigir:**
1. [ ] `convex/economy.ts:562` - `awardPvECoins()`
2. [ ] `convex/economy.ts` - `awardPvPCoins()`

---

#### P1.5 - Corrigir Race Conditions em Claims
**Severidade:** CRÍTICA 8/10
**Tempo:** 3-4 horas
**Impacto:** Prevenir múltiplos claims da mesma recompensa

**Problema:**
```typescript
// Step 1: Checar se já foi claimed
const mission = await ctx.db.query("personalMissions")
  .withIndex("by_player_date")
  .first();

if (mission?.claimed) {
  throw new Error("Already claimed");
}

// ⚠️ RACE CONDITION AQUI
// 10 requests concorrentes passam o check acima

// Step 2: Marcar como claimed
await ctx.db.patch(mission._id, { claimed: true });
await awardCoins(ctx, playerAddress, 500);
// Resultado: Mesmo mission claimed 5-10 vezes
```

**Ataque:**
```javascript
// Enviar 10 requests concorrentes
Promise.all([
  convex.mutation(api.missions.claimMission, { ... }),
  convex.mutation(api.missions.claimMission, { ... }),
  // ... 8 mais
]);
// Resultado: Mesmo mission claimed múltiplas vezes
```

**Solução:**
```typescript
// Adicionar constraint único no schema
// convex/schema.ts
defineTable("claimedMissions")
  .index("unique_claim", ["playerAddress", "missionType", "date"]);

export const claimMission = mutation({
  handler: async (ctx, args) => {
    try {
      // ✅ Operação atômica com unique constraint
      await ctx.db.insert("claimedMissions", {
        playerAddress: args.playerAddress,
        missionType: args.missionType,
        date: getCurrentDate(),
        // Database garante unique (playerAddress, missionType, date)
      });

      await awardCoins(ctx, args.playerAddress, reward);

    } catch (error) {
      if (error.message.includes("duplicate")) {
        throw new Error("Mission already claimed");
      }
      throw error;
    }
  },
});
```

**Arquivos Afetados:**
1. [ ] `convex/missions.ts:236` - `claimMission()`
2. [ ] `convex/quests.ts:297` - `claimQuestReward()`
3. [ ] `convex/quests.ts:881` - `claimWeeklyLeaderboardReward()`

---

#### P1.6 - Validação de Input nas Stats
**Severidade:** CRÍTICA 8/10
**Tempo:** 2-3 horas
**Impacto:** Prevenir manipulação de leaderboard

**Problema:**
```typescript
// convex/profiles.ts:230-271 - SEM VALIDAÇÃO
export const updateStats = mutation({
  args: {
    address: v.string(),
    stats: v.object({
      pveWins: v.optional(v.number()),
      pvpWins: v.optional(v.number()),
      totalPower: v.optional(v.number()),
      // ❌ SEM MIN/MAX
    }),
  },
  handler: async (ctx, args) => {
    // Aceita qualquer valor!
    await ctx.db.patch(profile._id, { stats: args.stats });
  },
});
```

**Ataque:**
```javascript
// Manipular stats para #1 no leaderboard
await convex.mutation(api.profiles.updateStats, {
  address: "0xATTACKER",
  stats: {
    pveWins: 999999,
    pvpWins: 999999,
    totalPower: 999999999,
  }
});
// Resultado: Instant #1 leaderboard + elegível para 1,000 coins semanais
```

**Solução:**
```typescript
export const updateStats = mutation({
  args: {
    address: v.string(),
    stats: v.object({
      pveWins: v.optional(v.number()),
      pvpWins: v.optional(v.number()),
      totalPower: v.optional(v.number()),
    }),
    signature: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // ✅ Verificar signature
    await authenticateActionWithBackend(ctx, args);

    // ✅ Validar ranges
    if (args.stats.pveWins !== undefined) {
      if (args.stats.pveWins < 0 || args.stats.pveWins > 10000) {
        throw new Error("Invalid pveWins value (must be 0-10000)");
      }
    }

    if (args.stats.totalPower !== undefined) {
      if (args.stats.totalPower < 0 || args.stats.totalPower > 1000000) {
        throw new Error("Invalid totalPower value (must be 0-1000000)");
      }
    }

    // ✅ Apenas permitir updates incrementais
    const currentStats = await getCurrentStats(ctx, args.address);
    if (args.stats.pveWins < currentStats.pveWins) {
      throw new Error("Cannot decrease stats");
    }

    await ctx.db.patch(profile._id, { stats: args.stats });
  },
});
```

---

#### P1.7 - Verificar Ownership de NFTs no Defense Deck
**Severidade:** ALTA 7/10
**Tempo:** 3-4 horas
**Impacto:** Prevenir uso de cartas de outros jogadores

**Problema:**
```typescript
// convex/profiles.ts:276-357
export const updateDefenseDeck = mutation({
  args: {
    address: v.string(),
    defenseDeck: v.array(v.any()), // Array de token IDs
  },
  handler: async (ctx, args) => {
    // ❌ SEM VERIFICAR SE USER POSSUI ESSES NFTs
    await ctx.db.patch(profile._id, {
      defenseDeck: args.defenseDeck,
    });
  },
});
```

**Ataque:**
```javascript
// Usar cartas lendárias de qualquer jogador
await convex.mutation(api.profiles.updateDefenseDeck, {
  address: "0xATTACKER",
  defenseDeck: [
    { tokenId: "123", rarity: "legendary" }, // Não possui
    { tokenId: "456", rarity: "legendary" }, // Não possui
  ],
});
// Resultado: Defense deck com cartas mais fortes do jogo sem possuí-las
```

**Solução:**
```typescript
export const updateDefenseDeck = mutation({
  handler: async (ctx, args) => {
    // ✅ Buscar NFTs do Alchemy
    const alchemyKey = process.env.ALCHEMY_API_KEY;
    const response = await fetch(
      `https://base-mainnet.g.alchemy.com/nft/v3/${alchemyKey}/getNFTsForOwner?owner=${args.address}&contractAddresses[]=0xf14c1dc8ce5fe65413379f76c43fa1460c31e728`
    );
    const data = await response.json();
    const ownedTokenIds = data.ownedNfts.map((nft: any) => nft.tokenId);

    // ✅ Verificar que todas as cartas são owned
    for (const card of args.defenseDeck) {
      if (!ownedTokenIds.includes(card.tokenId)) {
        throw new Error(`You don't own token ${card.tokenId}`);
      }
    }

    await ctx.db.patch(profile._id, { defenseDeck: args.defenseDeck });
  },
});
```

---

#### P1.8 - Corrigir Bypass do Daily Cap
**Severidade:** MÉDIA-ALTA 6/10
**Tempo:** 2-3 horas
**Impacto:** Prevenir exceder limite diário de coins

**Problema:**
```typescript
// convex/economy.ts:174-196
const estimatedDailyEarned = (profile.stats?.pveWinsToday || 0) * 30; // ❌ ESTIMA

if (estimatedDailyEarned >= DAILY_CAP) {
  throw new Error("Daily cap reached");
}
```

**Bypass:**
```
Estimativa: 30 gigachad wins × 30 = 900 coins (abaixo do cap)
Real: 30 wins × 150 (com boost de idioma) = 4,500 coins
Resultado: Bypass do cap de 3,500 por 1,000 coins (28% acima)
```

**Solução:**
```typescript
export const awardPvECoins = mutation({
  handler: async (ctx, args) => {
    const profile = await getProfile(ctx, args.playerAddress);

    // ✅ Trackear coins reais ganhos
    const actualDailyEarned = profile.economy?.dailyEarned || 0;

    if (actualDailyEarned >= DAILY_CAP) {
      throw new Error("Daily cap reached");
    }

    const rewardAmount = calculateReward(args);

    // ✅ Atualizar amount real ganho
    await ctx.db.patch(profile._id, {
      "economy.dailyEarned": actualDailyEarned + rewardAmount,
    });

    await awardCoins(ctx, args.playerAddress, rewardAmount);
  },
});
```

---

#### P1.9 - Adicionar Autenticação no Webhook do Farcaster
**Severidade:** CRÍTICA 9/10
**Tempo:** 3-4 horas
**Impacto:** Prevenir injeção de tokens maliciosos

**Problema:**
```typescript
// app/api/farcaster/webhook/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  // ❌ SEM VERIFICAR SIGNATURE
  // ❌ SEM RATE LIMITING
  // ❌ SEM AUTENTICAÇÃO

  const { event, data } = body;

  if (event === 'notifications_enabled') {
    // Salva direto no banco
    await convex.mutation(api.notifications.saveToken, {
      fid: data.fid,
      token: data.notificationDetails.token,
    });
  }
}
```

**Ataque:**
```javascript
// Atacante envia webhook fake
fetch('https://vibemostwanted.xyz/api/farcaster/webhook', {
  method: 'POST',
  body: JSON.stringify({
    event: 'notifications_enabled',
    data: {
      fid: "12345", // FID da vítima
      notificationDetails: {
        token: "attacker_webhook_url",
      }
    }
  })
});
// Resultado: Notificações da vítima redirecionadas para atacante
```

**Solução:**
```typescript
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-farcaster-signature');

    // ✅ Verificar signature do Farcaster
    const webhookSecret = process.env.FARCASTER_WEBHOOK_SECRET;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // ✅ Rate limiting (10 req/min por IP)
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const isRateLimited = await checkRateLimit(ip, 10, 60000);
    if (isRateLimited) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // ✅ Log todas as requests
    await logWebhookRequest(ip, body, signature);

    // Agora seguro para processar
    const { event, data } = body;
    // ... lógica existente
  }
}
```

---

#### P1.10 - Corrigir Segurança do OAuth do Twitter
**Severidade:** ALTA 7/10
**Tempo:** 4-5 horas
**Impacto:** Prevenir hijacking de OAuth

**Problemas:**

1. **State sem HMAC signature**
```typescript
// app/api/auth/twitter/route.ts:10
function encodeState(data: any): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
  // ❌ Base64 simples - não assinado
}
```

2. **Code Verifier exposto ao cliente (CRÍTICO)**
```typescript
// route.ts:57
const stateData = {
  codeVerifier, // ❌ PKCE secret enviado ao cliente
  address,
};
// State visível na URL, histórico do browser, logs
```

3. **Expiração muito longa (10 minutos)**
```typescript
// callback/route.ts:56
if (age > 10 * 60 * 1000) { // ❌ Muito tempo
  throw new Error("State expired");
}
// Padrão: 5 minutos ou menos
```

**Solução:**
```typescript
import crypto from 'crypto';

// ✅ Adicionar HMAC signature
function encodeState(data: any): string {
  const json = JSON.stringify(data);
  const base64 = Buffer.from(json).toString('base64url');

  const secret = process.env.OAUTH_STATE_SECRET;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(base64)
    .digest('base64url');

  return `${base64}.${signature}`;
}

function decodeState(encoded: string): any {
  const [base64, signature] = encoded.split('.');

  // ✅ Verificar signature
  const secret = process.env.OAUTH_STATE_SECRET;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(base64)
    .digest('base64url');

  if (signature !== expectedSignature) {
    throw new Error("Invalid state signature");
  }

  return JSON.parse(Buffer.from(base64, 'base64url').toString());
}

// ✅ Armazenar codeVerifier server-side
export async function GET(req: NextRequest) {
  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(CALLBACK_URL, {
    scope: ['tweet.read', 'users.read'],
  });

  // ✅ Guardar em httpOnly cookie, não no state
  const response = NextResponse.redirect(url);
  response.cookies.set('oauth_verifier', codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 300, // ✅ 5 minutos
  });

  // State contém apenas address + timestamp
  const stateData = { address, timestamp: Date.now() };
  const encodedState = encodeState(stateData);

  return response;
}
```

---

## 📊 CHECKLIST DE SEGURANÇA - FASE 1

**Total Tempo Fase 1:** 24-32 horas

- [ ] **P1.1** - Rotacionar chaves de API (2h)
  - [ ] Alchemy
  - [ ] Twitter OAuth
  - [ ] Firebase
  - [ ] WalletConnect
  - [ ] Remover .env do git history

- [ ] **P1.2** - Adicionar signature verification (6-8h)
  - [ ] `claimMission()`
  - [ ] `claimAllMissions()`
  - [ ] `claimQuestReward()`
  - [ ] `claimWeeklyReward()`
  - [ ] `claimAchievementReward()`

- [ ] **P1.3** - Proteger JSON.parse() (30min)
  - [ ] OAuth callback try-catch

- [ ] **P1.4** - Validação server-side de vitórias (8-10h)
  - [ ] `awardPvECoins()` → `completePvEBattle()`
  - [ ] `awardPvPCoins()` → `completePvPBattle()`
  - [ ] Verificar ownership de cartas

- [ ] **P1.5** - Corrigir race conditions (3-4h)
  - [ ] Schema: unique constraint em claims
  - [ ] `claimMission()` atomic operation
  - [ ] `claimQuestReward()` atomic operation
  - [ ] `claimWeeklyReward()` atomic operation

- [ ] **P1.6** - Validação de stats (2-3h)
  - [ ] `updateStats()` min/max ranges
  - [ ] Signature verification
  - [ ] Incremental-only updates

- [ ] **P1.7** - Verificar NFT ownership (3-4h)
  - [ ] `updateDefenseDeck()` Alchemy check

- [ ] **P1.8** - Corrigir bypass do daily cap (2-3h)
  - [ ] Trackear `dailyEarned` real

- [ ] **P1.9** - Autenticar webhook Farcaster (3-4h)
  - [ ] HMAC signature verification
  - [ ] Rate limiting
  - [ ] Request logging

- [ ] **P1.10** - Corrigir OAuth security (4-5h)
  - [ ] HMAC signature no state
  - [ ] codeVerifier em httpOnly cookie
  - [ ] Reduzir expiration para 5 min

---

## 🛠️ FASE 2: MAIOR - ARQUITETURA (20-28 horas)

### **🟠 ALTA PRIORIDADE - SEMANA 2**

#### P2.1 - Quebrar page.tsx de 7.145 Linhas
**Severidade:** MAIOR
**Tempo:** 8-10 horas
**Impacto:** Manutenibilidade, testabilidade, performance

**Problema:**
```
app/page.tsx (7,145 linhas) contém:
- 134 hooks/state calls
- 20+ useState
- 15+ useEffect
- 3000+ linhas de JSX
- PvE + PvP + Attack mode + Leaderboard + Missions + Audio
```

**Solução:**
```
app/page.tsx (300 linhas) → Container apenas
app/components/game/
  ├─ CardGrid.tsx (400 linhas)
  ├─ BattleArena.tsx (600 linhas)
  ├─ DifficultySelector.tsx (200 linhas)
  └─ GameStats.tsx (200 linhas)
app/components/tabs/
  ├─ LeaderboardTab.tsx (500 linhas)
  ├─ MissionsTab.tsx (400 linhas)
  ├─ AchievementsTab.tsx (400 linhas)
  └─ ProfileTab.tsx (300 linhas)
app/components/pvp/
  ├─ RoomCreator.tsx (300 linhas)
  ├─ RoomListing.tsx (400 linhas)
  └─ MatchmakingQueue.tsx (300 linhas)
```

**Passos:**
1. [ ] Extrair `CardGrid` component
2. [ ] Extrair `BattleArena` component
3. [ ] Extrair `LeaderboardTab` component
4. [ ] Extrair `MissionsTab` component
5. [ ] Extrair `AchievementsTab` component
6. [ ] Extrair `ProfileTab` component
7. [ ] Refatorar `page.tsx` para usar novos componentes

---

#### P2.2 - Adicionar Error Boundaries
**Severidade:** MAIOR
**Tempo:** 2-3 horas
**Impacto:** Prevenir crash da aplicação inteira

**Problema:**
- Nenhum Error Boundary implementado
- 1 erro não tratado → crash da aplicação inteira
- Nenhum recovery mechanism

**Solução:**
```typescript
// components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';

class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-fallback">
          <h2>Algo deu errado</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

**Uso:**
```typescript
// app/layout.tsx
<ErrorBoundary>
  <ConvexProvider>
    <WagmiProvider>
      {children}
    </WagmiProvider>
  </ConvexProvider>
</ErrorBoundary>
```

---

#### P2.3 - Criar Sistema de Error Handling Centralizado
**Severidade:** MAIOR
**Tempo:** 4-6 horas
**Impacto:** Erros consistentes, melhor debugging

**Problema:**
- 243 try-catch blocks com padrões inconsistentes
- Mensagens de erro genéricas ("Server Error")
- Sem logging centralizado

**Solução:**
```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public userMessage?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ErrorCodes = {
  // Auth errors
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',

  // Economy errors
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  DAILY_CAP_REACHED: 'DAILY_CAP_REACHED',
  ALREADY_CLAIMED: 'ALREADY_CLAIMED',

  // Game errors
  INVALID_CARD: 'INVALID_CARD',
  CARD_NOT_OWNED: 'CARD_NOT_OWNED',
} as const;

export const handleError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      error.message,
      'UNKNOWN_ERROR',
      500,
      'Ocorreu um erro inesperado'
    );
  }

  return new AppError(
    'Unknown error',
    'UNKNOWN_ERROR',
    500,
    'Ocorreu um erro inesperado'
  );
};

// lib/logger.ts
import * as Sentry from '@sentry/nextjs';

export const logError = (error: AppError, context?: any) => {
  console.error(`[${error.code}]`, error.message, context);

  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      extra: { code: error.code, ...context },
    });
  }
};
```

**Uso:**
```typescript
try {
  await claimReward();
} catch (error) {
  const appError = handleError(error);
  logError(appError, { userId: user.id });

  if (appError.code === ErrorCodes.ALREADY_CLAIMED) {
    toast.info('Você já reivindicou esta recompensa');
  } else if (appError.code === ErrorCodes.INSUFFICIENT_BALANCE) {
    toast.error('Saldo insuficiente');
  } else {
    toast.error(appError.userMessage || 'Erro desconhecido');
  }
}
```

---

#### P2.4 - Extrair Utility Functions Duplicadas
**Severidade:** MÉDIA
**Tempo:** 3-4 horas
**Impacto:** Reduzir duplicação de 5-8%

**Problemas Identificados:**

1. **Address Normalization (8+ instâncias)**
```typescript
// lib/utils/address.ts
export const normalizeAddress = (address: string): string => {
  if (!address || !address.startsWith('0x') || address.length !== 42) {
    throw new Error('Invalid address format');
  }
  return address.toLowerCase();
};
```

2. **Avatar URL Generation (~50 linhas duplicadas)**
```typescript
// lib/utils/avatar.ts
export const getAvatarUrl = (username: string): string => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
};
```

3. **Date Formatting (6+ instâncias)**
```typescript
// lib/utils/date.ts
export const formatDate = (timestamp: number, locale = 'pt-BR'): string => {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
};

export const formatRelativeTime = (timestamp: number, locale = 'pt-BR'): string => {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diff = Date.now() - timestamp;
  const diffMinutes = Math.floor(diff / 60000);

  if (diffMinutes < 60) return rtf.format(-diffMinutes, 'minute');
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return rtf.format(-diffHours, 'hour');
  const diffDays = Math.floor(diffHours / 24);
  return rtf.format(-diffDays, 'day');
};
```

---

#### P2.5 - Substituir Polling Manual por Reactive Queries
**Severidade:** MÉDIA
**Tempo:** 2-3 horas
**Impacto:** Performance, memory leak prevention

**Problema:**
```typescript
// app/page.tsx
useEffect(() => {
  const interval = setInterval(async () => {
    const leaderboard = await fetchLeaderboard();
    setLeaderboard(leaderboard);
  }, 30000); // Poll a cada 30s

  return () => clearInterval(interval); // Memory leak se cleanup falhar
}, []);
```

**Problemas:**
- Memory leak se cleanup falhar
- Banda desperdiçada (poll mesmo se user navegou)
- Carga no servidor (todos os clientes polling)

**Solução:**
```typescript
// Usar Convex reactive queries (sem polling)
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

const LeaderboardTab = () => {
  // ✅ Atualiza automaticamente quando dados mudam
  // ✅ Sem polling, usa WebSocket
  const leaderboard = useQuery(api.profiles.getLeaderboard, { limit: 100 });

  if (!leaderboard) {
    return <Spinner />;
  }

  return (
    <div>
      {leaderboard.map(player => (
        <LeaderboardRow key={player.address} player={player} />
      ))}
    </div>
  );
};
```

---

#### P2.6 - Corrigir Excesso de !important no CSS
**Severidade:** MÉDIA
**Tempo:** 4-6 horas
**Impacto:** CSS maintainability

**Problema:**
- 56 instâncias de `!important` no código
- Indica problemas na cascata CSS
- CSS frágil, difícil de sobrescrever

**Solução:**
1. [ ] Auditar todos os `!important`
2. [ ] Refatorar para usar CSS specificity correta
3. [ ] Usar CSS modules ou Tailwind de forma consistente
4. [ ] Remover `!important` desnecessários

**Exemplo de Refactor:**
```css
/* Antes - CSS frágil */
.button {
  background: blue !important;
  color: white !important;
}

/* Depois - CSS proper specificity */
.game-section .button-primary {
  background: var(--color-primary);
  color: var(--color-text-light);
}
```

---

#### P2.7 - Reduzir Console Logging em Produção
**Severidade:** MÉDIA
**Tempo:** 2-3 horas
**Impacto:** Security, performance

**Problema:**
- 247 console statements no código
- Logs em produção podem expor info sensível
- Poluição do console

**Solução:**
```typescript
// lib/utils/logger.ts (já existe, mas precisa usar)
export const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

export const devError = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(...args);
  }
};

export const devWarn = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(...args);
  }
};
```

**Tarefa:**
1. [ ] Substituir todos os `console.log` por `devLog`
2. [ ] Substituir todos os `console.error` por `devError`
3. [ ] Substituir todos os `console.warn` por `devWarn`
4. [ ] Adicionar lint rule para prevenir novos console.log

---

#### P2.8 - Corrigir Algoritmo de Embaralhamento
**Severidade:** BAIXA-MÉDIA ⚠️ (rebaixado após feedback do usuário)
**Tempo:** 1-2 horas
**Impacto:** Melhorar variedade de cards (não afeta balanceamento)

**Nota:** Originalmente marcado como ALTA, mas após análise, o balanceamento de dificuldade está correto (por poder). O problema é apenas que alguns cards dentro do mesmo tier podem aparecer mais que outros.

**Problema:**
```typescript
// Múltiplos arquivos usando sort com Math.random() - 0.5
pickedCards = weakest.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
```

**Arquivos Afetados:**
- `app/page.tsx`: Linhas 1630, 1637, 1644, 1649, 1666, 1761, 1775, 1783, 1797, 1817
- `hooks/useBattleOptimizations.ts`: Linhas 34, 43, 52, 59, 234
- `hooks/useCardCalculations.ts`: Linha 154

**Solução:**
```typescript
// lib/utils/shuffle.ts
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

**Uso:**
```typescript
// Substituir todos os .sort(() => Math.random() - 0.5)
pickedCards = shuffle(weakest).slice(0, HAND_SIZE);
```

---

## 📊 CHECKLIST - FASE 2

**Total Tempo Fase 2:** 20-28 horas

- [ ] **P2.1** - Quebrar page.tsx (8-10h)
  - [ ] Extrair CardGrid
  - [ ] Extrair BattleArena
  - [ ] Extrair LeaderboardTab
  - [ ] Extrair MissionsTab
  - [ ] Extrair AchievementsTab
  - [ ] Extrair ProfileTab

- [ ] **P2.2** - Error Boundaries (2-3h)
  - [ ] Criar ErrorBoundary component
  - [ ] Integrar com Sentry
  - [ ] Adicionar fallback UI

- [ ] **P2.3** - Error handling centralizado (4-6h)
  - [ ] Criar AppError class
  - [ ] Criar error codes
  - [ ] Criar logger
  - [ ] Refatorar try-catch blocks

- [ ] **P2.4** - Extrair utilities (3-4h)
  - [ ] normalizeAddress()
  - [ ] getAvatarUrl()
  - [ ] formatDate()
  - [ ] formatRelativeTime()

- [ ] **P2.5** - Reactive queries (2-3h)
  - [ ] Substituir polling por useQuery
  - [ ] Remover setInterval patterns

- [ ] **P2.6** - Refatorar CSS (4-6h)
  - [ ] Auditar !important
  - [ ] Refatorar specificity
  - [ ] Remover !important

- [ ] **P2.7** - Console logging (2-3h)
  - [ ] Substituir por devLog
  - [ ] Adicionar lint rule

- [ ] **P2.8** - Shuffle algorithm (1-2h)
  - [ ] Criar função Fisher-Yates
  - [ ] Substituir em 15+ locais

---

## 🧪 FASE 3: TESTES (16-24 horas)

### **🟡 SIGNIFICATIVO - SEMANA 2-3**

**Status Atual:**
- 2 testes E2E apenas (Playwright)
- **0 testes unitários**
- **0 testes de integração**
- Coverage: ~2.4%

**Meta:** 70%+ coverage

#### P3.1 - Testes de Economia (CRÍTICO)
**Tempo:** 4-6 horas
**Prioridade:** ALTA

```typescript
// convex/economy.test.ts
describe('Economy System', () => {
  describe('awardPvECoins', () => {
    it('should award 120 coins for gigachad win', async () => {
      const result = await awardPvECoins({
        playerAddress: '0xtest',
        difficulty: 'gigachad',
        won: true,
      });

      expect(result.coinsAwarded).toBe(120);
    });

    it('should enforce daily cap of 3500 coins', async () => {
      // Award 3400 coins
      for (let i = 0; i < 28; i++) {
        await awardPvECoins({ difficulty: 'gigachad', won: true });
      }

      // Try to award 200 more (would exceed cap)
      await expect(awardPvECoins({ difficulty: 'gigachad', won: true }))
        .rejects.toThrow('Daily cap reached');
    });

    it('should prevent negative balance', async () => {
      await expect(spendCoins(100))
        .rejects.toThrow('Insufficient balance');
    });
  });

  describe('Mission Claims', () => {
    it('should prevent claiming same mission twice', async () => {
      await claimMission({ missionType: 'first_pve_win' });

      await expect(claimMission({ missionType: 'first_pve_win' }))
        .rejects.toThrow('Already claimed');
    });

    it('should prevent race condition on concurrent claims', async () => {
      // 10 concurrent requests
      const promises = Array(10).fill(null).map(() =>
        claimMission({ missionType: 'first_pve_win' })
      );

      const results = await Promise.allSettled(promises);

      // Only 1 should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful).toHaveLength(1);
    });
  });
});
```

**Testes para Criar:**
1. [ ] `awardPvECoins()` - 8 test cases
2. [ ] `awardPvPCoins()` - 6 test cases
3. [ ] `claimMission()` - 5 test cases
4. [ ] `claimQuestReward()` - 5 test cases
5. [ ] `spendCoins()` - 4 test cases

---

#### P3.2 - Testes de Achievements
**Tempo:** 3-4 horas
**Prioridade:** ALTA

```typescript
// convex/achievements.test.ts
describe('Achievement Detection', () => {
  it('should detect "Own 5 Legendary Cards"', () => {
    const nfts = [
      { rarity: 'legendary' },
      { rarity: 'legendary' },
      { rarity: 'legendary' },
      { rarity: 'legendary' },
      { rarity: 'legendary' },
    ];

    const achievements = checkAchievements(nfts);

    expect(achievements).toContainEqual({
      id: 'legendary_collector_5',
      unlocked: true,
    });
  });

  it('should detect "Win 100 PvE Battles"', async () => {
    const profile = {
      stats: { pveWins: 100 },
    };

    const achievements = await checkAchievements(profile);

    expect(achievements).toContainEqual({
      id: 'pve_master_100',
      unlocked: true,
    });
  });

  it('should not unlock achievement with 4/5 legendary cards', () => {
    const nfts = [
      { rarity: 'legendary' },
      { rarity: 'legendary' },
      { rarity: 'legendary' },
      { rarity: 'legendary' },
      { rarity: 'common' },
    ];

    const achievements = checkAchievements(nfts);

    expect(achievements).not.toContainEqual({
      id: 'legendary_collector_5',
      unlocked: true,
    });
  });
});
```

**Testes para Criar:**
1. [ ] Legendary card achievements - 3 test cases
2. [ ] Win streak achievements - 4 test cases
3. [ ] Total power achievements - 3 test cases
4. [ ] Special achievements - 5 test cases

---

#### P3.3 - Testes de Profile CRUD
**Tempo:** 2-3 horas
**Prioridade:** MÉDIA

```typescript
// convex/profiles.integration.test.ts
describe('Profile CRUD', () => {
  it('should create profile and initialize economy', async () => {
    const result = await upsertProfile({
      address: '0xtest',
      username: 'testuser',
    });

    expect(result.economy.balance).toBe(100); // Welcome bonus
    expect(result.username).toBe('testuser');
  });

  it('should prevent duplicate usernames', async () => {
    await upsertProfile({ username: 'taken' });

    await expect(upsertProfile({ username: 'taken' }))
      .rejects.toThrow('Username already taken');
  });

  it('should update defense deck', async () => {
    const cards = [{ tokenId: '123' }, { tokenId: '456' }];

    const result = await updateDefenseDeck({
      address: '0xtest',
      defenseDeck: cards,
    });

    expect(result.defenseDeck).toEqual(cards);
  });
});
```

---

#### P3.4 - Testes de Componentes React
**Tempo:** 6-8 horas
**Prioridade:** MÉDIA

```typescript
// components/QuestPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestPanel } from './QuestPanel';

describe('QuestPanel', () => {
  it('should display daily quest', () => {
    const mockQuests = [
      { id: 'daily_1', title: 'Win 5 PvE Battles', progress: 2, target: 5 },
    ];

    render(<QuestPanel quests={mockQuests} />);

    expect(screen.getByText('Win 5 PvE Battles')).toBeInTheDocument();
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  it('should call claimReward when clicking claim button', async () => {
    const mockClaim = jest.fn();
    const mockQuests = [
      { id: 'daily_1', title: 'Quest', progress: 5, target: 5, completed: true },
    ];

    render(<QuestPanel quests={mockQuests} onClaim={mockClaim} />);

    fireEvent.click(screen.getByText('Claim Reward'));

    expect(mockClaim).toHaveBeenCalledWith('daily_1');
  });

  it('should disable claim button when not completed', () => {
    const mockQuests = [
      { id: 'daily_1', progress: 2, target: 5, completed: false },
    ];

    render(<QuestPanel quests={mockQuests} />);

    const button = screen.getByText('Claim Reward');
    expect(button).toBeDisabled();
  });
});
```

**Componentes para Testar:**
1. [ ] `QuestPanel` - 5 test cases
2. [ ] `CardGrid` - 6 test cases
3. [ ] `BattleArena` - 8 test cases
4. [ ] `DifficultyModal` - 4 test cases
5. [ ] `LeaderboardRow` - 3 test cases

---

#### P3.5 - Testes E2E - Fluxo Completo
**Tempo:** 4-6 horas
**Prioridade:** MÉDIA

```typescript
// e2e/pve-battle.spec.ts
import { test, expect } from '@playwright/test';

test('should complete full PvE battle flow', async ({ page }) => {
  await page.goto('/');

  // Connect wallet
  await page.click('[data-testid="connect-wallet"]');
  await page.waitForSelector('[data-testid="wallet-connected"]');

  // Select difficulty
  await page.click('[data-testid="difficulty-gigachad"]');

  // Wait for battle to complete
  await page.waitForSelector('[data-testid="battle-result"]', { timeout: 10000 });

  // Verify result
  const result = await page.textContent('[data-testid="battle-result"]');
  expect(result).toMatch(/You (Won|Lost)/);

  // Verify coins awarded (if won)
  const balance = await page.textContent('[data-testid="coin-balance"]');
  const balanceNum = parseInt(balance?.replace(/[^0-9]/g, '') || '0');
  expect(balanceNum).toBeGreaterThan(100); // Should have welcome bonus + any wins
});

test('should claim mission reward', async ({ page }) => {
  await page.goto('/');

  // Navigate to missions tab
  await page.click('[data-testid="missions-tab"]');

  // Click claim on completed mission
  await page.click('[data-testid="claim-mission-first-win"]');

  // Verify success toast
  await expect(page.locator('.toast-success')).toContainText('Mission claimed!');

  // Verify balance increased
  const newBalance = await page.textContent('[data-testid="coin-balance"]');
  expect(parseInt(newBalance || '0')).toBeGreaterThan(0);
});
```

---

## 📊 CHECKLIST - FASE 3

**Total Tempo Fase 3:** 16-24 horas

- [ ] **P3.1** - Testes de economia (4-6h)
  - [ ] awardPvECoins tests
  - [ ] awardPvPCoins tests
  - [ ] Mission claim tests
  - [ ] Quest claim tests
  - [ ] Spend coins tests

- [ ] **P3.2** - Testes de achievements (3-4h)
  - [ ] Card collection achievements
  - [ ] Win streak achievements
  - [ ] Power achievements
  - [ ] Special achievements

- [ ] **P3.3** - Testes de profile (2-3h)
  - [ ] Profile creation
  - [ ] Username validation
  - [ ] Defense deck update
  - [ ] Stats update

- [ ] **P3.4** - Testes de componentes (6-8h)
  - [ ] QuestPanel
  - [ ] CardGrid
  - [ ] BattleArena
  - [ ] DifficultyModal
  - [ ] LeaderboardRow

- [ ] **P3.5** - Testes E2E (4-6h)
  - [ ] PvE battle flow
  - [ ] Mission claim flow
  - [ ] Profile creation flow
  - [ ] PvP matchmaking flow

---

## 🔧 FASE 4: QUALIDADE & INFRAESTRUTURA (12-18 horas)

### **🟡-🔵 MÉDIO-BAIXO - SEMANA 3+**

#### P4.1 - Substituir Tipos `any` por TypeScript Adequado
**Tempo:** 3-4 horas
**Prioridade:** MÉDIA

**Arquivos com `any`:**
- `app/api/auth/twitter/route.ts:10` - `encodeState(data: any)`
- `app/page.tsx:87, 116` - `(window as any)`
- `components/AchievementsView.tsx:8` - `nfts?: any[]`
- `convex/schema.ts` - 15+ `v.any()`
- `convex/profiles.ts` - Linhas 259, 324, 348

**Solução:**
```typescript
// Antes
function encodeState(data: any): string { }

// Depois
interface OAuthState {
  address: string;
  timestamp: number;
  redirectUrl?: string;
}

function encodeState(data: OAuthState): string { }

// Antes
attributes: v.any()

// Depois
attributes: v.object({
  rarity: v.string(),
  wear: v.string(),
  foil: v.optional(v.string()),
  power: v.number(),
})

// Antes
(window as any).globalAudioManager

// Depois
declare global {
  interface Window {
    globalAudioManager?: AudioManager;
    webkitAudioContext?: typeof AudioContext;
  }
}

window.globalAudioManager
```

---

#### P4.2 - Corrigir Firebase Database Rules
**Tempo:** 2-3 horas
**Prioridade:** MÉDIA

**Problema Atual:**
```json
{
  "rules": {
    "profiles": {
      "$address": {
        ".read": true, // ❌ TODOS podem ler TODOS os profiles
        ".write": "newData.hasChildren(['address', 'username'])"
      }
    }
  }
}
```

**Impacto:**
- Enumeração completa de users
- Todas as stats visíveis
- Histórico de matchs público
- Zero privacidade

**Solução:**
```json
{
  "rules": {
    "profiles": {
      "$address": {
        ".read": "auth.uid === $address", // ✅ Apenas owner
        ".write": "auth.uid === $address && newData.hasChildren(['address', 'username'])"
      }
    },
    "usernames": {
      ".read": "auth != null", // ✅ Apenas autenticados
      ".write": "auth != null"
    },
    "playerMatches": {
      "$address": {
        ".read": "auth.uid === $address", // ✅ Apenas owner
        ".write": false // ✅ Apenas via backend
      }
    },
    "leaderboard": {
      ".read": "auth != null", // ✅ Public for authenticated
      ".write": false // ✅ Backend only
    }
  }
}
```

---

#### P4.3 - Criar Backend RPC Proxy para Alchemy
**Tempo:** 2-3 horas
**Prioridade:** MÉDIA

**Problema:**
```env
# .env.local
NEXT_PUBLIC_ALCHEMY_API_KEY=Y4XuYCtUIN1ArerfvN83lI2IgS8AJQyh
# ❌ NEXT_PUBLIC_ expõe no browser JavaScript
```

**Solução:**
```typescript
// app/api/rpc/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_METHODS = [
  'eth_call',
  'eth_getBalance',
  'eth_getTransactionCount',
  'alchemy_getNFTsForOwner',
];

export async function POST(req: NextRequest) {
  try {
    const { method, params } = await req.json();

    // ✅ Whitelist de métodos permitidos
    if (!ALLOWED_METHODS.includes(method)) {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 403 }
      );
    }

    // ✅ Private key, não exposta ao client
    const alchemyKey = process.env.ALCHEMY_API_KEY; // Sem NEXT_PUBLIC_

    const response = await fetch(
      `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
          id: 1,
        }),
      }
    );

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json(
      { error: 'RPC request failed' },
      { status: 500 }
    );
  }
}
```

**Frontend:**
```typescript
// lib/rpc.ts
export const rpcCall = async (method: string, params: any[]) => {
  const response = await fetch('/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  });

  if (!response.ok) {
    throw new Error('RPC call failed');
  }

  return response.json();
};

// Uso
const balance = await rpcCall('eth_getBalance', ['0x123...', 'latest']);
```

---

#### P4.4 - Adicionar Performance Optimizations
**Tempo:** 4-6 horas
**Prioridade:** BAIXA

**Tasks:**

1. **React.memo em componentes**
```typescript
const CardComponent = React.memo(({ card, onSelect }) => {
  return (
    <div className="card" onClick={() => onSelect(card.id)}>
      {/* ... */}
    </div>
  );
}, (prevProps, nextProps) => {
  // Re-render apenas se card mudou
  return prevProps.card.id === nextProps.card.id &&
         prevProps.card.selected === nextProps.card.selected;
});
```

2. **Lazy loading de tabs**
```typescript
const LeaderboardTab = React.lazy(() => import('./tabs/LeaderboardTab'));
const AchievementsTab = React.lazy(() => import('./tabs/AchievementsTab'));

<Suspense fallback={<Spinner />}>
  {activeTab === 'leaderboard' && <LeaderboardTab />}
  {activeTab === 'achievements' && <AchievementsTab />}
</Suspense>
```

3. **Bundle size analysis**
```bash
npm install --save-dev @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

# Run
ANALYZE=true npm run build
```

---

#### P4.5 - Integrar Error Logging (Sentry)
**Tempo:** 3-4 horas
**Prioridade:** MÉDIA

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,

  beforeSend(event, hint) {
    // Redact sensitive data
    if (event.request?.headers) {
      delete event.request.headers.authorization;
    }
    return event;
  },
});

// lib/logger.ts
export const logError = (error: Error, context?: any) => {
  console.error(error, context);

  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      extra: context,
    });
  }
};
```

---

#### P4.6 - Corrigir Bugs Conhecidos Restantes
**Tempo:** 3-4 horas
**Prioridade:** MÉDIA

**Bugs Pendentes:**
- [ ] Bug #4: Attack System Freeze (game logic)
- [ ] Bug #3: Tutorial Blocking Navigation (UI overlap)
- [ ] Bug #2: Race Condition (state sync) ← Já tratado em P1.5
- [ ] Bug #1: PvE Difficulty State (game mode)

---

## 📊 CHECKLIST - FASE 4

**Total Tempo Fase 4:** 12-18 horas

- [ ] **P4.1** - Substituir tipos `any` (3-4h)
  - [ ] API routes
  - [ ] window types
  - [ ] Convex schema
  - [ ] Components

- [ ] **P4.2** - Firebase rules (2-3h)
  - [ ] Profiles read/write
  - [ ] Usernames access
  - [ ] Matches privacy
  - [ ] Leaderboard public

- [ ] **P4.3** - RPC proxy (2-3h)
  - [ ] Create /api/rpc
  - [ ] Whitelist methods
  - [ ] Update frontend

- [ ] **P4.4** - Performance (4-6h)
  - [ ] React.memo
  - [ ] Lazy loading
  - [ ] Bundle analysis

- [ ] **P4.5** - Sentry (3-4h)
  - [ ] Install & configure
  - [ ] Error boundaries integration
  - [ ] Sensitive data redaction

- [ ] **P4.6** - Bug fixes (3-4h)
  - [ ] Bug #4: Attack freeze
  - [ ] Bug #3: Tutorial blocking
  - [ ] Bug #1: Difficulty state

---

## 📈 RESUMO DO PLANO

### **Tempo Total Estimado**

| Fase | Descrição | Tempo | Prioridade |
|------|-----------|-------|------------|
| **Fase 1** | Segurança Crítica | 24-32h | 🔴 URGENTE |
| **Fase 2** | Arquitetura & Refatoração | 20-28h | 🟠 ALTA |
| **Fase 3** | Testes | 16-24h | 🟡 SIGNIFICATIVA |
| **Fase 4** | Qualidade & Infraestrutura | 12-18h | 🟡-🔵 MÉDIA |
| **TOTAL** | | **72-102h** | |

### **Roadmap Sugerido**

**Semana 1 (40h):**
- Fase 1: Segurança Crítica (24-32h) ← URGENTE
- Fase 2: Parte 1 (8-10h) - Error boundaries + page.tsx refactor

**Semana 2 (30h):**
- Fase 2: Parte 2 (12-18h) - Error handling + utilities
- Fase 3: Parte 1 (10-12h) - Economy + Achievement tests

**Semana 3 (30h):**
- Fase 3: Parte 2 (6-12h) - Component + E2E tests
- Fase 4: Completa (12-18h) - Quality improvements

---

## 🎯 MILESTONES E CHECKPOINTS

### **Milestone 1 - Segurança Básica (Dia 2-3)**
- [ ] Todas as chaves de API rotacionadas
- [ ] Signature verification em claims implementada
- [ ] Race conditions corrigidas
- [ ] ✅ **Resultado:** Sistema não pode ser explorado economicamente

### **Milestone 2 - Segurança Completa (Dia 5-7)**
- [ ] Server-side battle validation
- [ ] OAuth security hardened
- [ ] Webhook authentication
- [ ] ✅ **Resultado:** Todas vulnerabilidades críticas resolvidas

### **Milestone 3 - Arquitetura (Dia 10-12)**
- [ ] page.tsx refatorado
- [ ] Error boundaries implementados
- [ ] Error handling centralizado
- [ ] ✅ **Resultado:** Codebase manutenível e testável

### **Milestone 4 - Testes (Dia 15-18)**
- [ ] Economy tests completos
- [ ] Achievement tests completos
- [ ] Component tests básicos
- [ ] ✅ **Resultado:** 60%+ code coverage

### **Milestone 5 - Produção (Dia 20-21)**
- [ ] Todos os testes passando
- [ ] Performance optimizations
- [ ] Sentry integrado
- [ ] ✅ **Resultado:** Pronto para produção

---

## 📋 CHECKLIST FINAL - PRONTO PARA PRODUÇÃO

### **Segurança** ✅
- [ ] Todas as chaves de API rotacionadas
- [ ] .env removido do git history
- [ ] Signature verification em todas as mutations críticas
- [ ] Race conditions resolvidas
- [ ] Server-side battle validation
- [ ] NFT ownership verification
- [ ] OAuth security hardened
- [ ] Webhook authentication
- [ ] Firebase rules restritivas

### **Arquitetura** ✅
- [ ] page.tsx < 500 linhas
- [ ] Todos os componentes separados
- [ ] Error boundaries implementados
- [ ] Error handling centralizado
- [ ] Utilities extraídas
- [ ] Sem polling manual
- [ ] Sem excesso de !important

### **Testes** ✅
- [ ] Economy tests (60%+ coverage)
- [ ] Achievement tests (70%+ coverage)
- [ ] Profile tests (60%+ coverage)
- [ ] Component tests (principais componentes)
- [ ] E2E tests (fluxos críticos)
- [ ] Overall coverage > 60%

### **Qualidade** ✅
- [ ] Zero tipos `any` em código crítico
- [ ] Console logs substituídos por devLog
- [ ] Shuffle algorithm correto
- [ ] Firebase rules seguras
- [ ] RPC proxy implementado
- [ ] Sentry integrado
- [ ] Bugs conhecidos resolvidos

### **Performance** ✅
- [ ] React.memo em componentes grandes
- [ ] Lazy loading de tabs
- [ ] Bundle size < 1MB
- [ ] Lighthouse score > 90

---

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

### **HOJE (2-3 horas)**
1. [ ] Rotacionar TODAS as chaves de API
2. [ ] Remover .env do git history
3. [ ] Deploy versão com novas chaves
4. [ ] Verificar que tudo funciona

### **DIA 1-2 (8-10 horas)**
1. [ ] P1.2 - Signature verification em claims
2. [ ] P1.3 - Proteger JSON.parse()
3. [ ] P1.5 - Corrigir race conditions

### **DIA 3-5 (12-16 horas)**
1. [ ] P1.4 - Server-side battle validation
2. [ ] P1.6 - Validação de stats
3. [ ] P1.7 - NFT ownership verification

---

## 💰 ROI ESTIMADO

**Investimento:**
- Tempo: 72-102 horas
- Custo (assumindo $50/hora): $3,600 - $5,100

**Retorno:**
- Previne perda econômica ilimitada (impossível quantificar)
- Reduz tempo de debugging em 40% (~16h/mês → ~9.6h/mês)
- Economia: 6.4h/mês × $50 = $320/mês
- **Payback: ~11-16 meses apenas em tempo de debug**
- **Valor real: Prevenir exploit econômico = PRICELESS**

**Benefícios Intangíveis:**
- Confiança do usuário
- Facilita onboarding de novos developers
- Menos bugs em produção
- Faster feature development

---

## 📞 PERGUNTAS FREQUENTES

**Q: Preciso fazer tudo de uma vez?**
A: Não. Fase 1 (Segurança) é URGENTE. Fases 2-4 podem ser iterativas.

**Q: Posso pular os testes?**
A: NÃO recomendado. Sem testes, refatoração é arriscado. Mínimo: testes de economia.

**Q: Quanto tempo até produção?**
A: Com Fase 1 completa: pode ir para produção com risco reduzido (1 semana). Ideal: 3 semanas para tudo.

**Q: Posso fazer em sprints?**
A: Sim! Sprint 1 (Segurança), Sprint 2 (Arquitetura), Sprint 3 (Testes + Quality).

---

**Documento criado:** 2025-11-06
**Última atualização:** 2025-11-06
**Versão:** 1.0
**Próxima revisão:** Após Milestone 2
