/**
 * BoosterTokenV2 ABI
 * Based on vibe.market IBoosterTokenV2 interface
 *
 * This contract manages token trading via bonding curves or Uniswap pools
 */

export const BOOSTER_TOKEN_V2_ABI = [
  // ============================================================================
  // READ FUNCTIONS
  // ============================================================================

  // Get quote: how much ETH needed to buy X tokens
  {
    inputs: [{ name: 'tokenAmount', type: 'uint256' }],
    name: 'getEthBuyQuote',
    outputs: [{ name: 'ethAmount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },

  // Get quote: how many tokens for X ETH
  {
    inputs: [{ name: 'ethAmount', type: 'uint256' }],
    name: 'getTokenBuyQuote',
    outputs: [{ name: 'tokenAmount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },

  // Get quote: how much ETH received for selling X tokens
  {
    inputs: [{ name: 'tokenAmount', type: 'uint256' }],
    name: 'getTokenSellQuote',
    outputs: [{ name: 'ethAmount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },

  // Market type: 0 = BONDING_CURVE, 1 = UNISWAP_POOL
  {
    inputs: [],
    name: 'marketType',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },

  // ERC20 standard functions
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
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

  // ============================================================================
  // WRITE FUNCTIONS
  // ============================================================================

  // Buy tokens with ETH
  // Parameters: minTokensOut (slippage), referrer (optional, for fees)
  {
    inputs: [
      { name: 'minTokensOut', type: 'uint256' },
      { name: 'referrer', type: 'address' },
    ],
    name: 'buy',
    outputs: [{ name: 'tokensOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },

  // Sell tokens for ETH
  // Parameters: tokenAmount, minEthOut (slippage)
  {
    inputs: [
      { name: 'tokenAmount', type: 'uint256' },
      { name: 'minEthOut', type: 'uint256' },
    ],
    name: 'sell',
    outputs: [{ name: 'ethOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ERC20 approve
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

  // ERC20 transfer
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

  // ============================================================================
  // EVENTS
  // ============================================================================
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: false, name: 'ethIn', type: 'uint256' },
      { indexed: false, name: 'tokensOut', type: 'uint256' },
      { indexed: true, name: 'referrer', type: 'address' },
    ],
    name: 'TokensBought',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'seller', type: 'address' },
      { indexed: false, name: 'tokensIn', type: 'uint256' },
      { indexed: false, name: 'ethOut', type: 'uint256' },
    ],
    name: 'TokensSold',
    type: 'event',
  },
] as const;

// Market types enum
export enum MarketType {
  BONDING_CURVE = 0,
  UNISWAP_POOL = 1,
}

/**
 * VBMS Token Direct Sell Function
 * Function selector: 0xb260753b
 * Signature: sell(uint256,address,uint256,address,address)
 * Discovered from tx: 0x3a0059f5b0b8f05102761ae53c748c8b57d8422cd03bfa1dd20ca2b85741027c
 *
 * This allows selling ANY amount of tokens directly (not just full packs)
 * Much simpler than the pack-based flow!
 */
export const VBMS_DIRECT_SELL_ABI = [
  // Direct sell - works for any amount of tokens
  // sell(uint256,address,uint256,address,address) = 0xb260753b
  {
    type: 'function',
    name: 'sell',
    inputs: [
      { name: 'tokenAmount', type: 'uint256' },
      { name: 'recipient', type: 'address' },
      { name: 'minEthOut', type: 'uint256' },
      { name: 'referrer', type: 'address' },
      { name: 'orderReferrer', type: 'address' },
    ],
    outputs: [{ name: 'ethOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  // Quote function
  {
    type: 'function',
    name: 'getTokenSellQuote',
    inputs: [{ name: 'tokenAmount', type: 'uint256' }],
    outputs: [{ name: 'ethAmount', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;
