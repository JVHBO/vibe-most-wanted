"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { toast } from "sonner";

interface CoinsInboxModalProps {
  inboxStatus: {
    coinsInbox: number;
    coins: number;
    lifetimeEarned: number;
  };
  onClose: () => void;
}

export function CoinsInboxModal({ inboxStatus, onClose }: CoinsInboxModalProps) {
  const { address } = useAccount();
  const claimAllCoins = useMutation(api.coinsInbox.claimAllCoinsFromInbox);

  const coinsInbox = inboxStatus.coinsInbox || 0;
  const canClaim = coinsInbox > 0;

  const handleClaimAll = async () => {
    if (!address) {
      toast.error("Conecte sua carteira");
      return;
    }

    if (!canClaim) {
      toast.error("Nenhuma moeda para coletar");
      return;
    }

    try {
      const result = await claimAllCoins({ address });

      toast.success(
        `🎉 ${result.claimedAmount.toLocaleString()} coins coletados com sucesso!`
      );

      onClose();
    } catch (error: any) {
      toast.error(error.message || "Erro ao coletar moedas");
    }
  };

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
          <div className="text-5xl mb-2">💰</div>
          <h2 className="text-2xl font-bold text-vintage-gold mb-1">
            Coins Inbox
          </h2>
          <p className="text-sm text-vintage-gold/60">
            Suas moedas acumuladas das batalhas
          </p>
        </div>

        {/* Balance */}
        <div className="bg-vintage-deep-black/50 rounded-lg p-4 mb-6">
          <div className="text-center">
            <div className="text-sm text-vintage-gold/60 mb-1">
              Moedas no Inbox
            </div>
            <div className="text-4xl font-bold text-vintage-gold mb-2">
              {coinsInbox.toLocaleString()}
            </div>
            <div className="text-xs text-vintage-gold/40">
              $TESTVBMS coins
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-vintage-deep-black/30 rounded p-3 text-center">
            <div className="text-xs text-vintage-gold/60 mb-1">
              Saldo Atual
            </div>
            <div className="text-sm font-bold text-vintage-gold">
              {inboxStatus.coins.toLocaleString()}
            </div>
          </div>
          <div className="bg-vintage-deep-black/30 rounded p-3 text-center">
            <div className="text-xs text-vintage-gold/60 mb-1">
              Total Ganho
            </div>
            <div className="text-sm font-bold text-vintage-gold">
              {inboxStatus.lifetimeEarned.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Info box */}
        {canClaim && (
          <div className="bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg p-3 mb-6">
            <p className="text-xs text-vintage-gold/80 text-center">
              💡 Ao coletar, as moedas serão adicionadas ao seu saldo disponível para gastar no jogo
            </p>
          </div>
        )}

        {/* Claim button */}
        <button
          onClick={handleClaimAll}
          disabled={!canClaim}
          className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
            canClaim
              ? "bg-gradient-to-r from-vintage-gold to-vintage-orange text-vintage-deep-black hover:scale-105"
              : "bg-vintage-deep-black/50 text-vintage-gold/30 cursor-not-allowed"
          }`}
        >
          {canClaim ? "Coletar Todas as Moedas" : "Inbox Vazio"}
        </button>

        {!canClaim && (
          <p className="text-xs text-center text-vintage-gold/60 mt-3">
            ℹ️ Ganhe batalhas e escolha "Guardar para Depois" para acumular moedas aqui
          </p>
        )}
      </div>
    </div>
  );
}
