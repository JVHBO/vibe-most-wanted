'use client';

import React from 'react';

interface FoilCardEffectProps {
  children: React.ReactNode;
  foilType?: 'Standard' | 'Prize' | null;
  className?: string;
}

/**
 * FoilCardEffect - Wrapper component that adds holographic effects to foil cards
 *
 * Usage:
 * <FoilCardEffect foilType={card.foil}>
 *   <img src={card.imageUrl} alt={card.name} />
 * </FoilCardEffect>
 */
const FoilCardEffect: React.FC<FoilCardEffectProps> = ({
  children,
  foilType,
  className = ''
}) => {
  // No foil effect for non-foil cards
  if (!foilType || foilType === null) {
    return <div className={className}>{children}</div>;
  }

  const isPrize = foilType === 'Prize';

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Main card content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Holographic effect overlay */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 300px 400px at 25% 25%,
              rgba(255, 0, 200, ${isPrize ? '0.5' : '0.3'}) 0%,
              rgba(255, 100, 150, ${isPrize ? '0.3' : '0.2'}) 30%,
              transparent 50%),
            radial-gradient(ellipse 400px 300px at 75% 35%,
              rgba(255, 255, 0, ${isPrize ? '0.5' : '0.3'}) 0%,
              rgba(200, 255, 0, ${isPrize ? '0.3' : '0.2'}) 30%,
              transparent 50%),
            radial-gradient(ellipse 350px 350px at 50% 70%,
              rgba(0, 200, 255, ${isPrize ? '0.5' : '0.3'}) 0%,
              rgba(0, 255, 200, ${isPrize ? '0.3' : '0.2'}) 30%,
              transparent 50%)
          `,
          filter: `blur(${isPrize ? '12px' : '8px'})`,
          animation: 'foilBlobMove 10s ease-in-out infinite',
          mixBlendMode: 'overlay',
        }}
      />

      {/* Shimmer effect */}
      <div
        className="absolute inset-0 z-30 pointer-events-none"
        style={{
          background: 'linear-gradient(125deg, transparent 40%, rgba(255, 255, 255, 0.2) 50%, transparent 60%)',
          backgroundSize: '200% 200%',
          animation: 'foilShimmer 3s ease-in-out infinite',
        }}
      />

      {/* Prize foil - Extra sparkle layer */}
      {isPrize && (
        <div
          className="absolute inset-0 z-25 pointer-events-none"
          style={{
            background: `
              radial-gradient(circle at 30% 20%,
                rgba(255, 215, 0, 0.4) 0%,
                transparent 30%),
              radial-gradient(circle at 70% 80%,
                rgba(255, 100, 255, 0.4) 0%,
                transparent 30%)
            `,
            filter: 'blur(15px)',
            animation: 'foilSparkle 4s ease-in-out infinite',
          }}
        />
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes foilBlobMove {
          0%, 100% {
            transform: rotate(0deg) scale(1);
          }
          25% {
            transform: rotate(90deg) scale(1.1) translate(5%, -5%);
          }
          50% {
            transform: rotate(180deg) scale(1) translate(-5%, 5%);
          }
          75% {
            transform: rotate(270deg) scale(1.1) translate(5%, 5%);
          }
        }

        @keyframes foilShimmer {
          0% {
            background-position: -100% -100%;
          }
          100% {
            background-position: 200% 200%;
          }
        }

        @keyframes foilSparkle {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1) rotate(0deg);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.2) rotate(180deg);
          }
        }
      `}</style>
    </div>
  );
};

export default FoilCardEffect;
