/**
 * Hook to get VBMS market cap from Wield API (same as VibeMarket)
 * Uses localStorage to cache the last known value
 */

import { useState, useEffect } from 'react';

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
        const res = await fetch('/api/vibe/marketcap');
        if (!res.ok) throw new Error('API error');
        const { statsData, priceData, ethData } = await res.json();

        if (statsData.success === false || priceData.success === false) throw new Error('Rate limited');

        const ethUsd = parseFloat(ethData?.usd) || 3700;
        // Get total packs from stats API
        const totalPacks = statsData?.stats?.totals?.totalCount || 0;
        // Get current price from price-chart API
        const currentPriceEth = priceData?.statistics?.currentPriceEth || 0;

        // Market Cap = Total Packs * Current Price * ETH/USD * 0.75
        // The 0.75 factor accounts for bonding curve mechanics where early buyers
        // paid less than current price, making true market cap lower than naive calculation
        const mcap = totalPacks * currentPriceEth * ethUsd * 0.75;

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
