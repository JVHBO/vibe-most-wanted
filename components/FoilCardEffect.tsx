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

      {/* PRIZE FOIL: Soft, realistic holographic effect */}
      {isPrize && (
        <>
          {/* Main color blobs layer - larger, softer, more blended */}
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              top: '-30%',
              left: '-30%',
              width: '160%',
              height: '160%',
              background: `
                radial-gradient(ellipse 400px 500px at 20% 20%,
                  rgba(255, 0, 200, 0.4) 0%,
                  rgba(255, 100, 150, 0.25) 25%,
                  transparent 45%),
                radial-gradient(ellipse 500px 400px at 80% 30%,
                  rgba(255, 200, 0, 0.4) 0%,
                  rgba(255, 255, 100, 0.25) 25%,
                  transparent 45%),
                radial-gradient(ellipse 450px 450px at 50% 75%,
                  rgba(0, 200, 255, 0.4) 0%,
                  rgba(100, 255, 200, 0.25) 25%,
                  transparent 45%),
                radial-gradient(ellipse 350px 400px at 15% 85%,
                  rgba(150, 0, 255, 0.35) 0%,
                  rgba(200, 100, 255, 0.2) 25%,
                  transparent 45%),
                radial-gradient(ellipse 300px 400px at 85% 75%,
                  rgba(0, 255, 150, 0.35) 0%,
                  rgba(100, 255, 100, 0.2) 25%,
                  transparent 45%)
              `,
              filter: 'blur(40px)',
              animation: 'blobMove 15s ease-in-out infinite',
              mixBlendMode: 'overlay',
              opacity: 0.8,
            }}
          />

          {/* Secondary glow layer - adds depth */}
          <div
            className="absolute inset-0 z-[21] pointer-events-none"
            style={{
              background: `
                radial-gradient(circle at 30% 30%,
                  rgba(255, 150, 0, 0.3) 0%,
                  transparent 30%),
                radial-gradient(circle at 70% 40%,
                  rgba(100, 200, 255, 0.3) 0%,
                  transparent 30%),
                radial-gradient(circle at 50% 70%,
                  rgba(255, 100, 200, 0.3) 0%,
                  transparent 30%)
              `,
              filter: 'blur(25px)',
              animation: 'flowMove 18s ease-in-out infinite',
              mixBlendMode: 'screen',
              opacity: 0.5,
            }}
          />

          {/* Subtle shimmer pass - less aggressive */}
          <div
            className="absolute inset-0 z-[22] pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.05) 50%, transparent 70%)',
              backgroundSize: '300% 300%',
              animation: 'shimmerPass 12s ease-in-out infinite',
              mixBlendMode: 'overlay',
            }}
          />
        </>
      )}

      {/* STANDARD FOIL: Visible rainbow shimmer */}
      {!isPrize && (
        <>
          {/* Rainbow color gradients */}
          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              background: `
                radial-gradient(ellipse 350px 450px at 30% 30%,
                  rgba(200, 150, 255, 0.45) 0%,
                  rgba(180, 100, 255, 0.3) 25%,
                  transparent 50%),
                radial-gradient(ellipse 400px 350px at 70% 40%,
                  rgba(100, 200, 255, 0.45) 0%,
                  rgba(150, 220, 255, 0.3) 25%,
                  transparent 50%),
                radial-gradient(ellipse 380px 380px at 50% 70%,
                  rgba(150, 255, 200, 0.45) 0%,
                  rgba(100, 255, 180, 0.3) 25%,
                  transparent 50%)
              `,
              filter: 'blur(25px)',
              animation: 'blobMove 12s ease-in-out infinite',
              mixBlendMode: 'overlay',
              opacity: 0.85,
            }}
          />

          {/* Shimmer sweep */}
          <div
            className="absolute inset-0 z-[21] pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.15) 50%, transparent 70%)',
              backgroundSize: '250% 250%',
              animation: 'shimmerPass 8s ease-in-out infinite',
              mixBlendMode: 'overlay',
            }}
          />
        </>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes blobMove {
          0%, 100% {
            transform: rotate(0deg) translate(0, 0) scale(1);
          }
          20% {
            transform: rotate(72deg) translate(3%, -2%) scale(1.05);
          }
          40% {
            transform: rotate(144deg) translate(-2%, 3%) scale(0.98);
          }
          60% {
            transform: rotate(216deg) translate(2%, 2%) scale(1.02);
          }
          80% {
            transform: rotate(288deg) translate(-3%, -1%) scale(0.96);
          }
        }

        @keyframes flowMove {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            filter: blur(25px) hue-rotate(0deg);
          }
          25% {
            transform: scale(1.15) rotate(90deg);
            filter: blur(20px) hue-rotate(90deg);
          }
          50% {
            transform: scale(0.95) rotate(180deg);
            filter: blur(30px) hue-rotate(180deg);
          }
          75% {
            transform: scale(1.08) rotate(270deg);
            filter: blur(22px) hue-rotate(270deg);
          }
        }

        @keyframes shimmerPass {
          0% {
            background-position: -150% -150%;
          }
          100% {
            background-position: 250% 250%;
          }
        }
      `}</style>
    </div>
  );
};

export default FoilCardEffect;
