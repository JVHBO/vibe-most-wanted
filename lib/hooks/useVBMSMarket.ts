'use client';

import { useState, useEffect } from 'react';

interface VBMSMarketData {
  price: string;
  priceUsd: number;
  marketCap: number;
  marketCapFormatted: string;
  change24h: number;
  change24hFormatted: string;
  volume24h: number;
  liquidity: number;
  isLoading: boolean;
  error: string | null;
}

// VBMS token on Base
const VBMS_TOKEN = '0xb03439567cD22f278B21e1FFcDFB8E1696763827';

/**
 * Fetch VBMS market data from DexScreener API
 */
export function useVBMSMarket(): VBMSMarketData {
  const [data, setData] = useState<VBMSMarketData>({
    price: '0',
    priceUsd: 0,
    marketCap: 0,
    marketCapFormatted: '$0',
    change24h: 0,
    change24hFormatted: '0%',
    volume24h: 0,
    liquidity: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${VBMS_TOKEN}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch market data');
        }

        const json = await response.json();

        // Find the pair with highest liquidity (usually the main pool)
        const pairs = json.pairs || [];
        if (pairs.length === 0) {
          throw new Error('No trading pairs found');
        }

        // Get the main pair (highest liquidity)
        const mainPair = pairs.reduce((best: any, pair: any) => {
          const liquidity = pair.liquidity?.usd || 0;
          return liquidity > (best.liquidity?.usd || 0) ? pair : best;
        }, pairs[0]);

        const priceUsd = parseFloat(mainPair.priceUsd || '0');
        const marketCap = mainPair.fdv || mainPair.marketCap || 0;
        const change24h = mainPair.priceChange?.h24 || 0;
        const volume24h = mainPair.volume?.h24 || 0;
        const liquidity = mainPair.liquidity?.usd || 0;

        // Format market cap
        let marketCapFormatted = '$0';
        if (marketCap >= 1_000_000) {
          marketCapFormatted = `$${(marketCap / 1_000_000).toFixed(2)}M`;
        } else if (marketCap >= 1_000) {
          marketCapFormatted = `$${(marketCap / 1_000).toFixed(2)}K`;
        } else {
          marketCapFormatted = `$${marketCap.toFixed(2)}`;
        }

        // Format 24h change
        const change24hFormatted = change24h >= 0
          ? `+${change24h.toFixed(2)}%`
          : `${change24h.toFixed(2)}%`;

        setData({
          price: priceUsd.toFixed(8),
          priceUsd,
          marketCap,
          marketCapFormatted,
          change24h,
          change24hFormatted,
          volume24h,
          liquidity,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        console.error('Error fetching VBMS market data:', err);
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }));
      }
    };

    fetchData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return data;
}
