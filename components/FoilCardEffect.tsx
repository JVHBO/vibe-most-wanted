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
        {/* Prize Foil - Enhanced rainbow effect (slower, smoother) */}
        {isPrize && (
          <>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: `
                  conic-gradient(from 315deg at -30% -30%, violet, blue, cyan, green, yellow, orange, red, violet),
                  linear-gradient(135deg, transparent, rgba(255, 0, 0, .5) 10%, rgba(255, 255, 0, .5) 20%, rgba(0, 255, 0, .5) 30%, rgba(0, 255, 255, .5) 40%, rgba(0, 0, 255, .5) 50%, rgba(255, 0, 255, .4) 60%, transparent 70%)
                `,
                backgroundSize: '100% 100%, 200% 200%',
                backgroundPosition: '0 0, -100% -100%',
                animation: 'prizeFoilShine 6s linear infinite',
                opacity: 0.35,
                mixBlendMode: 'hard-light',
              }}
            />
            {/* Diagonal stripes overlay (slower) */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255, 255, 255, .08) 0, rgba(255, 255, 255, .08) 10px)',
                mixBlendMode: 'overlay',
                opacity: 0.35,
                animation: 'prismMove 18s linear infinite',
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
