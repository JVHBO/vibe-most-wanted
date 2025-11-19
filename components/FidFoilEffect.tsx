'use client';

import React from 'react';

interface FidFoilEffectProps {
  children: React.ReactNode;
  foilType?: 'Standard' | 'Prize' | 'None' | null;
  className?: string;
}

/**
 * FidFoilEffect - New holographic effect specifically for /fid page
 *
 * Features modern rainbow scan effects:
 * - Prize: Intense rainbow wave with particle shimmer
 * - Standard: Subtle diagonal scan with soft glow
 */
const FidFoilEffect: React.FC<FidFoilEffectProps> = ({
  children,
  foilType,
  className = ''
}) => {
  // No foil effect for non-foil cards
  if (!foilType || foilType === 'None' || foilType === null) {
    return <div className={className}>{children}</div>;
  }

  const isPrize = foilType === 'Prize';

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Card content FIRST */}
      {children}

      {/* PRIZE FOIL - Intense rainbow wave effect */}
      {isPrize && (
        <>
          {/* Rainbow wave sweep */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: `
                linear-gradient(
                  90deg,
                  transparent 0%,
                  rgba(255, 0, 100, 0.6) 20%,
                  rgba(255, 200, 0, 0.6) 35%,
                  rgba(0, 255, 150, 0.6) 50%,
                  rgba(0, 150, 255, 0.6) 65%,
                  rgba(200, 0, 255, 0.6) 80%,
                  transparent 100%
                )
              `,
              filter: 'blur(10px)',
              animation: 'rainbowSweep 3s ease-in-out infinite',
              mixBlendMode: 'screen',
            }}
          />

          {/* Particle shimmer overlay */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: `
                radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.8) 0%, transparent 2%),
                radial-gradient(circle at 60% 30%, rgba(255, 255, 255, 0.6) 0%, transparent 2%),
                radial-gradient(circle at 40% 60%, rgba(255, 255, 255, 0.8) 0%, transparent 2%),
                radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.6) 0%, transparent 2%),
                radial-gradient(circle at 30% 85%, rgba(255, 255, 255, 0.8) 0%, transparent 2%)
              `,
              backgroundSize: '100% 100%',
              animation: 'sparkle 2s ease-in-out infinite',
              mixBlendMode: 'screen',
              opacity: 0.4,
            }}
          />

          {/* Edge glow */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              boxShadow: 'inset 0 0 30px rgba(255, 100, 255, 0.5), inset 0 0 60px rgba(0, 200, 255, 0.3)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
        </>
      )}

      {/* STANDARD FOIL - Subtle diagonal scan */}
      {!isPrize && foilType === 'Standard' && (
        <>
          {/* Diagonal scan line */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '-100%',
              left: '-100%',
              width: '200%',
              height: '200%',
              background: `
                linear-gradient(
                  135deg,
                  transparent 0%,
                  transparent 45%,
                  rgba(150, 200, 255, 0.3) 48%,
                  rgba(200, 150, 255, 0.5) 50%,
                  rgba(150, 200, 255, 0.3) 52%,
                  transparent 55%,
                  transparent 100%
                )
              `,
              filter: 'blur(5px)',
              animation: 'diagonalScan 8s linear infinite',
              mixBlendMode: 'screen',
            }}
          />

          {/* Soft glow */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: `
                radial-gradient(
                  circle at 50% 50%,
                  rgba(200, 150, 255, 0.15) 0%,
                  transparent 70%
                )
              `,
              animation: 'softPulse 4s ease-in-out infinite',
            }}
          />
        </>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes rainbowSweep {
          0% {
            left: -100%;
          }
          50% {
            left: 100%;
          }
          100% {
            left: -100%;
          }
        }

        @keyframes sparkle {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.2);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes diagonalScan {
          0% {
            transform: translate(-50%, -50%);
          }
          100% {
            transform: translate(0%, 0%);
          }
        }

        @keyframes softPulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export default FidFoilEffect;
