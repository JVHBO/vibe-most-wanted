# 🚀 Guia de Deploy dos Contratos VBMS

Este guia cobre o deploy de **3 contratos**:
1. **VBMSPoolTroll** - Claims simples (missões, PvE, PvP)
2. **VBMSPokerBattle** - Poker battles com stakes
3. **VBMSBetting** - Apostas de espectadores

⚠️ **IMPORTANTE:** Deploy na ordem correta! VBMSPoolTroll → VBMSPokerBattle → VBMSBetting

---

## 📝 Opção 1: Deploy via Remix (RECOMENDADO)

### Passo 1: Preparar os arquivos
1. Abra https://remix.ethereum.org
2. Crie uma nova workspace
3. Copie o conteúdo de todos os contratos:
   - `contracts/VBMSPoolTroll.sol`
   - `contracts/VBMSPokerBattle.sol`
   - `contracts/VBMSBetting.sol`
   - `contracts/MockERC20.sol` (só para testes locais)

### Passo 2: Instalar dependências
1. No Remix, vá em "File Explorer"
2. Crie a pasta `@openzeppelin/contracts`
3. Ou use o plugin "Remix Solidity Compiler" que já tem OpenZeppelin

**MAIS FÁCIL:**
- Clique em "Plugin Manager"
- Ative "Flattener"
- Use para gerar um arquivo único com todas as dependências

### Passo 3: Compilar
1. Vá na aba "Solidity Compiler"
2. Escolha versão: `0.8.20`
3. Enable optimization: `200 runs`
4. Compile todos os 3 contratos

### Passo 4A: Deploy VBMSPoolTroll (PRIMEIRO)
1. Vá na aba "Deploy & Run Transactions"
2. Environment: Selecione "Injected Provider - MetaMask"
3. Conecte sua MetaMask na rede Base
4. Selecione contrato: `VBMSPoolTroll`
5. Preencha os parâmetros do constructor:
   - `_vbmsToken`: `0xb03439567cd22f278b21e1ffcdfb8e1696763827`
   - `_backendSigner`: Endereço da carteira que vai assinar claims
6. Clique "Deploy"
7. Confirme no MetaMask
8. **COPIE O ENDEREÇO DO CONTRATO DEPLOYADO!** (você vai precisar!)

### Passo 4B: Deploy VBMSPokerBattle (SEGUNDO)
1. Selecione contrato: `VBMSPokerBattle`
2. Preencha os parâmetros do constructor:
   - `_vbmsToken`: `0xb03439567cd22f278b21e1ffcdfb8e1696763827`
   - `_poolAddress`: *ENDEREÇO DO VBMSPoolTroll QUE VOCÊ DEPLOYOU*
   - `_backendSigner`: Endereço da carteira que vai assinar resultados
3. Clique "Deploy"
4. Confirme no MetaMask
5. **COPIE O ENDEREÇO DO CONTRATO DEPLOYADO!**

### Passo 4C: Deploy VBMSBetting (TERCEIRO)
1. Selecione contrato: `VBMSBetting`
2. Preencha os parâmetros do constructor:
   - `_vbmsToken`: `0xb03439567cd22f278b21e1ffcdfb8e1696763827`
   - `_poolAddress`: *ENDEREÇO DO VBMSPoolTroll*
   - `_backendSigner`: Endereço da carteira que vai assinar resultados
   - `_pokerBattleContract`: *ENDEREÇO DO VBMSPokerBattle*
3. Clique "Deploy"
4. Confirme no MetaMask
5. **COPIE O ENDEREÇO DO CONTRATO DEPLOYADO!**

### Passo 5: Verificar no Basescan
Repita para cada um dos 3 contratos:

1. Copie o endereço do contrato deployado
2. Vá em https://basescan.org
3. Cole o endereço
4. Clique "Verify and Publish"
5. Selecione:
   - Compiler: `0.8.20`
   - Optimization: `Yes`, `200 runs`
   - Cole o código (use Flattener para pegar código completo)
6. Verifique os 3 contratos:
   - ✅ VBMSPoolTroll
   - ✅ VBMSPokerBattle
   - ✅ VBMSBetting

---

## 🧪 Opção 2: Testar Localmente Primeiro (MAIS SEGURO)

### Passo 1: Instalar Hardhat
```bash
cd vibe-most-wanted
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
# Escolha: "Create a JavaScript project"
```

### Passo 2: Configurar Hardhat
Arquivo `hardhat.config.js`:
```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  }
};
```

### Passo 3: Script de Deploy Local
Criar `scripts/deploy-local.js`:
```javascript
const hre = require("hardhat");

async function main() {
  const [deployer, backendSigner, user] = await hre.ethers.getSigners();

  console.log("Deploying contracts with:", deployer.address);
  console.log("Backend signer:", backendSigner.address);

  // 1. Deploy Mock VBMS Token
  console.log("\n1. Deploying Mock VBMS...");
  const MockVBMS = await hre.ethers.getContractFactory("MockVBMS");
  const vbmsToken = await MockVBMS.deploy();
  await vbmsToken.waitForDeployment();
  const vbmsAddress = await vbmsToken.getAddress();
  console.log("Mock VBMS deployed to:", vbmsAddress);

  // 2. Deploy Pool
  console.log("\n2. Deploying VBMSPoolTroll...");
  const VBMSPool = await hre.ethers.getContractFactory("VBMSPoolTroll");
  const pool = await VBMSPool.deploy(vbmsAddress, backendSigner.address);
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  console.log("VBMSPoolTroll deployed to:", poolAddress);

  // 3. Fund the pool
  console.log("\n3. Funding pool with 1M VBMS...");
  const fundAmount = hre.ethers.parseEther("1000000");
  await vbmsToken.transfer(poolAddress, fundAmount);
  console.log("Pool funded!");

  // 4. Test claim
  console.log("\n4. Testing claim...");
  const claimAmount = hre.ethers.parseEther("100");
  const nonce = hre.ethers.id("test-nonce-1");

  // Create signature
  const messageHash = hre.ethers.solidityPackedKeccak256(
    ["address", "uint256", "bytes32"],
    [user.address, claimAmount, nonce]
  );
  const signature = await backendSigner.signMessage(
    hre.ethers.getBytes(messageHash)
  );

  // Claim
  await pool.connect(user).claimVBMS(claimAmount, nonce, signature);

  const userBalance = await vbmsToken.balanceOf(user.address);
  console.log("User claimed:", hre.ethers.formatEther(userBalance), "VBMS");

  console.log("\n✅ All tests passed!");
  console.log("\nContract Addresses:");
  console.log("- VBMS Token:", vbmsAddress);
  console.log("- Pool:", poolAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### Passo 4: Rodar Testes
```bash
# Terminal 1: Iniciar rede local
npx hardhat node

# Terminal 2: Deploy
npx hardhat run scripts/deploy-local.js --network localhost
```

---

## 📋 CHECKLIST PRÉ-DEPLOY

Antes de fazer deploy de verdade na Base:

- [ ] Testei todos os 3 contratos localmente?
- [ ] Tenho ETH na Base para pagar gas (~$20-30 para 3 contratos)?
- [ ] Guardei o endereço do backend signer?
- [ ] Revisei o código dos contratos?
- [ ] Tenho tokens VBMS para transferir pro pool?
- [ ] Entendo a ordem de deploy: Pool → Battle → Betting?

---

## 🔐 SEGURANÇA

**NUNCA compartilhe:**
- ❌ Private keys
- ❌ Seed phrases
- ❌ Senhas

**Use MetaMask para:**
- ✅ Assinar transações
- ✅ Deploy via Remix
- ✅ Interagir com contratos

---

## 📞 PRÓXIMOS PASSOS

Depois do deploy dos 3 contratos:

### 1. Copiar endereços
Anote todos os endereços deployados:
```
VBMSPoolTroll: 0x...
VBMSPokerBattle: 0x...
VBMSBetting: 0x...
```

### 2. Atualizar `.env.local`:
```bash
NEXT_PUBLIC_VBMS_TOKEN=0xb03439567cd22f278b21e1ffcdfb8e1696763827
NEXT_PUBLIC_VBMS_POOL=0x...           # VBMSPoolTroll
NEXT_PUBLIC_VBMS_POKER_BATTLE=0x...   # VBMSPokerBattle
NEXT_PUBLIC_VBMS_BETTING=0x...        # VBMSBetting
```

### 3. Transferir VBMS tokens pro pool
```solidity
// Via Basescan ou Remix
vbmsToken.transfer(
  VBMS_POOL_ADDRESS,
  1000000000000000000000000  // 1M VBMS (1000000 * 10^18)
)
```

### 4. Configurar backend para criar signatures
Ver `contracts/ARCHITECTURE.md` para exemplos de integração Convex

### 5. Testar integração completa!
- ✅ Testar claim no pool
- ✅ Testar criar battle
- ✅ Testar entrar em battle
- ✅ Testar finalizar battle
- ✅ Testar aposta de espectador
- ✅ Testar claim de winnings

### 6. Monitorar transações on-chain
- Ver eventos no Basescan
- Conferir TX count diário
- **OBJETIVO: 300+ TX/dia = Farcaster ranking UP! 📈**
