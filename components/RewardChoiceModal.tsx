"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { useClaimVBMS } from "@/lib/hooks/useVBMSContracts";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const processReward = useMutation(api.rewardsChoice.processRewardChoice);
  const { claimVBMS, isPending: isClaimPending } = useClaimVBMS();

  // Debug: log when modal renders
  console.log('[RewardChoiceModal] Rendered with:', { amount, source, address, isProcessing });

  const sourceLabels = {
    pve: "PvE",
    pvp: "PvP",
    attack: t('attack') || "Attack",
    defense: t('defense') || "Defense",
    leaderboard: "Leaderboard",
  };

  const handleChoice = async (choice: "claim_now" | "claim_later") => {
    console.log('[RewardChoiceModal] handleChoice called', { choice, address, amount, source, isProcessing });

    if (!address) {
      console.error('[RewardChoiceModal] No address found');
      toast.error("Conecte sua carteira");
      return;
    }

    setIsProcessing(true);
    console.log('[RewardChoiceModal] Processing started');

    try {
      if (choice === "claim_now") {
        // CLAIM NOW: Get signature from backend and call blockchain
        console.log('[RewardChoiceModal] Getting signature for blockchain claim');
        const result = await processReward({
          address,
          amount,
          choice: "claim_now",
          source,
        });

        console.log('[RewardChoiceModal] Signature received:', result);

        // Call VBMS smart contract
        if (result.signature && result.nonce) {
          toast.info("🔐 Aguardando assinatura da carteira...");

          const txHash = await claimVBMS(
            amount.toString(),
            result.nonce as `0x${string}`,
            result.signature as `0x${string}`
          );

          console.log('[RewardChoiceModal] Blockchain TX:', txHash);
          toast.success(`✅ ${amount} VBMS claimed via blockchain!`);
        }
      } else {
        // CLAIM LATER: Send to inbox
        console.log('[RewardChoiceModal] Sending to inbox');
        const result = await processReward({
          address,
          amount,
          choice: "claim_later",
          source,
        });

        console.log('[RewardChoiceModal] Inbox result:', result);
        toast.success(result.message);
      }

      if (onChoiceMade) {
        console.log('[RewardChoiceModal] Calling onChoiceMade callback');
        onChoiceMade(choice);
      }

      // Close modal after a brief delay
      setTimeout(() => {
        console.log('[RewardChoiceModal] Closing modal');
        onClose();
      }, 1000);
    } catch (error: any) {
      console.error('[RewardChoiceModal] Error processing reward:', error);
      toast.error(error.message || "Erro ao processar recompensa");
      setIsProcessing(false);
    }
  };

  // SSR check
  if (typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        console.log('[RewardChoiceModal] Backdrop clicked', e.target);
      }}
    >
      <div
        className="relative bg-gradient-to-br from-vintage-deep-black to-vintage-rich-black border-2 border-vintage-gold rounded-lg p-4 md:p-6 max-w-lg w-full mx-4 my-4 max-h-[95vh] overflow-y-auto"
        onClick={(e) => {
          e.stopPropagation();
          console.log('[RewardChoiceModal] Modal content clicked');
        }}
      >
        {/* Header */}
        <div className="text-center mb-4 md:mb-6">
          <div className="text-5xl md:text-6xl mb-2 md:mb-3">🎉</div>
          <h2 className="text-2xl md:text-3xl font-bold text-vintage-gold mb-2">
            {t('victory')}!
          </h2>
          <p className="text-lg text-vintage-gold/80 mb-1">
            {t('youWon')}{" "}
            <span className="font-bold text-vintage-orange">
              {amount.toLocaleString()} {t('coins')}
            </span>
          </p>
          <p className="text-sm text-vintage-gold/60">
            de {sourceLabels[source]}
          </p>
        </div>

        {/* Choice explanation */}
        <div className="bg-vintage-deep-black/50 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
          <p className="text-xs md:text-sm text-vintage-gold/80 text-center mb-2">
            💡 {t('chooseHow')}
          </p>
          <ul className="text-xs text-vintage-gold/60 space-y-1">
            <li>
              ✅ <strong>{t('claimNowLabel')}:</strong> {t('claimNowExplain')}
            </li>
            <li>
              📥 <strong>{t('saveLaterLabel')}:</strong> {t('saveLaterExplain')}
            </li>
          </ul>
        </div>

        {/* Choice buttons */}
        <div className="grid grid-cols-1 gap-3 md:gap-4">
          <button
            onClick={() => {
              console.log('[RewardChoiceModal] Claim Now button clicked');
              handleChoice("claim_now");
            }}
            disabled={isProcessing}
            className="relative group py-3 md:py-4 px-4 md:px-6 rounded-lg bg-gradient-to-r from-vintage-gold to-vintage-orange text-vintage-deep-black font-bold text-base md:text-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center gap-2 md:gap-3">
              <span className="text-xl md:text-2xl">💰</span>
              <div>
                <div>{t('claimNowLabel')}</div>
                <div className="text-xs opacity-80">
                  {t('claimNowDesc')}
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              console.log('[RewardChoiceModal] Claim Later (Guardar) button clicked');
              handleChoice("claim_later");
            }}
            disabled={isProcessing}
            className="relative group py-3 md:py-4 px-4 md:px-6 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-base md:text-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center gap-2 md:gap-3">
              <span className="text-xl md:text-2xl">📥</span>
              <div>
                <div>{t('saveLaterLabel')}</div>
                <div className="text-xs opacity-80">{t('saveLaterDesc')}</div>
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
    </div>,
    document.body
  );
}
