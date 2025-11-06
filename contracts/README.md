# 🪙 VBMS Token Smart Contracts

Contratos Solidity para o sistema de claim de tokens VBMS do Vibe Most Wanted.

---

## 📋 Contratos

### 1. VBMSToken.sol
Token ERC-20 padrão para o VBMS.

**Características**:
- Supply: 10,000,000 VBMS (18 decimais)
- Mintable pelo owner (opcional, supply inicial já mintado)
- Burnable (deflação futura)
- OpenZeppelin padrão

### 2. VBMSClaim.sol
Sistema de pool para claims de VBMS.

**Características**:
- ✅ Signature verification (backend autoriza claims)
- ✅ Rate limiting (1 claim por hora)
- ✅ Daily cap (10,000 VBMS por jogador/dia)
- ✅ Nonce system (previne replay attacks)
- ✅ Pausable (emergências)
- ✅ ReentrancyGuard (segurança)

---

## 🔐 Camadas de Segurança

### 1. Daily Cap (Proteção Anti-Exploit) 🔒

**Problema**: Bug ou exploit poderia permitir jogador drenar pool inteira.

**Solução**: Cap diário de 10,000 VBMS por jogador.

```solidity
uint256 public constant DAILY_CLAIM_CAP = 10_000 * 10**18;

// Reseta automaticamente a cada dia (midnight UTC)
mapping(address => mapping(uint256 => uint256)) public dailyClaimedByPlayer;
```

**Benefícios**:
- Mesmo com exploit, jogador só drena 10K/dia (0.1% do pool)
- Pool de 10M duraria mínimo 1,000 dias mesmo sob ataque
- Tempo para detectar e pausar contrato

### 2. Rate Limiting (Cooldown)

**Proteção**: Mínimo 1 hora entre claims

```solidity
uint256 public constant CLAIM_COOLDOWN = 1 hours;
```

**Benefícios**:
- Previne spam de transactions
- Reduz custos de gas
- Facilita detecção de comportamento suspeito

### 3. Signature Verification

**Proteção**: Backend deve assinar cada claim

```solidity
address public signer; // Endereço do backend

// Cada claim precisa signature válida
bytes32 messageHash = keccak256(abi.encodePacked(player, amount, nonce));
require(recoveredSigner == signer, "Invalid signature");
```

**Benefícios**:
- Apenas claims autorizados pelo backend
- Backend valida saldo no Convex antes de assinar
- Impossível claimar sem aprovação

### 4. Nonce System

**Proteção**: Cada signature só funciona uma vez

```solidity
mapping(bytes32 => bool) public usedNonces;

require(!usedNonces[nonce], "Nonce already used");
usedNonces[nonce] = true;
```

**Benefícios**:
- Previne replay attacks
- Signature não pode ser reutilizada

### 5. Amount Limits

**Proteção**: Min/Max por transação

```solidity
uint256 public constant MIN_CLAIM_AMOUNT = 100 * 10**18;
uint256 public constant MAX_CLAIM_AMOUNT = 100_000 * 10**18;
```

**Benefícios**:
- Previne micro-claims (spam)
- Cap máximo por transaction (100K)
- Combinado com daily cap = 10K/dia real

### 6. Pausable

**Proteção**: Owner pode pausar em emergência

```solidity
function pause() external onlyOwner {
    _pause();
}
```

**Benefícios**:
- Stop imediato em caso de exploit descoberto
- Tempo para investigar e corrigir
- Resume quando seguro

### 7. Emergency Withdraw

**Proteção**: Owner pode resgatar tokens em emergência crítica

```solidity
function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
    // Transfer tokens out
}
```

**Benefícios**:
- Last resort se contrato comprometido
- Salvar pool de desastre total

---

## 📊 Parâmetros de Segurança

| Parâmetro | Valor | Justificativa |
|-----------|-------|---------------|
| **DAILY_CLAIM_CAP** | 10,000 VBMS | Max 0.1% do pool por dia por jogador |
| **CLAIM_COOLDOWN** | 1 hora | Previne spam, facilita detecção |
| **MIN_CLAIM_AMOUNT** | 100 VBMS | Previne micro-claims |
| **MAX_CLAIM_AMOUNT** | 100,000 VBMS | Cap máximo (mas daily cap limita mais) |

### Cenários de Exploit

#### Cenário 1: Bug no Backend (Assina Claims Inválidos)
- **Proteção**: Daily cap limita dano a 10K VBMS/jogador/dia
- **Impacto**: Máximo 0.1% do pool por dia
- **Recovery**: Pausar contrato, corrigir backend, resume

#### Cenário 2: Signature Compromised (Signer Key Leaked)
- **Proteção**: Daily cap + rate limiting + pausable
- **Impacto**: Ataque limitado a 10K/hora por endereço
- **Recovery**: Pause imediato, trocar signer key, resume

#### Cenário 3: Replay Attack (Reusar Signatures)
- **Proteção**: Nonce system
- **Impacto**: Zero (nonce usado = rejeita)
- **Recovery**: Não necessário

#### Cenário 4: Contrato Bug (Reentrancy, etc)
- **Proteção**: ReentrancyGuard + OpenZeppelin padrão
- **Impacto**: Muito baixo (padrões auditados)
- **Recovery**: Emergency withdraw se crítico

---

## 🚀 Deployment

### 1. Preparação

```bash
# Instalar dependências
npm install --save-dev hardhat @openzeppelin/contracts

# Compilar contratos
npx hardhat compile
```

### 2. Deploy VBMSToken

```javascript
// scripts/deploy-token.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying VBMSToken with account:", deployer.address);

  const VBMSToken = await hre.ethers.getContractFactory("VBMSToken");

  // Deploy (owner inicial será o VBMSClaim contract)
  // Por agora, use deployer como owner temporário
  const token = await VBMSToken.deploy(deployer.address);
  await token.deployed();

  console.log("VBMSToken deployed to:", token.address);
  console.log("Total supply:", await token.totalSupply());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### 3. Deploy VBMSClaim

```javascript
// scripts/deploy-claim.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const VBMS_TOKEN_ADDRESS = "0x..."; // Endereço do VBMSToken
  const BACKEND_SIGNER = "0x...";     // Endereço do backend

  console.log("Deploying VBMSClaim with account:", deployer.address);

  const VBMSClaim = await hre.ethers.getContractFactory("VBMSClaim");
  const claim = await VBMSClaim.deploy(VBMS_TOKEN_ADDRESS, BACKEND_SIGNER);
  await claim.deployed();

  console.log("VBMSClaim deployed to:", claim.address);

  // Transferir tokens para o claim contract
  const token = await hre.ethers.getContractAt("VBMSToken", VBMS_TOKEN_ADDRESS);
  const transferTx = await token.transfer(claim.address, ethers.utils.parseEther("10000000"));
  await transferTx.wait();

  console.log("10M VBMS transferred to claim contract");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### 4. Verificação

```bash
# Verificar no Basescan
npx hardhat verify --network base <TOKEN_ADDRESS> <CONSTRUCTOR_ARGS>
npx hardhat verify --network base <CLAIM_ADDRESS> <TOKEN_ADDRESS> <SIGNER_ADDRESS>
```

---

## 🧪 Testing

### Teste Local (Hardhat)

```javascript
// test/VBMSClaim.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VBMSClaim", function () {
  let token, claim, owner, signer, player;

  beforeEach(async () => {
    [owner, signer, player] = await ethers.getSigners();

    // Deploy token
    const VBMSToken = await ethers.getContractFactory("VBMSToken");
    token = await VBMSToken.deploy(owner.address);

    // Deploy claim
    const VBMSClaim = await ethers.getContractFactory("VBMSClaim");
    claim = await VBMSClaim.deploy(token.address, signer.address);

    // Transfer tokens to claim contract
    await token.transfer(claim.address, ethers.utils.parseEther("10000000"));
  });

  it("Should claim with valid signature", async () => {
    const amount = ethers.utils.parseEther("1000");
    const nonce = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("nonce1"));

    // Criar signature
    const messageHash = ethers.utils.solidityKeccak256(
      ["address", "uint256", "bytes32"],
      [player.address, amount, nonce]
    );
    const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));

    // Claim
    await expect(claim.connect(player).claim(amount, nonce, signature))
      .to.emit(claim, "Claimed")
      .withArgs(player.address, amount, nonce, anyValue);

    // Verificar balance
    expect(await token.balanceOf(player.address)).to.equal(amount);
  });

  it("Should reject invalid signature", async () => {
    const amount = ethers.utils.parseEther("1000");
    const nonce = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("nonce1"));
    const badSignature = "0x" + "00".repeat(65);

    await expect(
      claim.connect(player).claim(amount, nonce, badSignature)
    ).to.be.revertedWith("VBMSClaim: Invalid signature");
  });

  it("Should enforce daily cap", async () => {
    // Claim 10K (max daily)
    // ... (implementar teste completo)
  });

  // Mais testes...
});
```

---

## 📱 Integração Frontend

### Exemplo: Claim Button (React + wagmi)

```typescript
// components/ClaimVBMSButton.tsx
import { useAccount, useContractWrite, useWaitForTransaction } from 'wagmi';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

const VBMS_CLAIM_ADDRESS = process.env.NEXT_PUBLIC_VBMS_CLAIM_ADDRESS;

export function ClaimVBMSButton() {
  const { address } = useAccount();

  // 1. Query claimable balance
  const claimableData = useQuery(api.economy.getClaimableBalance, { address });

  // 2. Prepare claim signature (backend)
  const prepareClaimMutation = useMutation(api.economy.prepareClaimSignature);

  // 3. Contract write
  const { write: claimWrite, data: claimData } = useContractWrite({
    address: VBMS_CLAIM_ADDRESS,
    abi: VBMSClaimABI,
    functionName: 'claim',
  });

  // 4. Wait for transaction
  const { isLoading: isConfirming } = useWaitForTransaction({
    hash: claimData?.hash,
    onSuccess: async (receipt) => {
      // Mark as claimed in backend
      await recordClaimMutation({
        address,
        amount: claimableData.claimable,
        txHash: receipt.transactionHash,
      });
    },
  });

  const handleClaim = async () => {
    // Step 1: Backend prepara signature
    const { amount, nonce, message } = await prepareClaimMutation({
      address,
      amount: claimableData.claimable,
    });

    // Step 2: User assina mensagem
    const signature = await signMessageAsync({ message });

    // Step 3: Chama contrato
    claimWrite({
      args: [amount, nonce, signature],
    });
  };

  if (!claimableData || claimableData.claimable === 0) {
    return <div>No VBMS to claim</div>;
  }

  if (!claimableData.canClaimNow) {
    return <div>Cooldown: {claimableData.cooldownRemaining}s</div>;
  }

  return (
    <button onClick={handleClaim} disabled={isConfirming}>
      {isConfirming ? "Claiming..." : `Claim ${claimableData.claimable} VBMS`}
    </button>
  );
}
```

---

## 🔧 Backend Integration (Convex)

### Mutation: prepareClaimSignature

```typescript
// convex/economy.ts
export const prepareClaimSignature = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, { address, amount }) => {
    // 1. Get profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) throw new Error("Profile not found");

    // 2. Verify claimable balance
    const claimedTokens = profile.claimedTokens || 0;
    const claimable = (profile.coins || 0) - claimedTokens;

    if (amount > claimable) {
      throw new Error("Insufficient claimable balance");
    }

    // 3. Check rate limit (1 hour)
    const lastClaim = profile.lastClaimTimestamp || 0;
    const now = Date.now();
    const COOLDOWN = 60 * 60 * 1000; // 1 hour

    if (now - lastClaim < COOLDOWN) {
      const remainingSeconds = Math.ceil((COOLDOWN - (now - lastClaim)) / 1000);
      throw new Error(`Cooldown: wait ${remainingSeconds}s`);
    }

    // 4. Check daily cap (10K VBMS)
    const today = new Date().toISOString().split('T')[0];
    const dailyClaimed = profile.dailyClaimedVBMS?.[today] || 0;
    const DAILY_CAP = 10000;

    if (dailyClaimed + amount > DAILY_CAP) {
      throw new Error(`Daily cap exceeded: ${DAILY_CAP - dailyClaimed} VBMS remaining`);
    }

    // 5. Generate unique nonce
    const nonce = `0x${crypto.randomUUID().replace(/-/g, '')}`;

    // 6. Create message for signing
    // In production, backend would sign this message with private key
    const message = ethers.utils.solidityKeccak256(
      ["address", "uint256", "bytes32"],
      [address, ethers.utils.parseEther(amount.toString()), nonce]
    );

    return {
      amount: ethers.utils.parseEther(amount.toString()).toString(),
      nonce,
      message,
      // In production: signature = await backendWallet.signMessage(message)
    };
  },
});
```

---

## 📊 Monitoring

### On-Chain Events

```solidity
event Claimed(address indexed player, uint256 amount, bytes32 nonce, uint256 timestamp);
```

### Dashboard Queries

```typescript
// Total claimed
const totalClaimed = await claimContract.globalTotalClaimed();

// Pool remaining
const poolBalance = await tokenContract.balanceOf(claimAddress);

// Player stats
const stats = await claimContract.getPlayerStats(playerAddress);
// Returns: lastClaim, total, canClaim, cooldown, dailyClaimed, dailyRemaining
```

---

## ⚠️ Avisos Importantes

1. **Testnet First**: Sempre deploy em testnet primeiro
2. **Audit**: Considerar audit profissional antes do mainnet
3. **Gradual Rollout**: Lançar para poucos jogadores primeiro
4. **Monitor**: Watch claims 24/7 nas primeiras semanas
5. **Pause Ready**: Ter processo claro para pausar em emergência

---

## 📚 Referências

- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Base Network](https://docs.base.org/)
- [Wagmi Documentation](https://wagmi.sh/)

---

**Status**: ✅ PRONTO PARA REVIEW
**Última atualização**: 2025-11-06
