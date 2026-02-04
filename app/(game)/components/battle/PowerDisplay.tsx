"use client";

interface PowerDisplayProps {
  power: number;
  color: 'blue' | 'red';
  battlePhase: string;
  label?: string;
}

const colorClasses = {
  blue: 'text-vintage-neon-blue',
  red: 'text-red-400',
};

export function PowerDisplay({ power, color, battlePhase, label }: PowerDisplayProps) {
  return (
    <div className="mt-3 md:mt-4 text-center">
      {label && (
        <p className="text-xs text-vintage-burnt-gold mb-1">{label}</p>
      )}
      <p
        className={`text-3xl md:text-4xl font-bold ${colorClasses[color]}`}
        style={{
          animation:
            battlePhase === 'result'
              ? 'battlePowerPulse 1.5s ease-in-out 3'
              : undefined,
        }}
      >
        {power.toLocaleString()}
      </p>
    </div>
  );
}
