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

        {/* Standard Foil - Complex radial gradients effect */}
        {!isPrize && (
          <div className="standard-foil-wrapper" style={{ overflow: 'hidden' }}>
            {/* Rotating radial gradients */}
            <div
              className="standard-foil-before"
              style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: `
                  radial-gradient(ellipse at 25% 25%,
                    rgba(255, 255, 255, 1) 0%,
                    rgba(255, 100, 180, .9) 8%,
                    rgba(100, 200, 255, .9) 16%,
                    rgba(150, 255, 150, .9) 24%,
                    rgba(255, 255, 100, .9) 32%,
                    rgba(255, 150, 100, .9) 40%,
                    rgba(200, 100, 255, .9) 48%,
                    rgba(100, 255, 255, .8) 56%,
                    rgba(255, 200, 150, .7) 64%,
                    rgba(150, 255, 200, .6) 72%,
                    rgba(255, 150, 255, .5) 80%,
                    transparent 100%
                  ),
                  radial-gradient(circle at 70% 70%,
                    rgba(255, 255, 255, .9) 0%,
                    rgba(100, 255, 200, .8) 15%,
                    rgba(255, 150, 255, .7) 30%,
                    rgba(200, 255, 100, .6) 45%,
                    transparent 60%
                  )
                `,
                backgroundSize: '120% 120%, 80% 80%',
                backgroundPosition: '-20% -20%, 20% 20%',
                animation: 'standardFoilRotate 5s linear infinite',
                transformOrigin: 'center',
                opacity: 0.8,
              }}
            />
            {/* Sweeping light gradient */}
            <div
              className="standard-foil-after"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, .7) 45%, rgba(255, 255, 255, .6) 50%, transparent 55%)',
                animation: 'standardFoilSweep 7s ease-in-out infinite',
                opacity: 0.3,
              }}
            />
          </div>
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

        @keyframes prismMove {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 100px 100px;
          }
        }

        @keyframes standardFoilRotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes standardFoilSweep {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
};

export default FoilCardEffect;
