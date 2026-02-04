"use client";

interface LeaderboardRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const rewards = [
  { emoji: "\u{1F947}", label: "1st Place", amount: "1,000 coins", gradient: "from-yellow-500/20 to-yellow-600/10", border: "border-yellow-500/30", labelColor: "text-yellow-400", amountColor: "text-yellow-300" },
  { emoji: "\u{1F948}", label: "2nd Place", amount: "750 coins", gradient: "from-gray-400/20 to-gray-500/10", border: "border-gray-400/30", labelColor: "text-gray-300", amountColor: "text-gray-200" },
  { emoji: "\u{1F949}", label: "3rd Place", amount: "500 coins", gradient: "from-amber-600/20 to-amber-700/10", border: "border-amber-600/30", labelColor: "text-amber-400", amountColor: "text-amber-300" },
  { emoji: "\u{1F396}\uFE0F", label: "4th - 10th Place", amount: "300 coins", gradient: "from-vintage-gold/10 to-vintage-gold/5", border: "border-vintage-gold/20", labelColor: "text-vintage-gold", amountColor: "text-vintage-burnt-gold" },
];

export function LeaderboardRewardsModal({ isOpen, onClose }: LeaderboardRewardsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-2xl border-4 border-vintage-gold max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-vintage-gold/30">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-display font-bold text-vintage-gold">
              {"\u{1F3C6}"} Weekly Ranking Rewards
            </h2>
            <button
              onClick={onClose}
              className="text-vintage-gold hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-vintage-burnt-gold mt-1">
            Top 10 players receive rewards every Sunday at 00:00 UTC
          </p>
        </div>

        {/* Rewards List */}
        <div className="p-4 space-y-3">
          {rewards.map((r) => (
            <div
              key={r.label}
              className={`flex items-center justify-between p-3 bg-gradient-to-r ${r.gradient} rounded-lg border ${r.border}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{r.emoji}</span>
                <span className={`font-bold ${r.labelColor}`}>{r.label}</span>
              </div>
              <span className={`font-mono font-bold ${r.amountColor}`}>{r.amount}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-vintage-gold/30 text-center">
          <p className="text-xs text-vintage-burnt-gold">
            Ranking based on Aura score. Rewards are claimable after each Sunday reset.
          </p>
        </div>
      </div>
    </div>
  );
}
