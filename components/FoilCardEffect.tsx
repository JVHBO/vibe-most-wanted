'use client';

import React from 'react';

interface FoilCardEffectProps {
  children: React.ReactNode;
  foilType?: 'Standard' | 'Prize' | null;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * FoilCardEffect - Wrapper component that adds holographic effects to foil cards
 * Based on vibechain.com card effect
 */
const FoilCardEffect: React.FC<FoilCardEffectProps> = ({
  children,
  foilType,
  className = '',
  style
}) => {
  // No foil effect for non-foil cards
  if (!foilType || foilType === null) {
    return <div className={className} style={style}>{children}</div>;
  }

  const isPrize = foilType === 'Prize';

  return (
    <div className={`relative inline-block overflow-hidden rounded ${className}`} style={{ userSelect: 'none', ...style }}>
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
        {/* Prize Foil - Strong, fast, aggressive rainbow effect */}
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
                  linear-gradient(135deg, transparent, rgba(255, 0, 0, .7) 10%, rgba(255, 255, 0, .7) 20%, rgba(0, 255, 0, .7) 30%, rgba(0, 255, 255, .7) 40%, rgba(0, 0, 255, .7) 50%, rgba(255, 0, 255, .6) 60%, transparent 70%)
                `,
                backgroundSize: '100% 100%, 200% 200%',
                backgroundPosition: '0 0, -100% -100%',
                animation: 'prizeFoilShine 3s linear infinite', // 6s → 3s (faster!)
                opacity: 0.45, // 0.35 → 0.45 (stronger!)
                mixBlendMode: 'hard-light',
              }}
            />
            {/* Diagonal stripes overlay (faster, more aggressive) */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255, 255, 255, .12) 0, rgba(255, 255, 255, .12) 10px)', // 0.08 → 0.12 (more visible)
                mixBlendMode: 'overlay',
                opacity: 0.45, // 0.35 → 0.45 (stronger!)
                animation: 'prismMove 10s linear infinite', // 18s → 10s (faster!)
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
