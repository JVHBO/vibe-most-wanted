import pkg from "hardhat";
const { ethers } = pkg as any;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const VRF_COORDINATOR  = "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e";
  const KEY_HASH         = "0x027f94ff1465b3525f9fc03e9ff7d6d2c0953482246dd6ae07570c45d6631414";
  const SUBSCRIPTION_ID  = "1617999602672790485923587783825558200181355821866801878070639539839664660800";
  const ETH_USD_FEED     = "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612";
  const USND             = "0x4ecf61a6c2fab8a047ceb3b3b263b401763e9d49";

  const factory = await ethers.getContractFactory("VBMSRaffleARB");
  const contract = await factory.deploy(
    VRF_COORDINATOR,
    KEY_HASH,
    SUBSCRIPTION_ID,
    ETH_USD_FEED,
    USND
  );

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("VBMSRaffleARB deployed to:", address);
}

main().catch((e) => { console.error(e); process.exit(1); });
