"use client";

import { useState } from "react";
import { useFarcasterVBMSBalance, useFarcasterTransferVBMS, useFarcasterApproveVBMS } from "@/lib/hooks/useFarcasterVBMS"; // Miniapp-compatible
import { CONTRACTS } from "@/lib/contracts";
import { useAccount } from "wagmi";
import { parseEther } from "viem";

interface SpectatorEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (bettingCredits: number) => void;
  onJoinFree?: () => void; // Optional: Join as free spectator
  battleId: string;
  playerAddress?: string; // Optional: for Farcaster miniapp
  hideFreePick?: boolean; // Hide the free spectator option
}

export function SpectatorEntryModal({
  isOpen,
  onClose,
  onSuccess,
  onJoinFree,
  battleId,
  playerAddress,
  hideFreePick = false,
}: SpectatorEntryModalProps) {
  const { address: wagmiAddress } = useAccount();
  // Use playerAddress (miniapp) OR wagmiAddress (web) - playerAddress takes priority
  const effectiveAddress = playerAddress || wagmiAddress;
  const { balance: vbmsBalance } = useFarcasterVBMSBalance(effectiveAddress); // Miniapp-compatible
  const { approve, isPending: isApproving } = useFarcasterApproveVBMS();
  const { transfer, isPending: isTransferring } = useFarcasterTransferVBMS();

  const [amount, setAmount] = useState<string>("100");
  const [step, setStep] = useState<"input" | "deposit-intro" | "deposit-amount" | "approving" | "transferring" | "done">("input");
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
      await approve(CONTRACTS.VBMSBetting as `0x${string}`, parseEther(amount));

      // Step 2: Transfer
      setStep("transferring");
      const txHash = await transfer(CONTRACTS.VBMSBetting as `0x${string}`, parseEther(amount));

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
            Spectator Mode
          </h2>
          <p className="text-vintage-ice/70">
            Watch the battle and chat with players
          </p>
        </div>

        {/* Mode Selection - Only show if not in deposit flow */}
        {step === "input" && (
          <div className={`grid ${hideFreePick ? 'grid-cols-1' : 'grid-cols-2'} gap-4 mb-6`}>
            {/* Free Spectator - Hidden when hideFreePick is true */}
            {!hideFreePick && onJoinFree && (
              <button
                onClick={() => {
                  onJoinFree();
                  onClose();
                }}
                className="group relative bg-gradient-to-br from-blue-600/30 to-blue-800/30 hover:from-blue-500/50 hover:to-blue-700/50 border-2 border-blue-500/50 hover:border-blue-400 rounded-xl p-6 transition-all hover:scale-105"
              >
                <div className="text-center">
                  <div className="text-5xl mb-3">👁️</div>
                  <p className="text-blue-400 font-display font-bold text-lg mb-1">
                    Watch Free
                  </p>
                  <p className="text-vintage-ice/70 text-xs">
                    Chat & Watch
                  </p>
                  <p className="text-vintage-ice/50 text-xs mt-1">
                    No betting
                  </p>
                </div>
              </button>
            )}

            {/* Betting Spectator */}
            <button
              onClick={() => setStep("deposit-intro")}
              className="group relative bg-gradient-to-br from-purple-600/30 to-pink-800/30 hover:from-purple-500/50 hover:to-pink-700/50 border-2 border-purple-500/50 hover:border-purple-400 rounded-xl p-6 transition-all hover:scale-105"
            >
              <div className="text-center">
                <div className="text-5xl mb-3">💰</div>
                <p className="text-purple-400 font-display font-bold text-lg mb-1">
                  {hideFreePick ? 'Deposit VBMS to Enter' : 'With Betting'}
                </p>
                <p className="text-vintage-ice/70 text-xs">
                  Bet on rounds
                </p>
                <p className="text-vintage-ice/50 text-xs mt-1">
                  Deposit VBMS
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Deposit Intro - Explain betting */}
        {step === "deposit-intro" && (
          <>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-4">
              <p className="text-purple-400 text-sm mb-2">
                💰 <span className="font-bold">Round Betting System</span>
              </p>
              <ul className="text-vintage-ice/70 text-xs space-y-1">
                <li>• Bet on each round (1-7)</li>
                <li>• Growing odds: 1.5x → 2.0x</li>
                <li>• Instant payouts</li>
                <li>• Simple: tap card to bet</li>
              </ul>
            </div>

            <div className="text-center mb-4">
              <p className="text-vintage-gold font-bold mb-2">How much to deposit?</p>
              <p className="text-vintage-ice/70 text-sm">
                You'll receive 1:1 betting credits
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("input")}
                className="flex-1 bg-vintage-charcoal hover:bg-vintage-charcoal/80 text-vintage-ice border border-vintage-gold/30 py-3 rounded-lg font-display font-bold transition-all"
              >
                Back
              </button>
              <button
                onClick={() => setStep("deposit-amount")}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-lg font-display font-bold transition-all"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* Balance - Only show in deposit flow */}
        {(step === "deposit-amount" || step === "approving" || step === "transferring") && (
          <div className="bg-vintage-black/40 rounded-lg p-4 mb-6">
            <p className="text-vintage-ice/70 text-sm mb-1">Your VBMS Balance</p>
            <p className="text-2xl font-display font-bold text-purple-400">
              {parseFloat(vbmsBalance).toFixed(2)} VBMS
            </p>
          </div>
        )}

        {/* Deposit Amount Selection */}
        {step === "deposit-amount" && (
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
                onClick={() => setStep("deposit-intro")}
                className="flex-1 bg-vintage-charcoal hover:bg-vintage-charcoal/80 text-vintage-ice border border-vintage-gold/30 py-3 rounded-lg font-display font-bold transition-all"
              >
                Back
              </button>
              <button
                onClick={handleDeposit}
                disabled={!amount || parseFloat(amount) <= 0}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-lg font-display font-bold transition-all disabled:cursor-not-allowed"
              >
                Deposit & Enter
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
