'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { generateCriminalBackstory } from '@/lib/generateCriminalBackstory';
import { getFarcasterAccountCreationDate } from '@/lib/farcasterRegistry';
import CriminalBackstoryCard from '@/components/CriminalBackstoryCard';
import Link from 'next/link';
import { CardMedia } from '@/components/CardMedia';
import { convertIpfsUrl } from '@/lib/ipfs-url-converter';
import FoilCardEffect from '@/components/FoilCardEffect';

export default function FidCardPage() {
  const params = useParams();
  const fid = parseInt(params.fid as string);
  const { lang, setLang } = useLanguage();

  // Fetch all cards for this FID
  const fidCards = useQuery(api.farcasterCards.getFarcasterCardsByFid, { fid });

  // Get the most recent card (first one)
  const card = fidCards?.[0];

  const [backstory, setBackstory] = useState<any>(null);

  // Generate backstory for the card
  useEffect(() => {
    if (card) {
      const generateBackstory = async () => {
        const createdAt = await getFarcasterAccountCreationDate(card.fid);
        const story = generateCriminalBackstory({
          username: card.username,
          displayName: card.displayName,
          bio: card.bio || "",
          fid: card.fid,
          followerCount: card.followerCount,
          createdAt,
          power: card.power,
          bounty: card.power * 10,
          rarity: card.rarity,
        }, lang);
        setBackstory(story);
      };
      generateBackstory();
    }
  }, [card, lang]);

  if (!fidCards) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black flex items-center justify-center">
        <div className="text-vintage-gold text-xl">Loading...</div>
      </div>
    );
  }

  if (fidCards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold text-vintage-gold mb-4">
            No Card Found
          </h1>
          <p className="text-vintage-ice mb-6">
            This FID hasn't been minted yet.
          </p>
          <Link
            href="/fid"
            className="px-6 py-3 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors inline-block"
          >
            Mint Your Card
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black p-8">
      {/* Language Selector - Fixed Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as any)}
          className="px-4 py-2 bg-vintage-charcoal border-2 border-vintage-gold/50 rounded-lg text-vintage-ice focus:outline-none focus:border-vintage-gold text-sm shadow-lg hover:border-vintage-gold transition-colors"
        >
          <option value="en">🇺🇸 English</option>
          <option value="pt-BR">🇧🇷 Português</option>
          <option value="es">🇪🇸 Español</option>
          <option value="hi">🇮🇳 हिन्दी</option>
          <option value="ru">🇷🇺 Русский</option>
          <option value="zh-CN">🇨🇳 中文</option>
        </select>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-vintage-gold mb-2">
            VibeFID #{fid}
          </h1>
          <p className="text-vintage-ice">
            {card?.displayName} (@{card?.username})
          </p>
        </div>

        {/* Card Display */}
        {card && (
          <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-6 mb-8">
            <div className="flex flex-col items-center">
              {/* Card Image/Video */}
              <div className="w-full max-w-md mb-6">
                <FoilCardEffect
                  foilType={card.foil === 'None' ? null : (card.foil as 'Standard' | 'Prize')}
                  className="w-full rounded-lg shadow-2xl border-4 border-vintage-gold overflow-hidden"
                >
                  <CardMedia
                    src={convertIpfsUrl(card.imageUrl) || card.pfpUrl}
                    alt={card.username}
                    className="w-full"
                  />
                </FoilCardEffect>
              </div>

              {/* Card Stats */}
              <div className="w-full max-w-md bg-vintage-charcoal/80 rounded-lg border border-vintage-gold/30 p-6">
                <h3 className="text-xl font-bold text-vintage-gold mb-4 text-center">
                  Card Stats
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-vintage-burnt-gold font-semibold">Card:</span>{" "}
                    <span className={`font-bold ${card.color === 'red' ? 'text-red-500' : 'text-white'}`}>
                      {card.rank}{card.suitSymbol}
                    </span>
                  </div>
                  <div>
                    <span className="text-vintage-burnt-gold font-semibold">Rarity:</span>{" "}
                    <span className="text-vintage-ice">{card.rarity}</span>
                  </div>
                  <div>
                    <span className="text-vintage-burnt-gold font-semibold">Foil:</span>{" "}
                    <span className={`font-bold ${
                      card.foil === 'Prize' ? 'text-purple-400' :
                      card.foil === 'Standard' ? 'text-blue-400' :
                      'text-vintage-ice'
                    }`}>
                      {card.foil}
                    </span>
                  </div>
                  <div>
                    <span className="text-vintage-burnt-gold font-semibold">Wear:</span>{" "}
                    <span className="text-vintage-ice">{card.wear}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-vintage-burnt-gold font-semibold">Power:</span>{" "}
                    <span className="text-vintage-gold font-bold text-lg">{card.power}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 w-full max-w-md flex gap-4">
                {/* Share to Farcaster */}
                <a
                  href={(() => {
                    const shareUrl = `https://www.vibemostwanted.xyz/share/fid/${card.fid}`;

                    // Build dynamic share text with emojis
                    const rarityEmojiMap: Record<string, string> = {
                      'Mythic': '👑',
                      'Legendary': '⚡',
                      'Epic': '💎',
                      'Rare': '🔥',
                      'Common': '⭐'
                    };
                    const rarityEmoji = rarityEmojiMap[card.rarity] || '🎴';

                    const foilEmoji = card.foil === 'Prize' ? '✨' : card.foil === 'Standard' ? '💫' : '';
                    const foilText = card.foil !== 'None' ? ` ${card.foil} Foil` : '';

                    const castText = `🃏 Just minted my VibeFID!\n\n${rarityEmoji} ${card.rarity}${foilText}\n⚡ ${card.power} Power ${foilEmoji}\n🎯 FID #${card.fid}\n\n🎲 Play Poker Battles\n🗡️ Fight in PvE\n💰 Earn $VBMS\n\n🎮 Mint yours & start playing! @jvhbo`;

                    return `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(shareUrl)}`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-xl">🔮</span>
                  <span className="hidden sm:inline">Share to Farcaster</span>
                  <span className="sm:hidden">Share</span>
                </a>

                {/* View on OpenSea */}
                <a
                  href={`https://opensea.io/assets/base/${card.contractAddress || '0x30d595f40dee7AEd53f8993f13E87A34Ec0C8D25'}/${card.fid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-6 py-4 bg-vintage-gold hover:bg-vintage-burnt-gold text-vintage-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span className="hidden sm:inline">View on OpenSea</span>
                  <span className="sm:hidden">OpenSea</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Criminal Backstory */}
        {backstory && card && (
          <div className="mb-8">
            <CriminalBackstoryCard
              backstory={backstory}
              displayName={card.displayName}
              lang={lang}
            />
          </div>
        )}

        {/* Mint History for this FID */}
        {fidCards && fidCards.length > 1 && (
          <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-6">
            <h2 className="text-2xl font-bold text-vintage-gold mb-4">
              Mint History ({fidCards.length} mints)
            </h2>
            <p className="text-vintage-ice/70 mb-4 text-sm">
              All mints of FID #{fid}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fidCards.slice(1).map((mintedCard: any) => (
                <Link
                  key={mintedCard._id}
                  href={`/fid/${mintedCard.fid}`}
                  className="bg-vintage-charcoal rounded-lg border border-vintage-gold/30 p-4 hover:border-vintage-gold transition-colors"
                >
                  <div className="text-center mb-2">
                    <span className={`text-2xl font-bold ${mintedCard.color === 'red' ? 'text-red-500' : 'text-black'}`}>
                      {mintedCard.rank}{mintedCard.suitSymbol}
                    </span>
                  </div>

                  <div className="aspect-square mb-2 rounded-lg overflow-hidden">
                    <CardMedia
                      src={convertIpfsUrl(mintedCard.imageUrl) || mintedCard.pfpUrl}
                      alt={mintedCard.username}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-vintage-burnt-gold text-sm">{mintedCard.rarity}</span>
                    <span className="text-vintage-ice text-sm">⚡ {mintedCard.power}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Link
            href="/fid"
            className="px-6 py-3 bg-vintage-charcoal border-2 border-vintage-gold text-vintage-gold font-bold rounded-lg hover:bg-vintage-gold/20 transition-colors inline-block"
          >
            ← Mint Your Card
          </Link>
        </div>
      </div>
    </div>
  );
}
