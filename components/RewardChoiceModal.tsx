"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { toast } from "sonner";

interface RewardChoiceModalProps {
  amount: number;
  source: "pve" | "pvp" | "attack" | "defense" | "leaderboard";
  onClose: () => void;
  onChoiceMade?: (choice: "claim_now" | "claim_later") => void;
}

export function RewardChoiceModal({
  amount,
  source,
  onClose,
  onChoiceMade,
}: RewardChoiceModalProps) {
  const { address } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const processReward = useMutation(api.rewardsChoice.processRewardChoice);

  const sourceLabels = {
    pve: "PvE",
    pvp: "PvP",
    attack: "Ataque",
    defense: "Defesa",
    leaderboard: "Leaderboard",
  };

  const handleChoice = async (choice: "claim_now" | "claim_later") => {
    if (!address) {
      toast.error("Conecte sua carteira");
      return;
    }

    setIsProcessing(true);

    try {
      const result = await processReward({
        address,
        amount,
        choice,
        source,
      });

      toast.success(result.message);

      if (onChoiceMade) {
        onChoiceMade(choice);
      }

      // Close modal after a brief delay
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar recompensa");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative bg-gradient-to-br from-vintage-deep-black to-vintage-rich-black border-2 border-vintage-gold rounded-lg p-6 max-w-lg w-full mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">🎉</div>
          <h2 className="text-3xl font-bold text-vintage-gold mb-2">
            Vitória!
          </h2>
          <p className="text-lg text-vintage-gold/80 mb-1">
            Você ganhou{" "}
            <span className="font-bold text-vintage-orange">
              {amount.toLocaleString()} coins
            </span>
          </p>
          <p className="text-sm text-vintage-gold/60">
            de {sourceLabels[source]}
          </p>
        </div>

        {/* Choice explanation */}
        <div className="bg-vintage-deep-black/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-vintage-gold/80 text-center mb-2">
            💡 Escolha como receber suas moedas:
          </p>
          <ul className="text-xs text-vintage-gold/60 space-y-1">
            <li>
              ✅ <strong>Coletar Agora:</strong> Moedas vão direto para seu
              saldo
            </li>
            <li>
              📥 <strong>Guardar para Depois:</strong> Moedas vão para seu inbox
              para coletar quando quiser
            </li>
          </ul>
        </div>

        {/* Choice buttons */}
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => handleChoice("claim_now")}
            disabled={isProcessing}
            className="relative group py-4 px-6 rounded-lg bg-gradient-to-r from-vintage-gold to-vintage-orange text-vintage-deep-black font-bold text-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <div>Coletar Agora</div>
                <div className="text-xs opacity-80">
                  Disponível imediatamente
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleChoice("claim_later")}
            disabled={isProcessing}
            className="relative group py-4 px-6 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">📥</span>
              <div>
                <div>Guardar para Depois</div>
                <div className="text-xs opacity-80">Vai para o Inbox</div>
              </div>
            </div>
          </button>
        </div>

        {/* Optional: Skip/close button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="mt-4 w-full text-sm text-vintage-gold/60 hover:text-vintage-gold transition-colors"
        >
          Decidir depois
        </button>
      </div>
    </div>
  );
}
