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
 * IMPORTANT: Effect comes AFTER content in DOM (like reference HTML)
 * This makes mixBlendMode work correctly
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
      {/* Card content FIRST */}
      {children}

      {/* PRIZE FOIL effect AFTER content */}
      {isPrize && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: `
              radial-gradient(circle 300px at 30% 30%,
                rgba(255, 0, 200, 0.8) 0%,
                rgba(255, 0, 150, 0.5) 25%,
                transparent 50%),
              radial-gradient(circle 280px at 70% 25%,
                rgba(255, 255, 0, 0.8) 0%,
                rgba(200, 255, 0, 0.5) 25%,
                transparent 50%),
              radial-gradient(circle 320px at 45% 65%,
                rgba(0, 255, 255, 0.8) 0%,
                rgba(0, 200, 255, 0.5) 25%,
                transparent 50%),
              radial-gradient(circle 250px at 20% 75%,
                rgba(200, 0, 255, 0.8) 0%,
                rgba(255, 0, 255, 0.5) 25%,
                transparent 50%),
              radial-gradient(circle 270px at 80% 50%,
                rgba(0, 255, 100, 0.8) 0%,
                rgba(100, 255, 0, 0.5) 25%,
                transparent 50%)
            `,
            filter: 'blur(30px) saturate(2) brightness(1.3)',
            animation: 'holoMove 10s ease-in-out infinite',
            mixBlendMode: 'multiply',
            opacity: 0.7,
          }}
        />
      )}

      {/* STANDARD FOIL effect AFTER content */}
      {!isPrize && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: `
              radial-gradient(circle 280px at 35% 35%,
                rgba(200, 150, 255, 0.6) 0%,
                rgba(180, 100, 255, 0.4) 25%,
                transparent 50%),
              radial-gradient(circle 260px at 65% 30%,
                rgba(100, 200, 255, 0.6) 0%,
                rgba(150, 220, 255, 0.4) 25%,
                transparent 50%),
              radial-gradient(circle 300px at 50% 70%,
                rgba(150, 255, 200, 0.6) 0%,
                rgba(100, 255, 180, 0.4) 25%,
                transparent 50%)
            `,
            filter: 'blur(25px) saturate(1.5) brightness(1.2)',
            animation: 'holoMove 12s ease-in-out infinite',
            mixBlendMode: 'multiply',
            opacity: 0.6,
          }}
        />
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes holoMove {
          0%, 100% {
            transform: rotate(0deg) scale(1) translate(0, 0);
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
