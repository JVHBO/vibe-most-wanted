/**
 * Smart Contract Addresses and ABIs
 *
 * VBMS token contracts deployed on Base Mainnet
 */

// Contract addresses from DEPLOYED_ADDRESSES.md
export const CONTRACTS = {
  // VBMS Token (ERC20)
  VBMSToken: process.env.NEXT_PUBLIC_VBMS_TOKEN || '0xb03439567cd22f278b21e1ffcdfb8e1696763827',

  // VBMSPoolTroll (Claims Distribution)
  VBMSPoolTroll: process.env.NEXT_PUBLIC_VBMS_POOL_TROLL || '0x062b914668f3fD35c3Ae02e699cB82e1cF4bE18b',

  // VBMSPokerBattle V4 (PvP Stakes)
  VBMSPokerBattle: process.env.NEXT_PUBLIC_POKER_BATTLE_V4 || '0xce766404d1C4788078C4E77D12B13793afceD867',

  // VBMSBetting (Spectator Bets)
  VBMSBetting: process.env.NEXT_PUBLIC_VBMS_BETTING || '0x668c8d288b8670fdb9005fa91be046e4c2585af4',
} as const;

// ERC20 ABI - Standard functions used in the app
export const ERC20_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// VBMSPokerBattle ABI - Core battle functions
export const VBMS_POKER_BATTLE_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "stakeAmount", "type": "uint256"}],
    "name": "createBattle",
    "outputs": [{"internalType": "uint256", "name": "battleId", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "battleId", "type": "uint256"}],
    "name": "joinBattle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "battleId", "type": "uint256"}],
    "name": "cancelBattle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "battleId", "type": "uint256"},
      {"internalType": "address", "name": "winner", "type": "address"},
      {"internalType": "bytes", "name": "signature", "type": "bytes"}
    ],
    "name": "finishBattle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "player", "type": "address"}],
    "name": "getActiveBattle",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "battleId", "type": "uint256"}],
    "name": "getBattle",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "id", "type": "uint256"},
          {"internalType": "address", "name": "creator", "type": "address"},
          {"internalType": "address", "name": "opponent", "type": "address"},
          {"internalType": "uint256", "name": "stakeAmount", "type": "uint256"},
          {"internalType": "bool", "name": "isActive", "type": "bool"},
          {"internalType": "bool", "name": "isFinished", "type": "bool"},
          {"internalType": "address", "name": "winner", "type": "address"},
          {"internalType": "uint256", "name": "createdAt", "type": "uint256"}
        ],
        "internalType": "struct VBMSPokerBattle.Battle",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// VBMSPoolTroll ABI - Claim functions
export const VBMS_POOL_TROLL_ABI = [
  {
    "inputs": [
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "bytes32", "name": "nonce", "type": "bytes32"},
      {"internalType": "bytes", "name": "signature", "type": "bytes"}
    ],
    "name": "claimVBMS",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPoolBalance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getRemainingDailyAllowance",
    "outputs": [{"internalType": "uint256", "name": "remaining", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "nonce", "type": "bytes32"}],
    "name": "usedNonces",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "bytes32", "name": "nonce", "type": "bytes32"}
    ],
    "name": "VBMSClaimed",
    "type": "event"
  }
] as const;
