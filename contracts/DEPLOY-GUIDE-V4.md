# 🚀 Guia de Deploy - VBMSPokerBattleV4

## 📋 Pré-requisitos

- MetaMask conectada à **Base Mainnet**
- Saldo de ETH na Base para gas fees
- Endereços necessários:
  - ✅ VBMS Token: `0xb03439567cd22f278b21e1ffcdfb8e1696763827`
  - ✅ Pool Address (VBMSPool): `0x062b914668f3fD35c3Ae02e699cB82e1cF4bE18b`
  - ✅ Backend Signer: `0xd99624896203B1dd1AaED4945bF4C76e489B7009`

---

## 🔧 Passo 1: Backend Signer ✅

✅ **Já configurado!**

Você já tem um backend signer configurado:
- **Endereço:** `0xd99624896203B1dd1AaED4945bF4C76e489B7009`
- **Private Key:** Guardada em `.env.local` como `BACKEND_SIGNER_KEY`

Não precisa criar uma nova wallet. Use este endereço no deploy.

---

## 🌐 Passo 2: Abrir Remix

1. Acesse: https://remix.ethereum.org
2. No menu lateral esquerdo, clique em **"File Explorer"** (📁)

---

## 📄 Passo 3: Criar o Arquivo do Contrato

1. Clique com botão direito na pasta **contracts/**
2. Selecione **"New File"**
3. Nome: `VBMSPokerBattleV4.sol`
4. Cole todo o código do arquivo `VBMSPokerBattleV4.sol`

---

## 🔨 Passo 4: Compilar

1. No menu lateral, clique em **"Solidity Compiler"** (📋)
2. Configurações:
   - **Compiler:** `0.8.28+commit.7893614a`
   - **EVM Version:** `default`
   - **Optimization:** `false` (deixe desmarcado)
3. Clique em **"Compile VBMSPokerBattleV4.sol"**
4. ✅ Deve aparecer um check verde

---

## 🚀 Passo 5: Deploy

### 5.1 Configurar Deploy

1. No menu lateral, clique em **"Deploy & Run Transactions"** (🚀)
2. Configurações:
   - **Environment:** `Injected Provider - MetaMask`
   - **Account:** Verifique se é sua carteira correta
   - **Contract:** `VBMSPokerBattleV4 - contracts/VBMSPokerBattleV4.sol`

### 5.2 Parâmetros do Constructor

No campo **Deploy**, expanda os parâmetros e preencha:

```
_vbmsToken: 0xb03439567cd22f278b21e1ffcdfb8e1696763827
_poolAddress: 0x062b914668f3fD35c3Ae02e699cB82e1cF4bE18b
_backendSigner: 0xd99624896203B1dd1AaED4945bF4C76e489B7009
```

**✅ Pronto para copiar e colar!**

### 5.3 Fazer Deploy

1. Clique no botão **"Deploy"** (laranja)
2. MetaMask vai abrir
3. **Revise o gas fee**
4. Confirme a transação
5. ⏳ Aguarde confirmação (pode levar 1-2 minutos)

---

## ✅ Passo 6: Verificar Deploy

Após confirmação, você verá o contrato em **"Deployed Contracts"**:

1. Expanda o contrato
2. Teste as funções view:
   - `vbmsToken()` - deve retornar: `0xb03439567cd22f278b21e1ffcdfb8e1696763827`
   - `poolAddress()` - deve retornar: `0x062b914668f3fD35c3Ae02e699cB82e1cF4bE18b`
   - `backendSigner()` - deve retornar o endereço que você configurou
   - `feePercentage()` - deve retornar: `500` (5%)
   - `minStake()` - deve retornar: `1000000000000000000` (1 VBMS)
   - `maxStake()` - deve retornar: `10000000000000000000000` (10000 VBMS)

---

## 🔍 Passo 7: Verificar o Contrato no Blockscout

### 7.1 Copiar Endereço

1. No Remix, em "Deployed Contracts", copie o endereço do contrato
2. Vai parecer com: `0x123...abc`

### 7.2 Acessar Blockscout

1. Vá para: https://base.blockscout.com
2. Cole o endereço do contrato na busca
3. Clique no contrato

### 7.3 Verificar Código Fonte

1. Vá na aba **"Contract"**
2. Clique em **"Verify & Publish"**
3. Preencha:
   - **Compiler Type:** `Solidity (Single file)`
   - **Compiler Version:** `v0.8.28+commit.7893614a`
   - **Open Source License Type:** `MIT`
   - **Optimization:** `No`
4. Cole o código do contrato `VBMSPokerBattleV4.sol`
5. **Constructor Arguments (ABI-encoded):**
   - Clique em "Add" para adicionar os 3 parâmetros
   - Tipo 1: `address` - Valor: `0xb03439567cd22f278b21e1ffcdfb8e1696763827`
   - Tipo 2: `address` - Valor: `0x062b914668f3fD35c3Ae02e699cB82e1cF4bE18b`
   - Tipo 3: `address` - Valor: (seu backend signer)
6. Clique em **"Verify & Publish"**

---

## 📝 Passo 8: Atualizar Configurações do Projeto

Após deploy bem-sucedido, atualize os arquivos:

### 8.1 Arquivo `.env.local`

```bash
# Adicione a linha:
NEXT_PUBLIC_POKER_BATTLE_V4=0x... (endereço do contrato deployado)
```

### 8.2 Arquivo `lib/contracts.ts`

```typescript
export const CONTRACTS = {
  // ... outros contratos
  POKER_BATTLE_V4: process.env.NEXT_PUBLIC_POKER_BATTLE_V4 || '',
}
```

### 8.3 Backend Signer (.env do backend)

```bash
POKER_BATTLE_SIGNER_PRIVATE_KEY=0x... (private key do backend signer)
```

---

## 🎯 Funções Disponíveis

### Para Players:
- `createBattle(uint256 stake)` - Criar battle
- `joinBattle(uint256 battleId)` - Entrar em battle
- `cancelBattle(uint256 battleId)` - Cancelar battle

### Para Backend:
- `finishBattle(uint256 battleId, address winner, bytes signature)` - Finalizar battle

### Para Owner (Admin):
- `forceFinishBattle(uint256 battleId, address winner)` - Forçar fim de battle travada
- `forceCleanupActiveBattle(address player)` - Limpar mapping órfão
- **🆕 `emergencyWithdraw(address token, uint256 amount)`** - Resgatar tokens presos
- `setFeePercentage(uint256 newFee)` - Ajustar taxa (máx 10%)
- `setStakeLimits(uint256 newMin, uint256 newMax)` - Ajustar limites de stake
- `setPoolAddress(address newPool)` - Mudar endereço do pool
- `setBackendSigner(address newSigner)` - Mudar backend signer

---

## 🆘 Função Emergency Withdraw

**Quando usar:**
- Tokens VBMS ficaram presos no contrato
- Outros tokens ERC20 foram enviados por engano
- Acúmulo anormal de fundos

**Como usar no Remix:**
1. Expanda o contrato deployado
2. Localize `emergencyWithdraw`
3. Parâmetros:
   - `token`: Endereço do token ERC20 (ex: `0xb03...` para VBMS)
   - `amount`: Quantidade em wei (0 = sacar tudo)
4. Clique em **"transact"**
5. Confirme no MetaMask

**Exemplo:** Sacar todo VBMS preso
```
token: 0xb03439567cd22f278b21e1ffcdfb8e1696763827
amount: 0
```

---

## 🔐 Segurança

### ✅ Verificações Antes do Deploy:
- [ ] Backend signer está correto e seguro
- [ ] Pool address está correto
- [ ] VBMS token address está correto
- [ ] Você é o owner da carteira que vai fazer deploy

### ✅ Após Deploy:
- [ ] Testou criar uma battle de teste
- [ ] Verificou que não consegue criar com menos de 1 VBMS
- [ ] Verificou que não consegue criar com mais de 10k VBMS
- [ ] Código verificado no Blockscout

---

## 📊 Diferenças V3 → V4

| Característica | V3 | V4 |
|----------------|-----|-----|
| Emergency withdraw | ❌ Não | ✅ Sim |
| Resgatar tokens presos | ❌ Impossível | ✅ Owner pode resgatar |
| Segurança de fundos | ⚠️ Risco | ✅ Protegido |
| Cleanup battles | ✅ Sim | ✅ Sim |
| No cancel cooldown | ✅ Sim | ✅ Sim |

---

## 🎉 Deploy Concluído!

Seu contrato VBMSPokerBattleV4 está pronto para uso.

**Próximos passos:**
1. Integrar o novo endereço no frontend
2. Atualizar o backend para usar o novo contrato
3. Migrar battles ativas do V3 para V4 (se necessário)
4. Testar em produção com battles pequenas primeiro

---

## 📞 Suporte

Em caso de dúvidas ou problemas:
- Verifique os eventos emitidos no Blockscout
- Teste as funções view primeiro
- Use `emergencyWithdraw` apenas em emergências reais
