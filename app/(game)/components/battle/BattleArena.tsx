"use client";

import { CardMedia } from '@/components/CardMedia';
import FoilCardEffect from '@/components/FoilCardEffect';
import { getCardDisplayPower } from '@/lib/power-utils';
import { BattleResults } from './BattleResults';
import { PowerDisplay } from './PowerDisplay';

interface BattleCard {
  imageUrl?: string;
  tokenId?: string;
  foil?: string;
  power?: number;
  collection?: string;
  [key: string]: any;
}

interface PlayerInfo {
  name: string;
  pfp: string | null;
  fallbackInitials: string;
}

interface BattleArenaProps {
  isOpen: boolean;
  battleMode: 'normal' | 'elimination';
  battlePhase: string;
  playerCards: BattleCard[];
  opponentCards: BattleCard[];
  playerPower: number;
  opponentPower: number;
  player: PlayerInfo;
  opponent: PlayerInfo;
  result: string;
  winLabel: string;
  loseLabel: string;
  currentRound: number;
  roundResults: ('win' | 'loss' | 'tie')[];
  eliminationPlayerScore: number;
  eliminationOpponentScore: number;
  orderedPlayerCards: BattleCard[];
  orderedOpponentCards: BattleCard[];
  battleTitle: string;
  onPlayerPfpError?: () => void;
  onOpponentPfpError?: () => void;
}

function AvatarBadge({
  pfp,
  name,
  fallbackInitials,
  borderColor,
  shadowColor,
  gradientFrom,
  gradientTo,
  onError,
}: {
  pfp: string | null;
  name: string;
  fallbackInitials: string;
  borderColor: string;
  shadowColor: string;
  gradientFrom: string;
  gradientTo: string;
  onError?: () => void;
}) {
  return (
    <div className="flex flex-col items-center mb-3 md:mb-4">
      <div
        className={`w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 ${borderColor} shadow-lg ${shadowColor} mb-2 bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center relative`}
      >
        {pfp ? (
          <img
            src={pfp}
            alt={name}
            className="w-full h-full object-cover absolute inset-0"
            onError={onError ? () => onError() : undefined}
          />
        ) : null}
        <span className={`text-2xl md:text-3xl font-bold text-white ${pfp ? 'opacity-0' : 'opacity-100'}`}>
          {fallbackInitials}
        </span>
      </div>
      <h3 className={`text-xl md:text-2xl font-bold text-center ${borderColor.includes('cyan') ? 'text-vintage-neon-blue' : 'text-red-400'}`}>
        {name}
      </h3>
    </div>
  );
}

function BattleCardGrid({
  cards,
  battlePhase,
  ringColor,
  glowAnimation,
  powerBgColor,
  showTokenId,
}: {
  cards: BattleCard[];
  battlePhase: string;
  ringColor: string;
  glowAnimation: string;
  powerBgColor: string;
  showTokenId: boolean;
}) {
  return (
    <div
      className="grid grid-cols-5 gap-1 md:gap-2"
      style={{
        animation: battlePhase === 'clash' ? 'battleCardShake 2s ease-in-out' : 'battleCardFadeIn 0.8s ease-out',
      }}
    >
      {cards.map((c, i) => (
        <div
          key={i}
          className={`relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ${ringColor}`}
          style={{
            animation: battlePhase === 'clash' ? `${glowAnimation} 1.5s ease-in-out infinite` : undefined,
            animationDelay: `${i * 0.1}s`,
          }}
        >
          <FoilCardEffect
            foilType={c.foil === 'Standard' || c.foil === 'Prize' ? c.foil : null}
            className="w-full h-full"
          >
            <CardMedia src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" loading="eager" />
          </FoilCardEffect>
          <div
            className={`absolute top-0 left-0 ${powerBgColor} text-white text-xs md:text-sm font-bold px-1 md:px-2 py-1 rounded-br`}
            style={{
              animation: battlePhase === 'clash' ? 'battlePowerPulse 1s ease-in-out infinite' : undefined,
            }}
          >
            {getCardDisplayPower(c)}
          </div>
          {showTokenId && battlePhase === 'result' && (
            <div className="absolute bottom-0 right-0 bg-black/80 text-vintage-gold text-xs px-2 py-1 rounded-tl font-mono">
              #{c.tokenId}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EliminationCard({
  card,
  battlePhase,
  currentRound,
  ringColor,
  glowAnimation,
  powerBgColor,
  previousCards,
  roundResults,
  isOpponent,
}: {
  card: BattleCard | undefined;
  battlePhase: string;
  currentRound: number;
  ringColor: string;
  glowAnimation: string;
  powerBgColor: string;
  previousCards: BattleCard[];
  roundResults: ('win' | 'loss' | 'tie')[];
  isOpponent: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-purple-400 font-bold text-lg">Position #{currentRound}</div>
      <div
        className={`relative w-48 md:w-64 aspect-[2/3] rounded-lg overflow-hidden ring-4 ${ringColor}`}
        style={{
          animation: battlePhase === 'clash' ? `${glowAnimation} 1.5s ease-in-out infinite` : 'battleCardFadeIn 0.8s ease-out',
        }}
      >
        <FoilCardEffect
          foilType={card?.foil === 'Standard' || card?.foil === 'Prize' ? card.foil : null}
          className="w-full h-full"
        >
          <CardMedia src={card?.imageUrl} alt={`#${card?.tokenId}`} className="w-full h-full object-cover" loading="eager" />
        </FoilCardEffect>
        <div
          className={`absolute top-0 left-0 ${powerBgColor} text-white text-lg md:text-xl font-bold px-3 py-2 rounded-br`}
          style={{
            animation: battlePhase === 'clash' ? 'battlePowerPulse 1s ease-in-out infinite' : undefined,
          }}
        >
          {getCardDisplayPower(card)}
        </div>
        {isOpponent && battlePhase === 'result' && (
          <div className="absolute bottom-0 right-0 bg-black/80 text-vintage-gold text-xs px-2 py-1 rounded-tl font-mono">
            #{card?.tokenId}
          </div>
        )}
      </div>
      {currentRound > 1 && (
        <div className="flex gap-1 mt-2">
          {previousCards.slice(0, currentRound - 1).map((c, i) => {
            const winColor = isOpponent ? 'border-red-500' : 'border-green-500';
            const lossColor = isOpponent ? 'border-green-500' : 'border-red-500';
            const borderClass = roundResults[i] === 'win' ? winColor : roundResults[i] === 'loss' ? lossColor : 'border-yellow-500';
            return (
              <div key={i} className={`w-12 h-16 rounded border-2 ${borderClass} opacity-50`}>
                <CardMedia src={c.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function BattleArena({
  isOpen,
  battleMode,
  battlePhase,
  playerCards,
  opponentCards,
  playerPower,
  opponentPower,
  player,
  opponent,
  result,
  winLabel,
  loseLabel,
  currentRound,
  roundResults,
  eliminationPlayerScore,
  eliminationOpponentScore,
  orderedPlayerCards,
  orderedOpponentCards,
  battleTitle,
  onPlayerPfpError,
  onOpponentPfpError,
}: BattleArenaProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[300]">
      <div className="w-full max-w-6xl p-8">
        {/* Title */}
        {battleMode === 'elimination' ? (
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl md:text-4xl font-bold text-purple-400 uppercase tracking-wider mb-2">
              &#10022; ELIMINATION MODE
            </h2>
            <div className="flex items-center justify-center gap-4 md:gap-8 text-lg md:text-2xl font-bold">
              <span className="text-cyan-400">Round {currentRound}/5</span>
              <span className="text-vintage-gold">&bull;</span>
              <span className="text-cyan-400">You {eliminationPlayerScore}</span>
              <span className="text-vintage-gold">-</span>
              <span className="text-red-400">{eliminationOpponentScore} Opponent</span>
            </div>
          </div>
        ) : (
          <h2
            className="text-3xl md:text-5xl font-bold text-center mb-8 md:mb-12 text-yellow-400 uppercase tracking-wider"
            style={{ animation: 'battlePowerPulse 2s ease-in-out infinite' }}
          >
            {battleTitle}
          </h2>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
          {/* Player Side */}
          <div>
            <AvatarBadge
              pfp={player.pfp}
              name={player.name}
              fallbackInitials={player.fallbackInitials}
              borderColor="border-cyan-500"
              shadowColor="shadow-cyan-500/50"
              gradientFrom="from-cyan-500"
              gradientTo="to-blue-600"
              onError={onPlayerPfpError}
            />
            {battleMode === 'elimination' ? (
              <EliminationCard
                card={playerCards[currentRound - 1]}
                battlePhase={battlePhase}
                currentRound={currentRound}
                ringColor="ring-cyan-500"
                glowAnimation="battleGlowBlue"
                powerBgColor="bg-cyan-500"
                previousCards={orderedPlayerCards}
                roundResults={roundResults}
                isOpponent={false}
              />
            ) : (
              <>
                <BattleCardGrid
                  cards={playerCards}
                  battlePhase={battlePhase}
                  ringColor="ring-cyan-500"
                  glowAnimation="battleGlowBlue"
                  powerBgColor="bg-cyan-500"
                  showTokenId={false}
                />
                <PowerDisplay power={playerPower} color="blue" battlePhase={battlePhase} />
              </>
            )}
          </div>

          {/* Opponent Side */}
          <div>
            <AvatarBadge
              pfp={opponent.pfp}
              name={opponent.name}
              fallbackInitials={opponent.fallbackInitials}
              borderColor="border-red-500"
              shadowColor="shadow-red-500/50"
              gradientFrom="from-red-500"
              gradientTo="to-orange-600"
              onError={onOpponentPfpError}
            />
            {battleMode === 'elimination' ? (
              <EliminationCard
                card={opponentCards[currentRound - 1]}
                battlePhase={battlePhase}
                currentRound={currentRound}
                ringColor="ring-red-500"
                glowAnimation="battleGlowRed"
                powerBgColor="bg-red-500"
                previousCards={orderedOpponentCards}
                roundResults={roundResults}
                isOpponent={true}
              />
            ) : (
              <>
                <BattleCardGrid
                  cards={opponentCards}
                  battlePhase={battlePhase}
                  ringColor="ring-red-500"
                  glowAnimation="battleGlowRed"
                  powerBgColor="bg-red-500"
                  showTokenId={true}
                />
                <PowerDisplay power={opponentPower} color="red" battlePhase={battlePhase} />
              </>
            )}
          </div>
        </div>

        {/* Result */}
        <BattleResults
          result={result}
          battlePhase={battlePhase}
          battleMode={battleMode}
          currentRound={currentRound}
          winLabel={winLabel}
          loseLabel={loseLabel}
        />
      </div>
    </div>
  );
}
