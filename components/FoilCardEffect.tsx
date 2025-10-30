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
 * Prize Foil: Dramatic multi-color blob animation with shimmer (like your HTML example)
 * Standard Foil: Subtle rainbow shimmer effect
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

      {/* PRIZE FOIL: Full holographic effect like your HTML example */}
      {isPrize && (
        <>
          {/* Color blobs layer */}
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              top: '-20%',
              left: '-20%',
              width: '140%',
              height: '140%',
              background: `
                radial-gradient(ellipse 300px 400px at 25% 25%,
                  rgba(255, 0, 200, 0.7) 0%,
                  rgba(255, 100, 150, 0.5) 30%,
                  transparent 50%),
                radial-gradient(ellipse 400px 300px at 75% 35%,
                  rgba(255, 255, 0, 0.7) 0%,
                  rgba(200, 255, 0, 0.5) 30%,
                  transparent 50%),
                radial-gradient(ellipse 350px 350px at 50% 70%,
                  rgba(0, 200, 255, 0.7) 0%,
                  rgba(0, 255, 200, 0.5) 30%,
                  transparent 50%),
                radial-gradient(ellipse 300px 300px at 20% 80%,
                  rgba(200, 0, 255, 0.7) 0%,
                  rgba(255, 0, 255, 0.5) 30%,
                  transparent 50%),
                radial-gradient(ellipse 250px 350px at 80% 70%,
                  rgba(0, 255, 100, 0.7) 0%,
                  rgba(100, 255, 0, 0.5) 30%,
                  transparent 50%)
              `,
              filter: 'blur(8px)',
              animation: 'blobMove 10s ease-in-out infinite',
              mixBlendMode: 'screen',
            }}
          />

          {/* Color flow layer */}
          <div
            className="absolute inset-0 z-[21] pointer-events-none"
            style={{
              background: `
                radial-gradient(circle at 70% 20%,
                  rgba(255, 100, 0, 0.5) 0%,
                  transparent 35%),
                radial-gradient(circle at 30% 50%,
                  rgba(0, 255, 255, 0.5) 0%,
                  transparent 35%),
                radial-gradient(circle at 60% 80%,
                  rgba(255, 0, 100, 0.5) 0%,
                  transparent 35%)
              `,
              filter: 'blur(12px)',
              animation: 'flowMove 12s ease-in-out infinite reverse',
            }}
          />

          {/* Shimmer pass */}
          <div
            className="absolute inset-0 z-[22] pointer-events-none"
            style={{
              background: 'linear-gradient(125deg, transparent 40%, rgba(255, 255, 255, 0.1) 50%, transparent 60%)',
              backgroundSize: '200% 200%',
              animation: 'shimmerPass 8s ease-in-out infinite',
            }}
          />
        </>
      )}

      {/* STANDARD FOIL: Subtle rainbow effect */}
      {!isPrize && (
        <>
          {/* Subtle color gradients */}
          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              background: `
                radial-gradient(ellipse 300px 400px at 25% 25%,
                  rgba(255, 0, 200, 0.3) 0%,
                  rgba(255, 100, 150, 0.2) 30%,
                  transparent 50%),
                radial-gradient(ellipse 400px 300px at 75% 35%,
                  rgba(255, 255, 0, 0.3) 0%,
                  rgba(200, 255, 0, 0.2) 30%,
                  transparent 50%),
                radial-gradient(ellipse 350px 350px at 50% 70%,
                  rgba(0, 200, 255, 0.3) 0%,
                  rgba(0, 255, 200, 0.2) 30%,
                  transparent 50%)
              `,
              filter: 'blur(8px)',
              animation: 'blobMove 10s ease-in-out infinite',
              mixBlendMode: 'overlay',
            }}
          />

          {/* Shimmer effect */}
          <div
            className="absolute inset-0 z-30 pointer-events-none"
            style={{
              background: 'linear-gradient(125deg, transparent 40%, rgba(255, 255, 255, 0.2) 50%, transparent 60%)',
              backgroundSize: '200% 200%',
              animation: 'shimmerPass 3s ease-in-out infinite',
            }}
          />
        </>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes blobMove {
          0%, 100% {
            transform: rotate(0deg) translate(0, 0);
          }
          25% {
            transform: rotate(90deg) translate(5%, -5%);
          }
          50% {
            transform: rotate(180deg) translate(-5%, 5%);
          }
          75% {
            transform: rotate(270deg) translate(5%, 5%);
          }
        }

        @keyframes flowMove {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            filter: blur(12px) hue-rotate(0deg);
          }
          33% {
            transform: scale(1.2) rotate(120deg);
            filter: blur(8px) hue-rotate(120deg);
          }
          66% {
            transform: scale(0.9) rotate(240deg);
            filter: blur(15px) hue-rotate(240deg);
          }
        }

        @keyframes shimmerPass {
          0% {
            background-position: -100% -100%;
          }
          100% {
            background-position: 200% 200%;
          }
        }
      `}</style>
    </div>
  );
};

export default FoilCardEffect;
