"use client";

import { useState, useEffect, useCallback } from "react";
import { CardMedia } from '@/components/CardMedia';
import { convertIpfsUrl } from '@/lib/ipfs-url-converter';
import sdk from '@farcaster/miniapp-sdk';
import haptics from '@/lib/haptics';

interface PackOpeningAnimationProps {
  cards: any[];
  packType?: string;
  onClose: () => void;
}

const MAX_CARDS_PER_BATCH = 10;

export function PackOpeningAnimation({ cards, packType = 'Basic Pack', onClose }: PackOpeningAnimationProps) {
  const [stage, setStage] = useState<'opening' | 'revealing'>('opening');
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  const [shakingCard, setShakingCard] = useState<number | null>(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false);

  const displayCards = cards.slice(0, MAX_CARDS_PER_BATCH);

  useEffect(() => {
    sdk.isInMiniApp().then(setIsInMiniApp).catch(() => setIsInMiniApp(false));
  }, []);

  useEffect(() => {
    const openingTimer = setTimeout(() => {
      setStage('revealing');
    }, 1500);
    return () => clearTimeout(openingTimer);
  }, []);

  const playSound = useCallback((src: string) => {
    const audio = new Audio(src);
    audio.volume = 0.6;
    audio.play().catch(() => {});
    return audio;
  }, []);

  const handleCardClick = useCallback((index: number, rarity: string) => {
    if (revealedCards.has(index) || shakingCard !== null) return;

    setShakingCard(index);
    haptics.cardReveal(); // Haptic when card clicked
    playSound('/sounds/espera.mp3');

    setTimeout(() => {
      const soundMap: Record<string, string> = {
        Legendary: '/sounds/legendary-pull.mp3',
        Epic: '/sounds/epic-pull.mp3',
        Rare: '/sounds/rare-pull.mp3',
        Common: '/sounds/common-pull.mp3',
      };
      playSound(soundMap[rarity] || soundMap.Common);
      // Haptic based on rarity
      if (rarity === 'Legendary' || rarity === 'Mythic') haptics.rareCard();
      else if (rarity === 'Epic') haptics.success();
      else haptics.confirm();
      setRevealedCards(prev => new Set([...prev, index]));
      setShakingCard(null);
    }, 1800);
  }, [revealedCards, shakingCard, playSound]);

  const handleRevealAll = useCallback(() => {
    displayCards.forEach((card, index) => {
      if (!revealedCards.has(index)) {
        setTimeout(() => {
          const soundMap: Record<string, string> = {
            Legendary: '/sounds/legendary-pull.mp3',
            Epic: '/sounds/epic-pull.mp3',
            Rare: '/sounds/rare-pull.mp3',
            Common: '/sounds/common-pull.mp3',
          };
          playSound(soundMap[card.rarity] || soundMap.Common);
          setRevealedCards(prev => new Set([...prev, index]));
        }, index * 300);
      }
    });
  }, [displayCards, revealedCards, playSound]);

  const allRevealed = revealedCards.size >= displayCards.length;

  const getRarityCounts = () => {
    const counts: Record<string, number> = { Legendary: 0, Epic: 0, Rare: 0, Common: 0 };
    const foilCounts: Record<string, number> = { Prize: 0, Standard: 0 };
    displayCards.forEach((card) => {
      if (counts[card.rarity] !== undefined) counts[card.rarity]++;
      if (card.foil && card.foil !== 'None' && foilCounts[card.foil] !== undefined) foilCounts[card.foil]++;
    });
    return { counts, foilCounts };
  };

  const handleShare = () => {
    const { counts, foilCounts } = getRarityCounts();
    const totalPower = displayCards.reduce((sum, card) => sum + (card.power || 0), 0);
    const totalCards = displayCards.length;

    // Calculate PnL based on pack type
    const packTypeKey = packType.toLowerCase().replace(' pack', '').replace(' ', '');
    const packPrices: Record<string, number> = {
      starter: 0, basic: 1000, premium: 10000, elite: 100000,
      boosted: 5000, luckboost: 5000, lucky: 5000, mission: 0, achievement: 0, dailyfree: 0,
    };
    const burnRarityMult: Record<string, number> = { Common: 0.2, Rare: 1.1, Epic: 4.0, Legendary: 40.0 };
    const foilMult: Record<string, number> = { Prize: 5.0, Standard: 1.5, None: 1.0 };

    const packPrice = packPrices[packTypeKey] || 1000;
    const effectivePrice = packPrice > 0 ? packPrice : 1000;
    const cost = packPrice * totalCards;

    // Calculate burn value
    let burnValue = 0;
    displayCards.forEach(card => {
      const baseBurn = effectivePrice * (burnRarityMult[card.rarity] || 0.2);
      const foilBonus = card.foil && card.foil !== 'None' ? (foilMult[card.foil] || 1.0) : 1.0;
      burnValue += baseBurn * foilBonus;
    });

    // Calculate PnL
    const pnl = cost > 0 ? ((burnValue - cost) / cost * 100) : 0;
    const pnlText = cost > 0 ? (pnl >= 0 ? '+' + pnl.toFixed(0) + '%' : pnl.toFixed(0) + '%') : 'FREE';

    // Build simple text (avoid complex unicode)
    const rarityList: string[] = [];
    if (counts.Legendary > 0) rarityList.push(counts.Legendary + ' Legendary');
    if (counts.Epic > 0) rarityList.push(counts.Epic + ' Epic');
    if (counts.Rare > 0) rarityList.push(counts.Rare + ' Rare');
    if (counts.Common > 0) rarityList.push(counts.Common + ' Common');

    let castText = 'Pack Opening - ' + packType + '!\n';
    castText += totalCards + ' pulls: ' + rarityList.join(', ') + '\n';
    castText += 'Power: ' + totalPower + ' | Burn: ' + Math.round(burnValue);
    if (cost > 0) castText += ' | PnL: ' + pnlText;

    // Build share URL with params for OG image
    const shareParams = new URLSearchParams({
      packType: packTypeKey,
      legendary: String(counts.Legendary),
      epic: String(counts.Epic),
      rare: String(counts.Rare),
      common: String(counts.Common),
      totalPower: String(totalPower),
      foilPrize: String(foilCounts.Prize),
      foilStandard: String(foilCounts.Standard),
      cards: String(totalCards),
    });
    const shareUrl = 'https://vibemostwanted.xyz/share/pack?' + shareParams.toString();

    // Use SDK composeCast when in miniapp, fallback to URL
    if (isInMiniApp && sdk.actions?.composeCast) {
      sdk.actions.composeCast({
        text: castText,
        embeds: [shareUrl],
      }).catch(() => {
        // Fallback to URL if SDK fails
        const farcasterUrl = 'https://warpcast.com/~/compose?text=' + encodeURIComponent(castText) + '&embeds[]=' + encodeURIComponent(shareUrl);
        window.open(farcasterUrl, '_blank');
      });
    } else {
      const farcasterUrl = 'https://warpcast.com/~/compose?text=' + encodeURIComponent(castText) + '&embeds[]=' + encodeURIComponent(shareUrl);
      window.open(farcasterUrl, '_blank');
    }
  };

  const rarityColors: Record<string, string> = {
    Legendary: "border-vintage-gold shadow-lg shadow-vintage-gold/50",
    Epic: "border-purple-400 shadow-lg shadow-purple-400/50",
    Rare: "border-blue-400 shadow-lg shadow-blue-400/50",
    Common: "border-vintage-ice/30",
  };

  return (
    <div className="fixed inset-0 bg-vintage-black/95 backdrop-blur-md flex items-center justify-center z-50 p-2">
      {/* Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
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
          <div className="pack-shake">
            <img
              src="/pack-cover.png"
              alt="Opening Pack"
              className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-2xl"
            />
          </div>
          <div className="absolute inset-0 bg-vintage-gold/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center">
            <p className="text-2xl md:text-3xl font-display font-bold text-vintage-gold animate-pulse">
              Opening Pack...
            </p>
          </div>
        </div>
      )}

      {/* Card Revealing Stage */}
      {stage === 'revealing' && (
        <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto px-2">
          <div className="sticky top-0 bg-vintage-black/95 py-2 z-10 flex flex-col items-center gap-2">
            <h2 className="text-lg md:text-2xl font-display font-bold text-vintage-gold animate-bounce-in">
              Tap cards to reveal!
            </h2>
            {!allRevealed && (
              <button
                onClick={handleRevealAll}
                className="text-sm bg-vintage-charcoal hover:bg-vintage-charcoal/80 text-vintage-gold px-4 py-1.5 rounded-lg border border-vintage-gold/50"
              >
                Reveal All ({displayCards.length - revealedCards.size} left)
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3 mb-4 mt-2">
            {displayCards.map((card: any, i: number) => {
              const isRevealed = revealedCards.has(i);
              const isShaking = shakingCard === i;

              return (
                <div
                  key={i}
                  className={`relative cursor-pointer card-container ${isShaking ? 'card-shaking' : ''}`}
                  onClick={() => handleCardClick(i, card.rarity)}
                >
                  <div className={`card-inner ${isRevealed ? 'is-flipped' : ''}`}>
                    {/* Card Back */}
                    <div className="card-face card-back bg-vintage-charcoal border-2 border-vintage-gold/50 rounded-lg overflow-hidden">
                      <img
                        src="/card-back.png"
                        alt="Card back"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <span className="text-3xl animate-pulse">&#10067;</span>
                      </div>
                    </div>

                    {/* Card Front */}
                    <div className={`card-face card-front bg-vintage-charcoal/80 border-2 md:border-3 rounded-lg p-1 md:p-2 text-center ${rarityColors[card.rarity] || rarityColors.Common}`}>
                      {/* NEW Badge */}
                      {!card.isDuplicate && (
                        <div className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-lg z-10">
                          NEW!
                        </div>
                      )}

                      {/* Card Image */}
                      <div className="relative mb-1">
                        <CardMedia
                          src={convertIpfsUrl(card.imageUrl) || card.imageUrl}
                          alt={`${card.rarity} card`}
                          className="w-full h-auto rounded"
                        />
                        {card.rarity === 'Legendary' && (
                          <div className="absolute inset-0 bg-gradient-to-t from-vintage-gold/30 to-transparent rounded animate-pulse" />
                        )}
                      </div>

                      {/* Power */}
                      <p className={`text-sm md:text-lg font-display font-bold ${
                        card.rarity === 'Legendary' ? 'text-vintage-gold' :
                        card.rarity === 'Epic' ? 'text-purple-400' :
                        card.rarity === 'Rare' ? 'text-blue-400' :
                        'text-vintage-ice'
                      }`}>
                        {card.power}
                      </p>
                      <p className="text-[8px] text-vintage-ice/70">POWER</p>

                      {/* Rarity */}
                      <p className={`text-[10px] font-bold ${
                        card.rarity === 'Legendary' ? 'text-vintage-gold' :
                        card.rarity === 'Epic' ? 'text-purple-400' :
                        card.rarity === 'Rare' ? 'text-blue-400' :
                        'text-vintage-ice/70'
                      }`}>
                        {card.rarity}
                      </p>

                      {/* Foil Badge */}
                      {card.foil && card.foil !== 'None' && (
                        <div className="text-[8px] text-purple-300 font-bold">
                          &#10024; {card.foil}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Buttons - Show after all cards revealed */}
          {allRevealed && (
            <div className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto pb-4">
              <button
                onClick={handleShare}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-display font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all animate-bounce-in flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
                Share
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-vintage-gold hover:bg-vintage-burnt-gold text-vintage-black font-display font-bold py-2.5 px-4 rounded-xl shadow-gold hover:shadow-gold-lg transition-all animate-bounce-in"
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

        @keyframes cardShake {
          0%, 100% { transform: translateX(0) rotateY(0deg); }
          10% { transform: translateX(-4px) rotateY(-5deg); }
          20% { transform: translateX(4px) rotateY(5deg); }
          30% { transform: translateX(-4px) rotateY(-3deg); }
          40% { transform: translateX(4px) rotateY(3deg); }
          50% { transform: translateX(-2px) rotateY(-1deg); }
          60% { transform: translateX(2px) rotateY(1deg); }
          70% { transform: translateX(-1px) rotateY(0deg); }
          80% { transform: translateX(1px) rotateY(0deg); }
          90% { transform: translateX(0) rotateY(0deg); }
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

        .animate-float {
          animation: float linear infinite;
        }

        .pack-shake {
          animation: shake 1.5s ease-in-out;
        }

        .animate-bounce-in {
          animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .card-container {
          perspective: 1000px;
        }

        .card-shaking {
          animation: cardShake 0.3s ease-in-out infinite;
        }

        .card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.5s;
          transform-style: preserve-3d;
        }

        .card-inner.is-flipped {
          transform: rotateY(180deg);
        }

        .card-face {
          width: 100%;
          backface-visibility: hidden;
        }

        .card-back {
          position: relative;
          transform: rotateY(0deg);
        }

        .card-front {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
