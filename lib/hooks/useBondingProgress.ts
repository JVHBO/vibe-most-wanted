/**
 * Hook to get VBMS bonding curve progress
 * When ETH reaches 2.5 ETH, liquidity transfers to Uniswap
 */

import { useState, useEffect } from 'react';

const BOOSTER_TOKEN_ADDRESS = '0xb03439567cd22f278b21e1ffcdfb8e1696763827';
const BASE_RPC = 'https://mainnet.base.org';
const ETH_USD_API = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';
const TARGET_ETH = 2.5; // 2.5 ETH target for Uniswap migration
const CACHE_KEY = 'vbms_bonding_progress';

export function useBondingProgress() {
  const [ethBalance, setEthBalance] = useState(0);
  const [usdBalance, setUsdBalance] = useState(0);
  const [progress, setProgress] = useState(0);
  const [ethPrice, setEthPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load cached value immediately
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        setEthBalance(data.ethBalance);
        setUsdBalance(data.usdBalance);
        setProgress(data.progress);
      }
    } catch {}

    async function fetchProgress() {
      try {
        // Get ETH balance from bonding curve contract
        const balanceRes = await fetch(BASE_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [BOOSTER_TOKEN_ADDRESS, 'latest'],
            id: 1,
          }),
        });
        const balanceData = await balanceRes.json();
        const weiBalance = BigInt(balanceData.result);
        const eth = Number(weiBalance) / 1e18;

        // Get ETH price
        const ethRes = await fetch(ETH_USD_API);
        const ethData = await ethRes.json();
        const fetchedEthPrice = parseFloat(ethData?.ethereum?.usd) || 3500;
        setEthPrice(fetchedEthPrice);
        const ethPrice = fetchedEthPrice;

        // Calculate USD and progress
        const usd = eth * ethPrice;
        const prog = Math.min((eth / TARGET_ETH) * 100, 100);

        setEthBalance(eth);
        setUsdBalance(usd);
        setProgress(prog);

        // Cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          ethBalance: eth,
          usdBalance: usd,
          progress: prog,
        }));
      } catch (err) {
        console.error('Error fetching bonding progress:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProgress();
    const interval = setInterval(fetchProgress, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  return {
    ethBalance,
    usdBalance,
    progress,
    targetEth: TARGET_ETH,
    isLoading,
    isComplete: progress >= 100,
    ethPrice,
  };
}
