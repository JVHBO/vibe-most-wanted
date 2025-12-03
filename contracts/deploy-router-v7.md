# Deploy VBMSRouter V7 - Ownership-Based Token Discovery

## Por que V7 funciona quando V1-V6 falharam?

**Problema V1-V6:** Todos dependiam de alguma forma de "adivinhar" o tokenId antes ou durante o mint:
- V1-V3: Frontend passava startingTokenId → race condition
- V4: Callback `onERC721Received` → só funciona com `_safeMint`
- V5: Leitura de storage slot → race condition
- V6: Callback + fallback try-catch → try-catch nas vendas é lento e impreciso

**Solução V7:** Verifica OWNERSHIP depois do mint!

```solidity
// 1. Lê totalSupply antes
uint256 supplyBefore = drop.totalSupply();

// 2. Minta os packs
drop.mint{value: msg.value}(quantity, address(this), referrer, "");

// 3. Lê totalSupply depois
uint256 supplyAfter = drop.totalSupply();

// 4. Busca pelos tokens que EU possuo
for (uint256 tokenId = supplyBefore - 10; tokenId <= supplyAfter + 10; tokenId++) {
    if (nft.ownerOf(tokenId) == address(this)) {
        // Encontrei um token meu!
        ownedTokenIds[found++] = tokenId;
    }
}

// 5. Vende só os que verificamos ser nossos
for (uint256 i = 0; i < quantity; i++) {
    drop.sellAndClaimOffer(ownedTokenIds[i], address(this), referrer);
}
```

**Por que é race-condition proof:**
- Não importa se outras transações mintaram no mesmo bloco
- Verificamos ownership DEPOIS do mint (mesma transação = atômico)
- `ownerOf` é uma view function (barata)
- Só vendemos tokens que VERIFICAMOS ser nossos

## Deploy via Remix

1. Vá para https://remix.ethereum.org
2. Crie arquivo: `VBMSRouterV7.sol`
3. Cole o código de `contracts/VBMSRouterV7.sol`
4. Compile: Solidity 0.8.20+
5. Deploy:
   - Environment: "Injected Provider - MetaMask"
   - Rede: Base Mainnet (chainId 8453)
   - Sem argumentos no constructor (referrer hardcoded)
   - Click Deploy

## Deploy via Foundry

```bash
# Instalar foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Deploy V7
forge create contracts/VBMSRouterV7.sol:VBMSRouterV7 \
  --rpc-url https://mainnet.base.org \
  --private-key YOUR_PRIVATE_KEY
```

## Após Deploy

1. Copie o endereço do contrato deployado
2. Atualize `lib/contracts/BoosterDropV2ABI.ts`:

```typescript
export const VBMS_CONTRACTS = {
  // ... outros
  vbmsRouter: 'NOVO_ENDERECO_V7' as `0x${string}`,
};
```

## V7 API

### `buyVBMS(uint256 quantity)`
Compra VBMS com ETH. Só precisa da quantidade!

### `getMintPrice(uint256 quantity)`
Retorna preço em ETH para X packs.

## Verificar no Basescan

```bash
forge verify-contract CONTRACT_ADDRESS contracts/VBMSRouterV7.sol:VBMSRouterV7 \
  --chain base
```

## Diferenças V6 → V7

| Aspecto | V6 | V7 |
|---------|----|----|
| Parâmetros | `quantity, expectedStartTokenId` | `quantity` |
| Descoberta de tokens | try-catch sell | ownerOf check |
| Referrer | Constructor param | Hardcoded |
| Gas efficiency | Médio (try-catch) | Alto (view calls) |
| Confiabilidade | Média | Alta |
