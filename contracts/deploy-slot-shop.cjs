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

const PRIVATE_KEY = process.env.VBMS_SIGNER_PRIVATE_KEY || '0x324282eb211e3be00641b7fc399f1a4323a97a0b0f1218c79f6025b9993e0588';
const DEV_ADDRESS = '0x21c8AbF88f15f1a43CC42a78C8f616a3C2370A70'; // new signer wallet

// v2: price per 100 coins
// 0.000307 ETH / 1M coins → per 100 coins = 0.000307 / 10000 = 0.0000000307 ETH = 30727 wei
// $0.72 USDC / 1M coins → per 100 coins = $0.000000072 USDC = 0.072 units (6 dec) → 1 unit min
// Use 1 unit USDC per 100 coins (minimum representable amount = $0.000001)
const PRICE_PER_100_ETH  = '30727717995';  // ~30727 wei per 100 coins (~$0.000072 at $2355/ETH)
const PRICE_PER_100_USDC = '72';           // 72 micro-USDC per 100 coins ($0.000072)

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
    PRICE_PER_100_ETH,
    DEV_ADDRESS,
    { gasLimit: 1_500_000 }
  );

  console.log('TX hash:', contract.deploymentTransaction()?.hash);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`✅ SlotCoinShop v2 deployed on ${chain.name}: ${address}`);
  console.log(`   ${chain.explorerUrl}${address}`);

  // Add stablecoin after deploy
  const shopContract = new ethers.Contract(address, artifact.abi, wallet);
  console.log(`\nAdding stablecoin ${chain.stablecoin}...`);
  const tx = await shopContract.addToken(chain.stablecoin, PRICE_PER_100_USDC, { gasLimit: 100_000 });
  await tx.wait();
  console.log('✅ Stablecoin added');

  // Save to deployed addresses
  const deployedPath = path.join(__dirname, 'DEPLOYED_ADDRESSES.md');
  const entry = `\n## SlotCoinShop v2 (${chain.name})\n- Address: \`${address}\`\n- pricePerHundredETH: ${PRICE_PER_100_ETH} wei\n- pricePerHundredUSDC/USDN: ${PRICE_PER_100_USDC}\n`;
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
