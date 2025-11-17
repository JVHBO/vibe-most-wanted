"use client";

import { useState, useEffect } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { useClaimVBMS } from "@/lib/hooks/useVBMSContracts";
import { sdk } from "@farcaster/miniapp-sdk";
import { CONTRACTS, POOL_ABI } from "@/lib/contracts";
import { encodeFunctionData, parseEther } from "viem";

interface InboxModalProps {
  economy: {
    inbox: number;
    claimableBalance: number;
    lastClaimTimestamp: number;
    coins?: number; // TESTVBMS virtual balance
  };
  onClose: () => void;
}

export function InboxModal({ economy, onClose }: InboxModalProps) {
  const { address } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [useFarcasterSDK, setUseFarcasterSDK] = useState(false);

  // Check if we should use Farcaster SDK for transactions
  useEffect(() => {
    const checkFarcasterSDK = async () => {
      if (sdk && typeof sdk.wallet !== 'undefined') {
        const provider = await sdk.wallet.getEthereumProvider();
        if (provider) {
          setUseFarcasterSDK(true);
          console.log('[InboxModal] Using Farcaster SDK for transactions');
        }
      }
    };
    checkFarcasterSDK();
  }, []);

  const claimAsTESTVBMS = useMutation(api.vbmsClaim.claimInboxAsTESTVBMS);
  const prepareInboxClaimVBMS = useAction(api.vbmsClaim.prepareInboxClaim);
  const recordInboxClaim = useMutation(api.vbmsClaim.recordInboxClaim);
  const convertTESTVBMS = useAction(api.vbmsClaim.convertTESTVBMStoVBMS);
  const recordTESTVBMSConversion = useMutation(api.vbmsClaim.recordTESTVBMSConversion);
  const { claimVBMS, isPending: isClaimPending } = useClaimVBMS();

  // Helper function to claim via Farcaster SDK
  const claimViaFarcasterSDK = async (amount: string, nonce: string, signature: string) => {
    const provider = await sdk.wallet.getEthereumProvider();
    if (!provider) {
      const error = "Farcaster wallet not available";
      console.error('[InboxModal]', error);
      toast.error(error);
      throw new Error(error);
    }

    console.log('[InboxModal] Claiming via Farcaster SDK:', {
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

    console.log('[InboxModal] Encoded data:', data);

    try {
      // Send transaction via Farcaster SDK
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address as `0x${string}`,
          to: CONTRACTS.VBMSPoolTroll,
          data: data,
        }],
      });

      console.log('[InboxModal] Farcaster SDK TX hash:', txHash);
      toast.success('TX enviada: ' + txHash);
      return txHash;
    } catch (error: any) {
      console.error('[InboxModal] Farcaster SDK error:', error);
      toast.error('Erro na TX: ' + (error.message || 'Desconhecido'));
      throw error;
    }
  };

  const inboxAmount = economy.inbox || 0;
  const testvbmsBalance = economy.coins || 0;
  const canClaimTESTVBMS = inboxAmount >= 1 && !isProcessing;
  const canClaimVBMS = inboxAmount >= 100 && !isProcessing;
  const canConvertTESTVBMS = testvbmsBalance >= 100 && !isProcessing;

  // Claim as virtual TESTVBMS coins
  const handleClaimTESTVBMS = async () => {
    if (!address) {
      toast.error("Conecte sua carteira");
      return;
    }

    if (!canClaimTESTVBMS) {
      toast.error("Inbox vazio");
      return;
    }

    try {
      const result = await claimAsTESTVBMS({ address });
      toast.success(result.message);
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Erro ao coletar TESTVBMS");
    }
  };

  // Claim as VBMS blockchain tokens
  const handleClaimVBMS = async () => {
    if (!address) {
      toast.error("Conecte sua carteira");
      return;
    }

    if (!canClaimVBMS) {
      toast.error("Mínimo de 100 TESTVBMS para converter em VBMS");
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

      console.log('[InboxModal] Step 4: TX sent, waiting for confirmation...', txHash);
      toast.loading("⏳ Aguardando confirmação da blockchain...", { id: "claim-wait" });

      // Wait for TX confirmation (3 seconds should be enough for Base)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Record the claim in backend to zero inbox
      console.log('[InboxModal] Step 5: Recording inbox claim to zero balance...');
      await recordInboxClaim({
        address,
        amount: result.amount,
        txHash: txHash as unknown as string,
      });

      console.log('[InboxModal] Step 6: Inbox zeroed successfully!');
      toast.dismiss("claim-wait");

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
      toast.dismiss("claim-wait");
      toast.error(error.message || "Erro ao coletar VBMS");
      setIsProcessing(false);
    }
  };

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
      console.log('[InboxModal] Step 1: Getting signature...');
      const result = await convertTESTVBMS({ address });

      toast.info("🔐 Aguardando assinatura da carteira...");

      console.log('[InboxModal] Step 2: Sending blockchain TX...');
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

      console.log('[InboxModal] Step 3: TX sent, waiting for confirmation...', txHash);
      toast.loading("⏳ Aguardando confirmação da blockchain...", { id: "conversion-wait" });

      // Wait for TX confirmation (3 seconds should be enough for Base)
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('[InboxModal] Step 4: Zeroing TESTVBMS balance...');
      // Zero TESTVBMS balance after TX is sent
      await recordTESTVBMSConversion({
        address,
        amount: result.amount,
        txHash: txHash as unknown as string,
      });

      console.log('[InboxModal] Step 5: Conversion complete!');
      toast.dismiss("conversion-wait");
      toast.success(`✅ ${result.amount.toLocaleString()} TESTVBMS convertidos para VBMS!`);

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error('[InboxModal] Error converting TESTVBMS:', error);
      toast.dismiss("conversion-wait");
      toast.error(error.message || "Erro ao converter TESTVBMS");
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
              <span className="text-4xl">💰</span>
            </div>
            <h2 className="text-3xl font-display font-bold text-vintage-gold mb-2">
              CONVERTER
            </h2>
            <p className="text-sm text-vintage-gold/70">
              TESTVBMS → VBMS Blockchain
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Warning - Claims only work on miniapp */}
          <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3">
            <p className="text-xs text-blue-300 text-center leading-relaxed">
              ⚠️ <span className="font-semibold">Claims only work on Farcaster miniapp</span>
            </p>
          </div>

          {/* TESTVBMS Balance (what you can convert) */}
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-400/50 rounded-xl p-6 mb-4">
            <div className="text-center">
              <div className="text-sm font-bold text-green-300 mb-3 uppercase tracking-wide">
                💰 SALDO TESTVBMS
              </div>
              <div className="text-6xl font-bold text-green-100 mb-2">
                {testvbmsBalance.toLocaleString()}
              </div>
              <div className="text-xs text-green-300/60 mt-2">
                Disponível para converter
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Convert TESTVBMS → VBMS (only button) */}
            {testvbmsBalance >= 100 ? (
              <button
                onClick={handleConvertTESTVBMS}
                disabled={!canConvertTESTVBMS || isProcessing}
                className={`w-full group relative overflow-hidden rounded-xl p-4 font-bold transition-all ${
                  canConvertTESTVBMS
                    ? "bg-gradient-to-r from-vintage-gold to-vintage-burnt-gold hover:from-vintage-burnt-gold hover:to-vintage-gold text-vintage-deep-black shadow-lg shadow-vintage-gold/20 hover:shadow-vintage-gold/40 hover:scale-[1.02]"
                    : "bg-vintage-deep-black/50 text-vintage-gold/30 cursor-not-allowed border border-vintage-gold/10"
                }`}
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                <div className="relative flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-xl">🔄</span>
                    <span>Converter {testvbmsBalance.toLocaleString()} → VBMS</span>
                  </span>
                  <span className="text-xs opacity-80 bg-black/20 px-2 py-1 rounded">Pay Gas</span>
                </div>
              </button>
            ) : (
              <div className="text-center py-6">
                <div className="text-6xl mb-3 opacity-20">💰</div>
                <p className="text-vintage-gold/60 text-sm">
                  Mínimo de 100 TESTVBMS
                </p>
                <p className="text-vintage-gold/40 text-xs mt-1">
                  Complete battles para ganhar mais!
                </p>
              </div>
            )}

            {/* Help Text */}
            {canConvertTESTVBMS && (
              <div className="bg-vintage-gold/5 border border-vintage-gold/20 rounded-lg p-3">
                <p className="text-xs text-vintage-gold/70 text-center leading-relaxed">
                  💎 <span className="font-semibold">VBMS</span> = Blockchain tokens (onchain) •
                  <span className="font-semibold"> TESTVBMS</span> = In-game currency (offchain)
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
