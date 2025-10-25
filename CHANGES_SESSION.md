# Sessão de Otimizações - JC Deck Loading

## ⚠️ INFORMAÇÕES CRÍTICAS - NÃO MODIFICAR

### Wallet de Desenvolvimento
```
Dev Wallet: 0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52
- Possui 363 NFTs do contrato Vibe Most Wanted
- Usar esta wallet para testes locais
```

### Contrato Vibe Most Wanted - NUNCA MUDAR
```
NEXT_PUBLIC_VIBE_CONTRACT=0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728
```
**⚠️ ATENÇÃO**: Este é o único contrato correto do Vibe Most Wanted!
- **NUNCA** mudar este endereço
- Se mudado, as cartas não irão carregar (retorna 0 NFTs)
- Válido tanto para `.env.local` quanto para Vercel

### Problema Comum: Loop Infinito no devLog
Se a aplicação travar com "Maximum call stack size exceeded":
- **Causa**: Funções `devLog`, `devWarn`, `devError` chamando a si mesmas
- **Solução**: Trocar chamadas recursivas por `console.log`, `console.warn`, `console.error`
- **Arquivos afetados**: `app/page.tsx` e `app/profile/[username]/page.tsx`

```typescript
// ❌ ERRADO (causa loop infinito)
const devLog = (...args: any[]) => {
  if (isDev) devLog(...args);  // Chamada recursiva!
};

// ✅ CORRETO
const devLog = (...args: any[]) => {
  if (isDev) console.log(...args);
};
```

### Configurações Essenciais (.env.local)
```env
# Alchemy API (para buscar NFTs da blockchain)
NEXT_PUBLIC_ALCHEMY_API_KEY=Y4XuYCtUIN1ArerfvN83lI2IgS8AJQyh
NEXT_PUBLIC_ALCHEMY_CHAIN=base-mainnet

# Contratos NFT
NEXT_PUBLIC_VIBE_CONTRACT=0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728
NEXT_PUBLIC_JC_CONTRACT=0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728

# WalletConnect (para conectar carteiras)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=925c3c3ff15267c5b5ad367984db55cb

# Firebase (PvP e Perfis)
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://vibe-most-wanted-default-rtdb.firebaseio.com

# Produção
NEXT_PUBLIC_APP_URL=https://vibe-most-wanted.vercel.app
```

### Como Verificar se NFTs Estão Carregando
1. Conectar wallet no app
2. Abrir console do navegador (F12)
3. Procurar por logs:
   - ✅ `"Received NFTs from Alchemy: XXX"` (onde XXX > 0)
   - ❌ `"Received NFTs from Alchemy: 0"` = contrato errado ou wallet sem NFTs

### Workflow de Deploy para Vercel
```bash
# 1. Fazer commit das mudanças
git add .
git commit -m "Sua mensagem"
git push

# 2. Verificar variáveis de ambiente no Vercel
vercel env ls

# 3. Atualizar variável se necessário
vercel env rm NEXT_PUBLIC_VIBE_CONTRACT production
echo "0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728" | vercel env add NEXT_PUBLIC_VIBE_CONTRACT production

# 4. Deploy
vercel --prod

# 5. Verificar se está funcionando
# Abrir https://vibe-most-wanted.vercel.app
```

### Estrutura de Arquivos Importantes
```
vibe-most-wanted/
├── app/
│   ├── page.tsx                    # Página principal do jogo
│   ├── profile/[username]/page.tsx # Página de perfil
│   └── api/                        # API routes
├── lib/
│   └── nft-fetcher.ts             # Utilitários para buscar NFTs
├── .env.local                      # Variáveis de ambiente LOCAL
└── CHANGES_SESSION.md             # Este arquivo (documentação)
```

### Troubleshooting Comum

**Problema**: "No revealed cards found"
- **Causa 1**: Contrato errado no .env
- **Causa 2**: Wallet conectada não tem NFTs desse contrato
- **Solução**: Verificar contrato e wallet nos logs do console

**Problema**: Aplicação trava ao carregar
- **Causa**: Loop infinito no devLog
- **Solução**: Ver seção "Loop Infinito no devLog" acima

**Problema**: Mudanças no .env.local não aparecem
- **Causa**: Next.js cacheia variáveis de ambiente
- **Solução**: Reiniciar servidor dev (`Ctrl+C` e `npm run dev`)

**Problema**: Vercel mostra versão antiga após deploy
- **Causa**: CDN cache ou variáveis de ambiente não atualizadas
- **Solução**: Fazer redeploy ou limpar cache do Vercel

---

## Data: 2025-10-23

## Problema Inicial
- Dificuldade da IA muito baixa (IMPOSSIBLE mode só tinha 184 de poder)
- Loading do deck do JC estava demorando muito (10+ minutos)
- JC tem 6,720 cartas mas só carregava 0

## Descobertas

### Análise da Wallet do JC
```
Wallet: 0xf14c1dc8ce5fe65413379f76c43fa1460c31e728
Contrato NFT: 0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728

📦 TOTAL: 6,720 cartas
- 🔒 UNOPENED: 5,843 (86.9%) - nunca serão abertas
- ✅ OPENED: 859 (13.1%)

Por raridade (apenas abertas):
- Common: 330 (4.9%)
- Rare: 137 (2.0%)
- Epic: 50 (0.7%)
- Legendary: 1 (0.0%)
```

## Mudanças Implementadas

### 1. Fix do Contrato Address
**Arquivo**: `.env.local`
```env
# ANTES (ERRADO)
NEXT_PUBLIC_VIBE_CONTRACT=0x29f9673bbcbab3dece542fc78f4f3b5b61c5a15a

# DEPOIS (CORRETO)
NEXT_PUBLIC_VIBE_CONTRACT=0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728
```

**⚠️ IMPORTANTE**: Atualizar também no Vercel Dashboard:
1. https://vercel.com/joaovitorhbos-projects/vibe-most-wanted/settings/environment-variables
2. Editar `NEXT_PUBLIC_VIBE_CONTRACT`
3. Valor: `0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728`
4. Salvar e fazer Redeploy

### 2. Otimização do fetchNFTs (app/page.tsx)

**Localização**: Linha 914-956

**Mudanças**:
```typescript
// ANTES: Fetching sem filtro, processando tudo depois
async function fetchNFTs(owner: string): Promise<any[]> {
  // Buscava todas as páginas
  // Não filtrava unopened
  // Retornava tudo
}

// DEPOIS: Filtra unopened durante o fetch
async function fetchNFTs(owner: string): Promise<any[]> {
  const maxPages = 50; // Suficiente para pegar maioria das abertas
  const targetRevealed = 500; // Para quando tiver 500 abertas

  do {
    // Fetch página
    const pageNfts = json.ownedNfts || [];

    // ✅ FILTRO NOVO: Remove unopened imediatamente
    const revealed = pageNfts.filter((nft: any) => {
      const attrs = nft?.raw?.metadata?.attributes || nft?.metadata?.attributes || [];
      const rarityAttr = attrs.find((a: any) => a.trait_type?.toLowerCase() === 'rarity');
      const rarity = rarityAttr?.value || '';
      return rarity.toLowerCase() !== 'unopened';
    });

    revealedNfts = revealedNfts.concat(revealed);

    // ✅ PARA CEDO: Quando tiver 500 abertas
    if (revealedNfts.length >= targetRevealed) {
      console.log(`   ✅ Reached ${revealedNfts.length} revealed cards, stopping early`);
      break;
    }
  } while (pageKey && pageCount < maxPages);
}
```

### 3. Otimização do loadJCNFTs (app/page.tsx)

**Localização**: Linha 1534-1560

**Mudanças**:
```typescript
// ANTES: Buscava, depois filtrava unrevealed
const raw = await fetchNFTs(JC_WALLET_ADDRESS);
const revealed = raw.filter((n) => !isUnrevealed(n));

// DEPOIS: Já vem filtrado
const revealed = await fetchNFTs(JC_WALLET_ADDRESS); // Já filtrado!

// ✅ Extrai imagens diretamente da resposta da Alchemy (sem fetch async)
const processed = revealed.map(nft => {
  const imageUrl = nft?.image?.cachedUrl ||
                   nft?.image?.thumbnailUrl ||
                   nft?.image?.originalUrl ||
                   nft?.raw?.metadata?.image ||
                   '';

  return {
    ...nft,
    imageUrl: normalizeUrl(imageUrl), // Direto, sem async!
    rarity: findAttr(nft, 'rarity'),
    status: findAttr(nft, 'status'),
    wear: findAttr(nft, 'wear'),
    foil: findAttr(nft, 'foil'),
    power: calcPower(nft),
  };
});
```

### 4. Botão de Sort no Attack Mode (app/page.tsx)

**Localização**: Linha 1206, 1871-1874, 2865-2880

**Mudanças**:
```typescript
// Estado
const [sortAttackByPower, setSortAttackByPower] = useState<boolean>(false);

// Memo para cartas ordenadas
const sortedAttackNfts = useMemo(() => {
  if (!sortAttackByPower) return nfts;
  return [...nfts].sort((a, b) => (b.power || 0) - (a.power || 0));
}, [nfts, sortAttackByPower]);

// Botão no modal de ataque
<button
  onClick={() => {
    setSortAttackByPower(!sortAttackByPower);
    if (soundEnabled) AudioManager.buttonClick();
  }}
  className={...}
>
  {sortAttackByPower ? '↓ Sort by Power' : '⇄ Default Order'}
</button>
```

### 5. Fix das Dificuldades (app/page.tsx)

**Localização**: Linha 1710-1726

**Mudanças**:
```typescript
// ANTES: EXTREME e IMPOSSIBLE eram iguais (ambos top 5)

// DEPOIS:
case 'extreme':
  // Extreme: Pega das top 10 mais fortes
  for (let i = 0; i < HAND_SIZE_CONST; i++) {
    const idx = Math.floor(Math.random() * Math.min(10, sorted.length));
    pickedDealer.push(sorted[idx]);
    sorted.splice(idx, 1);
  }
  break;

case 'impossible':
  // Impossible: EXATAMENTE as top 5 mais fortes (máximo poder)
  pickedDealer = sorted.slice(0, HAND_SIZE_CONST);
  break;
```

### 6. Loading Indicator (app/page.tsx)

**Localização**: Linha 1210, 3963-3997

**Mudanças**:
```typescript
// Estado
const [jcNftsLoading, setJcNftsLoading] = useState<boolean>(true);

// Botão com loading
<button
  disabled={!userProfile || jcNftsLoading}
>
  {jcNftsLoading ? (
    <span className="flex items-center justify-center gap-2">
      <span className="animate-spin">⏳</span>
      Loading JC Deck ({jcNfts.length} cards)...
    </span>
  ) : (
    'Battle vs AI'
  )}
</button>
```

## Scripts de Teste Criados

### test-unopened.js
Analisa a wallet e conta cartas opened vs unopened por raridade.

```bash
cd vibe-most-wanted && node test-unopened.js
```

### test-wallet-nfts.js
Testa se a wallet tem NFTs (sem filtro de contrato).

```bash
cd vibe-most-wanted && node test-wallet-nfts.js
```

## Resultados Esperados

### Performance
- ❌ ANTES: 68 páginas = ~60-90 segundos de loading
- ✅ DEPOIS: ~40-50 páginas = ~30-40 segundos de loading (~40-50% mais rápido)

### Deck do JC
- ✅ ~500-859 cartas abertas disponíveis para batalhas
- ✅ Unopened filtradas automaticamente (economiza memória e tempo)
- ✅ Imagens carregadas direto da resposta Alchemy (sem async)

### Dificuldades
- 🟢 EASY: 100% random
- 🔵 MEDIUM: 70% top 3, 30% random
- 🟠 HARD: Random das top 7
- 🔴 EXTREME: Random das top 10
- 🟣 IMPOSSIBLE: EXATAMENTE top 5 (máximo poder)

## Commits Feitos

1. `787e3fb` - Fix: Filter by rarity=unopened trait instead of name check
2. `9cbab9c` - Optimize: Filter unrevealed cards during fetch, stop at 1000 revealed cards
3. `8801478` - Optimize: Limit JC deck to 20 pages (2000 cards) for faster loading
4. `e2223c8` - Fix: Extract images from Alchemy response for JC deck (fast + with images)
5. `64edcd3` - Optimize JC deck loading - skip metadata/image enrichment
6. `e012b1e` - Optimize: Reduce target to 500 revealed cards for faster loading
7. `a3ec81e` - feat: Add separate JC_CONTRACT for JC's cards (supports 2 contracts)
8. `7dcd858` - perf: Reduce target to 100 cards + add localStorage cache (1 day)

## Otimizações Finais (Commit 7dcd858)

### Problema: Ainda demorando muito
Com 859 cartas abertas (13.1%) e target de 500:
- Precisava buscar ~3,800 cartas total
- ~38 páginas × 1-2 seg/página = 38-76 segundos

### Solução Implementada:

**1. Reduzido Target para 100 cartas**
- 100 cartas é suficiente para pegar as top 5 mais fortes
- ~8-15 páginas × 1-2 seg/página = **8-30 segundos** (primeira vez)

**2. Cache LocalStorage (1 dia)**
```typescript
// Verifica cache antes de buscar
const cached = localStorage.getItem('jc_deck_cache_v2');
const cacheTime = localStorage.getItem('jc_deck_cache_time_v2');

if (cached && (Date.now() - cacheTime) < oneDay) {
  // Carrega do cache - INSTANTÂNEO!
  return cachedData;
}

// Busca da API só na primeira vez
// Salva no cache após processar
localStorage.setItem('jc_deck_cache_v2', JSON.stringify(finalProcessed));
```

**Resultado:**
- ⚡ **Primeira visita**: 8-30 segundos
- 🚀 **Visitas seguintes**: < 1 segundo (cache)
- 💾 Cache válido por 24 horas

## Próximos Passos

1. ⚠️  Adicionar `NEXT_PUBLIC_JC_CONTRACT` no Vercel (quando tiver deployments)
   - Valor: `0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728`
2. ✅ Testar loading no ambiente de produção
3. ✅ Verificar se IMPOSSIBLE mode está com poder alto o suficiente

## Notas Técnicas

- **Unopened cards**: Nunca serão abertas, então o filtro sempre funcionará
- **Contract address**: O contrato NFT tem o mesmo endereço que a wallet do JC
- **Rarity trait**: Unopened cards têm `rarity: "unopened"` nos attributes
- **Total de páginas necessárias**: ~40-50 para pegar 500 cards opened (suficiente)
