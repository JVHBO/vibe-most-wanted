# Sessão de Melhorias - 2025-10-24

## Commits Feitos (Todos pushados para GitHub)

### 1. Commit `fad5279` - Fix PvE Battle Modal
**Problema**: Ao clicar em "Play vs AI" pela primeira vez, voltava para tela principal e só funcionava na segunda tentativa.

**Causa**: Botão chamava `playHand()` diretamente, mas essa função precisa de 5 cartas selecionadas primeiro.

**Fix**:
- Botão agora abre o modal de seleção de cartas PvE (`setShowPveCardSelection(true)`)
- Adicionado botão "Sort by Power" no modal de seleção PvE
- Novo estado: `pveSortByPower`
- Novo `useMemo`: `sortedPveNfts`

**Arquivos**: `app/page.tsx` (linhas 3256-3260, 1418, 1998-2002, 2840, 2876-2891)

---

### 2. Commit `2abc8d7` - GIGACHAD Difficulty Fix
**Problema**: GIGACHAD não estava pegando as 5 cartas mais fortes, estava pegando aleatoriamente das top 5.

**Fix**:
- Mudou de `for loop` com random para `sorted.slice(0, HAND_SIZE_CONST)`
- GIGACHAD agora pega EXATAMENTE as top 5 mais fortes (sem aleatoriedade)
- Atualizada descrição: "EXACTLY top 5 strongest (MAX POWER)"

**Arquivos**: `app/page.tsx` (linhas 1848-1851, 2919, 3266)

---

### 3. Commit `b34af72` - Refactor All AI Difficulties
**Problema**: GOONER (medium) tinha lógica bugada que podia causar duplicatas.

**Fix**:
```typescript
// GEY (easy): 5 random cards
pickedDealer = shuffled.slice(0, HAND_SIZE_CONST);

// GOONER (medium): 3 from top 7 + 2 random
const strongCards = sorted.slice(0, 7);
const shuffledStrong = [...strongCards].sort(() => Math.random() - 0.5);
pickedDealer = shuffledStrong.slice(0, 3);
// + 2 random from remaining

// GIGACHAD (hard): EXACTLY top 5
pickedDealer = sorted.slice(0, HAND_SIZE_CONST);
```

**Arquivos**: `app/page.tsx` (linhas 1828-1854, 2919-2921, 3266-3268)

---

### 4. Commit `fc2d049` - Admin 40 Attacks (NÃO DEPLOYADO)
**Feature**: Admin tem 40 ataques/dia, outros jogadores continuam com 3.

**Implementação**:
```typescript
const ADMIN_WALLET = '0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52';
const MAX_ATTACKS_DEFAULT = 3;
const MAX_ATTACKS_ADMIN = 40;

const getMaxAttacks = (walletAddress: string | null): number => {
  if (!walletAddress) return MAX_ATTACKS_DEFAULT;
  return walletAddress.toLowerCase() === ADMIN_WALLET.toLowerCase()
    ? MAX_ATTACKS_ADMIN
    : MAX_ATTACKS_DEFAULT;
};
```

**Mudanças**:
- Novo `useMemo`: `maxAttacks = getMaxAttacks(address)`
- UI mostra limite dinâmico: `{attacksRemaining}/{maxAttacks}`
- Alert usa limite dinâmico: `You have used all ${maxAttacks} attacks...`
- useEffect reseta para `maxAttacks` (não mais hardcoded 3)

**Arquivos**: `app/page.tsx` (linhas 16-26, 1437-1440, 2309, 2312, 4220, 4292)

---

## Status do Deploy

❌ **BLOQUEADO**: Vercel atingiu limite de 100 deploys gratuitos/dia
⏳ **Tempo**: Esperar 7 minutos (desde ~última tentativa)
✅ **GitHub**: Todos os commits estão no repositório
📦 **Último deploy bem-sucedido**: `https://vibe-most-wanted-kt8i7i1te-joaovitorhbos-projects.vercel.app` (commit b34af72)

**Commits pendentes de deploy**:
- `fc2d049` (Admin 40 attacks)
- `888fea1` (Session summary doc)
- `f374c1a` (Mobile optimizations)

---

### 5. Commit `f374c1a` - Mobile Optimizations (NÃO DEPLOYADO)
**Feature**: Otimizações completas do layout para mobile/Farcaster miniapp.

**Problemas identificados no mobile**:
1. Título muito grande
2. Conteúdo cortado embaixo
3. Botões ocupando muito espaço
4. Tabela do leaderboard com colunas cortadas
5. Textos muito pequenos ou muito grandes

**Otimizações do Header**:
```typescript
// Título
className="text-3xl md:text-5xl lg:text-6xl"  // Antes: text-5xl lg:text-6xl

// Gaps e padding
className="gap-3 md:gap-6 mb-4 md:mb-8 p-3 md:p-6"  // Antes: gap-6 mb-8 p-6

// Botão "Buy Cards"
<span className="hidden md:inline">BUY CARDS ON VIBE MARKET</span>
<span className="md:hidden">Buy Cards</span>
```

**Otimizações dos Botões de Navegação**:
```typescript
// Tabs (Vibe Most Wanted, Settings, Leaderboard)
className="px-2 md:px-6 py-2 md:py-3"  // Antes: px-6 py-3
className="text-xs md:text-base"  // Antes: (sem classe)

// Esconde texto no mobile, mostra só ícones
<span className="hidden sm:inline">{t('title')}</span>
```

**Otimizações da Tabela do Leaderboard**:
```typescript
// Header
className="p-2 md:p-4 text-xs md:text-base"  // Antes: p-4

// Esconde colunas no mobile
<th className="hidden md:table-cell">Opened</th>  // Esconde < md
<th className="hidden lg:table-cell">{t('wins')}</th>  // Esconde < lg
<th className="hidden lg:table-cell">{t('losses')}</th>  // Esconde < lg
<th className="hidden sm:table-cell">Actions</th>  // Esconde < sm

// Células de dados
className="p-2 md:p-4"  // Antes: p-4
className="text-xs md:text-base"  // Responsivo
className="text-base md:text-xl"  // Power column

// Esconde endereço wallet em telas pequenas
className="hidden sm:block"  // Para o endereço
```

**Resultado**:
- ✅ Todo o conteúdo cabe na tela mobile
- ✅ Não há mais corte de texto
- ✅ Leaderboard mostra apenas colunas essenciais: Rank, Player, Power
- ✅ Textos legíveis em todos os tamanhos de tela
- ✅ Layout compacto mas funcional
- ✅ Otimizado para Farcaster miniapp

**Arquivos**: `app/page.tsx` (linhas 3818-3842, 3855-3857, 3919-3957, 4210-4274)

---

## Como fazer deploy quando liberado

```bash
cd vibe-most-wanted
vercel --prod
```

---

## Resumo das Melhorias

✅ **PvE Battle**: Corrigido bug do primeiro clique
✅ **Sort Button**: Adicionado ordenação por poder no modal PvE
✅ **GIGACHAD**: Agora pega EXATAMENTE top 5 (não aleatório)
✅ **GOONER**: Corrigida lógica (3 das top 7 + 2 random)
✅ **GEY**: Mantido 5 random
✅ **Admin Attacks**: 40 ataques/dia para 0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52
✅ **Descrições**: Todas as dificuldades com descrições corretas
✅ **Mobile/Farcaster**: Layout completamente otimizado para mobile
  - Header menor e mais compacto
  - Botões responsivos (só ícones no mobile)
  - Leaderboard com colunas escondidas no mobile
  - Todo conteúdo cabe na tela sem cortes

---

## Próximos Passos

1. ⏳ Esperar liberação do Vercel (~10 minutos restantes)
2. 🚀 Deploy do commit `fc2d049`
3. 🖼️ Melhorias na versão Farcaster (aguardando mobile.jpg do usuário)

---

## Dados Técnicos

**JC Deck**: 617 cartas reveladas salvas em `jc-cards-revealed.json`
- Common: 402
- Rare: 161
- Epic: 53
- Legendary: 1

**Dificuldades**:
- GEY 🏳️‍🌈: 100% aleatório
- GOONER 💀: 3 das top 7 + 2 random
- GIGACHAD 💪: EXATAMENTE top 5

**Admin Wallet**: 0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52
**Max Attacks**: Admin=40, Default=3
