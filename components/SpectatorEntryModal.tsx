"use client";

import { useState } from "react";
import { useTransferVBMS, useApproveVBMS } from "@/lib/hooks/useVBMSContracts";
import { useFarcasterVBMSBalance } from "@/lib/hooks/useFarcasterVBMS"; // Miniapp-compatible
import { CONTRACTS } from "@/lib/contracts";
import { useAccount } from "wagmi";

interface SpectatorEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (bettingCredits: number) => void;
  battleId: string;
  playerAddress?: string; // Optional: for Farcaster miniapp
}

export function SpectatorEntryModal({
  isOpen,
  onClose,
  onSuccess,
  battleId,
  playerAddress,
}: SpectatorEntryModalProps) {
  const { address: wagmiAddress } = useAccount();
  // Use playerAddress (miniapp) OR wagmiAddress (web) - playerAddress takes priority
  const effectiveAddress = playerAddress || wagmiAddress;
  const { balance: vbmsBalance } = useFarcasterVBMSBalance(effectiveAddress); // Miniapp-compatible
  const { approve, isPending: isApproving } = useApproveVBMS();
  const { transfer, isPending: isTransferring } = useTransferVBMS();

  const [amount, setAmount] = useState<string>("100");
  const [step, setStep] = useState<"input" | "approving" | "transferring" | "done">("input");
  const [error, setError] = useState<string | null>(null);

  // Preset amounts
  const PRESETS = [50, 100, 250, 500, 1000];

  const handleDeposit = async () => {
    if (!effectiveAddress || !amount) return;

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    if (parseFloat(vbmsBalance) < amountNum) {
      setError("Insufficient VBMS balance");
      return;
    }

    setError(null);

    try {
      // Step 1: Approve
      setStep("approving");
      await approve(CONTRACTS.VBMSBetting as `0x${string}`, amount);

      // Step 2: Transfer
      setStep("transferring");
      const txHash = await transfer(CONTRACTS.VBMSBetting as `0x${string}`, BigInt(amount));

      console.log("✅ Deposited to betting:", txHash);

      // Step 3: Verify and add credits via API
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

      console.log("🎰 Credits added:", data.creditsAdded, "| New balance:", data.newBalance);

      // Step 4: Done - Give betting credits
      setStep("done");
      setTimeout(() => {
        onSuccess(data.creditsAdded);
      }, 1000);
    } catch (err: any) {
      console.error("Error depositing:", err);
      setError(err.message || "Failed to deposit VBMS");
      setStep("input");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-vintage-charcoal border-2 border-vintage-gold rounded-xl max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-display font-bold text-vintage-gold mb-2">
            Enter Spectator Mode
          </h2>
          <p className="text-vintage-ice/70">
            Deposit VBMS to get betting credits for this battle
          </p>
        </div>

        {/* Balance */}
        <div className="bg-vintage-black/40 rounded-lg p-4 mb-6">
          <p className="text-vintage-ice/70 text-sm mb-1">Your VBMS Balance</p>
          <p className="text-2xl font-display font-bold text-purple-400">
            {parseFloat(vbmsBalance).toFixed(2)} VBMS
          </p>
        </div>

        {step === "input" && (
          <>
            {/* Amount Input */}
            <div className="mb-6">
              <label className="text-vintage-ice text-sm font-bold mb-2 block">
                Amount to Deposit
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-vintage-black/60 border-2 border-vintage-gold/30 focus:border-vintage-gold rounded-lg px-4 py-3 text-vintage-ice text-xl font-display outline-none"
                placeholder="100"
                min="1"
              />
            </div>

            {/* Presets */}
            <div className="grid grid-cols-5 gap-2 mb-6">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(preset.toString())}
                  className="bg-vintage-charcoal hover:bg-vintage-gold/20 border border-vintage-gold/30 hover:border-vintage-gold rounded-lg py-2 text-vintage-gold font-bold transition-all"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <p className="text-blue-400 text-sm">
                💡 You'll receive <span className="font-bold">{amount || 0} Betting Credits</span> to use during this battle.
                Credits are instant and don't require blockchain transactions!
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
                onClick={handleDeposit}
                disabled={!amount || parseFloat(amount) <= 0}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-lg font-display font-bold transition-all disabled:cursor-not-allowed"
              >
                Enter Spectator Mode
              </button>
            </div>
          </>
        )}

        {step === "approving" && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-vintage-gold border-t-transparent mx-auto mb-4"></div>
            <p className="text-vintage-gold font-display font-bold text-xl">Approving VBMS...</p>
            <p className="text-vintage-ice/70 text-sm mt-2">Please confirm in your wallet</p>
          </div>
        )}

        {step === "transferring" && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-400 border-t-transparent mx-auto mb-4"></div>
            <p className="text-purple-400 font-display font-bold text-xl">Transferring VBMS...</p>
            <p className="text-vintage-ice/70 text-sm mt-2">Transaction in progress</p>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-green-400 font-display font-bold text-xl mb-2">Success!</p>
            <p className="text-vintage-ice/70">
              You received <span className="text-vintage-gold font-bold">{amount} Betting Credits</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
