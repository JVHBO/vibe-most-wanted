"use client";

import { useState } from "react";
import { useFarcasterVBMSBalance, useFarcasterTransferVBMS, useFarcasterApproveVBMS } from "@/lib/hooks/useFarcasterVBMS";
import { CONTRACTS } from "@/lib/contracts";
import { useAccount } from "wagmi";
import { parseEther } from "viem";
import { useLanguage } from "@/contexts/LanguageContext";

interface SpectatorEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (bettingCredits: number) => void;
  onJoinFree?: () => void;
  battleId: string;
  playerAddress?: string;
  hideFreePick?: boolean;
  embedded?: boolean; // If true, renders without modal wrapper (for CpuArenaModal)
}

export function SpectatorEntryModal({
  isOpen,
  onClose,
  onSuccess,
  onJoinFree,
  battleId,
  playerAddress,
  hideFreePick = false,
  embedded = false,
}: SpectatorEntryModalProps) {
  const { t } = useLanguage();
  const { address: wagmiAddress } = useAccount();
  const effectiveAddress = playerAddress || wagmiAddress;
  const { balance: vbmsBalance } = useFarcasterVBMSBalance(effectiveAddress);
  const { approve, isPending: isApproving } = useFarcasterApproveVBMS();
  const { transfer, isPending: isTransferring } = useFarcasterTransferVBMS();

  const [amount, setAmount] = useState<string>("100");
  // Skip directly to deposit-amount if hideFreePick is true (no choice needed)
  const [step, setStep] = useState<"input" | "deposit-amount" | "approving" | "transferring" | "done">(
    hideFreePick ? "deposit-amount" : "input"
  );
  const [error, setError] = useState<string | null>(null);

  const MIN_DEPOSIT = 100;
  const MAX_DEPOSIT = 5000;
  const PRESETS = [100, 500, 1000, 2500, 5000];

  const handleDeposit = async () => {
    if (!effectiveAddress || !amount) return;

    const amountNum = parseFloat(amount);
    if (amountNum < MIN_DEPOSIT) {
      setError(`Minimum: ${MIN_DEPOSIT} VBMS`);
      return;
    }

    if (amountNum > MAX_DEPOSIT) {
      setError(`Maximum: ${MAX_DEPOSIT.toLocaleString()} VBMS`);
      return;
    }

    if (parseFloat(vbmsBalance) < amountNum) {
      setError("Insufficient VBMS");
      return;
    }

    setError(null);

    try {
      setStep("approving");
      await approve(CONTRACTS.VBMSBetting as `0x${string}`, parseEther(amount));

      setStep("transferring");
      const txHash = await transfer(CONTRACTS.VBMSBetting as `0x${string}`, parseEther(amount));

      console.log("✅ Deposited to betting:", txHash);

      const response = await fetch('/api/betting/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: effectiveAddress,
          amount,
          txHash,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process deposit');
      }

      console.log("🎰 Credits added:", data.creditsAdded);

      setStep("done");
      setTimeout(() => {
        onSuccess(data.creditsAdded);
      }, 1000);
    } catch (err: any) {
      console.error("Error depositing:", err);
      setError(err.message || "Failed to deposit");
      setStep("input");
    }
  };

  if (!isOpen) return null;

  const content = (
    <div className="p-4">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-vintage-gold">
          {t('spectatorMode') || 'Spectator Mode'}
        </h2>
      </div>

      {/* Mode Selection */}
      {step === "input" && (
        <>
          <div className="space-y-2 mb-4">
            {/* Free Spectator */}
            {!hideFreePick && onJoinFree && (
              <button
                onClick={() => {
                  onJoinFree();
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg border bg-vintage-black/30 border-vintage-gold/20 hover:border-vintage-gold/40 hover:bg-vintage-black/50 transition-all"
              >
                <span className="text-vintage-ice font-bold text-sm">Watch Free</span>
                <span className="text-vintage-ice/50 text-xs">No betting</span>
              </button>
            )}

            {/* Betting Spectator */}
            <button
              onClick={() => setStep("deposit-amount")}
              className="w-full flex items-center justify-between p-3 rounded-lg border bg-vintage-gold/10 border-vintage-gold/50 hover:bg-vintage-gold/20 transition-all"
            >
              <span className="text-vintage-gold font-bold text-sm">
                {hideFreePick ? t('depositVbmsToEnter') : t('withBetting')}
              </span>
              <span className="text-vintage-ice/50 text-xs">Deposit VBMS</span>
            </button>
          </div>

          {/* Back button */}
          <button
            onClick={onClose}
            className="w-full py-2 text-vintage-ice/50 hover:text-vintage-ice transition-colors text-sm"
          >
            ← {t('mechaBackToArenas')}
          </button>
        </>
      )}

      {/* Deposit Amount */}
      {step === "deposit-amount" && (
        <>
          {/* Balance */}
          <div className="bg-vintage-black/30 border border-vintage-gold/20 rounded-lg p-3 mb-4">
            <p className="text-vintage-ice/50 text-xs">{t("yourVbmsBalance")}</p>
            <p className="text-vintage-gold font-bold">
              {parseFloat(vbmsBalance).toFixed(2)} VBMS
            </p>
          </div>

          {/* Amount Input */}
          <div className="mb-4">
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                const val = e.target.value;
                if (parseFloat(val) > MAX_DEPOSIT) {
                  setAmount(MAX_DEPOSIT.toString());
                } else {
                  setAmount(val);
                }
              }}
              className="w-full bg-vintage-black/50 border border-vintage-gold/30 focus:border-vintage-gold rounded-lg px-4 py-3 text-vintage-ice text-center font-bold outline-none"
              placeholder="100"
              min="1"
              max={MAX_DEPOSIT}
            />
          </div>

          {/* Presets */}
          <div className="grid grid-cols-5 gap-1 mb-4">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(preset.toString())}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  amount === preset.toString()
                    ? 'bg-vintage-gold text-vintage-black'
                    : 'bg-vintage-black/30 border border-vintage-gold/20 text-vintage-gold hover:border-vintage-gold/40'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 mb-4">
              <p className="text-red-400 text-xs text-center">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleDeposit}
              disabled={!amount || parseFloat(amount) <= 0}
              className="w-full py-3 bg-vintage-gold hover:bg-vintage-burnt-gold disabled:bg-vintage-gold/30 text-vintage-black font-bold rounded-lg transition-all disabled:cursor-not-allowed"
            >
              {t("depositAndEnter")} ({amount} VBMS)
            </button>
            <button
              onClick={() => hideFreePick ? onClose() : setStep("input")}
              className="w-full py-2 text-vintage-ice/50 hover:text-vintage-ice transition-colors text-sm"
            >
              {t("mechaBackToArenas")}
            </button>
          </div>
        </>
      )}

      {/* Approving */}
      {step === "approving" && (
        <div className="text-center py-6">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-vintage-gold border-t-transparent mx-auto mb-3"></div>
          <p className="text-vintage-gold font-bold">{t("approvingVbms")}...</p>
          <p className="text-vintage-ice/50 text-xs mt-1">{t("confirmInWallet")}</p>
        </div>
      )}

      {/* Transferring */}
      {step === "transferring" && (
        <div className="text-center py-6">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-vintage-gold border-t-transparent mx-auto mb-3"></div>
          <p className="text-vintage-gold font-bold">{t("transferringVbms")}...</p>
          <p className="text-vintage-ice/50 text-xs mt-1">{t("transactionInProgress")}</p>
        </div>
      )}

      {/* Done */}
      {step === "done" && (
        <div className="text-center py-6">
          <p className="text-green-400 font-bold mb-1">{t("success")}!</p>
          <p className="text-vintage-ice/70 text-sm">
            +{amount} Betting Credits
          </p>
        </div>
      )}
    </div>
  );

  // If embedded (used inside CpuArenaModal), return content directly
  if (embedded) {
    return content;
  }

  // Standalone mode - wrap in modal overlay
  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold/50 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
}
