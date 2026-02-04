"use client";

interface BattleResultsProps {
  result: string;
  battlePhase: string;
  battleMode: 'normal' | 'elimination';
  currentRound?: number;
  winLabel: string;
  loseLabel: string;
}

export function BattleResults({
  result,
  battlePhase,
  battleMode,
  currentRound = 1,
  winLabel,
  loseLabel,
}: BattleResultsProps) {
  if (battlePhase !== 'result' || !result) return null;

  const isWin = result === winLabel;
  const isLoss = result === loseLabel;

  const colorClass = isWin
    ? 'text-green-400'
    : isLoss
    ? 'text-red-400'
    : 'text-yellow-400';

  const displayText =
    battleMode === 'elimination' && currentRound <= 5
      ? isWin
        ? '\u2605 ROUND WIN!'
        : isLoss
        ? '\u2020 ROUND LOST'
        : '~ ROUND TIE'
      : result;

  return (
    <div className="text-center" style={{ animation: 'battleResultSlide 0.8s ease-out' }}>
      <div className={`text-3xl md:text-6xl font-bold ${colorClass}`}>
        {displayText}
      </div>
    </div>
  );
}
