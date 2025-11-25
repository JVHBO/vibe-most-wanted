# Deploy VBMSRouter V4 - Race-Condition Proof

## The REAL Bug That V4 Fixes

**V3 Problem:** Pre-calculated `startingTokenId` causes failures when another transaction mints first.

```
Frontend reads: nextTokenId = 11275
User submits tx with startingTokenId = 11275
Another tx mints first → nextTokenId becomes 11276
Your tx mints tokenId 11276
Your tx tries to sell tokenId 11275 (which you don't own!)
→ REVERT
```

**V4 Solution:** Capture ACTUAL minted tokenIds via `onERC721Received` callback.

```solidity
// V3 (BROKEN):
function buyVBMS(uint256 quantity, uint256 startingTokenId, ...) {
    drop.mint(...);
    for (i < quantity) {
        tokenId = startingTokenId + i;  // ❌ Pre-calculated, may be wrong!
        drop.sellAndClaimOffer(tokenId, ...);
    }
}

// V4 (FIXED):
function buyVBMS(uint256 quantity) {
    drop.mint(...);  // onERC721Received stores ACTUAL tokenIds
    for (i < quantity) {
        tokenId = _receivedTokenIds[i];  // ✅ Actual tokenId from callback!
        drop.sellAndClaimOffer(tokenId, ...);
    }
}
```

## Deploy via Remix

1. Go to https://remix.ethereum.org
2. Create new file: `VBMSRouterV4.sol`
3. Paste the contract code from `contracts/VBMSRouterV4.sol`
4. Compile: Solidity 0.8.20+
5. Deploy:
   - Environment: "Injected Provider - MetaMask"
   - Make sure MetaMask is on Base network
   - Constructor arg: `0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52` (vibemostwanted referrer)
   - Click Deploy

## Deploy via Foundry

```bash
# Install foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Deploy V4
forge create contracts/VBMSRouterV4.sol:VBMSRouterV4 \
  --rpc-url https://mainnet.base.org \
  --private-key YOUR_PRIVATE_KEY \
  --constructor-args 0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52
```

## After Deploy

1. Copy the deployed contract address
2. Update `lib/contracts/BoosterDropV2ABI.ts`:

```typescript
export const VBMS_CONTRACTS = {
  // ... others
  vbmsRouter: 'NEW_V4_ADDRESS' as `0x${string}`,
};
```

3. Update frontend to call new simpler function:

```typescript
// OLD (V3) - Required startingTokenId:
await router.write.buyVBMS([quantity, startingTokenId, referrer], { value: price });

// NEW (V4) - No startingTokenId needed!
await router.write.buyVBMS([quantity], { value: price });
```

## V4 API

### `buyVBMS(uint256 quantity)`
Buy VBMS using the hardcoded BoosterDrop address. Simplified - no tokenId needed!

### `buy(address boosterDrop, uint256 quantity)`
Generic buy for any BoosterDrop collection.

### `getVBMSMintPrice(uint256 quantity)`
Get ETH price for X VBMS packs.

## Why V4 Works

1. **No pre-calculation**: Doesn't rely on frontend-provided tokenId
2. **Callback capture**: Uses `onERC721Received` to capture the ACTUAL tokenIds minted
3. **Reentrancy protected**: `_inBuyOperation` flag prevents issues
4. **Race-proof**: Works even if 100 other transactions mint before yours

## Verify on Basescan

```bash
forge verify-contract CONTRACT_ADDRESS contracts/VBMSRouterV4.sol:VBMSRouterV4 \
  --chain base \
  --constructor-args $(cast abi-encode "constructor(address)" 0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52)
```
