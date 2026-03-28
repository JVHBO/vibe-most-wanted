import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// Load environment variables
const PRIVATE_KEY          = process.env.DEPLOYER_PRIVATE_KEY  || "0x0000000000000000000000000000000000000000000000000000000000000001";
const BASE_RPC_URL         = process.env.BASE_RPC_URL          || "https://mainnet.base.org";
const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL  || "https://sepolia.base.org";
const ARB_RPC_URL          = process.env.ARB_RPC_URL           || "https://arb1.arbitrum.io/rpc";
const BASESCAN_API_KEY     = process.env.BASESCAN_API_KEY      || "";
const ARBISCAN_API_KEY     = process.env.ARBISCAN_API_KEY      || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.21",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    base: {
      url: BASE_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 8453,
    },
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 84532,
    },
    arbitrum: {
      url: ARB_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 42161,
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  etherscan: {
    apiKey: {
      base: BASESCAN_API_KEY,
      baseSepolia: BASESCAN_API_KEY,
      arbitrumOne: ARBISCAN_API_KEY,
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      }
    ]
  }
};

export default config;
