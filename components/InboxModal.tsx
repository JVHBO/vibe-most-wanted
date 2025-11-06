"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { toast } from "sonner";

interface InboxModalProps {
  economy: {
    inbox: number;
    claimableBalance: number;
    lastClaimTimestamp: number;
  };
  onClose: () => void;
}

export function InboxModal({ economy, onClose }: InboxModalProps) {
  const { address } = useAccount();
  const prepareInboxClaim = useMutation(api.vbmsClaim.prepareInboxClaim);

  const inboxAmount = economy.inbox || 0;
  const canClaim = inboxAmount >= 100;

  const handleClaim = async () => {
    if (!address) {
      toast.error("Conecte sua carteira");
      return;
    }

    if (!canClaim) {
      toast.error("Mínimo de 100 TESTVBMS para coletar");
      return;
    }

    try {
      const result = await prepareInboxClaim({ address });

      toast.success(
        `🎉 Preparado para coletar ${result.amount.toLocaleString()} TESTVBMS!` +
        (result.bonus > 0 ? ` (+${result.bonus} bonus)` : "")
      );

      // Mostrar detalhes do bonus se houver
      if (result.bonusReasons && result.bonusReasons.length > 0) {
        setTimeout(() => {
          result.bonusReasons.forEach((reason: string) => {
            toast.info(reason);
          });
        }, 500);
      }

      onClose();
    } catch (error: any) {
      toast.error(error.message || "Erro ao preparar claim");
    }
  };

  const lastClaimText = economy.lastClaimTimestamp
    ? new Date(economy.lastClaimTimestamp).toLocaleDateString()
    : "Nunca";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
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
          <div className="text-5xl mb-2">📬</div>
          <h2 className="text-2xl font-bold text-vintage-gold mb-1">
            Inbox TESTVBMS
          </h2>
          <p className="text-sm text-vintage-gold/60">
            Acumule suas recompensas e colete depois
          </p>
        </div>

        {/* Balance */}
        <div className="bg-vintage-deep-black/50 rounded-lg p-4 mb-6">
          <div className="text-center">
            <div className="text-sm text-vintage-gold/60 mb-1">
              Saldo no Inbox
            </div>
            <div className="text-4xl font-bold text-vintage-gold mb-2">
              {inboxAmount.toLocaleString()}
            </div>
            <div className="text-xs text-vintage-gold/40">
              TESTVBMS tokens
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-vintage-deep-black/30 rounded p-3 text-center">
            <div className="text-xs text-vintage-gold/60 mb-1">
              Último Claim
            </div>
            <div className="text-sm font-bold text-vintage-gold">
              {lastClaimText}
            </div>
          </div>
          <div className="bg-vintage-deep-black/30 rounded p-3 text-center">
            <div className="text-xs text-vintage-gold/60 mb-1">
              Mínimo
            </div>
            <div className="text-sm font-bold text-vintage-gold">
              100 TESTVBMS
            </div>
          </div>
        </div>

        {/* Claim button */}
        <button
          onClick={handleClaim}
          disabled={!canClaim}
          className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
            canClaim
              ? "bg-gradient-to-r from-vintage-gold to-vintage-orange text-vintage-deep-black hover:scale-105"
              : "bg-vintage-deep-black/50 text-vintage-gold/30 cursor-not-allowed"
          }`}
        >
          {canClaim ? "Preparar Claim" : `Precisa ${100 - inboxAmount} TESTVBMS`}
        </button>

        {canClaim && (
          <p className="text-xs text-center text-vintage-gold/60 mt-3">
            ⚠️ Feature em desenvolvimento - Transações blockchain em breve
          </p>
        )}
      </div>
    </div>
  );
}
