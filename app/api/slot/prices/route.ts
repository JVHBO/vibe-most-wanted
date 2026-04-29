import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base, arbitrum } from 'viem/chains';

const SLOT_SHOP_BASE = '0x1c9F41d7818aBa8CF2cABaE604D028Ec20d8828C' as const;
const SLOT_SHOP_ARB  = '0x3736a48Bd8CE9BeE0602052B48254Fc44ffC0daA' as const;
const USDC_BASE      = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
const USDN_ARB       = '0x4ecf61a6c2fab8a047ceb3b3b263b401763e9d49' as const;

const SHOP_ABI = [
  { name: 'pricePerHundredETH', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'tokenPricePer100',   type: 'function', stateMutability: 'view', inputs: [{ name: 'token', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

export const revalidate = 300; // cache 5 min

export async function GET() {
  try {
    const basePublic = createPublicClient({ chain: base,     transport: http() });
    const arbPublic  = createPublicClient({ chain: arbitrum, transport: http() });

    const [baseETH, baseUSDC, arbETH, arbUSDN] = await Promise.all([
      basePublic.readContract({ address: SLOT_SHOP_BASE, abi: SHOP_ABI, functionName: 'pricePerHundredETH' }) as Promise<bigint>,
      basePublic.readContract({ address: SLOT_SHOP_BASE, abi: SHOP_ABI, functionName: 'tokenPricePer100', args: [USDC_BASE] }) as Promise<bigint>,
      arbPublic.readContract({  address: SLOT_SHOP_ARB,  abi: SHOP_ABI, functionName: 'pricePerHundredETH' }) as Promise<bigint>,
      arbPublic.readContract({  address: SLOT_SHOP_ARB,  abi: SHOP_ABI, functionName: 'tokenPricePer100', args: [USDN_ARB] }) as Promise<bigint>,
    ]);

    return NextResponse.json({
      base: { eth: baseETH.toString(), usdc: baseUSDC.toString() },
      arb:  { eth: arbETH.toString(),  usdn: arbUSDN.toString()  },
    }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
