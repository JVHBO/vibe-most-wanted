# 📥 COINS INBOX - GUIA DE INTEGRAÇÃO

**Status**: ✅ Ready to integrate
**Tempo estimado**: 2-3 horas
**Complexidade**: Baixa

---

## 🎯 O QUE FOI IMPLEMENTADO

### 1. Schema Atualizado ✅

**Arquivo**: `convex/schema.ts`

Novo campo no `profiles`:
```typescript
coinsInbox: v.optional(v.number()), // Unclaimed coins (inbox/correio) - claim later option
```

Este campo armazena moedas que o jogador escolheu "guardar para depois" após vitórias em batalhas.

---

### 2. Backend Mutations ✅

#### **Arquivo**: `convex/coinsInbox.ts` (NOVO)

Funções criadas:
- ✅ `sendCoinsToInbox` - Envia moedas para o inbox do jogador
- ✅ `claimAllCoinsFromInbox` - Coleta todas as moedas do inbox
- ✅ `getInboxStatus` - Obtém status do inbox (moedas no inbox, saldo atual, total ganho)
- ✅ `hasUnclaimedCoins` - Verifica se há moedas não coletadas

#### **Arquivo**: `convex/rewardsChoice.ts` (NOVO)

Funções criadas:
- ✅ `processRewardChoice` - Processa escolha do jogador (claim now ou claim later)
- ✅ `getPendingReward` - Obtém recompensa pendente de uma partida
- ✅ `markMatchAsClaimed` - Marca partida como reivindicada

---

### 3. Frontend Components ✅

**Arquivos criados**:
- ✅ `components/CoinsInboxDisplay.tsx` - Ícone de inbox com badge no header
- ✅ `components/CoinsInboxModal.tsx` - Modal para visualizar e coletar moedas do inbox
- ✅ `components/RewardChoiceModal.tsx` - Modal de escolha após vitórias (Claim Now ou Claim Later)

---

### 4. Página de Documentação ✅

**Arquivo**: `app/docs/page.tsx` (NOVO)

Página de documentação in-app com seções:
- 💰 Sistema de Economia
- 📥 Inbox de Moedas (novo sistema)
- ⚔️ Sistema de Batalhas
- 🏆 Conquistas
- 🎯 Missões

---

## 🚀 COMO INTEGRAR NO SITE

### PASSO 1: Deploy do Schema (Convex)

```bash
cd vibe-most-wanted
npx convex dev
```

O Convex vai detectar as mudanças no schema e aplicar automaticamente.

**⚠️ IMPORTANTE**: Isso vai adicionar novos campos, mas **NÃO vai quebrar** dados existentes (todos são `optional`).

---

### PASSO 2: Adicionar CoinsInboxDisplay ao Header

Adicione o componente no layout principal para que os jogadores vejam seu inbox:

**Arquivo**: `app/layout.tsx` ou onde você tem o header/navigation

```typescript
import { CoinsInboxDisplay } from "@/components/CoinsInboxDisplay";

// No header, junto com outros elementos
<div className="flex items-center gap-4">
  {/* Outros elementos do header */}
  <CoinsInboxDisplay />
</div>
```

O componente:
- Mostra o ícone 💰 com o saldo do inbox
- Exibe badge de notificação quando há moedas não coletadas
- Ao clicar, abre o modal para coletar todas as moedas

---

### PASSO 3: Integrar RewardChoiceModal nas Telas de Batalha

Este é o passo mais importante! Após cada vitória, mostre o modal de escolha.

#### Exemplo de integração em PvE:

**Arquivo**: `components/PveCardSelectionModal.tsx` (ou similar)

```typescript
import { useState } from "react";
import { RewardChoiceModal } from "@/components/RewardChoiceModal";

// State
const [showRewardChoice, setShowRewardChoice] = useState(false);
const [rewardAmount, setRewardAmount] = useState(0);

// Após a batalha terminar e o jogador vencer
const handleBattleEnd = (result: "win" | "loss", coinsEarned: number) => {
  if (result === "win" && coinsEarned > 0) {
    // Mostrar modal de escolha ao invés de adicionar moedas automaticamente
    setRewardAmount(coinsEarned);
    setShowRewardChoice(true);
  } else {
    // Lógica para derrota
    toast.error("Você perdeu!");
  }
};

// No render
{showRewardChoice && (
  <RewardChoiceModal
    amount={rewardAmount}
    source="pve"
    onClose={() => setShowRewardChoice(false)}
    onChoiceMade={(choice) => {
      console.log(`Jogador escolheu: ${choice}`);
      // Opcional: rastrear analytics
    }}
  />
)}
```

#### Integração similar para PvP:

```typescript
// Após vitória PvP
if (result === "win" && coinsEarned > 0) {
  setRewardAmount(coinsEarned);
  setRewardSource("pvp");
  setShowRewardChoice(true);
}
```

#### Integração similar para Attack Mode:

```typescript
// Após vitória em Attack
if (result === "win" && coinsEarned > 0) {
  setRewardAmount(coinsEarned);
  setRewardSource("attack");
  setShowRewardChoice(true);
}
```

---

### PASSO 4: Atualizar Sistema de Recompensas (Importante!)

As mutations de economia atuais (`awardPvECoins`, `awardPvPCoins`, etc.) adicionam moedas **automaticamente**.

Temos duas opções:

#### **Opção A: Modificar mutations existentes (Recomendado)**

Modifique as mutations para **NÃO adicionar moedas automaticamente**, apenas validar e retornar o valor:

**Em `convex/economy.ts`**:

```typescript
// ANTES - adiciona moedas direto
await ctx.db.patch(profile._id, {
  coins: (profile.coins || 0) + totalReward,
  lifetimeEarned: (profile.lifetimeEarned || 0) + totalReward,
});

// DEPOIS - apenas retorna o valor, deixa frontend decidir
// Remova ou comente a linha de patch acima
// O frontend vai chamar processRewardChoice com o valor retornado
```

#### **Opção B: Criar mutations paralelas (Alternativa)**

Mantenha as mutations antigas e crie novas versões que não adicionam moedas:

```typescript
export const calculatePvEReward = mutation({
  // ... mesmo código, mas só calcula e retorna
  // Não faz patch no profile.coins
  return { amount: totalReward, bonuses };
});
```

**Recomendação**: Use a **Opção A** para evitar duplicação de código.

---

### PASSO 5: Adicionar Link para Documentação

Adicione um botão de ajuda/docs no menu principal:

```typescript
<Link
  href="/docs"
  className="flex items-center gap-2 px-4 py-2 bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg hover:bg-vintage-gold/20"
>
  📚 Documentação
</Link>
```

---

## 🎨 CUSTOMIZAÇÃO (Opcional)

### Mudar Cores dos Botões

**Em `components/RewardChoiceModal.tsx`**:

```typescript
// Botão "Claim Now"
className="bg-gradient-to-r from-vintage-gold to-vintage-orange" // Linha 94

// Botão "Claim Later"
className="bg-gradient-to-r from-blue-500 to-purple-500" // Linha 103
```

### Mudar Ícones

- Inbox de moedas: 💰 (linha 29 de `CoinsInboxDisplay.tsx`)
- Inbox de VBMS: 📬 (existente)
- Vitória: 🎉 (linha 58 de `RewardChoiceModal.tsx`)

---

## 🧪 COMO TESTAR

### 1. Testar CoinsInboxDisplay

1. Abrir o site
2. Conectar carteira
3. Verificar que o ícone 💰 aparece no header
4. Clicar no ícone
5. Ver modal de inbox (vazio inicialmente)

### 2. Testar Fluxo Completo

1. Jogar uma partida PvE e ganhar
2. Ver modal de escolha aparecer
3. Clicar em "Guardar para Depois"
4. Ver toast de confirmação
5. Verificar que o ícone 💰 no header mostra as moedas acumuladas
6. Verificar badge de notificação aparece
7. Clicar no ícone 💰
8. Ver saldo no inbox
9. Clicar em "Coletar Todas as Moedas"
10. Ver toast de sucesso
11. Verificar que o saldo aumentou
12. Verificar que o inbox ficou em 0

### 3. Testar Escolha "Claim Now"

1. Jogar outra partida e ganhar
2. Ver modal de escolha
3. Clicar em "Coletar Agora"
4. Ver toast de confirmação
5. Verificar que as moedas foram adicionadas direto ao saldo

---

## 🐛 TROUBLESHOOTING

### Erro: "Profile not found"
- Certifique-se que o wallet está conectado
- Verifique se `address.toLowerCase()` está sendo usado

### Inbox não aparece no header
- Verifique se `CoinsInboxDisplay` foi adicionado ao layout
- Confirme que wallet está conectado
- Verifique console para erros

### Modal de escolha não abre após vitória
- Verifique se `RewardChoiceModal` foi importado
- Confirme que `showRewardChoice` está sendo setado para `true`
- Verifique se `coinsEarned > 0`

### Moedas sendo adicionadas automaticamente
- Verifique se você comentou/removeu o `patch` nas mutations de economia
- Ou verifique se está usando as novas mutations ao invés das antigas

### Badge de notificação não aparece
- Verifique se há moedas no inbox (`coinsInbox > 0`)
- Verifique se a classe `animate-notification-pulse` está definida no CSS

---

## 📊 ESTRUTURA DE ARQUIVOS

```
vibe-most-wanted/
├── app/
│   └── docs/
│       └── page.tsx                    # ✅ Página de documentação
├── components/
│   ├── CoinsInboxDisplay.tsx           # ✅ Ícone de inbox no header
│   ├── CoinsInboxModal.tsx             # ✅ Modal de coleta de moedas
│   └── RewardChoiceModal.tsx           # ✅ Modal de escolha após vitória
├── convex/
│   ├── schema.ts                        # ✅ Atualizado com coinsInbox
│   ├── coinsInbox.ts                    # ✅ Mutations do inbox
│   ├── rewardsChoice.ts                 # ✅ Mutations de escolha de rewards
│   └── economy.ts                       # ⚠️ Precisa ser modificado (ver PASSO 4)
└── docs/
    └── COINS-INBOX-INTEGRATION-GUIDE.md # 📄 Este arquivo
```

---

## ⚠️ CHECKLIST ANTES DE DEPLOY

- [ ] Schema deployed no Convex (`npx convex dev` ou `npx convex deploy`)
- [ ] `CoinsInboxDisplay` adicionado ao header
- [ ] `RewardChoiceModal` integrado em PvE
- [ ] `RewardChoiceModal` integrado em PvP
- [ ] `RewardChoiceModal` integrado em Attack Mode
- [ ] Mutations de economia modificadas (PASSO 4)
- [ ] Link para `/docs` adicionado ao menu
- [ ] Testado fluxo completo (claim now + claim later)
- [ ] Badge de notificação funcionando
- [ ] Toast messages funcionando

---

## 🎯 EXEMPLO DE INTEGRAÇÃO COMPLETO

### Antes (PvE):

```typescript
// components/PveCardSelectionModal.tsx (ANTES)
const handleBattleEnd = async (result, coinsEarned) => {
  if (result === "win") {
    // Mutation já adiciona moedas automaticamente
    await awardPvECoins({ address, difficulty, won: true });
    toast.success(`Você ganhou ${coinsEarned} coins!`);
  }
};
```

### Depois (PvE):

```typescript
// components/PveCardSelectionModal.tsx (DEPOIS)
import { RewardChoiceModal } from "@/components/RewardChoiceModal";

const [showRewardChoice, setShowRewardChoice] = useState(false);
const [rewardAmount, setRewardAmount] = useState(0);

const handleBattleEnd = async (result, coinsEarned) => {
  if (result === "win" && coinsEarned > 0) {
    // Mutation NÃO adiciona moedas mais (ver PASSO 4)
    // ou use a nova mutation calculatePvEReward ao invés de awardPvECoins

    setRewardAmount(coinsEarned);
    setShowRewardChoice(true);
  } else if (result === "loss") {
    toast.error("Você perdeu!");
  }
};

// No JSX
return (
  <>
    {/* ... resto do componente */}

    {showRewardChoice && (
      <RewardChoiceModal
        amount={rewardAmount}
        source="pve"
        onClose={() => setShowRewardChoice(false)}
        onChoiceMade={(choice) => {
          console.log(`Escolha: ${choice}`);
          // Opcional: analytics
        }}
      />
    )}
  </>
);
```

---

## 💡 DICAS

### Performance
- Os components usam `useQuery` que é **reactive**
- Inbox atualiza automaticamente quando moedas são adicionadas
- Badge anima automaticamente quando há saldo

### UX
- Toast messages claras para cada ação
- Modal de escolha é intuitivo e visual
- Inbox mostra estatísticas úteis (saldo atual, total ganho)

### Experiência do Jogador
- Jogadores podem escolher quando coletar moedas
- Útil para acumular moedas antes de gastar
- Reduz "spam" de notificações de moedas

---

## 📝 PRÓXIMOS PASSOS (Futuro)

1. **Analytics**: Rastrear quantos jogadores usam "Claim Now" vs "Claim Later"
2. **Bônus por acúmulo**: Dar bônus para quem acumula muitas moedas (similar ao VBMS)
3. **Auto-claim**: Opção de auto-coletar após X dias
4. **Notificações**: Lembrar jogadores que têm moedas no inbox
5. **Histórico**: Mostrar histórico de coletas no inbox

---

## 🎉 RESULTADO FINAL

Após a integração, os jogadores poderão:

1. ✅ Ganhar batalhas
2. ✅ Escolher entre "Coletar Agora" ou "Guardar para Depois"
3. ✅ Ver saldo do inbox no header com badge de notificação
4. ✅ Coletar todas as moedas do inbox quando quiserem
5. ✅ Ler documentação completa in-app em `/docs`

**Tempo de jogo mais flexível e organizado!** 🎮

---

**Status**: ✅ PRONTO PARA INTEGRAÇÃO
**Breaking Changes**: Nenhum
**Backwards Compatible**: Sim
**Requer mudanças no código existente**: Sim (modificar mutations de economia - PASSO 4)

🚀 **Pode começar agora!**
