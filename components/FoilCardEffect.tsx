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
        {/* Prize Foil - Rainbow shifting effect */}
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
                  conic-gradient(from 45deg at 30% 30%, red, orange, yellow, green, cyan, blue, violet, red),
                  linear-gradient(135deg, transparent, rgba(255, 0, 0, .7) 10%, rgba(255, 255, 0, .8) 20%, rgba(0, 255, 0, .7) 30%, rgba(0, 255, 255, .8) 40%, rgba(0, 0, 255, .7) 50%, rgba(255, 0, 255, .6) 60%, transparent 70%)
                `,
                backgroundSize: '100% 100%, 200% 200%',
                backgroundPosition: '0 0, -100% -100%',
                animation: 'prizeFoilShine 2s linear infinite',
                opacity: 0.4,
                mixBlendMode: 'hard-light',
              }}
            />
            {/* Diagonal stripes overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255, 255, 255, .1) 0, rgba(255, 255, 255, .1) 10px)',
                mixBlendMode: 'overlay',
                opacity: 0.5,
                animation: 'prismMove 10s linear infinite',
              }}
            />
          </>
        )}

        {/* Standard Foil - Subtle pastel effect */}
        {!isPrize && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: `
                conic-gradient(from 45deg at 30% 30%,
                  rgba(255, 100, 200, 0.3),
                  rgba(255, 200, 100, 0.3),
                  rgba(100, 255, 200, 0.3),
                  rgba(100, 200, 255, 0.3),
                  rgba(200, 100, 255, 0.3),
                  rgba(255, 100, 200, 0.3)
                ),
                linear-gradient(135deg, transparent, rgba(100, 200, 255, .4) 20%, rgba(200, 100, 255, .4) 50%, transparent 80%)
              `,
              backgroundSize: '100% 100%, 200% 200%',
              backgroundPosition: '0 0, -100% -100%',
              animation: 'standardFoilShine 4s linear infinite',
              opacity: 0.3,
              mixBlendMode: 'hard-light',
            }}
          />
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
