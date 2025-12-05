/**
 * Hook to get VBMS market cap from Wield API (same as VibeMarket)
 * Uses localStorage to cache the last known value
 */

import { useState, useEffect } from 'react';

const WIELD_API = 'https://build.wield.xyz/vibe/boosterbox/collection/0xf14c1dc8ce5fe65413379f76c43fa1460c31e728/stats';
const ETH_USD_API = 'https://build.wield.xyz/utils/eth-to-usd?eth=1';
const CACHE_KEY = 'vbms_market_cap';

export function useVBMSMarketCap() {
  const [marketCap, setMarketCap] = useState(0);
  const [marketCapFormatted, setMarketCapFormatted] = useState('...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load cached value immediately
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { value, formatted } = JSON.parse(cached);
        setMarketCap(value);
        setMarketCapFormatted(formatted);
      }
    } catch {}

    async function fetchMarketCap() {
      try {
        const [statsRes, ethRes] = await Promise.all([
          fetch(WIELD_API, {
            headers: { 'Origin': 'https://vibechain.com', 'Referer': 'https://vibechain.com/' },
          }),
          fetch(ETH_USD_API),
        ]);

        if (!statsRes.ok || !ethRes.ok) throw new Error('API error');

        const stats = await statsRes.json();
        const ethData = await ethRes.json();

        if (stats.success === false) throw new Error('Rate limited');

        const ethUsd = ethData?.usd || 3400;
        const totalMinted = stats?.totalMinted || stats?.totalPacksSold || 0;
        const avgPriceEth = stats?.avgPricePerPackInEth || stats?.pricePerPackInEth || 0;

        // Market Cap = Total Minted * Avg Price Per Pack * ETH/USD
        const mcap = totalMinted * avgPriceEth * ethUsd;

        // Format
        let formatted: string;
        if (mcap >= 1000000) {
          formatted = `$${(mcap / 1000000).toFixed(2)}M`;
        } else if (mcap >= 1000) {
          formatted = `$${(mcap / 1000).toFixed(2)}k`;
        } else {
          formatted = `$${mcap.toFixed(2)}`;
        }

        setMarketCap(mcap);
        setMarketCapFormatted(formatted);

        // Cache for fallback
        localStorage.setItem(CACHE_KEY, JSON.stringify({ value: mcap, formatted }));
      } catch (err) {
        console.error('Error fetching market cap:', err);
        // Keep current/cached value
      } finally {
        setIsLoading(false);
      }
    }

    fetchMarketCap();
    const interval = setInterval(fetchMarketCap, 60000);
    return () => clearInterval(interval);
  }, []);

  return { marketCap, marketCapFormatted, isLoading };
}
