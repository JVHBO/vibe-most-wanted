'use client';

import React from 'react';

interface FoilCardEffectProps {
  children: React.ReactNode;
  foilType?: 'Standard' | 'Prize' | null;
  className?: string;
}

/**
 * FoilCardEffect - Wrapper component that adds holographic effects to foil cards
 * Based on vibechain.com card effect
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
    <div className={`relative inline-block overflow-hidden rounded ${className}`} style={{ userSelect: 'none' }}>
      {/* Card content FIRST */}
      {children}

      {/* Foil overlay AFTER content */}
      <div
        className="foil-overlay"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 2,
          pointerEvents: 'none',
          mixBlendMode: 'overlay',
        }}
      >
        {/* Prize Foil - Very subtle, delicate shimmer */}
        {isPrize && (
          <>
            {/* Ultra-soft rainbow gradient */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: `
                  conic-gradient(from 45deg at -30% -30%, violet, blue, cyan, green, yellow, orange, red, violet),
                  linear-gradient(135deg, transparent, rgba(255, 0, 0, .2) 10%, rgba(255, 255, 0, .2) 20%, rgba(0, 255, 0, .2) 30%, rgba(0, 255, 255, .2) 40%, rgba(0, 0, 255, .2) 50%, rgba(255, 0, 255, .15) 60%, transparent 70%)
                `,
                backgroundSize: '100% 100%, 200% 200%',
                backgroundPosition: '0 0, -100% -100%',
                animation: 'standardFoilShine 8s linear infinite',
                opacity: 0.15,
                mixBlendMode: 'hard-light',
              }}
            />
            {/* Very subtle stripes */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255, 255, 255, .04) 0, rgba(255, 255, 255, .04) 10px)',
                mixBlendMode: 'overlay',
                opacity: 0.2,
                animation: 'prismMove 20s linear infinite',
              }}
            />
          </>
        )}

        {/* Standard Foil - Softer version of Prize effect */}
        {!isPrize && (
          <>
            {/* Base rainbow gradient (inverted rotation) */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: `
                  conic-gradient(from 45deg at -30% -30%, violet, blue, cyan, green, yellow, orange, red, violet),
                  linear-gradient(135deg, transparent, rgba(255, 0, 0, .4) 10%, rgba(255, 255, 0, .4) 20%, rgba(0, 255, 0, .4) 30%, rgba(0, 255, 255, .4) 40%, rgba(0, 0, 255, .4) 50%, rgba(255, 0, 255, .3) 60%, transparent 70%)
                `,
                backgroundSize: '100% 100%, 200% 200%',
                backgroundPosition: '0 0, -100% -100%',
                animation: 'standardFoilShine 4s linear infinite',
                opacity: 0.25,
                mixBlendMode: 'hard-light',
              }}
            />
            {/* Diagonal stripes (slower) */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255, 255, 255, .08) 0, rgba(255, 255, 255, .08) 10px)',
                mixBlendMode: 'overlay',
                opacity: 0.3,
                animation: 'prismMove 15s linear infinite',
              }}
            />
          </>
        )}
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes prizeFoilShine {
          0% {
            background-position: 0 0, -100% -100%;
            filter: hue-rotate(0deg);
          }
          100% {
            background-position: 0 0, 100% 100%;
            filter: hue-rotate(360deg);
          }
        }

        @keyframes standardFoilShine {
          0% {
            background-position: 0 0, -100% -100%;
            filter: hue-rotate(0deg);
          }
          100% {
            background-position: 0 0, 100% 100%;
            filter: hue-rotate(360deg);
          }
        }

        @keyframes prismMove {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 100px 100px;
          }
        }
      `}</style>
    </div>
  );
};

export default FoilCardEffect;
