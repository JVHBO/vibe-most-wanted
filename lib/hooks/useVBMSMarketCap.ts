/**
 * Hook to get VBMS market cap from Wield API (same source as VibeMarket)
 */

import { useState, useEffect } from 'react';

const WIELD_API = 'https://build.wield.xyz/vibe/boosterbox/collection/0xf14c1dc8ce5fe65413379f76c43fa1460c31e728/stats';
const ETH_USD_API = 'https://build.wield.xyz/utils/eth-to-usd?eth=1';

interface WieldStats {
  totalPacksSold?: number;
  totalMinted?: number;
  avgPricePerPackInEth?: number;
  pricePerPackInEth?: number;
}

export function useVBMSMarketCap() {
  const [marketCap, setMarketCap] = useState(0);
  const [marketCapFormatted, setMarketCapFormatted] = useState('...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMarketCap() {
      try {
        // Fetch both stats and ETH/USD price in parallel
        const [statsRes, ethRes] = await Promise.all([
          fetch(WIELD_API, {
            headers: {
              'Origin': 'https://vibechain.com',
              'Referer': 'https://vibechain.com/',
            },
          }),
          fetch(ETH_USD_API),
        ]);

        if (!statsRes.ok || !ethRes.ok) {
          throw new Error('API error');
        }

        const stats: WieldStats = await statsRes.json();
        const ethData = await ethRes.json();

        const ethUsd = ethData?.usd || 3400;
        const totalMinted = stats?.totalMinted || stats?.totalPacksSold || 0;
        const pricePerPackEth = stats?.pricePerPackInEth || stats?.avgPricePerPackInEth || 0;

        // Market Cap = Total Minted * Price Per Pack * ETH/USD
        const mcap = totalMinted * pricePerPackEth * ethUsd;

        setMarketCap(mcap);

        // Format
        if (mcap >= 1000000) {
          setMarketCapFormatted(`$${(mcap / 1000000).toFixed(2)}M`);
        } else if (mcap >= 1000) {
          setMarketCapFormatted(`$${(mcap / 1000).toFixed(2)}k`);
        } else {
          setMarketCapFormatted(`$${mcap.toFixed(2)}`);
        }
      } catch (err) {
        console.error('Error fetching market cap:', err);
        setMarketCapFormatted('$5.74k'); // Fallback to last known value
      } finally {
        setIsLoading(false);
      }
    }

    fetchMarketCap();

    // Refresh every 60 seconds
    const interval = setInterval(fetchMarketCap, 60000);
    return () => clearInterval(interval);
  }, []);

  return {
    marketCap,
    marketCapFormatted,
    isLoading,
  };
}
