"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/fid/convex-generated/api";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

interface DailyLeaderProps {
  showPastWinners?: boolean;
  compact?: boolean;
}

export function DailyLeader({ showPastWinners = true, compact = false }: DailyLeaderProps) {
  const { lang } = useLanguage();

  const prizeInfo = useQuery(api.cardVotes.getDailyPrizeInfo, {});
  const dailyLeaderboard = useQuery(api.cardVotes.getDailyLeaderboard, { limit: 5 });
  const pastWinners = useQuery(api.cardVotes.getPastWinners, { limit: 7 });

  const translations: Record<string, any> = {
    en: {
      todaysLeader: "Today's Leader",
      prizePool: "Prize Pool",
      votes: "votes",
      noVotesYet: "No votes yet today!",
      beFirst: "Be the first to vote!",
      pastWinners: "Past Winners",
      coins: "coins",
      endsIn: "Ends in",
      topVoted: "Top Voted Today",
    },
    "pt-BR": {
      todaysLeader: "Líder do Dia",
      prizePool: "Prêmio",
      votes: "votos",
      noVotesYet: "Nenhum voto ainda hoje!",
      beFirst: "Seja o primeiro a votar!",
      pastWinners: "Vencedores Anteriores",
      coins: "moedas",
      endsIn: "Termina em",
      topVoted: "Mais Votados Hoje",
    },
  };

  const t = translations[lang] || translations.en;

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!prizeInfo?.endsAt) return "";
    const now = Date.now();
    const diff = prizeInfo.endsAt - now;
    if (diff <= 0) return "Ending soon...";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-vintage-gold/20 to-vintage-burnt-gold/10 rounded-lg border border-vintage-gold/50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {prizeInfo?.currentLeader ? (
              <>
                <img
                  src={prizeInfo.currentLeader.pfpUrl}
                  alt={prizeInfo.currentLeader.username}
                  className="w-10 h-10 rounded-full border-2 border-vintage-gold"
                />
                <div>
                  <p className="text-vintage-gold font-bold text-sm">
                    👑 @{prizeInfo.currentLeader.username}
                  </p>
                  <p className="text-vintage-ice/70 text-xs">
                    {prizeInfo.currentLeader.totalVotes} {t.votes}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-vintage-ice/70 text-sm">{t.noVotesYet}</p>
            )}
          </div>

          <div className="text-right">
            <p className="text-vintage-gold font-bold">
              🏆 {prizeInfo?.prizePool || 0}
            </p>
            <p className="text-vintage-ice/50 text-xs">{t.prizePool}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-vintage-gold">
          👑 {t.todaysLeader}
        </h2>
        <div className="text-right">
          <p className="text-vintage-burnt-gold text-xs">{t.endsIn}</p>
          <p className="text-vintage-gold font-bold">{getTimeRemaining()}</p>
        </div>
      </div>

      {/* Current Leader */}
      {prizeInfo?.currentLeader ? (
        <Link
          href={`/fid/${prizeInfo.currentLeader.cardFid}`}
          className="block bg-gradient-to-r from-vintage-gold/20 to-vintage-burnt-gold/10 rounded-lg border-2 border-vintage-gold p-4 mb-4 hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-center gap-4">
            <img
              src={prizeInfo.currentLeader.pfpUrl}
              alt={prizeInfo.currentLeader.username}
              className="w-16 h-16 rounded-full border-2 border-vintage-gold shadow-lg"
            />
            <div className="flex-1">
              <p className="text-vintage-gold font-bold text-lg">
                @{prizeInfo.currentLeader.username}
              </p>
              <p className="text-vintage-ice text-sm">
                {prizeInfo.currentLeader.displayName}
              </p>
              <p className="text-vintage-burnt-gold font-bold mt-1">
                🗳️ {prizeInfo.currentLeader.totalVotes} {t.votes}
              </p>
            </div>
            <div className="text-right">
              <p className="text-vintage-gold text-2xl font-bold">
                🏆 {prizeInfo.prizePool}
              </p>
              <p className="text-vintage-ice/70 text-xs">{t.prizePool}</p>
            </div>
          </div>
        </Link>
      ) : (
        <div className="bg-vintage-charcoal/50 rounded-lg border border-vintage-gold/30 p-6 text-center mb-4">
          <p className="text-vintage-ice text-lg mb-2">{t.noVotesYet}</p>
          <p className="text-vintage-burnt-gold">{t.beFirst}</p>
        </div>
      )}

      {/* Top 5 Leaderboard */}
      {dailyLeaderboard && dailyLeaderboard.length > 1 && (
        <div className="mb-4">
          <h3 className="text-vintage-burnt-gold font-bold mb-2">{t.topVoted}</h3>
          <div className="space-y-2">
            {dailyLeaderboard.slice(1, 5).map((leader: any, index: number) => (
              <Link
                key={leader.cardFid}
                href={`/fid/${leader.cardFid}`}
                className="flex items-center gap-3 bg-vintage-charcoal/30 rounded-lg p-2 hover:bg-vintage-charcoal/50 transition-colors"
              >
                <span className="text-vintage-ice/50 w-6 text-center">
                  #{index + 2}
                </span>
                <img
                  src={leader.pfpUrl}
                  alt={leader.username}
                  className="w-8 h-8 rounded-full border border-vintage-gold/30"
                />
                <span className="text-vintage-ice flex-1 truncate">
                  @{leader.username}
                </span>
                <span className="text-vintage-burnt-gold font-bold">
                  {leader.totalVotes} 🗳️
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Past Winners */}
      {showPastWinners && pastWinners && pastWinners.length > 0 && (
        <div className="border-t border-vintage-gold/20 pt-4">
          <h3 className="text-vintage-burnt-gold font-bold mb-3">{t.pastWinners}</h3>
          <div className="space-y-2">
            {pastWinners.map((winner: any) => (
              <Link
                key={winner.date}
                href={`/fid/${winner.cardFid}`}
                className="flex items-center gap-3 bg-vintage-charcoal/20 rounded-lg p-2 hover:bg-vintage-charcoal/40 transition-colors"
              >
                <img
                  src={winner.pfpUrl}
                  alt={winner.username}
                  className="w-8 h-8 rounded-full border border-vintage-gold/20"
                />
                <div className="flex-1">
                  <p className="text-vintage-ice text-sm">@{winner.username}</p>
                  <p className="text-vintage-ice/50 text-xs">{winner.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-vintage-gold font-bold text-sm">
                    {winner.prizeAmount} 🪙
                  </p>
                  <p className="text-vintage-ice/50 text-xs">
                    {winner.totalVotes} {t.votes}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DailyLeader;
