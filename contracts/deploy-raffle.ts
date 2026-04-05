/**
 * Deploy VBMSRaffleARB (Arbitrum) + VBMSRaffleBase (Base)
 *
 * Before running:
 * 1. Set env vars: DEPLOYER_PRIVATE_KEY, ARB_RPC_URL, BASE_RPC_URL, ARBISCAN_API_KEY, BASESCAN_API_KEY
 * 2. Create Chainlink VRF subscription at vrf.chain.link (Arbitrum One)
 *    → Fund with LINK, note the subscription ID
 * 3. Run:
 *    npx hardhat run deploy-raffle.ts --network arbitrum   (ARB contract)
 *    npx hardhat run deploy-raffle.ts --network base       (Base contract)
 */

import { ethers, network, run } from "hardhat";

// ─── Chainlink addresses (Arbitrum One) ──────────────────────────────────────
const ARB_VRF_COORDINATOR = "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e";
const ARB_VRF_KEYHASH     = "0x027f94ff1465b3525f9fc03e9ff7d6d2c0953482246dd6ae07570c45d6631414"; // 500 gwei lane
const ARB_ETH_USD_FEED    = "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612";

// ─── Token addresses ──────────────────────────────────────────────────────────
const ARB_USND  = "0x4ecf61a6c2fab8a047ceb3b3b263b401763e9d49";
const BASE_VBMS = "0xf14c1dc8ce5fe65413379f76c43fa1460c31e728";
const BASE_POOL = "0x062b914668f3fD35c3Ae02e699cB82e1cF4bE18b"; // VBMSPoolTroll

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Network:", network.name);

  if (network.name === "arbitrum") {
    await deployARB(deployer);
  } else if (network.name === "base") {
    await deployBase(deployer);
  } else {
    throw new Error("Run with --network arbitrum OR --network base");
  }
}

async function deployARB(deployer: any) {
  const VRF_SUB_ID = process.env.VRF_SUBSCRIPTION_ID;
  if (!VRF_SUB_ID) throw new Error("Set VRF_SUBSCRIPTION_ID env var");

  console.log("\n─── Deploying VBMSRaffleARB on Arbitrum One ───");

  const Factory = await ethers.getContractFactory("VBMSRaffleARB");
  const contract = await Factory.deploy(
    ARB_VRF_COORDINATOR,
    ARB_VRF_KEYHASH,
    BigInt(VRF_SUB_ID),
    ARB_ETH_USD_FEED,
    ARB_USND
  );

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("✅ VBMSRaffleARB deployed:", address);

  console.log("\n📋 Next steps:");
  console.log("1. Add contract as VRF consumer at vrf.chain.link →", address);
  console.log("2. Fund VRF subscription with LINK");
  console.log("3. Update CONVEX env: RAFFLE_ARB_ADDRESS=" + address);

  await verifyContract(address, [
    ARB_VRF_COORDINATOR, ARB_VRF_KEYHASH, BigInt(VRF_SUB_ID), ARB_ETH_USD_FEED, ARB_USND
  ]);
}

async function deployBase(deployer: any) {
  console.log("\n─── Deploying VBMSRaffleBase on Base Mainnet ───");

  const Factory = await ethers.getContractFactory("VBMSRaffleBase");
  const contract = await Factory.deploy(BASE_VBMS, BASE_POOL);

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("✅ VBMSRaffleBase deployed:", address);

  console.log("\n📋 Next steps:");
  console.log("1. Update CONVEX env: RAFFLE_BASE_ADDRESS=" + address);
  console.log("2. Call activateRaffle(100000000000000000000000) to set 100k VBMS ticket price");

  await verifyContract(address, [BASE_VBMS, BASE_POOL]);
}

async function verifyContract(address: string, args: any[]) {
  if (!process.env.ARBISCAN_API_KEY && !process.env.BASESCAN_API_KEY) return;
  console.log("\nVerifying on explorer...");
  await new Promise(r => setTimeout(r, 10000)); // wait for indexing
  try {
    await run("verify:verify", { address, constructorArguments: args });
    console.log("✅ Verified");
  } catch (e: any) {
    console.warn("Verify:", e.message);
  }
}

main().catch(console.error);
