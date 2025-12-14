/**
 * Hook to get VBMS market cap from Wield API (same as VibeMarket)
 * Uses localStorage to cache the last known value
 */

import { useState, useEffect } from 'react';

const WIELD_API_KEY = process.env.NEXT_PUBLIC_WIELD_API_KEY || '';
const STATS_API = 'https://build.wield.xyz/vibe/boosterbox/collection/0xf14c1dc8ce5fe65413379f76c43fa1460c31e728/stats';
const PRICE_API = 'https://build.wield.xyz/vibe/boosterbox/price-chart/0xf14c1dc8ce5fe65413379f76c43fa1460c31e728?timeframe=24h&chainId=8453&includeStats=true';
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
        const headers: Record<string, string> = {
          'Origin': 'https://vibechain.com',
          'Referer': 'https://vibechain.com/',
        };
        if (WIELD_API_KEY) {
          headers['API-KEY'] = WIELD_API_KEY;
        }

        const [statsRes, priceRes, ethRes] = await Promise.all([
          fetch(STATS_API, { headers }),
          fetch(PRICE_API, { headers }),
          fetch(ETH_USD_API),
        ]);

        if (!statsRes.ok || !priceRes.ok || !ethRes.ok) throw new Error('API error');

        const statsData = await statsRes.json();
        const priceData = await priceRes.json();
        const ethData = await ethRes.json();

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
