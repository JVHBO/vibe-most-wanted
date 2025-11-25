# Deploy VBMSRouter

## Via Remix (Easiest)

1. Go to https://remix.ethereum.org
2. Create new file: VBMSRouter.sol
3. Paste the contract code
4. Compile: Solidity 0.8.20+
5. Deploy:
   - Environment: "Injected Provider - MetaMask"
   - Make sure MetaMask is on Base network
   - Constructor arg: Your referrer address (e.g., 0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52)
   - Click Deploy

## Via Foundry

```bash
# Install foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Deploy
forge create contracts/VBMSRouter.sol:VBMSRouter \
  --rpc-url https://mainnet.base.org \
  --private-key YOUR_PRIVATE_KEY \
  --constructor-args 0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52
```

## After Deploy

Copy the deployed contract address and update:
- `lib/contracts/BoosterDropV2ABI.ts` - add `vbmsRouter` address
- `lib/hooks/useVBMSDex.ts` - use the new router for buyVBMS

## Contract Usage

```solidity
// Buy 1 pack worth of VBMS
VBMSRouter.buyVBMS{value: mintPrice}(1, address(0));

// Buy 5 packs with custom referrer
VBMSRouter.buyVBMS{value: mintPrice * 5}(5, myReferrer);
```

## Verify on Basescan

After deploy, verify the contract:
```bash
forge verify-contract CONTRACT_ADDRESS contracts/VBMSRouter.sol:VBMSRouter \
  --chain base \
  --constructor-args $(cast abi-encode "constructor(address)" 0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52)
```
