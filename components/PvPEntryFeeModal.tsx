"use client";

import { useState } from "react";
import { useTransferVBMS, useVBMSBalance } from "@/lib/hooks/useVBMSContracts";
import { CONTRACTS } from "@/lib/contracts";
import { useAccount } from "wagmi";
import { parseEther } from "viem";

interface PvPEntryFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entryFeeAmount: number; // Fixed entry fee (e.g., 20 VBMS)
}

export function PvPEntryFeeModal({
  isOpen,
  onClose,
  onSuccess,
  entryFeeAmount,
}: PvPEntryFeeModalProps) {
  const { address } = useAccount();
  const { balance: vbmsBalance } = useVBMSBalance(address);
  const { transfer, isPending: isTransferring, error: transferError } = useTransferVBMS();

  const [step, setStep] = useState<"confirm" | "transferring" | "done">("confirm");
  const [error, setError] = useState<string | null>(null);

  const handlePayEntryFee = async () => {
    if (!address) return;

    if (parseFloat(vbmsBalance) < entryFeeAmount) {
      setError(`Insufficient VBMS. You need ${entryFeeAmount} VBMS`);
      return;
    }

    setError(null);

    try {
      // Step 1: Transfer VBMS to VBMSPoolTroll
      setStep("transferring");
      console.log("💸 Initiating transfer...");

      const transferHash = await transfer(
        CONTRACTS.VBMSPoolTroll as `0x${string}`,
        parseEther(entryFeeAmount.toString())
      );

      console.log("✅ Entry fee transferred:", transferHash);

      // Step 2: Verify and record entry via API
      const response = await fetch('/api/pvp/entry-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          amount: entryFeeAmount,
          txHash: transferHash,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process entry fee');
      }

      console.log("⚔️ Entry fee recorded:", data);

      // Step 3: Done
      setStep("done");
      setTimeout(() => {
        onSuccess();
        onClose();
        setStep("confirm"); // Reset for next time
      }, 1500);
    } catch (err: any) {
      console.error("Error paying entry fee:", err);
      setError(err.message || "Failed to pay entry fee");
      setStep("confirm");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-vintage-charcoal border-2 border-vintage-gold rounded-xl max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-display font-bold text-vintage-gold mb-2">
            PvP Entry Fee
          </h2>
          <p className="text-vintage-ice/70">
            Pay {entryFeeAmount} VBMS to enter this PvP battle
          </p>
        </div>

        {/* Balance */}
        <div className="bg-vintage-black/40 rounded-lg p-4 mb-6">
          <p className="text-vintage-ice/70 text-sm mb-1">Your VBMS Balance</p>
          <p className="text-2xl font-display font-bold text-purple-400">
            {parseFloat(vbmsBalance).toFixed(2)} VBMS
          </p>
        </div>

        {step === "confirm" && (
          <>
            {/* Entry Fee Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <p className="text-blue-400 text-sm mb-2">
                💰 Entry fee: <span className="font-bold">{entryFeeAmount} VBMS</span>
              </p>
              <p className="text-vintage-ice/70 text-xs mb-1">
                • VBMS goes to pool (locked)
              </p>
              <p className="text-vintage-ice/70 text-xs mb-1">
                • Winner receives TESTVBMS in inbox
              </p>
              <p className="text-vintage-ice/70 text-xs">
                • Loser's VBMS stays in pool
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-vintage-charcoal hover:bg-vintage-charcoal/80 text-vintage-ice border border-vintage-gold/30 py-3 rounded-lg font-display font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handlePayEntryFee}
                disabled={parseFloat(vbmsBalance) < entryFeeAmount}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-lg font-display font-bold transition-all disabled:cursor-not-allowed"
              >
                Pay {entryFeeAmount} VBMS
              </button>
            </div>
          </>
        )}

        {step === "transferring" && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-400 border-t-transparent mx-auto mb-4"></div>
            <p className="text-purple-400 font-display font-bold text-xl">Transferring VBMS...</p>
            <p className="text-vintage-ice/70 text-sm mt-2">Please confirm in your wallet</p>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-green-400 font-display font-bold text-xl mb-2">Entry fee paid!</p>
            <p className="text-vintage-ice/70">
              {entryFeeAmount} VBMS transferred to pool
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
