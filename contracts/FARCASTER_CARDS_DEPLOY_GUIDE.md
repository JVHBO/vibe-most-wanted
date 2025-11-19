# 🎴 Farcaster Cards - Guia Completo de Deploy

## 📋 Índice

1. [Contrato FarcasterCards.sol](#contrato)
2. [Preparação do Backend Signer](#signer)
3. [Deploy via Remix IDE](#deploy)
4. [Configuração do Backend](#backend)
5. [Verificação do Contrato](#verificação)
6. [Custos de Gas](#gas)

---

## 1. 📄 Contrato FarcasterCards.sol

### Localização
```
/home/user/vibe-most-wanted/contracts/FarcasterCards.sol
```

### Características Principais

- **Nome da Coleção**: "Vibe Most Wanted - FID Edition"
- **Símbolo**: VMWFID
- **Mint Price**: 0.0005 ETH
- **Max Supply**: Ilimitado (sem limite de supply)
- **Rede**: Base Mainnet (Chain ID: 8453)
- **Biblioteca**: Solady (gas-optimized)
- **Segurança**: EIP-712 signature verification

### Funcionalidades

✅ **presignedMint()** - Minta NFT com assinatura do backend
✅ **withdraw()** - Saca ETH do contrato (owner only)
✅ **setSigner()** - Atualiza endereço do backend signer (owner only)
✅ **closeMinting()** - Fecha minting permanentemente (owner only)
✅ **tokenURI()** - Retorna IPFS URI do token

---

## 2. 🔐 Preparação do Backend Signer

### ✅ VOCÊ JÁ TEM UM SIGNER CONFIGURADO!

O projeto já usa `VBMS_SIGNER_PRIVATE_KEY` em `.env.local` para assinar claims.

### Opção 1: Usar o Mesmo Signer (Recomendado)

Você pode usar a **mesma wallet** que já assina os VBMS claims:

```bash
# Seu .env.local já tem:
VBMS_SIGNER_PRIVATE_KEY=0x...
```

**Vantagens:**
- ✅ Não precisa criar nova wallet
- ✅ Não precisa gerenciar múltiplas private keys
- ✅ Mesma infraestrutura de segurança

### Opção 2: Criar Novo Signer (Isolamento)

Se preferir separar, crie uma nova wallet:

```bash
# Usar Node.js para gerar
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Ou online (menos seguro):
# https://vanity-eth.tk/
```

Adicione ao `.env.local`:

```bash
# Novo signer apenas para Farcaster Cards
FARCASTER_CARDS_SIGNER_PRIVATE_KEY=0x...
```

### ⚠️ Importante: Obter o Endereço Público

Você precisa do **endereço público** (não a private key) para o deploy:

```javascript
// Rode no Node.js ou console do navegador:
const { ethers } = require('ethers');
const privateKey = "0x..."; // SUA PRIVATE KEY
const wallet = new ethers.Wallet(privateKey);
console.log("Endereço do Signer:", wallet.address);
```

**Exemplo de output:**
```
Endereço do Signer: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
```

**🚨 GUARDE ESSE ENDEREÇO - Você vai usar no deploy!**

---

## 3. 🚀 Deploy via Remix IDE

### Passo 1: Abrir Remix

1. Acesse: https://remix.ethereum.org/
2. Crie novo arquivo: `FarcasterCards.sol`
3. Cole o contrato completo (veja seção abaixo)

### Passo 2: Instalar Dependências Solady

**IMPORTANTE**: Remix precisa dos imports do Solady!

1. No Remix, vá em **File Explorer**
2. Crie pasta `.deps/solady/src/`
3. Baixe os arquivos:
   - `tokens/ERC721.sol`
   - `utils/EIP712.sol`
   - `utils/ECDSA.sol`
   - `auth/Ownable.sol`

**OU** use remappings (mais fácil):

Modifique o início do contrato para usar URLs:

```solidity
import {ERC721} from "https://raw.githubusercontent.com/Vectorized/solady/main/src/tokens/ERC721.sol";
import {EIP712} from "https://raw.githubusercontent.com/Vectorized/solady/main/src/utils/EIP712.sol";
import {ECDSA} from "https://raw.githubusercontent.com/Vectorized/solady/main/src/utils/ECDSA.sol";
import {Ownable} from "https://raw.githubusercontent.com/Vectorized/solady/main/src/auth/Ownable.sol";
```

### Passo 3: Compilar

1. Vá em **Solidity Compiler** (ícone à esquerda)
2. Selecione versão: **0.8.4** ou superior
3. Clique em **Compile FarcasterCards.sol**
4. ✅ Verifique se compilou sem erros

### Passo 4: Conectar Wallet

1. Vá em **Deploy & Run Transactions**
2. Em **Environment**, selecione: **Injected Provider - MetaMask**
3. Conecte sua wallet
4. **IMPORTANTE**: Mude network para **Base Mainnet**

**Adicionar Base no MetaMask:**
```
Network Name: Base
RPC URL: https://mainnet.base.org
Chain ID: 8453
Currency Symbol: ETH
Block Explorer: https://basescan.org
```

### Passo 5: Deploy do Contrato

1. Certifique-se que **FarcasterCards** está selecionado
2. Em **DEPLOY**, no campo `_signer`:
   - Cole o **endereço público do signer** (da Etapa 2)
   - Exemplo: `0x742d35Cc6634C0532925a3b844Bc454e4438f44e`

3. Clique em **transact** (deploy)
4. Confirme a transação no MetaMask

**Gas Estimado para Deploy**: ~2,500,000 gas (~0.001 ETH na Base)

### Passo 6: Copiar Endereço do Contrato

Após deploy:
1. Vá em **Deployed Contracts** (embaixo)
2. Copie o endereço do contrato
3. Exemplo: `0x1234...abcd`

**🚨 GUARDE ESSE ENDEREÇO!**

---

## 4. ⚙️ Configuração do Backend

### Passo 1: Adicionar Variáveis ao .env.local

```bash
# Backend Signer (se usar o mesmo do VBMS)
VBMS_SIGNER_PRIVATE_KEY=0x... # Já existe

# OU (se criou novo signer)
FARCASTER_CARDS_SIGNER_PRIVATE_KEY=0x...

# Endereço do contrato deployado
FARCASTER_CARDS_CONTRACT_ADDRESS=0x1234...abcd  # COLE O ENDEREÇO DO DEPLOY

# Neynar API (já existe)
NEYNAR_API_KEY=REDACTED
```

### Passo 2: Criar Endpoint de Assinatura

Crie arquivo: `app/api/farcaster/mint-signature/route.ts`

```typescript
/**
 * API Route: Sign Farcaster Card Mint
 *
 * Verifies FID ownership and signs EIP-712 message for minting
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getUserByFid } from '@/lib/neynar';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, fid, ipfsURI } = body;

    if (!address || !fid || !ipfsURI) {
      return NextResponse.json(
        { error: 'Missing required fields: address, fid, and ipfsURI' },
        { status: 400 }
      );
    }

    console.log('🔍 Verifying FID ownership:', { address, fid });

    // 1. Fetch FID data from Neynar
    const user = await getUserByFid(fid);
    if (!user) {
      return NextResponse.json(
        { error: `FID ${fid} not found on Farcaster` },
        { status: 404 }
      );
    }

    // 2. Verify ownership: check if connected address owns the FID
    const normalizedAddress = address.toLowerCase();
    const verifiedAddresses = user.verified_addresses.eth_addresses.map(a => a.toLowerCase());

    if (!verifiedAddresses.includes(normalizedAddress)) {
      return NextResponse.json({
        error: 'You do not own this FID',
        fid,
        yourAddress: address,
        fidOwners: user.verified_addresses.eth_addresses,
      }, { status: 403 });
    }

    console.log('✅ Ownership verified for FID', fid);

    // 3. Get signer private key from environment
    const SIGNER_PRIVATE_KEY =
      process.env.FARCASTER_CARDS_SIGNER_PRIVATE_KEY ||
      process.env.VBMS_SIGNER_PRIVATE_KEY;

    if (!SIGNER_PRIVATE_KEY) {
      throw new Error('Signer private key not configured');
    }

    // 4. Create wallet from private key
    const wallet = new ethers.Wallet(SIGNER_PRIVATE_KEY);

    // 5. Get contract address
    const contractAddress = process.env.FARCASTER_CARDS_CONTRACT_ADDRESS;
    if (!contractAddress) {
      throw new Error('FARCASTER_CARDS_CONTRACT_ADDRESS not configured');
    }

    // 6. Define EIP-712 domain (must match contract)
    const domain = {
      name: 'Vibe Most Wanted - FID Edition',
      version: '1',
      chainId: 8453, // Base mainnet
      verifyingContract: contractAddress,
    };

    // 7. Define EIP-712 types (must match contract)
    const types = {
      MintPermit: [
        { name: 'to', type: 'address' },
        { name: 'fid', type: 'uint256' },
        { name: 'ipfsURI', type: 'string' },
      ],
    };

    // 8. Create message to sign
    const message = {
      to: address,
      fid: fid,
      ipfsURI: ipfsURI,
    };

    // 9. Sign EIP-712 typed data
    const signature = await wallet.signTypedData(domain, types, message);

    console.log('✅ Signature generated for FID', fid);

    return NextResponse.json({
      signature,
      message: 'Signature generated successfully',
      fid,
      address,
    });

  } catch (error: any) {
    console.error('❌ Error signing mint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate signature' },
      { status: 500 }
    );
  }
}
```

### Passo 3: Adicionar ao Vercel (Produção)

No Vercel Dashboard:

1. Vá em **Settings** → **Environment Variables**
2. Adicione:
   - `FARCASTER_CARDS_CONTRACT_ADDRESS` = `0x...` (endereço do contrato)
   - `FARCASTER_CARDS_SIGNER_PRIVATE_KEY` = `0x...` (private key do signer)
   - OU use `VBMS_SIGNER_PRIVATE_KEY` se for o mesmo

3. **Redeploy** o projeto

---

## 5. ✅ Verificação do Contrato

### Via BaseScan

1. Acesse: https://basescan.org/address/0x...SEU_CONTRATO...
2. Vá em **Contract** → **Verify and Publish**
3. Preencha:
   - **Compiler Type**: Solidity (Single file)
   - **Compiler Version**: v0.8.4+
   - **License**: MIT

4. Cole o código do contrato (com imports resolvidos)
5. Em **Constructor Arguments**, cole o endereço do signer (em ABI-encoded format)

**Gerar Constructor Arguments:**
```javascript
const ethers = require('ethers');
const signerAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
  ['address'],
  [signerAddress]
);
console.log(encoded.slice(2)); // Remove '0x'
```

6. Clique em **Verify and Publish**

---

## 6. 💰 Custos de Gas

### ⚠️ IMPORTANTE: Signer NÃO Precisa de Gas!

O **backend signer** apenas **assina mensagens off-chain**. Ele **não paga gas**.

**Quem paga gas:**
- ✅ **Usuário que minta** (paga 0.0005 ETH + gas da transação)
- ✅ **Owner do contrato** (você) - apenas para withdraw/setSigner/closeMinting

### Estimativas de Gas (Base Mainnet)

| Operação | Gas Estimado | Custo (@ 0.1 gwei) |
|----------|--------------|-------------------|
| **Deploy do Contrato** | ~2,500,000 | ~0.00025 ETH (~$0.80) |
| **presignedMint()** (usuário) | ~120,000 | ~0.000012 ETH (~$0.04) |
| **withdraw()** (owner) | ~30,000 | ~0.000003 ETH (~$0.01) |
| **setSigner()** (owner) | ~25,000 | ~0.0000025 ETH (~$0.008) |

**Base é MUITO barata!** Gas é 100x mais barato que Ethereum mainnet.

### Saldo Necessário para Deploy

**Wallet do Owner (você):**
- Para deploy: **~0.001 ETH** (com margem de segurança)
- Para testes: **~0.01 ETH** recomendado

**Wallet do Signer (backend):**
- **0 ETH necessário** ✅ (apenas assina off-chain)

---

## 7. 🧪 Testando o Sistema

### Teste 1: Verificar Signer no Contrato

No BaseScan ou Remix:
```solidity
// Chame a função "signer()"
// Deve retornar o endereço que você configurou
```

### Teste 2: Testar Assinatura do Backend

```bash
curl -X POST https://www.vibemostwanted.xyz/api/farcaster/mint-signature \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xSUA_WALLET",
    "fid": 214746,
    "ipfsURI": "ipfs://test"
  }'
```

**Resposta esperada:**
```json
{
  "signature": "0x1234...",
  "message": "Signature generated successfully",
  "fid": 214746,
  "address": "0x..."
}
```

### Teste 3: Mintar um NFT

1. Acesse: https://www.vibemostwanted.xyz/fid (via Farcaster miniapp)
2. Digite seu FID
3. Clique em "Mint Card"
4. Confirme transação (0.0005 ETH + gas)

---

## 8. 📊 Resumo de Configuração

### Checklist Final

- [ ] Contrato compilado no Remix
- [ ] Signer address gerado (endereço público)
- [ ] Contrato deployado na Base Mainnet
- [ ] Endereço do contrato copiado
- [ ] `.env.local` atualizado com:
  - [ ] `FARCASTER_CARDS_CONTRACT_ADDRESS`
  - [ ] `FARCASTER_CARDS_SIGNER_PRIVATE_KEY` (ou usa `VBMS_SIGNER_PRIVATE_KEY`)
- [ ] Variáveis adicionadas no Vercel
- [ ] Endpoint `/api/farcaster/mint-signature` criado
- [ ] Projeto redeployado
- [ ] Contrato verificado no BaseScan
- [ ] Teste de mint funcionando

---

## 9. 🆘 Troubleshooting

### Erro: "Invalid Signature"

**Causa**: Domain separator do backend não bate com o contrato

**Solução**: Verifique se:
- `chainId` é `8453` (Base mainnet)
- `verifyingContract` é o endereço correto do deploy
- `name` é exatamente `"Vibe Most Wanted - FID Edition"`
- `version` é `"1"`

### Erro: "You do not own this FID"

**Causa**: Endereço conectado não está em `verified_addresses` do FID

**Solução**:
1. Vá no Warpcast
2. Settings → Verified Addresses
3. Conecte a wallet que você quer usar para mintar

### Erro: "Insufficient Payment"

**Causa**: Usuário enviou menos de 0.0005 ETH

**Solução**: Frontend deve enviar exatamente `parseEther("0.0005")` como `value`

---

## 10. 🎯 Próximos Passos

Após deploy e configuração:

1. **Testar mint localmente** (localhost:3000/fid)
2. **Testar no staging** (Vercel preview deployment)
3. **Deploy em produção**
4. **Mintar primeiro NFT** (seu FID)
5. **Compartilhar no Farcaster** 🎉

---

**Última atualização:** 2025-01-19
**Status:** Pronto para deploy ✅
