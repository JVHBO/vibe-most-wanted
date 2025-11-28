"use client";

import { useState } from "react";
import { COLLECTION_CARDS } from "@/convex/arenaCardsData";
import { convertIpfsUrl } from "@/lib/ipfs-url-converter";

// Collection cover images for Mecha Arena (sealed/unrevealed card backs)
const COLLECTION_COVERS: Record<string, string> = {
  gmvbrs: 'https://nft-cdn.alchemy.com/base-mainnet/d0de7e9fa12eadb1ea2204e67d43e166',
  vibe: 'https://nft-cdn.alchemy.com/base-mainnet/511915cc9b6f20839e2bf2999760530f',
  americanfootball: 'https://nft-cdn.alchemy.com/base-mainnet/5c023b39577f02927478fbd60c26d75e',
  coquettish: 'https://nft-cdn.alchemy.com/base-mainnet/9145036a0f3e07a031b46130b4171084',
  viberuto: 'https://nft-cdn.alchemy.com/base-mainnet/ec58759f6df558aa4193d58ae9b0e74f',
  meowverse: 'https://nft-cdn.alchemy.com/base-mainnet/16a8f93f75def1a771cca7e417b5d05e',
  poorlydrawnpepes: 'https://nft-cdn.alchemy.com/base-mainnet/96282462557a81c42fad965a48c34f4c',
  teampothead: 'https://nft-cdn.alchemy.com/base-mainnet/ae56485394d1e5f37322d498f0ea11a0',
  tarot: 'https://nft-cdn.alchemy.com/base-mainnet/72ea458dbad1ce6a722306d811a42252',
};

// Collection display names
const COLLECTION_NAMES: Record<string, string> = {
  vibefid: "VibeFID",
  gmvbrs: "GM VBRS",
  vibe: "Vibe Most Wanted",
  americanfootball: "American Football",
  coquettish: "Coquettish",
  viberuto: "Viberuto",
  meowverse: "Meowverse",
  poorlydrawnpepes: "Poorly Drawn Pepes",
  teampothead: "Team Pothead",
  tarot: "Tarot",
};

export default function TestCoversPage() {
  const [loadStatus, setLoadStatus] = useState<Record<string, 'loading' | 'success' | 'error'>>({});
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  const handleLoad = (key: string) => {
    setLoadStatus(prev => ({ ...prev, [key]: 'success' }));
  };

  const handleError = (key: string) => {
    setLoadStatus(prev => ({ ...prev, [key]: 'error' }));
  };

  const collections = Object.keys(COLLECTION_CARDS);

  return (
    <div className="min-h-screen bg-vintage-deep-black p-4 sm:p-8">
      <h1 className="text-3xl font-bold text-vintage-gold mb-2">Mecha Arena - All Images Test</h1>
      <p className="text-vintage-ice/70 mb-8">Testing covers and all card images for each collection</p>

      {/* Collection selector */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setSelectedCollection(null)}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            selectedCollection === null
              ? 'bg-vintage-gold text-black'
              : 'bg-vintage-charcoal text-vintage-ice hover:bg-vintage-gold/20'
          }`}
        >
          All Collections
        </button>
        {collections.map(col => (
          <button
            key={col}
            onClick={() => setSelectedCollection(col)}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              selectedCollection === col
                ? 'bg-vintage-gold text-black'
                : 'bg-vintage-charcoal text-vintage-ice hover:bg-vintage-gold/20'
            }`}
          >
            {COLLECTION_NAMES[col] || col}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="mb-8 p-4 bg-vintage-charcoal rounded-xl border border-vintage-gold/30">
        <h3 className="text-xl font-bold text-vintage-gold mb-2">Status Summary</h3>
        <div className="flex gap-6">
          <p className="text-green-400">
            Success: {Object.values(loadStatus).filter(s => s === 'success').length}
          </p>
          <p className="text-red-400">
            Failed: {Object.values(loadStatus).filter(s => s === 'error').length}
          </p>
        </div>
      </div>

      {/* Collections */}
      {collections
        .filter(col => selectedCollection === null || selectedCollection === col)
        .map(collection => {
          const cards = COLLECTION_CARDS[collection] || [];
          const coverUrl = COLLECTION_COVERS[collection];

          return (
            <div key={collection} className="mb-12">
              <h2 className="text-2xl font-bold text-vintage-gold mb-4 flex items-center gap-3">
                {COLLECTION_NAMES[collection] || collection}
                <span className="text-sm font-normal text-vintage-ice/50">
                  ({cards.length} cards)
                </span>
              </h2>

              {/* Cover image */}
              {coverUrl && (
                <div className="mb-4">
                  <h3 className="text-lg text-purple-400 mb-2">Cover Image (Card Back)</h3>
                  <div className="inline-block bg-vintage-charcoal rounded-xl p-3 border border-purple-500/30">
                    <div className="relative w-32 aspect-[3/4] bg-black rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverUrl}
                        alt={`${collection} cover`}
                        className="w-full h-full object-cover"
                        onLoad={() => handleLoad(`cover-${collection}`)}
                        onError={() => handleError(`cover-${collection}`)}
                      />
                      {loadStatus[`cover-${collection}`] === 'error' && (
                        <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                          <span className="text-white font-bold text-xs">FAILED</span>
                        </div>
                      )}
                      {loadStatus[`cover-${collection}`] === 'success' && (
                        <div className="absolute top-1 right-1 bg-green-500 text-white px-1 rounded text-xs">OK</div>
                      )}
                    </div>
                    <p className="text-xs text-vintage-ice/50 mt-2 max-w-[200px] break-all">{coverUrl}</p>
                  </div>
                </div>
              )}

              {!coverUrl && (
                <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg inline-block">
                  <span className="text-yellow-400 font-bold">No cover image defined for this collection</span>
                </div>
              )}

              {/* Cards grid */}
              <h3 className="text-lg text-cyan-400 mb-2">Cards</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {cards.map((card, idx) => {
                  const key = `${collection}-${card.tokenId}`;
                  const imageUrl = convertIpfsUrl(card.imageUrl) || card.imageUrl;
                  // VibeFID cards are all videos (WebM), even Alchemy CDN URLs
                  const isVideo = collection === 'vibefid' || imageUrl.includes('ipfs') || imageUrl.endsWith('.webm') || imageUrl.endsWith('.mp4');

                  return (
                    <div key={key} className="bg-vintage-charcoal rounded-lg p-2 border border-vintage-gold/20">
                      <div className="relative aspect-[3/4] bg-black rounded overflow-hidden mb-2">
                        {isVideo ? (
                          <video
                            src={imageUrl}
                            className="w-full h-full object-cover"
                            autoPlay
                            loop
                            muted
                            playsInline
                            onLoadedData={() => handleLoad(key)}
                            onError={() => handleError(key)}
                          />
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={imageUrl}
                            alt={card.name}
                            className="w-full h-full object-cover"
                            onLoad={() => handleLoad(key)}
                            onError={() => handleError(key)}
                          />
                        )}

                        {loadStatus[key] === 'error' && (
                          <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                            <span className="text-white font-bold text-xs">FAILED</span>
                          </div>
                        )}
                        {loadStatus[key] === 'success' && (
                          <div className="absolute top-1 right-1 bg-green-500 text-white px-1 rounded text-[10px]">OK</div>
                        )}
                      </div>

                      <p className="text-xs text-vintage-ice font-bold truncate">{card.name}</p>
                      <p className="text-[10px] text-vintage-ice/50">{card.rarity} | Power: {card.power}</p>
                      <p className="text-[10px] text-vintage-ice/30 truncate">{imageUrl.slice(-40)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      {/* Back link */}
      <div className="mt-8">
        <a href="/" className="text-vintage-gold hover:text-vintage-burnt-gold underline">
          Back to Home
        </a>
      </div>
    </div>
  );
}
