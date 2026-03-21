import { useState, useCallback, useEffect } from 'react';
import { normalizeUrl } from '@/lib/nft/attributes';
import { findAttr, calcPower } from '@/lib/nft/attributes';
import { fetchNFTs } from '@/lib/nft/fetcher';
import { JC_CONTRACT_ADDRESS as JC_WALLET_ADDRESS } from '@/lib/config';
import { devLog, devError } from '@/lib/utils/logger';

const JC_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_JC_CONTRACT || process.env.NEXT_PUBLIC_VIBE_CONTRACT;

export function useJCDeckLoader() {
  const [jcNfts, setJcNfts] = useState<any[]>([]);
  const [jcNftsLoading, setJcNftsLoading] = useState(true);
  const [jcLoadingProgress, setJcLoadingProgress] = useState<{ page: number; cards: number } | null>(null);

  const loadJCNFTs = useCallback(async () => {
    try {
      devLog('Loading JC deck from optimized static file...');
      const res = await fetch('/api/jc-deck');
      if (!res.ok) throw new Error(`Failed to load JC deck: ${res.status}`);

      const data = await res.json();
      const cards = data.cards || [];
      devLog(`JC deck loaded: ${cards.length} cards from ${data.source}`);

      const processed = cards.map((card: any) => ({
        tokenId: card.tokenId,
        imageUrl: normalizeUrl(card.imageUrl || ''),
        rarity: card.rarity,
        status: card.status,
        power: card.power,
        name: card.name,
        attributes: card.attributes || [],
        raw: { metadata: { name: card.name, image: card.imageUrl, attributes: card.attributes } },
      }));

      setJcNfts(processed);
      setJcNftsLoading(false);
    } catch (e: any) {
      devError('Error loading JC NFTs from static file, falling back to live API:', e);
      try {
        const revealed = await fetchNFTs(
          JC_WALLET_ADDRESS,
          JC_CONTRACT_ADDRESS,
          (page: number, cards: number) => setJcLoadingProgress({ page, cards }),
        );

        const processed = revealed.map((nft: any) => {
          const imageUrl =
            nft?.image?.cachedUrl ||
            nft?.image?.thumbnailUrl ||
            nft?.image?.originalUrl ||
            nft?.raw?.metadata?.image ||
            '';
          return {
            ...nft,
            imageUrl: normalizeUrl(imageUrl),
            name: nft.title || nft.name || `Card #${nft.tokenId}`,
            rarity: findAttr(nft, 'rarity'),
            status: findAttr(nft, 'status'),
            wear: findAttr(nft, 'wear'),
            foil: findAttr(nft, 'foil'),
            power: calcPower(nft),
          };
        });

        setJcNfts(processed);
        setJcNftsLoading(false);
        setJcLoadingProgress(null);
        devLog('JC NFTs loaded from live API:', processed.length);
      } catch (fallbackError: any) {
        devError('Fallback also failed:', fallbackError);
        setJcNftsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadJCNFTs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { jcNfts, jcNftsLoading, jcLoadingProgress, loadJCNFTs };
}
