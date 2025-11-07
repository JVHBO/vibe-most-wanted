# 🪙 MIGRAÇÃO TESTV BMS → TOKEN VBMS REAL

**Status**: 📋 PLANEJAMENTO
**Criado**: 2025-11-06
**Última atualização**: 2025-11-06

---

## 📊 SITUAÇÃO ATUAL

### Sistema Existente (testVBMS)

O sistema atual é **100% virtual**, gerenciado pelo backend Convex:

- ✅ Pool virtual de 10M de moedas
- ✅ Economia funcionando (PvE, PvP, Attack, Missions)
- ✅ Balances armazenados no banco Convex
- ✅ Sistema de daily limits, caps e bonuses
- ✅ Weekly rewards automatizados
- ✅ 64 achievements com recompensas

**Localização da lógica**: `convex/economy.ts` (1,418 linhas)

### Pontos de Uso do testVBMS

O termo "testVBMS" aparece apenas em:
- Comentários de documentação (linhas 2, 5, 6, 18)
- Mensagem de erro (linha 1023, 1032)
- Documentação (`docs/ECONOMY-GUIDE.md`)

**Conclusão**: Mudança é principalmente de infraestrutura, não de código frontend.

---

## 🎯 OBJETIVO DA MIGRAÇÃO

Transformar o sistema virtual em um sistema híbrido:

1. **Manter sistema atual** - Convex continua rastreando ganhos/gastos
2. **Adicionar token real** - Contrato ERC-20 na Base blockchain
3. **Sistema de Claim** - Jogadores podem sacar coins para token real
4. **Pool on-chain** - Contrato gerencia pool de 10M VBMS

---

## 🏗️ ARQUITETURA PROPOSTA

### Componentes

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│  - UI de batalhas (PvE, PvP, Attack)                    │
│  - Botões de CLAIM para sacar VBMS                      │
│  - Display de balance (virtual + claimable)             │
└───────────────┬─────────────────────────────────────────┘
                │
                ├──────────────┬──────────────┐
                │              │              │
                ▼              ▼              ▼
┌───────────────────┐  ┌──────────────┐  ┌─────────────────┐
│  CONVEX BACKEND   │  │  WALLET      │  │ SMART CONTRACTS │
│  (Atual)          │  │  (wagmi)     │  │  (Base)         │
├───────────────────┤  ├──────────────┤  ├─────────────────┤
│ • Tracks coins    │  │ • Sign claim │  │ • VBMSToken.sol │
│ • Economy rules   │  │ • Transactions│  │   (ERC-20)      │
│ • Daily limits    │  │              │  │ • VBMSClaim.sol │
│ • Achievements    │  │              │  │   (Pool)        │
│ • Match history   │  │              │  │                 │
└───────────────────┘  └──────────────┘  └─────────────────┘
        │                                          │
        │◄─────── Claim Validation ───────────────┤
        │         (Signature check)                │
        └──────────────────────────────────────────┘
```

### Fluxo de Claim

```
1. Jogador ganha coins no jogo → Convex database
2. Jogador clica "CLAIM VBMS" → Frontend
3. Frontend verifica saldo disponível → Convex query
4. Gera mensagem + signature → Web3Auth
5. Envia transação para contrato → VBMSClaim.sol
6. Contrato verifica signature → Backend verification endpoint
7. Transfere VBMS tokens → Player wallet
8. Atualiza saldo no Convex → Mark as claimed
```

---

## 📋 SMART CONTRACTS NECESSÁRIOS

### 1. VBMSToken.sol (ERC-20 Token)

**Opção A**: Criar novo token VBMS
```solidity
contract VBMSToken is ERC20 {
    // 10M supply total
    // Mintable apenas pelo VBMSClaim contract
    // Standard ERC-20
}
```

**Opção B**: Usar token VBMS existente (se já houver)
- Apenas precisa do address do contrato

### 2. VBMSClaim.sol (Pool & Claim System)

```solidity
contract VBMSClaim {
    // Pool de 10M VBMS
    // Função claim(address player, uint256 amount, bytes signature)
    // Verificação de signature backend
    // Rate limiting (prevent spam)
    // Emergency pause
    // Owner controls
}
```

**Características principais**:
- ✅ Pool único com 10M tokens
- ✅ Sistema de claim com prova backend (signature)
- ✅ Proteção contra double-claim
- ✅ Rate limiting (ex: 1 claim por hora)
- ✅ Emergency pause para segurança
- ✅ Events para tracking on-chain

---

## 🔧 MUDANÇAS NO CÓDIGO

### Backend (Convex)

#### 1. Adicionar campos ao schema (`convex/schema.ts`)
```typescript
profiles: defineTable({
  // ... campos existentes ...

  // Novos campos para claim system
  claimedTokens: v.optional(v.number()), // Total de VBMS já sacados
  lastClaimTimestamp: v.optional(v.number()), // Último claim
  pendingClaim: v.optional(v.number()), // Coins disponíveis para claim
})
```

#### 2. Nova mutation: `prepareClaimSignature` (`convex/economy.ts`)
```typescript
export const prepareClaimSignature = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, { address, amount }) => {
    // 1. Verifica saldo disponível
    // 2. Verifica rate limit (1h desde último claim)
    // 3. Gera nonce único
    // 4. Retorna { amount, nonce, message }
    // Frontend usa isso para gerar signature
  }
})
```

#### 3. Nova mutation: `recordClaim` (`convex/economy.ts`)
```typescript
export const recordClaim = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
    txHash: v.string(),
  },
  handler: async (ctx, { address, amount, txHash }) => {
    // Marca coins como claimed
    // Atualiza claimedTokens
    // Salva txHash para auditoria
  }
})
```

#### 4. Nova query: `getClaimableBalance` (`convex/economy.ts`)
```typescript
export const getClaimableBalance = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    // Retorna:
    // - coins: saldo virtual total
    // - claimedTokens: já sacado
    // - claimable: coins - claimedTokens
    // - canClaimNow: check rate limit
  }
})
```

### Frontend (Next.js + React)

#### 1. Novo componente: `ClaimVBMSButton` (`components/ClaimVBMSButton.tsx`)
```typescript
export function ClaimVBMSButton() {
  // 1. Query claimableBalance
  // 2. Se claimable > 0, mostra botão
  // 3. onClick:
  //    a. prepareClaimSignature()
  //    b. signMessage() com wallet
  //    c. Chama contrato claim()
  //    d. recordClaim() no Convex
  // 4. Loading states + error handling
}
```

#### 2. Atualizar `app/page.tsx`
- Adicionar display de "Claimable VBMS"
- Integrar ClaimVBMSButton
- Mostrar histórico de claims

#### 3. Nova página: `app/claims/page.tsx`
- Histórico completo de claims
- Status de transações
- Link para explorador (Basescan)

---

## 🔐 SEGURANÇA

### Proteções no Contrato

1. **Signature Verification**
   - Backend gera signature única por claim
   - Contrato verifica signature antes de transferir
   - Previne claims não autorizados

2. **Rate Limiting**
   - Mínimo 1 hora entre claims
   - Previne spam e gas wars

3. **Nonce System**
   - Cada claim tem nonce único
   - Previne replay attacks

4. **Emergency Pause**
   - Owner pode pausar claims em emergência
   - Protege pool em caso de exploit

### Proteções no Backend

1. **Double-Claim Prevention**
   - Atomic updates no Convex
   - Marca coins como "claimed" imediatamente

2. **Amount Validation**
   - Nunca permite claim > balance disponível
   - Verifica daily limits se necessário

3. **Transaction Verification**
   - Salva txHash para auditoria
   - Pode verificar on-chain se necessário

---

## 📝 VARIÁVEIS DE AMBIENTE

Adicionar em `.env.local`, `.env.production`:

```bash
# VBMS Token Contract
NEXT_PUBLIC_VBMS_TOKEN_ADDRESS=0x...

# VBMS Claim Contract
NEXT_PUBLIC_VBMS_CLAIM_ADDRESS=0x...

# Blockchain Network
NEXT_PUBLIC_CHAIN_ID=8453  # Base mainnet

# Backend Signature Key (SERVER-SIDE ONLY)
VBMS_CLAIM_PRIVATE_KEY=0x...  # Para assinar claims
```

---

## 📦 DEPLOYMENT PLAN

### Fase 1: Preparação (1-2 dias)
- [ ] Escrever contratos Solidity
- [ ] Testes locais (Hardhat/Foundry)
- [ ] Auditar código do contrato
- [ ] Deploy em testnet (Base Goerli)

### Fase 2: Backend Updates (1 dia)
- [ ] Adicionar campos ao schema
- [ ] Implementar mutations/queries de claim
- [ ] Testar fluxo completo no dev

### Fase 3: Frontend Integration (1 dia)
- [ ] Criar ClaimVBMSButton
- [ ] Integrar com wagmi
- [ ] UI para histórico de claims
- [ ] Testar em testnet

### Fase 4: Mainnet Deploy (1 dia)
- [ ] Deploy VBMSToken em Base mainnet
- [ ] Deploy VBMSClaim em Base mainnet
- [ ] Transferir 10M VBMS para VBMSClaim
- [ ] Atualizar env vars produção
- [ ] Smoke tests

### Fase 5: Launch (Gradual)
- [ ] Anunciar feature aos jogadores
- [ ] Monitor claims iniciais
- [ ] Ajustar rate limits se necessário
- [ ] Coletar feedback

**Tempo estimado total**: 4-6 dias de desenvolvimento

---

## 🧪 TESTING CHECKLIST

### Smart Contracts
- [ ] Test claim com signature válida
- [ ] Test claim com signature inválida (deve rejeitar)
- [ ] Test double-claim (deve rejeitar)
- [ ] Test rate limiting
- [ ] Test emergency pause
- [ ] Test pool depletion scenarios

### Backend
- [ ] Test prepareClaimSignature
- [ ] Test recordClaim atomic update
- [ ] Test rate limit enforcement
- [ ] Test balance validation

### Frontend
- [ ] Test claim flow (happy path)
- [ ] Test error states (insufficient balance, rate limit)
- [ ] Test loading states
- [ ] Test transaction confirmation
- [ ] Test claim history display

### Integration
- [ ] End-to-end claim test (dev → testnet → mainnet)
- [ ] Test com múltiplos usuários simultâneos
- [ ] Test gas estimation
- [ ] Test failure recovery

---

## 💰 GAS OPTIMIZATION

### Estimativas

- `claim()`: ~50,000 gas
- Base gas price: ~0.001 gwei
- Cost per claim: ~$0.05 USD

### Otimizações Possíveis

1. **Batch Claims** (opcional)
   - Permitir claim de múltiplos jogadores em batch
   - Reduz gas por jogador

2. **EIP-2612 Permit** (opcional)
   - Gasless approvals
   - Melhor UX

---

## 📊 MONITORING & ANALYTICS

### Métricas para Tracking

- Total VBMS claimed
- Número de claims por dia
- Average claim amount
- Pool remaining
- Failed claims (reasons)
- Gas costs

### Dashboards

- Admin dashboard mostrando pool status
- Public leaderboard de top claimers
- Transaction history público

---

## ⚠️ RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Bug no contrato | Baixa | CRÍTICO | Audit + testnet + gradual rollout |
| Pool esgotado rápido | Média | Alto | Rate limiting + daily caps |
| Gas wars | Baixa | Médio | Rate limiting |
| Signature exploit | Baixa | CRÍTICO | Nonce + expiry + backend validation |
| Frontend bug | Média | Baixo | Extensive testing + error handling |

---

## 🚀 MELHORIAS FUTURAS

### V2 Features (Opcional)

1. **Staking**
   - Stake VBMS para boost de earnings
   - Lock periods com multipliers

2. **Burning Mechanism**
   - Burn VBMS para special items
   - Deflationary tokenomics

3. **Marketplace Integration**
   - Buy/sell NFTs com VBMS
   - P2P trading

4. **Governance**
   - VBMS holders votam em features
   - DAO structure

---

## 📞 DECISÕES PENDENTES

Precisamos decidir:

1. **Token Address**
   - [ ] Criar novo token VBMS?
   - [ ] Ou usar token existente? (endereço?)

2. **Chain**
   - [ ] Base mainnet? (recomendado - low gas)
   - [ ] Ethereum mainnet? (high gas)
   - [ ] Arbitrum? (alternativa)

3. **Rate Limits**
   - [ ] 1 claim por hora?
   - [ ] 1 claim por dia?
   - [ ] Minimum claim amount? (ex: 100 VBMS)

4. **Pool Size**
   - [ ] 10M VBMS inicial?
   - [ ] Plano para recarregar pool?

---

## 📚 REFERÊNCIAS

- [OpenZeppelin ERC-20](https://docs.openzeppelin.com/contracts/erc20)
- [Base Network Docs](https://docs.base.org/)
- [Wagmi Claims Example](https://wagmi.sh/examples/sign-message)
- [Convex Mutations](https://docs.convex.dev/database/mutations)

---

**Próximos Passos**:
1. ✅ Revisar plano com time
2. ⏳ Decidir perguntas pendentes (token address, chain, etc)
3. ⏳ Começar desenvolvimento dos contratos
4. ⏳ Setup testnet environment
