# 🚀 Guia de Deploy dos Contratos VBMS via Remix

## 📋 Informações Importantes

### Endereços Principais:
- **Token VBMS**: `0xb03439567cd22f278b21e1ffcdfb8e1696763827`
- **Sua Wallet (Owner)**: `0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52`
- **Backend Signer**: `0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52` (mesma wallet)
- **Network**: Base Mainnet (Chain ID: 8453)

---

## 🔧 Setup do Remix

1. Acesse: https://remix.ethereum.org
2. Conecte sua wallet (MetaMask, Coinbase Wallet, etc)
3. Certifique-se de estar na **Base Mainnet** (Chain ID: 8453)
4. Tenha ETH suficiente para gas (~0.005 ETH ou ~$20)

---

## 📝 Ordem de Deploy

### ⚠️ IMPORTANTE: Deploye nesta ordem exata!

1. VBMSPoolTroll (primeiro)
2. VBMSPokerBattle (segundo)
3. VBMSBetting (terceiro)

---

## 1️⃣ Deploy VBMSPoolTroll

### Preparação:
1. No Remix, vá em "File Explorer"
2. Crie um arquivo: `VBMSPoolTroll.sol`
3. Cole o conteúdo do arquivo `contracts/VBMSPoolTroll.sol`
4. Vá em "Solidity Compiler"
5. Selecione versão: **0.8.20**
6. Clique em "Compile VBMSPoolTroll.sol"

### Deploy:
1. Vá em "Deploy & Run Transactions"
2. Selecione "Injected Provider - MetaMask" (ou sua wallet)
3. Selecione contrato: **VBMSPoolTroll**
4. Preencha os parâmetros do constructor:

```
_vbmsToken: 0xb03439567cd22f278b21e1ffcdfb8e1696763827
_backendSigner: 0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52
```

5. Clique em "Deploy" e confirme na wallet
6. **COPIE O ENDEREÇO DO CONTRATO DEPLOYADO** (você vai precisar!)

### Verificação:
```
Endereço VBMSPoolTroll: ___________________ (ANOTE AQUI!)
```

---

## 2️⃣ Deploy VBMSPokerBattle

### Preparação:
1. Crie arquivo: `VBMSPokerBattle.sol`
2. Cole o conteúdo do arquivo `contracts/VBMSPokerBattle.sol`
3. Compile com versão **0.8.20**

### Deploy:
1. Selecione contrato: **VBMSPokerBattle**
2. Preencha os parâmetros do constructor:

```
_vbmsToken: 0xb03439567cd22f278b21e1ffcdfb8e1696763827
_poolAddress: [ENDEREÇO DO VBMSPoolTroll QUE VOCÊ DEPLOYOU]
_backendSigner: 0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52
```

3. Clique em "Deploy" e confirme na wallet
4. **COPIE O ENDEREÇO DO CONTRATO DEPLOYADO**

### Verificação:
```
Endereço VBMSPokerBattle: ___________________ (ANOTE AQUI!)
```

---

## 3️⃣ Deploy VBMSBetting

### Preparação:
1. Crie arquivo: `VBMSBetting.sol`
2. Cole o conteúdo do arquivo `contracts/VBMSBetting.sol`
3. Compile com versão **0.8.20**

### Deploy:
1. Selecione contrato: **VBMSBetting**
2. Preencha os parâmetros do constructor:

```
_vbmsToken: 0xb03439567cd22f278b21e1ffcdfb8e1696763827
_poolAddress: [ENDEREÇO DO VBMSPoolTroll QUE VOCÊ DEPLOYOU]
_backendSigner: 0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52
_pokerBattleContract: [ENDEREÇO DO VBMSPokerBattle QUE VOCÊ DEPLOYOU]
```

3. Clique em "Deploy" e confirme na wallet
4. **COPIE O ENDEREÇO DO CONTRATO DEPLOYADO**

### Verificação:
```
Endereço VBMSBetting: ___________________ (ANOTE AQUI!)
```

---

## 4️⃣ Funding do Pool (Opcional mas Recomendado)

Após deployar o VBMSPoolTroll, você precisa enviar $VBMS para ele:

1. Acesse o contrato do token VBMS: `0xb03439567cd22f278b21e1ffcdfb8e1696763827`
2. Chame a função `transfer`:
   - `to`: [ENDEREÇO DO VBMSPoolTroll]
   - `amount`: [Quantidade em Wei - ex: 1000000000000000000000 = 1000 VBMS]
3. Confirme a transação

**Recomendação**: Comece com 10,000 - 50,000 VBMS no pool

---

## 5️⃣ Verificação dos Contratos no Basescan

Para verificar cada contrato no Basescan (https://basescan.org):

1. Vá no endereço do contrato no Basescan
2. Clique em "Contract" → "Verify and Publish"
3. Preencha:
   - Compiler Type: Solidity (Single file)
   - Compiler Version: v0.8.20
   - License: MIT
4. Cole o código Solidity completo
5. Preencha os parâmetros do constructor (os mesmos usados no deploy)
6. Clique em "Verify and Publish"

### Constructor Arguments (ABI-encoded):

Você pode usar o Remix para pegar os constructor arguments:
1. No Remix, após o deploy, clique no contrato deployado
2. Copie os "constructor arguments" da transação

---

## 📊 Resumo Final

Após todos os deploys, você terá:

```
✅ VBMSPoolTroll: ___________________
✅ VBMSPokerBattle: ___________________
✅ VBMSBetting: ___________________
✅ VBMS Token: 0xb03439567cd22f278b21e1ffcdfb8e1696763827
```

---

## 🔐 Configurações Pós-Deploy

### No VBMSPoolTroll:
- Fundar com $VBMS inicial
- Configurar `minClaimAmount` e `maxClaimAmount` se necessário
- Tudo está pronto para uso!

### No VBMSPokerBattle:
- Configurar `minStake` e `maxStake` se necessário (padrão: 1-10k VBMS)
- Configurar `feePercentage` se necessário (padrão: 5%)

### No VBMSBetting:
- Configurar `minBet` e `maxBet` se necessário (padrão: 1-1k VBMS)
- Configurar `poolFeePercentage` se necessário (padrão: 10%)
- Configurar `payoutMultiplier` se necessário (padrão: 3x)

---

## 🚨 Checklist de Segurança

Antes de liberar para o público:

- [ ] Todos os contratos deployados e verificados
- [ ] Pool financiado com $VBMS
- [ ] Testado criar battle e fazer claim
- [ ] Backend configurado para assinar transações
- [ ] Testado betting system
- [ ] Limites configurados corretamente
- [ ] Owner é a wallet correta
- [ ] Todos os endereços anotados

---

## 📱 Integração com Frontend

Adicione os endereços dos contratos no seu `.env.local`:

```env
NEXT_PUBLIC_VBMS_TOKEN=0xb03439567cd22f278b21e1ffcdfb8e1696763827
NEXT_PUBLIC_VBMS_POOL=[ENDEREÇO VBMSPoolTroll]
NEXT_PUBLIC_POKER_BATTLE=[ENDEREÇO VBMSPokerBattle]
NEXT_PUBLIC_VBMS_BETTING=[ENDEREÇO VBMSBetting]
```

---

## 🆘 Troubleshooting

### Erro: "Insufficient funds"
- Certifique-se de ter ETH suficiente para gas

### Erro: "Contract creation failed"
- Verifique se todos os parâmetros estão corretos
- Verifique se está na Base Mainnet

### Erro: "Execution reverted"
- Verifique os endereços (não podem ser 0x0)
- Verifique se deployou na ordem correta

### Erro ao fundar pool
- Aprove o token $VBMS primeiro
- Verifique se tem saldo suficiente

---

## 📞 Contato

Se tiver problemas, me chame! 🚀

**Good luck anon! To the moon! 🌙**
