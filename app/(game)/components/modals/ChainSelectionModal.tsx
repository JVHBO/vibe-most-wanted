"use client";

interface ChainSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChain: (chain: string) => Promise<void>;
}

export function ChainSelectionModal({ isOpen, onClose, onSelectChain }: ChainSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold p-5 max-w-sm w-full shadow-gold"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-vintage-gold text-center mb-3">Choose Network</h2>
        <p className="text-xs text-vintage-burnt-gold text-center mb-4">
          Select which blockchain to use for claim transactions
        </p>

        <div className="space-y-3">
          {/* Base option */}
          <button
            onClick={() => onSelectChain("base")}
            className="w-full p-3 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/40 rounded-xl transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{"\u25C7"}</span>
              <div>
                <p className="font-bold text-blue-400 text-sm">Base (Default)</p>
                <p className="text-[10px] text-vintage-burnt-gold">Standard rewards</p>
              </div>
            </div>
          </button>

          {/* Arbitrum option */}
          <button
            onClick={() => onSelectChain("arbitrum")}
            className="w-full p-3 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/40 rounded-xl transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{"\u25C6"}</span>
              <div>
                <p className="font-bold text-purple-400 text-sm">Arbitrum</p>
                <p className="text-[10px] text-green-400">2x quest rewards, +1 free spin, +1 free pack</p>
              </div>
            </div>
          </button>
        </div>

        <p className="text-[9px] text-vintage-burnt-gold/50 text-center mt-3">
          You can change anytime in Settings
        </p>
      </div>
    </div>
  );
}
