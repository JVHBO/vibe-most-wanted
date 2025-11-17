"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { createPortal } from "react-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useClaimVBMS } from "@/lib/hooks/useVBMSContracts";
import { sdk } from "@farcaster/miniapp-sdk";
import { CONTRACTS, POOL_ABI } from "@/lib/contracts";
import { encodeFunctionData, parseEther } from "viem";

interface CoinsInboxModalProps {
  inboxStatus: {
    coinsInbox: number; // VBMS inbox (backend balance, not blockchain)
    coins: number; // TESTVBMS for in-game spending
    lifetimeEarned: number;
  };
  onClose: () => void;
  userAddress?: string; // Pass address from parent (for Farcaster mobile)
}

export function CoinsInboxModal({ inboxStatus, onClose, userAddress }: CoinsInboxModalProps) {
  const { address: wagmiAddress } = useAccount();
  // Use userAddress prop if provided (Farcaster mobile), otherwise wagmi
  const address = userAddress || wagmiAddress;
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [useFarcasterSDK, setUseFarcasterSDK] = useState(false);

  // Check if we should use Farcaster SDK for transactions
  useEffect(() => {
    const checkFarcasterSDK = async () => {
      if (sdk && typeof sdk.wallet !== 'undefined' && sdk.wallet.ethProvider) {
        setUseFarcasterSDK(true);
        console.log('[CoinsInboxModal] Using Farcaster SDK for transactions');
      }
    };
    checkFarcasterSDK();
  }, []);

  const convertTESTVBMS = useAction(api.vbmsClaim.convertTESTVBMStoVBMS);
  const recordTESTVBMSConversion = useMutation(api.vbmsClaim.recordTESTVBMSConversion);
  const prepareInboxClaim = useAction(api.vbmsClaim.prepareInboxClaim);
  const recordInboxClaim = useMutation(api.vbmsClaim.recordInboxClaim);
  const { claimVBMS, isPending: isClaimPending } = useClaimVBMS();

  // Helper function to claim via Farcaster SDK
  const claimViaFarcasterSDK = async (amount: string, nonce: string, signature: string) => {
    if (!sdk.wallet?.ethProvider) {
      const error = "Farcaster wallet not available";
      console.error('[CoinsInboxModal]', error);
      toast.error(error);
      throw new Error(error);
    }

    console.log('[CoinsInboxModal] Claiming via Farcaster SDK:', {
      amount,
      nonce,
      from: address,
      to: CONTRACTS.VBMSPoolTroll,
      chainId: CONTRACTS.CHAIN_ID
    });

    // Encode the function call
    const data = encodeFunctionData({
      abi: POOL_ABI,
      functionName: 'claimVBMS',
      args: [parseEther(amount), nonce as `0x${string}`, signature as `0x${string}`],
    });

    console.log('[CoinsInboxModal] Encoded data:', data);

    try {
      // Send transaction via Farcaster SDK
      const txHash = await sdk.wallet.ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address as `0x${string}`,
          to: CONTRACTS.VBMSPoolTroll,
          data: data,
        }],
      });

      console.log('[CoinsInboxModal] Farcaster SDK TX hash:', txHash);
      toast.success('TX enviada: ' + txHash);
      return txHash;
    } catch (error: any) {
      console.error('[CoinsInboxModal] Farcaster SDK error:', error);
      toast.error('Erro na TX: ' + (error.message || 'Desconhecido'));
      throw error;
    }
  };

  const vbmsInbox = inboxStatus.coinsInbox || 0;
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

      // Use Farcaster SDK if available, otherwise wagmi
      const txHash = useFarcasterSDK
        ? await claimViaFarcasterSDK(
            result.amount.toString(),
            result.nonce,
            result.signature
          )
        : await claimVBMS(
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

      // Use Farcaster SDK if available, otherwise wagmi
      const txHash = useFarcasterSDK
        ? await claimViaFarcasterSDK(
            result.amount.toString(),
            result.nonce,
            result.signature
          )
        : await claimVBMS(
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
        className="relative bg-gradient-to-br from-vintage-deep-black to-vintage-rich-black border-2 border-vintage-gold rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
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
              VBMS
            </div>
            <div className="text-5xl font-bold text-vintage-gold mb-2">
              {vbmsInbox.toLocaleString()}
            </div>
          </div>
        </div>

        {/* TESTVBMS In-Game Balance */}
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-400/50 rounded-xl p-5 mb-6">
          <div className="text-center">
            <div className="text-xs font-bold text-purple-300 mb-2 uppercase tracking-wide">
              TESTVBMS
            </div>
            <div className="text-5xl font-bold text-purple-100 mb-2">
              {inboxStatus.coins.toLocaleString()}
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

          {/* Message to use miniapp */}
          <p className="text-xs text-center text-vintage-gold/60 mt-4">
            You need to access the miniapp to claim
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
