import { NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { base, arbitrum } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

/**
 * Cron: update SlotCoinShop pack prices on Base + ARB to match Wield bonding curve
 * Runs hourly via vercel.json cron
 * Auth: Bearer CRON_SECRET
 */

const SLOT_SHOP_BASE = '0x1c9F41d7818aBa8CF2cABaE604D028Ec20d8828C' as const;
const SLOT_SHOP_ARB  = '0x3736a48Bd8CE9BeE0602052B48254Fc44ffC0daA' as const;
const USDC_BASE      = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
const USDN_ARB       = '0x4ecf61a6c2fab8a047ceb3b3b263b401763e9d49' as const;

const WIELD_PRICE_API = 'https://build.wield.xyz/vibe/boosterbox/price-chart/0xf14c1dc8ce5fe65413379f76c43fa1460c31e728?timeframe=24h&chainId=8453&includeStats=true';
const ETH_USD_API     = 'https://build.wield.xyz/utils/eth-to-usd?eth=1';

const SHOP_ABI = [
  { name: 'setETHPrice',       type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_pricePerHundredETH', type: 'uint256' }], outputs: [] },
  { name: 'setTokenPrice',     type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'token', type: 'address' }, { name: 'pricePer100', type: 'uint256' }], outputs: [] },
  { name: 'pricePerHundredETH', type: 'function', stateMutability: 'view',      inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

// Tolerance: only update if price changed >2% to avoid unnecessary gas
const TOLERANCE = 0.02;

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const auth = request.headers.get('authorization');
    if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const signerKey = process.env.VBMS_SIGNER_PRIVATE_KEY as `0x${string}`;
    if (!signerKey) return NextResponse.json({ error: 'VBMS_SIGNER_PRIVATE_KEY not set' }, { status: 500 });

    // ── Fetch prices from Wield ───────────────────────────────────────
    const [priceRes, ethRes] = await Promise.all([
      fetch(WIELD_PRICE_API),
      fetch(ETH_USD_API),
    ]);
    const priceData = await priceRes.json();
    const ethData   = await ethRes.json();

    const ethUsd: number      = parseFloat(ethData?.usd) || 0;
    const priceEth: number    = priceData?.statistics?.currentPriceEth || 0;

    if (!ethUsd || !priceEth) {
      return NextResponse.json({ error: 'Failed to fetch prices', ethUsd, priceEth }, { status: 500 });
    }

    // v2: price per 100 coins
    // 1M coins = 1 pack = priceEth ETH  →  per 100 coins = priceEth / 10000
    const packPriceETH_wei  = BigInt(Math.round(priceEth * 1e18 / 10000));           // wei per 100 coins
    const packPriceUSDC_u6  = BigInt(Math.round(priceEth * ethUsd * 1e6 / 10000));   // USDC units per 100 coins

    const account = privateKeyToAccount(signerKey);

    // ── Base ──────────────────────────────────────────────────────────
    const basePublic = createPublicClient({ chain: base, transport: http() });
    const baseWallet = createWalletClient({ account, chain: base, transport: http() });

    const currentBaseETH = await basePublic.readContract({ address: SLOT_SHOP_BASE, abi: SHOP_ABI, functionName: 'pricePerHundredETH' }) as bigint;
    const baseETHDiff = Math.abs(Number(packPriceETH_wei - currentBaseETH)) / Number(currentBaseETH);

    const baseUpdates: string[] = [];
    if (baseETHDiff > TOLERANCE) {
      await baseWallet.writeContract({ address: SLOT_SHOP_BASE, abi: SHOP_ABI, functionName: 'setETHPrice', args: [packPriceETH_wei], gas: 80000n });
      await baseWallet.writeContract({ address: SLOT_SHOP_BASE, abi: SHOP_ABI, functionName: 'setTokenPrice', args: [USDC_BASE, packPriceUSDC_u6], gas: 80000n });
      baseUpdates.push(`ETH: ${packPriceETH_wei} wei`, `USDC: ${packPriceUSDC_u6}`);
    }

    // ── ARB ───────────────────────────────────────────────────────────
    const arbPublic = createPublicClient({ chain: arbitrum, transport: http() });
    const arbWallet = createWalletClient({ account, chain: arbitrum, transport: http() });

    const currentArbETH = await arbPublic.readContract({ address: SLOT_SHOP_ARB, abi: SHOP_ABI, functionName: 'pricePerHundredETH' }) as bigint;
    const arbETHDiff = Math.abs(Number(packPriceETH_wei - currentArbETH)) / Number(currentArbETH);

    const arbUpdates: string[] = [];
    if (arbETHDiff > TOLERANCE) {
      await arbWallet.writeContract({ address: SLOT_SHOP_ARB, abi: SHOP_ABI, functionName: 'setETHPrice', args: [packPriceETH_wei], gas: 80000n });
      await arbWallet.writeContract({ address: SLOT_SHOP_ARB, abi: SHOP_ABI, functionName: 'setTokenPrice', args: [USDN_ARB, packPriceUSDC_u6], gas: 80000n });
      arbUpdates.push(`ETH: ${packPriceETH_wei} wei`, `USDN: ${packPriceUSDC_u6}`);
    }

    console.log(`[update-slot-prices] ETH/USD: $${ethUsd} | packETH: ${priceEth} | Base updated: ${baseUpdates.length > 0} | ARB updated: ${arbUpdates.length > 0}`);

    return NextResponse.json({
      success: true,
      ethUsd,
      priceEth,
      packPriceETH_wei: packPriceETH_wei.toString(),
      packPriceUSDC_u6: packPriceUSDC_u6.toString(),
      base: baseUpdates.length > 0 ? { updated: true, changes: baseUpdates } : { updated: false, reason: `diff ${(baseETHDiff * 100).toFixed(2)}% < 2%` },
      arb:  arbUpdates.length > 0  ? { updated: true, changes: arbUpdates  } : { updated: false, reason: `diff ${(arbETHDiff  * 100).toFixed(2)}% < 2%` },
    });

  } catch (error: any) {
    console.error('[update-slot-prices] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
