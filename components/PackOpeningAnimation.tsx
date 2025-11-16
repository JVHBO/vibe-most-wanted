"use client";

import { useState, useEffect } from "react";

interface PackOpeningAnimationProps {
  cards: any[];
  onClose: () => void;
}

export function PackOpeningAnimation({ cards, onClose }: PackOpeningAnimationProps) {
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
        <div className="w-full max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center text-vintage-gold mb-8 animate-bounce-in">
            🎉 Pack Opened!
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
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
                    className={`bg-vintage-charcoal/80 border-4 rounded-xl p-3 text-center transform transition-all duration-500 hover:scale-105 ${
                      rarityColors[card.rarity as keyof typeof rarityColors] || rarityColors.Common
                    } ${isRevealed ? 'card-flip-in' : ''}`}
                  >
                    {/* NEW Badge for first reveal */}
                    {isRevealed && !card.isDuplicate && (
                      <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-bounce-in shadow-lg">
                        NEW!
                      </div>
                    )}

                    {/* FREE CARD Badge */}
                    <div className="absolute top-2 left-2 bg-green-600/90 text-white text-xs font-bold px-2 py-1 rounded">
                      FREE
                    </div>

                    {/* Duplicate Badge */}
                    {card.isDuplicate && (
                      <div className="absolute top-2 right-2 bg-vintage-burnt-gold/90 text-white text-xs font-bold px-2 py-1 rounded">
                        x{card.quantity}
                      </div>
                    )}

                    {/* Card Image with Glow */}
                    <div className="relative mb-2">
                      <img
                        src={card.imageUrl}
                        alt={`${card.rarity} card`}
                        className="w-full h-auto rounded-lg"
                      />
                      {card.rarity === 'Legendary' && (
                        <div className="absolute inset-0 bg-gradient-to-t from-vintage-gold/30 to-transparent rounded-lg animate-pulse" />
                      )}
                    </div>

                    {/* Power */}
                    <div className="mb-2">
                      <p className={`text-2xl font-display font-bold ${
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

          {/* Close Button - Show after all cards revealed */}
          {revealedIndex >= cards.length - 1 && (
            <button
              onClick={onClose}
              className="w-full max-w-md mx-auto block bg-vintage-gold hover:bg-vintage-burnt-gold text-vintage-black font-display font-bold py-4 px-8 rounded-xl shadow-gold hover:shadow-gold-lg transition-all animate-bounce-in"
            >
              Collect Cards
            </button>
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
