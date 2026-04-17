/**
 * Deploy SlotCoinShop on Base + Arbitrum
 * Usage:
 *   node deploy-slot-shop.cjs base
 *   node deploy-slot-shop.cjs arb
 */

const { ethers } = require('ethers');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PRIVATE_KEY = '0xae6b2ed121d89cd2115e4d8adfadbb960b6264d041479c1f21e1d7531182c895';
const DEV_ADDRESS = '0x81CE8c5168895Be0a75C653571ba929941faC16d'; // same signer = dev

// Current prices from Wield (update periodically via setPrice)
// 1 pack = 100k VBMS = 1M coins
const PACK_PRICE_ETH  = '307277179952346'; // 0.000307 ETH in wei (~$0.72 at $2355/ETH)
const PACK_PRICE_USDC = '720000';          // $0.72 USDC (6 decimals)

const CHAINS = {
  base: {
    rpc: 'https://mainnet.base.org',
    chainId: 8453,
    stablecoin: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC Base (6 dec)
    name: 'Base',
    explorerUrl: 'https://basescan.org/address/',
  },
  arb: {
    rpc: 'https://arb1.arbitrum.io/rpc',
    chainId: 42161,
    stablecoin: '0x4ecf61a6c2fab8a047ceb3b3b263b401763e9d49', // USDN ARB (same as raffle)
    name: 'Arbitrum One',
    explorerUrl: 'https://arbiscan.io/address/',
  },
};

async function compile() {
  console.log('Compiling...');
  execSync('npx hardhat compile', { cwd: __dirname, stdio: 'inherit' });
}

async function deploy(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) throw new Error('Use: base or arb');

  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`\nDeploying on ${chain.name}`);
  console.log('Deployer:', wallet.address);
  console.log('Balance:', ethers.formatEther(await provider.getBalance(wallet.address)), 'ETH');

  const artifactPath = path.join(__dirname, 'artifacts/src/SlotCoinShop.sol/SlotCoinShop.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(
    PACK_PRICE_ETH,
    DEV_ADDRESS,
    { gasLimit: 1_500_000 }
  );

  console.log('TX hash:', contract.deploymentTransaction()?.hash);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`✅ SlotCoinShop deployed on ${chain.name}: ${address}`);
  console.log(`   ${chain.explorerUrl}${address}`);

  // Save to deployed addresses
  const deployedPath = path.join(__dirname, 'DEPLOYED_ADDRESSES.md');
  const entry = `\n## SlotCoinShop (${chain.name})\n- Address: \`${address}\`\n- USDC: \`${chain.usdc}\`\n- packPriceETH: ${PACK_PRICE_ETH} wei\n- packPriceUSDC: ${PACK_PRICE_USDC}\n`;
  fs.appendFileSync(deployedPath, entry);

  return address;
}

async function main() {
  const chainKey = process.argv[2];
  if (!chainKey) {
    console.error('Usage: node deploy-slot-shop.cjs [base|arb]');
    process.exit(1);
  }
  await compile();
  await deploy(chainKey);
}

main().catch(e => { console.error(e); process.exit(1); });
