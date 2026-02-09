/**
 * VBMS Contracts Configuration
 * Base Mainnet (Chain ID: 8453)
 */

export const CONTRACTS = {
  // Contract addresses on Base Mainnet
  VBMSToken: '0xb03439567cd22f278b21e1ffcdfb8e1696763827',
  VBMSPoolTroll: '0x062b914668f3fd35c3ae02e699cb82e1cf4be18b',
  VBMSPokerBattle: '0x01090882A1Cb18CFCA89cB91edE798F0308aB950', // V5 - CURRENT (no activeBattles check)
  VBMSBetting: '0x668c8d288b8670fdb9005fa91be046e4c2585af4', // CURRENT - Spectator betting

  // Chain configuration
  CHAIN_ID: 8453,
  CHAIN_NAME: 'Base',
} as const;

// VBMSPoolTroll ABI (key functions)
export const POOL_ABI = [
  {
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'signature', type: 'bytes' }
    ],
    name: 'claimVBMS',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'bytes32' }],
    name: 'usedNonces',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getDailyClaimInfo',
    outputs: [
      { name: 'remaining', type: 'uint256' },
      { name: 'resetTime', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'dailyClaimLimit',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxClaimAmount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// VBMSPokerBattle ABI (key functions)
export const POKER_BATTLE_ABI = [
  // Read functions
  {
    inputs: [],
    name: 'vbmsToken',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'poolAddress',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'uint256' }],
    name: 'battles',
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'player1', type: 'address' },
      { name: 'player2', type: 'address' },
      { name: 'stake', type: 'uint256' },
      { name: 'createdAt', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'winner', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'activeBattles',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },

  // Write functions
  {
    inputs: [{ name: 'stake', type: 'uint256' }],
    name: 'createBattle',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'battleId', type: 'uint256' }],
    name: 'joinBattle',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'battleId', type: 'uint256' }],
    name: 'cancelBattle',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'battleId', type: 'uint256' },
      { name: 'winner', type: 'address' },
      { name: 'signature', type: 'bytes' }
    ],
    name: 'finishBattle',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'battleId', type: 'uint256' },
      { indexed: true, name: 'player1', type: 'address' },
      { indexed: false, name: 'stake', type: 'uint256' },
    ],
    name: 'BattleCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'battleId', type: 'uint256' },
      { indexed: true, name: 'player2', type: 'address' },
    ],
    name: 'BattleJoined',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'battleId', type: 'uint256' },
    ],
    name: 'BattleCancelled',
    type: 'event',
  },
] as const;

// VBMSBetting ABI (key functions)
export const BETTING_ABI = [
  // Read functions
  {
    inputs: [],
    name: 'vbmsToken',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'address' },
    ],
    name: 'bets',
    outputs: [
      { name: 'bettor', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'predictedWinner', type: 'address' },
      { name: 'claimed', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'uint256' }],
    name: 'battleBets',
    outputs: [
      { name: 'totalBetsOnPlayer1', type: 'uint256' },
      { name: 'totalBetsOnPlayer2', type: 'uint256' },
      { name: 'totalBettors', type: 'uint256' },
      { name: 'resolved', type: 'bool' },
      { name: 'actualWinner', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'totalWinnings',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'totalBetsPlaced',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'correctPredictions',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },

  // Write functions
  {
    inputs: [
      { name: 'battleId', type: 'uint256' },
      { name: 'predictedWinner', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'placeBet',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'battleId', type: 'uint256' }],
    name: 'claimWinnings',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// ERC20 ABI for VBMS Token
export const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
