# 🔍 Guia Completo: Como Verificar Contratos no Basescan

## Método Recomendado: Hardhat Flatten + Verificação Manual

### Passo 1: Preparar os Arquivos

#### Opção A: Usar Remix (MAIS FÁCIL)

1. **No Remix**, após compilar o contrato:
   - Clique com botão direito no contrato compilado
   - Selecione **"Flatten"**
   - Salve o arquivo gerado

#### Opção B: Usar Hardhat Flatten

Se você tiver Hardhat instalado:

```bash
# No terminal, na pasta do projeto
npx hardhat flatten contracts/VBMSPoolTroll.sol > VBMSPoolTroll_flattened.sol
npx hardhat flatten contracts/VBMSPokerBattle.sol > VBMSPokerBattle_flattened.sol
npx hardhat flatten contracts/VBMSBetting.sol > VBMSBetting_flattened.sol
```

---

## Passo 2: Verificar no Basescan (Interface Web)

### Para VBMSPoolTroll:

1. **Acesse:** https://basescan.org/address/[SEU_ENDERECO_DO_CONTRATO]
2. **Clique:** Aba "Contract" → "Verify and Publish"

3. **Preencha o Formulário:**

```
┌─────────────────────────────────────────────────────────┐
│ Please select Compiler Type                             │
│ ○ Solidity (Single file)  ← SELECIONE ESTE             │
│ ○ Solidity (Multi-part files)                          │
│ ○ Solidity (Standard-Json-Input)                       │
│ ○ Vyper (Experimental)                                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Please select Compiler Version                          │
│ v0.8.20+commit.a1b79de6  ← SELECIONE ESTE              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Please select Open Source License Type                  │
│ 3) MIT License (MIT)  ← SELECIONE ESTE                 │
└─────────────────────────────────────────────────────────┘

[Continue] ←  CLIQUE AQUI
```

4. **Cole o Código:**
   - Cole TODO o conteúdo do arquivo flattened
   - Ative "Optimization": **Yes**
   - Runs: **200**

5. **Constructor Arguments (ABI-Encoded):**

Para obter os constructor arguments:

**Método 1: Via Remix**
- No Remix, depois de deployar
- Vá em "Deployed Contracts"
- Copie o "input data" da transação de deploy
- Remova os primeiros caracteres (bytecode) e pegue apenas os últimos 128 caracteres

**Método 2: Via Etherscan**
- Vá na transação de deploy
- Copie o "Input Data"
- Use esta ferramenta: https://abi.hashex.org/
- Cole o input data e extraia os constructor args

**Método 3: Calcular Manualmente**

Para VBMSPoolTroll, os constructor args são:
```
_vbmsToken: 0xb03439567cd22f278b21e1ffcdfb8e1696763827
_backendSigner: 0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52
```

Cole isso no campo "Constructor Arguments ABI-encoded":
```
000000000000000000000000b03439567cd22f278b21e1ffcdfb8e16978382700000000000000000000000002a9585da40de004d6ff0f5f12cfe726bd2f98b52
```

6. **Clique em "Verify and Publish"**

---

## Passo 3: Repetir para Outros Contratos

### VBMSPokerBattle Constructor Args:
```
_vbmsToken: 0xb03439567cd22f278b21e1ffcdfb8e1696763827
_poolAddress: [ENDEREÇO_DO_VBMSPoolTroll_QUE_VOCÊ_DEPLOYOU]
_backendSigner: 0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52
```

### VBMSBetting Constructor Args:
```
_vbmsToken: 0xb03439567cd22f278b21e1ffcdfb8e1696763827
_poolAddress: [ENDEREÇO_DO_VBMSPoolTroll]
_backendSigner: 0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52
_pokerBattleContract: [ENDEREÇO_DO_VBMSPokerBattle]
```

---

## Método Alternativo: Usar API do Basescan

Se você tem chave de API do Basescan:

```bash
# Instalar hardhat-etherscan
npm install --save-dev @nomicfoundation/hardhat-verify

# No hardhat.config.js, adicionar:
etherscan: {
  apiKey: "SUA_BASESCAN_API_KEY"
}

# Verificar
npx hardhat verify --network base [ENDERECO_CONTRATO] "CONSTRUCTOR_ARG1" "CONSTRUCTOR_ARG2"
```

**Exemplo para VBMSPoolTroll:**
```bash
npx hardhat verify --network base 0x[ENDERECO_POOL] \
  "0xb03439567cd22f278b21e1ffcdfb8e1696763827" \
  "0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52"
```

---

## ⚠️ Problemas Comuns

### Erro: "Compiled contract mismatch"
**Solução:** Certifique-se de usar:
- Compiler: v0.8.20
- Optimizer: Enabled
- Runs: 200

### Erro: "Constructor arguments invalid"
**Solução:**
- Use o input data da transação de deploy
- Ou use a ferramenta ABI encoder

### Erro: "Already verified"
**Solução:**
- Contrato já está verificado! ✅

---

## 📋 Checklist de Verificação

- [ ] Contrato deployado com sucesso
- [ ] Anotou o endereço do contrato
- [ ] Tem o código fonte (flattened)
- [ ] Sabe os constructor arguments usados
- [ ] Compiler version: 0.8.20
- [ ] Optimization: Yes, 200 runs
- [ ] License: MIT
- [ ] Verificou no Basescan
- [ ] Contrato aparece como "Verified" ✅

---

## 🎯 Links Úteis

- Basescan: https://basescan.org
- ABI Encoder: https://abi.hashex.org/
- Remix: https://remix.ethereum.org
- Hardhat Verify Docs: https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify

---

## 💡 Dica Final

**SEMPRE SALVE:**
1. Endereço de cada contrato deployado
2. Transaction hash do deploy
3. Constructor arguments usados
4. Código fonte flattened

Isso vai facilitar MUITO a verificação e futuras auditorias!

Good luck! 🚀
