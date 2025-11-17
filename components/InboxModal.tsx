"use client";

import { useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { useClaimVBMS } from "@/lib/hooks/useVBMSContracts";

interface InboxModalProps {
  economy: {
    inbox: number;
    claimableBalance: number;
    lastClaimTimestamp: number;
    coins?: number; // VBMS virtual balance
  };
  onClose: () => void;
}

export function InboxModal({ economy, onClose }: InboxModalProps) {
  const { address } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);

  const claimAsVBMS = useMutation(api.vbmsClaim.claimInboxAsVBMS);
  const prepareInboxClaimVBMS = useAction(api.vbmsClaim.prepareInboxClaim);
  const recordInboxClaim = useMutation(api.vbmsClaim.recordInboxClaim);
  const convertVBMS = useAction(api.vbmsClaim.convertVBMStoVBMS);
  const recordVBMSConversion = useMutation(api.vbmsClaim.recordVBMSConversion);
  const { claimVBMS, isPending: isClaimPending } = useClaimVBMS();

  const inboxAmount = economy.inbox || 0;
  const testvbmsBalance = economy.coins || 0;
  const canClaimVBMS = inboxAmount >= 1 && !isProcessing;
  const canClaimVBMS = inboxAmount >= 100 && !isProcessing;
  const canConvertVBMS = testvbmsBalance >= 100 && !isProcessing;

  // Claim as virtual VBMS coins
  const handleClaimVBMS = async () => {
    if (!address) {
      toast.error("Conecte sua carteira");
      return;
    }

    if (!canClaimVBMS) {
      toast.error("Inbox vazio");
      return;
    }

    try {
      const result = await claimAsVBMS({ address });
      toast.success(result.message);
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Erro ao coletar VBMS");
    }
  };

  // Claim as VBMS blockchain tokens
  const handleClaimVBMS = async () => {
    if (!address) {
      toast.error("Conecte sua carteira");
      return;
    }

    if (!canClaimVBMS) {
      toast.error("Mínimo de 100 VBMS para converter em VBMS");
      return;
    }

    setIsProcessing(true);

    try {
      console.log('[InboxModal] Step 1: Preparing inbox claim...');
      const result = await prepareInboxClaimVBMS({ address });

      console.log('[InboxModal] Step 2: Got signature:', result);

      // Show bonus info if any
      if (result.bonusReasons && result.bonusReasons.length > 0) {
        result.bonusReasons.forEach((reason: string) => {
          toast.info(reason);
        });
      }

      toast.info("🔐 Aguardando assinatura da carteira...");

      console.log('[InboxModal] Step 3: Calling blockchain claimVBMS...');
      const txHash = await claimVBMS(
        result.amount.toString(),
        result.nonce as `0x${string}`,
        result.signature as `0x${string}`
      );

      console.log('[InboxModal] Step 4: Blockchain TX successful:', txHash);

      // Record the claim in backend to zero inbox
      console.log('[InboxModal] Step 5: Recording inbox claim to zero balance...');
      await recordInboxClaim({
        address,
        amount: result.amount,
        txHash: txHash as unknown as string,
      });

      console.log('[InboxModal] Step 6: Inbox zeroed successfully!');

      toast.success(
        `✅ ${result.amount.toLocaleString()} VBMS claimed via blockchain!` +
        (result.bonus > 0 ? ` (+${result.bonus} bonus)` : "")
      );

      // Close modal after brief delay
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error('[InboxModal] Error claiming VBMS:', error);
      toast.error(error.message || "Erro ao coletar VBMS");
      setIsProcessing(false);
    }
  };

  // Convert VBMS to VBMS blockchain tokens
  const handleConvertVBMS = async () => {
    if (!address) {
      toast.error("Conecte sua carteira");
      return;
    }

    if (!canConvertVBMS) {
      toast.error("Mínimo de 100 VBMS para converter");
      return;
    }

    setIsProcessing(true);

    try {
      console.log('[InboxModal] Converting VBMS to VBMS...');
      const result = await convertVBMS({ address });

      toast.info("🔐 Aguardando assinatura da carteira...");

      const txHash = await claimVBMS(
        result.amount.toString(),
        result.nonce as `0x${string}`,
        result.signature as `0x${string}`
      );

      console.log('[InboxModal] Conversion TX successful:', txHash);

      // Zero VBMS balance
      await recordVBMSConversion({
        address,
        amount: result.amount,
        txHash: txHash as unknown as string,
      });

      toast.success(`✅ ${result.amount.toLocaleString()} VBMS convertidos para VBMS!`);

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error('[InboxModal] Error converting VBMS:', error);
      toast.error(error.message || "Erro ao converter VBMS");
      setIsProcessing(false);
    }
  };

  const lastClaimText = economy.lastClaimTimestamp
    ? new Date(economy.lastClaimTimestamp).toLocaleDateString()
    : "Nunca";

  // SSR check
  if (typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-gradient-to-br from-vintage-charcoal via-vintage-deep-black to-vintage-rich-black border-2 border-vintage-gold/50 rounded-2xl shadow-2xl shadow-vintage-gold/20 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-vintage-gold to-transparent" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-vintage-deep-black/50 hover:bg-vintage-gold/20 text-vintage-gold/60 hover:text-vintage-gold transition-all"
        >
          ✕
        </button>

        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-vintage-gold/10 via-transparent to-transparent p-6 pb-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-vintage-gold/20 to-vintage-burnt-gold/20 border-2 border-vintage-gold/30 mb-3">
              <span className="text-4xl">📬</span>
            </div>
            <h2 className="text-3xl font-display font-bold text-vintage-gold mb-2">
              VBMS Inbox
            </h2>
            <p className="text-sm text-vintage-gold/70">
              Acumule rewards e escolha como coletar
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Inbox Balance Card */}
          <div className="relative bg-gradient-to-br from-vintage-gold/5 to-vintage-burnt-gold/5 border border-vintage-gold/30 rounded-xl p-5 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-vintage-gold/5 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-vintage-gold/70 uppercase tracking-wider">
                  💰 Inbox Available
                </span>
                {inboxAmount > 0 && (
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
                    Ready
                  </span>
                )}
              </div>
              <div className="text-5xl font-display font-bold text-vintage-gold mb-1">
                {inboxAmount.toLocaleString()}
              </div>
              <div className="text-sm text-vintage-gold/60">
                VBMS • Blockchain transferível
              </div>
            </div>
          </div>

          {/* VBMS Balance Card */}
          <div className="relative bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-400/50 rounded-xl p-5 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl -mr-16 -mt-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                  🎮 In-Game Balance
                </span>
                {testvbmsBalance >= 100 && (
                  <span className="text-xs bg-purple-500/40 text-purple-100 px-2 py-1 rounded-full border border-purple-400/50 font-semibold">
                    Can Convert
                  </span>
                )}
              </div>
              <div className="text-4xl font-display font-bold text-purple-100 mb-1">
                {testvbmsBalance.toLocaleString()}
              </div>
              <div className="text-sm text-purple-200 font-medium">
                VBMS • Use na shop, battles & fees
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-vintage-deep-black/40 border border-vintage-gold/20 rounded-lg p-3 text-center">
              <div className="text-xs text-vintage-gold/60 mb-1">
                Último Claim
              </div>
              <div className="text-sm font-bold text-vintage-gold">
                {lastClaimText}
              </div>
            </div>
            <div className="bg-vintage-deep-black/40 border border-vintage-gold/20 rounded-lg p-3 text-center">
              <div className="text-xs text-vintage-gold/60 mb-1">
                Mínimo Chain
              </div>
              <div className="text-sm font-bold text-vintage-gold">
                100 VBMS
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-vintage-gold/20"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-vintage-deep-black px-3 text-vintage-gold/50 font-semibold tracking-wider">
                Actions
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Claim Inbox as VBMS */}
            {inboxAmount > 0 && (
              <button
                onClick={handleClaimVBMS}
                disabled={!canClaimVBMS || isProcessing}
                className={`w-full group relative overflow-hidden rounded-xl p-4 font-bold transition-all ${
                  canClaimVBMS
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:scale-[1.02]"
                    : "bg-vintage-deep-black/50 text-vintage-gold/30 cursor-not-allowed border border-vintage-gold/10"
                }`}
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                <div className="relative flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-xl">💰</span>
                    <span>Claim as VBMS</span>
                  </span>
                  <span className="text-sm opacity-80">Instant</span>
                </div>
              </button>
            )}

            {/* Claim Inbox as VBMS Blockchain */}
            {inboxAmount >= 100 && (
              <button
                onClick={handleClaimVBMS}
                disabled={!canClaimVBMS || isProcessing}
                className={`w-full group relative overflow-hidden rounded-xl p-4 font-bold transition-all ${
                  canClaimVBMS
                    ? "bg-gradient-to-r from-vintage-gold to-vintage-burnt-gold hover:from-vintage-burnt-gold hover:to-vintage-gold text-vintage-deep-black shadow-lg shadow-vintage-gold/20 hover:shadow-vintage-gold/40 hover:scale-[1.02]"
                    : "bg-vintage-deep-black/50 text-vintage-gold/30 cursor-not-allowed border border-vintage-gold/10"
                }`}
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                <div className="relative flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-xl">💳</span>
                    <span>Claim as VBMS</span>
                  </span>
                  <span className="text-xs opacity-80 bg-black/20 px-2 py-1 rounded">Pay Gas</span>
                </div>
              </button>
            )}

            {/* Convert VBMS to VBMS */}
            {testvbmsBalance >= 100 && (
              <button
                onClick={handleConvertVBMS}
                disabled={!canConvertVBMS || isProcessing}
                className={`w-full group relative overflow-hidden rounded-xl p-4 font-bold transition-all ${
                  canConvertVBMS
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.02]"
                    : "bg-vintage-deep-black/50 text-vintage-gold/30 cursor-not-allowed border border-vintage-gold/10"
                }`}
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                <div className="relative flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-xl">🔄</span>
                    <span>Convert {testvbmsBalance.toLocaleString()} VBMS</span>
                  </span>
                  <span className="text-xs opacity-80">→ VBMS</span>
                </div>
              </button>
            )}
          </div>

          {/* Help Text */}
          {inboxAmount === 0 && testvbmsBalance === 0 && (
            <div className="text-center py-6">
              <div className="text-6xl mb-3 opacity-20">📭</div>
              <p className="text-vintage-gold/60 text-sm">
                Inbox vazio
              </p>
              <p className="text-vintage-gold/40 text-xs mt-1">
                Complete battles e achievements para ganhar VBMS!
              </p>
            </div>
          )}

          {/* Info Footer */}
          {(canClaimVBMS || canConvertVBMS) && (
            <div className="bg-vintage-gold/5 border border-vintage-gold/20 rounded-lg p-3">
              <p className="text-xs text-vintage-gold/70 text-center leading-relaxed">
                💎 <span className="font-semibold">VBMS</span> = Blockchain tokens (trade/hold) •
                <span className="font-semibold"> VBMS</span> = In-game currency (shop/fees)
              </p>
            </div>
          )}
        </div>

        {/* Decorative bottom border */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-vintage-gold to-transparent" />
      </div>
    </div>,
    document.body
  );
}
