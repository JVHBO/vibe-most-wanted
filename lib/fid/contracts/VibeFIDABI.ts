/**
 * VibeFID V2 Smart Contract ABI
 * Deployed on Base Mainnet at: 0x60274A138d026E3cB337B40567100FdEC3127565
 * Deployed on Arbitrum One at: TBD (set NEXT_PUBLIC_VIBEFID_ARB_CONTRACT_ADDRESS)
 * Base Mint Price: 0.0003 ETH
 * Arbitrum Mint Price: 0.000225 ETH (25% discount)
 */

export const VIBEFID_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_signer",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "EmptyURI",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "FIDAlreadyMinted",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientPayment",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSignature",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSigner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MintingClosed",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "fid",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "ipfsURI",
        "type": "string"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "presignedMint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "tokenURI",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalMinted",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "fidMinted",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MINT_PRICE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newSigner",
        "type": "address"
      }
    ],
    "name": "setSigner",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const VIBEFID_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_VIBEFID_CONTRACT_ADDRESS || '0x60274A138d026E3cB337B40567100FdEC3127565') as `0x${string}`;
export const VIBEFID_ARB_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_VIBEFID_ARB_CONTRACT_ADDRESS || '') as `0x${string}`;

export const MINT_PRICE = "0.0003"; // ETH (Base)
export const MINT_PRICE_ARB = "0.000225"; // ETH (Arbitrum - 25% discount)

export type VibeFIDChain = "base" | "arbitrum";

export function getVibeFIDConfig(chain: VibeFIDChain) {
  if (chain === "arbitrum") {
    return {
      address: VIBEFID_ARB_CONTRACT_ADDRESS,
      mintPrice: MINT_PRICE_ARB,
      chainId: 42161,
      chainName: "Arbitrum One",
      rpcUrl: "https://arb1.arbitrum.io/rpc",
    };
  }
  return {
    address: VIBEFID_CONTRACT_ADDRESS,
    mintPrice: MINT_PRICE,
    chainId: 8453,
    chainName: "Base",
    rpcUrl: "https://mainnet.base.org",
  };
}
