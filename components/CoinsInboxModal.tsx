"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { createPortal } from "react-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useClaimVBMS, useVBMSBalance } from "@/lib/hooks/useVBMSContracts";
import { sdk } from "@farcaster/miniapp-sdk";
import { CONTRACTS, POOL_ABI } from "@/lib/contracts";
import { encodeFunctionData, parseEther } from "viem";

interface CoinsInboxModalProps {
  inboxStatus: {
    inbox: number; // TESTVBMS inbox (rewards accumulate here)
    coins: number; // TESTVBMS balance (after claiming from inbox)
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

  const claimInboxAsTESTVBMS = useMutation(api.vbmsClaim.claimInboxAsTESTVBMS);
  const convertTESTVBMS = useAction(api.vbmsClaim.convertTESTVBMStoVBMS);
  const recordTESTVBMSConversion = useMutation(api.vbmsClaim.recordTESTVBMSConversion);
  const { claimVBMS } = useClaimVBMS();

  // Get VBMS wallet balance from blockchain
  const { balance: vbmsWalletBalance } = useVBMSBalance(address as `0x${string}`);

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

  const inboxAmount = inboxStatus.inbox || 0; // TESTVBMS no inbox
  const testvbmsBalance = inboxStatus.coins || 0; // TESTVBMS no saldo
  const canClaimInbox = inboxAmount >= 1 && !isProcessing;
  const canConvertTESTVBMS = testvbmsBalance >= 100 && !isProcessing;

  // Claim inbox → adiciona ao saldo TESTVBMS (instant, no gas)
  const handleClaimInbox = async () => {
    if (!address) {
      toast.error("Conecte sua carteira");
      return;
    }

    if (!canClaimInbox) {
      toast.error("Inbox vazio");
      return;
    }

    try {
      const result = await claimInboxAsTESTVBMS({ address });
      toast.success(result.message);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || "Erro ao coletar inbox");
    }
  };

  // Convert TESTVBMS saldo → VBMS blockchain tokens
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
      toast.loading("⏳ Aguardando confirmação da blockchain...", { id: "conversion-wait" });

      // Wait for TX confirmation
      await new Promise(resolve => setTimeout(resolve, 3000));

      await recordTESTVBMSConversion({
        address,
        amount: result.amount,
        txHash: txHash as unknown as string,
      });

      toast.dismiss("conversion-wait");
      toast.success(`✅ ${result.amount.toLocaleString()} TESTVBMS convertidos para VBMS!`);

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error('[CoinsInboxModal] Error converting TESTVBMS:', error);
      toast.dismiss("conversion-wait");
      toast.error(error.message || "Erro ao converter TESTVBMS");
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
          <div className="text-4xl mb-2">📬</div>
          <h2 className="text-2xl font-bold text-vintage-gold">
            INBOX
          </h2>
          <p className="text-xs text-vintage-burnt-gold mt-2">
            Claim rewards e converta para VBMS
          </p>
        </div>

        {/* Wallet Balance (from blockchain) */}
        <div className="bg-gradient-to-br from-vintage-gold/20 to-vintage-burnt-gold/20 border-2 border-vintage-gold/50 rounded-xl p-6 mb-4">
          <div className="text-center">
            <div className="text-sm font-bold text-vintage-gold mb-3 uppercase tracking-wide">
              💎 VBMS WALLET
            </div>
            <div className="text-6xl font-bold text-vintage-gold mb-2">
              {parseFloat(vbmsWalletBalance || '0').toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-vintage-gold/60 mt-2">
              Blockchain (onchain)
            </div>
          </div>
        </div>

        {/* Inbox Balance */}
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-400/50 rounded-xl p-6 mb-4">
          <div className="text-center">
            <div className="text-sm font-bold text-purple-300 mb-3 uppercase tracking-wide">
              📬 INBOX
            </div>
            <div className="text-6xl font-bold text-purple-100 mb-2">
              {inboxAmount.toLocaleString()}
            </div>
            <div className="text-xs text-purple-300/60 mt-2">
              TESTVBMS rewards (offchain)
            </div>
          </div>
        </div>

        {/* TESTVBMS Balance Display */}
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-400/50 rounded-xl p-6 mb-6">
          <div className="text-center">
            <div className="text-sm font-bold text-green-300 mb-3 uppercase tracking-wide">
              💰 SALDO TESTVBMS
            </div>
            <div className="text-6xl font-bold text-green-100 mb-2">
              {testvbmsBalance.toLocaleString()}
            </div>
            <div className="text-xs text-green-300/60 mt-2">
              In-game currency (offchain)
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Claim Inbox → Saldo (instant, no gas) */}
          {inboxAmount > 0 && (
            <button
              onClick={handleClaimInbox}
              disabled={!canClaimInbox || isProcessing}
              className={`w-full group relative overflow-hidden rounded-xl p-4 font-bold transition-all ${
                canClaimInbox
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:scale-[1.02]"
                  : "bg-vintage-deep-black/50 text-vintage-gold/30 cursor-not-allowed border border-vintage-gold/10"
              }`}
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
              <div className="relative flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  <span>Claim {inboxAmount.toLocaleString()} TESTVBMS</span>
                </span>
                <span className="text-sm opacity-80">Instant</span>
              </div>
            </button>
          )}

          {/* Convert Saldo → VBMS blockchain (pay gas, min 100) */}
          {testvbmsBalance >= 100 && (
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
                  <span>Convert {testvbmsBalance.toLocaleString()} → VBMS</span>
                </span>
                <span className="text-xs opacity-80 bg-black/20 px-2 py-1 rounded">Pay Gas</span>
              </div>
            </button>
          )}

          {/* Empty state */}
          {inboxAmount === 0 && testvbmsBalance === 0 && (
            <div className="text-center py-6">
              <div className="text-6xl mb-3 opacity-20">📭</div>
              <p className="text-vintage-gold/60 text-sm">
                Inbox vazio
              </p>
              <p className="text-vintage-gold/40 text-xs mt-1">
                Complete battles para ganhar TESTVBMS!
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
      </div>
    </div>,
    document.body
  );
}
