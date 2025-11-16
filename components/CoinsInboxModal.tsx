"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { createPortal } from "react-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useClaimVBMS } from "@/lib/hooks/useVBMSContracts";

interface CoinsInboxModalProps {
  inboxStatus: {
    inbox: number; // VBMS inbox
    coins: number; // TESTVBMS for in-game spending
    lifetimeEarned: number;
  };
  onClose: () => void;
}

export function CoinsInboxModal({ inboxStatus, onClose }: CoinsInboxModalProps) {
  const { address } = useAccount();
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);

  const convertTESTVBMS = useAction(api.vbmsClaim.convertTESTVBMStoVBMS);
  const recordTESTVBMSConversion = useMutation(api.vbmsClaim.recordTESTVBMSConversion);
  const prepareInboxClaim = useAction(api.vbmsClaim.prepareInboxClaim);
  const recordInboxClaim = useMutation(api.vbmsClaim.recordInboxClaim);
  const { claimVBMS, isPending: isClaimPending } = useClaimVBMS();

  const vbmsInbox = inboxStatus.inbox || 0;
  const testvbmsBalance = inboxStatus.coins || 0;
  const canClaimInbox = vbmsInbox >= 100 && !isProcessing; // Minimum 100 VBMS to claim
  const canConvertTESTVBMS = testvbmsBalance >= 100 && !isProcessing;

  // Convert TESTVBMS to VBMS blockchain tokens
  const handleConvertTESTVBMS = async () => {
    if (!address) {
      toast.error("Conecte sua carteira");
      return;
    }

    if (!canConvertTESTVBMS) {
      toast.error("Mínimo de 100 TESTVBMS para converter");
      return;
    }

    setIsProcessing(true);

    try {
      console.log('[CoinsInboxModal] Converting TESTVBMS to VBMS...');
      const result = await convertTESTVBMS({ address });

      toast.info("🔐 Aguardando assinatura da carteira...");

      const txHash = await claimVBMS(
        result.amount.toString(),
        result.nonce as `0x${string}`,
        result.signature as `0x${string}`
      );

      console.log('[CoinsInboxModal] Conversion TX successful:', txHash);

      // Zero TESTVBMS balance
      await recordTESTVBMSConversion({
        address,
        amount: result.amount,
        txHash: txHash as unknown as string,
      });

      toast.success(`✅ ${result.amount.toLocaleString()} TESTVBMS convertidos para VBMS!`);

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error('[CoinsInboxModal] Error converting TESTVBMS:', error);
      toast.error(error.message || "Erro ao converter TESTVBMS");
      setIsProcessing(false);
    }
  };

  // Claim VBMS from inbox
  const handleClaimInbox = async () => {
    if (!address) {
      toast.error("Conecte sua carteira");
      return;
    }

    if (!canClaimInbox) {
      toast.error("Mínimo de 100 VBMS no inbox para coletar");
      return;
    }

    setIsProcessing(true);

    try {
      console.log('[CoinsInboxModal] Claiming inbox VBMS...');
      const result = await prepareInboxClaim({ address });

      toast.info("🔐 Aguardando assinatura da carteira...");

      const txHash = await claimVBMS(
        result.amount.toString(),
        result.nonce as `0x${string}`,
        result.signature as `0x${string}`
      );

      console.log('[CoinsInboxModal] Inbox claim TX successful:', txHash);

      await recordInboxClaim({
        address,
        amount: result.amount,
        txHash: txHash as unknown as string,
      });

      toast.success(`✅ ${result.amount.toLocaleString()} VBMS coletados!`);

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error('[CoinsInboxModal] Error claiming inbox:', error);
      toast.error(error.message || "Erro ao coletar VBMS");
      setIsProcessing(false);
    }
  };

  // SSR check
  if (typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-gradient-to-br from-vintage-deep-black to-vintage-rich-black border-2 border-vintage-gold rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-vintage-gold/60 hover:text-vintage-gold text-2xl"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">💰</div>
          <h2 className="text-2xl font-bold text-vintage-gold">
            VBMS Wallet
          </h2>
        </div>

        {/* VBMS Inbox Balance */}
        <div className="bg-gradient-to-br from-vintage-gold/20 to-vintage-orange/10 rounded-xl p-5 mb-4 border-2 border-vintage-gold/50">
          <div className="text-center">
            <div className="text-xs font-bold text-vintage-gold/80 mb-2 uppercase tracking-wide">
              📬 VBMS Inbox
            </div>
            <div className="text-5xl font-bold text-vintage-gold mb-2">
              {vbmsInbox.toLocaleString()}
            </div>
            <div className="text-xs text-vintage-gold/60">
              Ready to claim
            </div>
          </div>
        </div>

        {/* TESTVBMS In-Game Balance */}
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-400/50 rounded-xl p-5 mb-6">
          <div className="text-center">
            <div className="text-xs font-bold text-purple-300 mb-2 uppercase tracking-wide">
              🎮 TESTVBMS Balance
            </div>
            <div className="text-5xl font-bold text-purple-100 mb-2">
              {inboxStatus.coins.toLocaleString()}
            </div>
            <div className="text-xs text-purple-300/80">
              In-game currency
            </div>
          </div>
        </div>

        {/* Claim buttons */}
        <div className="space-y-3">
          {/* Option 1: Claim VBMS from Inbox */}
          <button
            onClick={handleClaimInbox}
            disabled={!canClaimInbox}
            className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
              canClaimInbox
                ? "bg-gradient-to-r from-vintage-gold to-vintage-orange text-vintage-deep-black hover:scale-105"
                : "bg-vintage-deep-black/50 text-vintage-gold/30 cursor-not-allowed"
            }`}
          >
            {canClaimInbox ? `💳 Claim ${vbmsInbox.toLocaleString()} VBMS (Pay Gas)` : "📬 Inbox Empty"}
          </button>

          {/* Option 2: Convert TESTVBMS to VBMS */}
          {testvbmsBalance > 0 && (
            <button
              onClick={handleConvertTESTVBMS}
              disabled={!canConvertTESTVBMS}
              className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
                canConvertTESTVBMS
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105"
                  : "bg-vintage-deep-black/50 text-vintage-gold/30 cursor-not-allowed"
              }`}
            >
              🔄 Convert {testvbmsBalance.toLocaleString()} TESTVBMS → VBMS
            </button>
          )}

          {!canClaimInbox && vbmsInbox > 0 && (
            <p className="text-xs text-center text-vintage-gold/60">
              ℹ️ Precisa {100 - vbmsInbox} VBMS para claim (mínimo 100)
            </p>
          )}

          {testvbmsBalance > 0 && !canConvertTESTVBMS && (
            <p className="text-xs text-center text-purple-400/60">
              ℹ️ Precisa {100 - testvbmsBalance} TESTVBMS para converter (mínimo 100)
            </p>
          )}

          {canClaimInbox && (
            <p className="text-xs text-center text-vintage-gold/60">
              💎 Blockchain VBMS = Real tokens on Base
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
