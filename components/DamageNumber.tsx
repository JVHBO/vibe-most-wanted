/**
 * Floating Damage Number Component
 *
 * Shows damage numbers that float up and fade out
 */

'use client';

import { useEffect, useState } from 'react';

interface DamageNumberProps {
  damage: number;
  isCritical: boolean;
  x: number; // Position X (0-100%)
  y: number; // Position Y (0-100%)
  onComplete: () => void;
}

export function DamageNumber({ damage, isCritical, x, y, onComplete }: DamageNumberProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Fade out and remove after 1.5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`absolute pointer-events-none font-bold text-2xl animate-damage-float ${
        isCritical ? 'text-red-500 text-4xl' : 'text-yellow-400'
      }`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animation: 'damageFloat 1.5s ease-out forwards',
        textShadow: isCritical
          ? '0 0 10px rgba(255, 0, 0, 0.8), 0 0 20px rgba(255, 0, 0, 0.5)'
          : '0 0 10px rgba(255, 215, 0, 0.8)',
      }}
    >
      {isCritical && <span className="text-red-600">CRITICAL! </span>}
      {damage.toLocaleString()}
      {isCritical && '!'}
    </div>
  );
}
