"use client";

import { useState, useEffect } from "react";
import { CardMedia } from '@/components/CardMedia';
import { convertIpfsUrl } from '@/lib/ipfs-url-converter';

interface PackOpeningAnimationProps {
  cards: any[];
  packType?: string;
  onClose: () => void;
}

export function PackOpeningAnimation({ cards, packType = 'Basic Pack', onClose }: PackOpeningAnimationProps) {
  const [stage, setStage] = useState<'opening' | 'revealing'>('opening');
  const [revealedIndex, setRevealedIndex] = useState(-1);

  useEffect(() => {
    // Pack opening animation
    const openingTimer = setTimeout(() => {
      setStage('revealing');
      setRevealedIndex(0);
    }, 1500);

    return () => clearTimeout(openingTimer);
  }, []);

  useEffect(() => {
    if (stage === 'revealing' && revealedIndex < cards.length - 1) {
      const revealTimer = setTimeout(() => {
        setRevealedIndex(revealedIndex + 1);
      }, 600);

      return () => clearTimeout(revealTimer);
    }
  }, [stage, revealedIndex, cards.length]);

  const getRarityCounts = () => {
    const counts: Record<string, number> = { Legendary: 0, Epic: 0, Rare: 0, Common: 0 };
    const foilCounts: Record<string, number> = { Prize: 0, Standard: 0 };
    cards.forEach((card) => {
      if (counts[card.rarity] !== undefined) counts[card.rarity]++;
      if (card.foil && card.foil !== 'None' && foilCounts[card.foil] !== undefined) foilCounts[card.foil]++;
    });
    return { counts, foilCounts };
  };

  const handleShare = () => {
    const { counts, foilCounts } = getRarityCounts();
    const rarityParts: string[] = [];
    if (counts.Legendary > 0) rarityParts.push("🌟 " + counts.Legendary + " Legendary");
    if (counts.Epic > 0) rarityParts.push("💜 " + counts.Epic + " Epic");
    if (counts.Rare > 0) rarityParts.push("💙 " + counts.Rare + " Rare");
    if (counts.Common > 0) rarityParts.push("⚪ " + counts.Common + " Common");
    const foilParts: string[] = [];
    if (foilCounts.Prize > 0) foilParts.push("✨ " + foilCounts.Prize + " Prize Foil");
    if (foilCounts.Standard > 0) foilParts.push("⭐ " + foilCounts.Standard + " Standard Foil");
    const totalPower = cards.reduce((sum, card) => sum + (card.power || 0), 0);
    let castText = "🎴 Pack Opening - " + packType + "!\n\n";
    castText += rarityParts.join("\n");
    if (foilParts.length > 0) castText += "\n\n" + foilParts.join("\n");
    castText += "\n\n⚡ Total Power: " + totalPower;
    castText += "\n\n@jvhbo";
    // Build share URL with query params for OG image
    const params = new URLSearchParams();
    params.set('packType', packType);
    if (counts.Legendary > 0) params.set('legendary', counts.Legendary.toString());
    if (counts.Epic > 0) params.set('epic', counts.Epic.toString());
    if (counts.Rare > 0) params.set('rare', counts.Rare.toString());
    if (counts.Common > 0) params.set('common', counts.Common.toString());
    params.set('totalPower', totalPower.toString());
    if (foilCounts.Prize > 0) params.set('foilPrize', foilCounts.Prize.toString());
    if (foilCounts.Standard > 0) params.set('foilStandard', foilCounts.Standard.toString());

    // Include up to 5 card images
    const cardImages = cards.slice(0, 5).map(card => convertIpfsUrl(card.imageUrl) || card.imageUrl);
    if (cardImages.length > 0) {
      params.set('cards', encodeURIComponent(JSON.stringify(cardImages)));
    }

    const shareUrl = "https://www.vibemostwanted.xyz/share/pack?" + params.toString();
    const farcasterUrl = "https://warpcast.com/~/compose?text=" + encodeURIComponent(castText) + "&embeds[]=" + encodeURIComponent(shareUrl);
    window.open(farcasterUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 bg-vintage-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4">
      {/* Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-vintage-gold/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Pack Opening Stage */}
      {stage === 'opening' && (
        <div className="relative">
          {/* Pack Image with Shake Animation */}
          <div className="pack-shake">
            <img
              src="/pack-cover.png"
              alt="Opening Pack"
              className="w-64 h-64 object-contain drop-shadow-2xl"
            />
          </div>

          {/* Glowing Effect */}
          <div className="absolute inset-0 bg-vintage-gold/20 rounded-full blur-3xl animate-pulse" />

          {/* Opening Text */}
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center">
            <p className="text-3xl font-display font-bold text-vintage-gold animate-pulse">
              Opening Pack...
            </p>
          </div>
        </div>
      )}

      {/* Card Revealing Stage */}
      {stage === 'revealing' && (
        <div className="w-full max-w-6xl max-h-[85vh] overflow-y-auto px-1">
          <h2 className="text-xl md:text-4xl font-display font-bold text-center text-vintage-gold mb-3 md:mb-8 animate-bounce-in sticky top-0 bg-vintage-black/90 py-2 z-10">
            🎉 Pack Opened!
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4 mb-4 md:mb-6">
            {cards.map((card: any, i: number) => {
              const isRevealed = i <= revealedIndex;
              const rarityColors = {
                Legendary: "border-vintage-gold shadow-lg shadow-vintage-gold/50",
                Epic: "border-purple-400 shadow-lg shadow-purple-400/50",
                Rare: "border-blue-400 shadow-lg shadow-blue-400/50",
                Common: "border-vintage-ice/30",
              };

              return (
                <div
                  key={i}
                  className={`relative transition-all duration-500 ${
                    isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                  }`}
                  style={{
                    transitionDelay: isRevealed ? '0ms' : `${i * 100}ms`,
                  }}
                >
                  {/* Card Container */}
                  <div
                    className={`bg-vintage-charcoal/80 border-2 md:border-4 rounded-lg md:rounded-xl p-1.5 md:p-3 text-center transform transition-all duration-500 hover:scale-105 ${
                      rarityColors[card.rarity as keyof typeof rarityColors] || rarityColors.Common
                    } ${isRevealed ? 'card-flip-in' : ''}`}
                  >
                    {/* NEW Badge for first reveal */}
                    {isRevealed && !card.isDuplicate && (
                      <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3 bg-green-500 text-white text-[10px] md:text-xs font-bold px-2 py-0.5 md:px-3 md:py-1 rounded-full animate-bounce-in shadow-lg">
                        NEW!
                      </div>
                    )}

                    {/* FREE CARD Badge */}
                    <div className="absolute top-1 left-1 md:top-2 md:left-2 bg-green-600/90 text-white text-[8px] md:text-xs font-bold px-1 py-0.5 md:px-2 md:py-1 rounded">
                      FREE
                    </div>

                    {/* Duplicate Badge */}
                    {card.isDuplicate && (
                      <div className="absolute top-1 right-1 md:top-2 md:right-2 bg-vintage-burnt-gold/90 text-white text-[8px] md:text-xs font-bold px-1 py-0.5 md:px-2 md:py-1 rounded">
                        x{card.quantity}
                      </div>
                    )}

                    {/* Card Image with Glow */}
                    <div className="relative mb-2">
                      <CardMedia
                        src={convertIpfsUrl(card.imageUrl) || card.imageUrl}
                        alt={`${card.rarity} card`}
                        className="w-full h-auto rounded-lg"
                      />
                      {card.rarity === 'Legendary' && (
                        <div className="absolute inset-0 bg-gradient-to-t from-vintage-gold/30 to-transparent rounded-lg animate-pulse" />
                      )}
                    </div>

                    {/* Power */}
                    <div className="mb-2">
                      <p className={`text-lg md:text-2xl font-display font-bold ${
                        card.rarity === 'Legendary' ? 'text-vintage-gold' :
                        card.rarity === 'Epic' ? 'text-purple-400' :
                        card.rarity === 'Rare' ? 'text-blue-400' :
                        'text-vintage-ice'
                      }`}>
                        {card.power}
                      </p>
                      <p className="text-[10px] text-vintage-ice/70">POWER</p>
                    </div>

                    {/* Rarity */}
                    <p className={`text-xs font-bold mb-1 ${
                      card.rarity === 'Legendary' ? 'text-vintage-gold' :
                      card.rarity === 'Epic' ? 'text-purple-400' :
                      card.rarity === 'Rare' ? 'text-blue-400' :
                      'text-vintage-ice/70'
                    }`}>
                      {card.rarity}
                    </p>

                    {/* Foil Badge */}
                    {card.foil && (
                      <div className="text-[10px] text-purple-300 font-bold">
                        ✨ {card.foil}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Buttons - Show after all cards revealed */}
          {revealedIndex >= cards.length - 1 && (
            <div className="flex flex-col md:flex-row gap-3 max-w-md mx-auto">
              <button
                onClick={handleShare}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-display font-bold py-3 px-6 md:py-4 md:px-8 rounded-xl shadow-lg transition-all animate-bounce-in flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
                Share
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-vintage-gold hover:bg-vintage-burnt-gold text-vintage-black font-display font-bold py-3 px-6 md:py-4 md:px-8 rounded-xl shadow-gold hover:shadow-gold-lg transition-all animate-bounce-in"
              >
                Collect Cards
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 0.8;
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          10% { transform: translateX(-10px) rotate(-5deg); }
          20% { transform: translateX(10px) rotate(5deg); }
          30% { transform: translateX(-10px) rotate(-3deg); }
          40% { transform: translateX(10px) rotate(3deg); }
          50% { transform: translateX(-5px) rotate(-1deg); }
          60% { transform: translateX(5px) rotate(1deg); }
          70% { transform: translateX(-3px) rotate(-0.5deg); }
          80% { transform: translateX(3px) rotate(0.5deg); }
          90% { transform: translateX(-1px) rotate(0deg); }
        }

        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3) translateY(-50px);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes flipIn {
          0% {
            transform: rotateY(90deg);
            opacity: 0;
          }
          100% {
            transform: rotateY(0deg);
            opacity: 1;
          }
        }

        .animate-float {
          animation: float linear infinite;
        }

        .pack-shake {
          animation: shake 1.5s ease-in-out;
        }

        .animate-bounce-in {
          animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .card-flip-in {
          animation: flipIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
