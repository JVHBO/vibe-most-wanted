/**
 * BoosterDropV2 ABI
 * Contract: 0xf14c1dc8ce5fe65413379f76c43fa1460c31e728 ($VBMS)
 */

export const BOOSTER_DROP_V2_ABI = [
  { inputs: [], name: 'name', outputs: [{ name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'owner', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'quantity', type: 'uint256' }], name: 'getMintPrice', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalSupply', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'owner', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'tokenId', type: 'uint256' }], name: 'ownerOf', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'tokenId', type: 'uint256' }], name: 'tokenURI', outputs: [{ name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'quantity', type: 'uint256' }, { name: 'recipient', type: 'address' }, { name: 'referrer', type: 'address' }, { name: 'comment', type: 'string' }], name: 'mint', outputs: [], stateMutability: 'payable', type: 'function' },
  { inputs: [{ name: 'quantity', type: 'uint256' }], name: 'mintWithToken', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'recipient', type: 'address' }, { name: 'referrer', type: 'address' }], name: 'sellAndClaimOffer', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'recipient', type: 'address' }, { name: 'referrer', type: 'address' }], name: 'sell', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'tokenId', type: 'uint256' }], name: 'open', outputs: [], stateMutability: 'payable', type: 'function' },
  { inputs: [{ name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], name: 'approve', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], name: 'transferFrom', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { anonymous: false, inputs: [{ indexed: true, name: 'from', type: 'address' }, { indexed: true, name: 'to', type: 'address' }, { indexed: true, name: 'tokenId', type: 'uint256' }], name: 'Transfer', type: 'event' },
] as const;

export const VBMS_CONTRACTS = {
  boosterDrop: '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728' as `0x${string}`,
  boosterToken: '0xb03439567cd22f278b21e1ffcdfb8e1696763827' as `0x${string}`,
  // VBMSRouter V7 Simple - Based on working MintAndSellWrapper pattern
  vbmsRouter: '0x0c403f77a2c5f5e86d5082c8B84db2e3D575D081' as `0x${string}`,
  chainId: 8453,
} as const;

// VBMSRouter V7 ABI - Simple and reliable
// buyVBMSAuto(uint256 quantity) - auto-detects tokenId
// buyVBMS(uint256 quantity, uint256 startingTokenId) - manual tokenId
export const VBMS_ROUTER_ABI = [
  {
    type: 'function',
    name: 'buyVBMSAuto',
    inputs: [{ name: 'quantity', type: 'uint256' }],
    outputs: [],
    stateMutability: 'payable'
  },
  {
    type: 'function',
    name: 'buyVBMS',
    inputs: [
      { name: 'quantity', type: 'uint256' },
      { name: 'startingTokenId', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'payable'
  },
  {
    type: 'function',
    name: 'getVBMSMintPrice',
    inputs: [{ name: 'quantity', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'event',
    name: 'VBMSPurchased',
    inputs: [
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'quantity', type: 'uint256', indexed: false },
      { name: 'ethSpent', type: 'uint256', indexed: false },
      { name: 'vbmsReceived', type: 'uint256', indexed: false }
    ]
  },
] as const;

export const VBMS_DEX_CONSTANTS = {
  TOKENS_PER_PACK: BigInt('100000000000000000000000'),
  DEFAULT_REFERRER: '0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52' as `0x${string}`,
} as const;
