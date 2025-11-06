"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

interface InboxModalProps {
  inboxAmount: number;
  onClose: () => void;
}

export function InboxModal({ inboxAmount, onClose }: InboxModalProps) {
  const { address } = useAccount();
  const [collecting, setCollecting] = useState(false);

  const prepareClaimMutation = useMutation(api.vbmsClaim.prepareInboxClaim);
  const recordClaimMutation = useMutation(api.vbmsClaim.recordInboxClaim);

  const claimHistory = useQuery(
    api.vbmsClaim.getClaimHistory,
    address ? { address, limit: 5 } : "skip"
  );

  const canCollect = inboxAmount >= 100;

  async function handleCollect() {
    if (!address || !canCollect) return;

    setCollecting(true);

    try {
      toast.info("Preparing claim...");

      const claimData = await prepareClaimMutation({ address });

      toast.info("Sending transaction...");

      // TODO: Replace with actual contract call
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const mockTxHash = `0x${Math.random().toString(16).substring(2)}`;

      await recordClaimMutation({
        address,
        amount: claimData.amount,
        txHash: mockTxHash,
      });

      if (claimData.bonus > 0) {
        toast.success(
          `✅ Collected ${claimData.amount} VBMS! (+${claimData.bonus} bonus)`,
          { duration: 5000 }
        );
      } else {
        toast.success(`✅ Collected ${claimData.amount} VBMS to your wallet!`);
      }

      setTimeout(() => onClose(), 1500);
    } catch (error: any) {
      console.error("Collection failed:", error);
      toast.error(error.message || "Failed to collect from inbox");
    } finally {
      setCollecting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-2xl p-6 max-w-md w-full border-2 border-vintage-gold shadow-[0_0_30px_rgba(255,215,0,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-vintage-gold flex items-center gap-2 font-display">
            <span>📬</span> VBMS Inbox
          </h2>
          <button onClick={onClose} className="text-vintage-burnt-gold hover:text-vintage-gold text-3xl font-bold">
            ×
          </button>
        </div>

        {canCollect ? (
          <>
            <div className="bg-vintage-deep-black rounded-xl p-6 mb-6 text-center border-2 border-vintage-gold shadow-[0_0_20px_rgba(255,215,0,0.2)]">
              <p className="text-vintage-burnt-gold text-sm mb-2 font-modern">You have</p>
              <p className="text-6xl font-bold text-vintage-gold mb-2 font-display" style={{textShadow: '0 0 20px rgba(255, 215, 0, 0.5)'}}>
                {inboxAmount.toLocaleString()}
              </p>
              <p className="text-vintage-gold text-lg font-modern">VBMS</p>
              <p className="text-vintage-burnt-gold text-sm mt-2">waiting to be collected</p>
            </div>

            <button
              onClick={handleCollect}
              disabled={collecting}
              className="w-full py-4 px-6 rounded-xl font-bold text-lg font-display transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-gold hover:shadow-gold-lg mb-4"
              style={{background: 'linear-gradient(145deg, #FFD700, #C9A227)'}}
            >
              {collecting ? (
                <span className="flex items-center justify-center gap-2 text-vintage-black">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-vintage-black"></div>
                  Collecting...
                </span>
              ) : (
                <span className="text-vintage-black">Collect All</span>
              )}
            </button>

            <p className="text-center text-vintage-burnt-gold text-sm mb-6">
              Gas cost: ~$0.005
            </p>
          </>
        ) : (
          <div className="bg-vintage-deep-black rounded-xl p-8 mb-6 text-center border-2 border-vintage-burnt-gold/30">
            <div className="text-6xl mb-4 opacity-50">📭</div>
            <p className="text-vintage-gold text-lg mb-2 font-display">Inbox Empty</p>
            <p className="text-vintage-burnt-gold text-sm font-modern">
              Win battles to earn VBMS
            </p>
            {inboxAmount > 0 && (
              <p className="text-vintage-gold text-sm mt-4">
                {inboxAmount} VBMS in inbox
                <br />
                <span className="text-vintage-burnt-gold">Minimum: 100 VBMS</span>
              </p>
            )}
          </div>
        )}

        {claimHistory && claimHistory.length > 0 && (
          <div className="mt-6 border-t border-vintage-gold/20 pt-4">
            <h3 className="text-vintage-burnt-gold text-sm font-semibold mb-3 font-modern">
              Recent Collections
            </h3>
            <div className="space-y-2">
              {claimHistory.map((claim, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-vintage-deep-black rounded-lg p-3 text-sm border border-vintage-burnt-gold/20"
                >
                  <div>
                    <p className="text-vintage-gold font-medium font-modern">
                      {claim.amount.toLocaleString()} VBMS
                    </p>
                    {claim.bonus && claim.bonus > 0 && (
                      <p className="text-vintage-gold text-xs">
                        +{claim.bonus} bonus
                      </p>
                    )}
                    <p className="text-vintage-burnt-gold text-xs">
                      {new Date(claim.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <a
                    href={`https://basescan.org/tx/${claim.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-vintage-gold hover:text-vintage-gold-light text-xs font-modern underline"
                  >
                    View ↗
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg p-3">
          <p className="text-vintage-burnt-gold text-sm font-modern">
            💡 <strong className="text-vintage-gold">Tip:</strong> Accumulate more VBMS in your inbox to save on gas
            fees! Collect weekly for maximum savings.
          </p>
        </div>
      </div>
    </div>
  );
}
