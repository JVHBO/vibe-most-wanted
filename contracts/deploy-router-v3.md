# Deploy VBMSRouter V3 (CORRIGIDO)

## BUG CORRIGIDO

O router antigo falhava porque a assinatura do mint() estava errada:
- **ERRADO:** `mint(uint256,address,address,address)` → selector `0x70c7ff94`
- **CORRETO:** `mint(uint256,address,address,string)` → selector `0x9acd083e`

O último parâmetro é `string comment`, não `address orderReferrer`!

## Deploy do Router V3 (Corrigido)

### Via Remix (Mais fácil)

1. Go to https://remix.ethereum.org
2. Create new file: `VBMSRouterV3.sol`
3. Paste the contract code from `contracts/VBMSRouterV3.sol`
4. Compile: Solidity 0.8.20+
5. Deploy:
   - Environment: "Injected Provider - MetaMask"
   - Make sure MetaMask is on Base network
   - Constructor arg: Your referrer address (e.g., `0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52`)
   - Click Deploy

### Via Foundry

```bash
# Install foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Deploy V3
forge create contracts/VBMSRouterV3.sol:VBMSRouterV3 \
  --rpc-url https://mainnet.base.org \
  --private-key YOUR_PRIVATE_KEY \
  --constructor-args 0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52
```

## Após Deploy

1. Copy o endereço do contrato deployado
2. Atualizar `lib/contracts/BoosterDropV2ABI.ts`:

```typescript
export const VBMS_CONTRACTS = {
  // ... outros
  vbmsRouter: 'SEU_NOVO_ENDERECO' as `0x${string}`,
};
```

3. Atualizar o ABI para usar a nova função:

```typescript
export const VBMS_ROUTER_ABI = [
  {
    type: 'function',
    name: 'buy',
    inputs: [
      { name: 'boosterDrop', type: 'address' },
      { name: 'quantity', type: 'uint256' },
      { name: 'startingTokenId', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'payable'
  },
  // ... resto
];
```

## Uso do Contrato

```solidity
// Função genérica (qualquer BoosterDrop)
router.buy{value: mintPrice}(
    0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728, // BoosterDrop address
    1,                                            // quantity
    currentTokenId                                // startingTokenId
);

// Função simplificada (VBMS BoosterDrop hardcoded)
router.buyVBMS{value: mintPrice}(
    1,                  // quantity
    currentTokenId,     // startingTokenId
    address(0)          // referrer (0 = default)
);
```

## Diferenças V2 vs V3

| V2 | V3 |
|----|-----|
| buyVBMS(quantity, startingTokenId, referrer) | buy(boosterDrop, quantity, startingTokenId) |
| BoosterDrop hardcoded | BoosterDrop como parâmetro |
| Falha com certos wallets | Mais flexível |

## Verify on Basescan

```bash
forge verify-contract CONTRACT_ADDRESS contracts/VBMSRouterV3.sol:VBMSRouterV3 \
  --chain base \
  --constructor-args $(cast abi-encode "constructor(address)" 0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52)
```
