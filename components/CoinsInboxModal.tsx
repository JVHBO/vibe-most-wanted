"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { createPortal } from "react-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useClaimVBMS } from "@/lib/hooks/useVBMSContracts";
import { useFarcasterVBMSBalance } from "@/lib/hooks/useFarcasterVBMS"; // Miniapp-compatible
import { sdk } from "@farcaster/miniapp-sdk";
import { CONTRACTS, POOL_ABI } from "@/lib/contracts";
import { encodeFunctionData, parseEther } from "viem";
import Image from "next/image";
import Link from "next/link";
import { useBodyScrollLock, useEscapeKey } from "@/hooks";
import { Z_INDEX } from "@/lib/z-index";
import CoinsHistoryModal from "./CoinsHistoryModal";

const NextImage = Image;

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
  const [showHistory, setShowHistory] = useState(false);

  // Modal accessibility hooks
  useBodyScrollLock(true);
  useEscapeKey(onClose);

    // Check if we should use Farcaster SDK for transactions
  useEffect(() => {
    const checkFarcasterSDK = async () => {
      try {
        // Only use Farcaster SDK if we're actually inside the miniapp
        // Check if we're in an iframe (miniapp runs in iframe)
        const isInIframe = window !== window.parent;

        if (!isInIframe) {
          console.log('[CoinsInboxModal] Not in iframe, using wagmi');
          setUseFarcasterSDK(false);
          return;
        }

        if (sdk && typeof sdk.wallet !== 'undefined') {
          const provider = await sdk.wallet.getEthereumProvider();
          if (provider) {
            setUseFarcasterSDK(true);
            console.log('[CoinsInboxModal] Using Farcaster SDK for transactions');
          }
        }
      } catch (error) {
        console.log('[CoinsInboxModal] Farcaster SDK not available, using wagmi:', error);
        setUseFarcasterSDK(false);
      }
    };
    checkFarcasterSDK();
  }, []);

  const claimInboxAsTESTVBMS = useMutation(api.vbmsClaim.claimInboxAsTESTVBMS);
  const convertTESTVBMS = useAction(api.vbmsClaim.convertTESTVBMStoVBMS);
  const recordTESTVBMSConversion = useMutation(api.vbmsClaim.recordTESTVBMSConversion);
  const { claimVBMS } = useClaimVBMS();

  // Get VBMS wallet balance from blockchain (using Farcaster-compatible hook for miniapp)
  const { balance: vbmsWalletBalance } = useFarcasterVBMSBalance(address);

  // Helper function to claim via Farcaster SDK
  const claimViaFarcasterSDK = async (amount: string, nonce: string, signature: string) => {
    const provider = await sdk.wallet.getEthereumProvider();
    if (!provider) {
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
      const txHash = await provider.request({
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

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          style={{ zIndex: Z_INDEX.modal }}
          onClick={onClose}
        >
          <div
            className="relative bg-gradient-to-br from-vintage-deep-black to-vintage-rich-black border-2 border-vintage-gold rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-vintage-gold/60 hover:text-vintage-gold text-2xl z-20 p-2"
        >
          ✕
        </button>

        {/* Transaction History Icon Button */}
        <button
          onClick={() => {
            console.log('[CoinsInboxModal] History button clicked');
            setShowHistory(true);
          }}
          className="absolute top-3 right-14 p-2 z-20 bg-vintage-gold/10 hover:bg-vintage-gold/20 rounded-lg text-vintage-gold/80 hover:text-vintage-gold transition-all group border border-vintage-gold/20"
          title="Histórico de Transações"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="group-hover:scale-110 transition-transform"
          >
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        </button>

        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-vintage-gold/10 via-transparent to-transparent p-6 pb-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-vintage-gold/20 to-vintage-burnt-gold/20 border-2 border-vintage-gold/30 mb-3">
              <NextImage src="/images/icons/convert.svg" alt="Convert" width={32} height={32} className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-display font-bold text-vintage-gold mb-2">
              CONVERT
            </h2>
            <p className="text-sm text-vintage-gold/70">
              TESTVBMS → VBMS
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Warning - Claims only work on miniapp */}
          <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3">
            <p className="text-xs text-blue-300 text-center leading-relaxed flex items-center justify-center gap-2">
              <NextImage src="/images/icons/warning.svg" alt="Warning" width={16} height={16} className="w-4 h-4" />
              <span className="font-semibold">Claims only work on Farcaster miniapp</span>
            </p>
          </div>

          {/* TESTVBMS Balance (what you can convert) */}
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-400/50 rounded-xl p-6 mb-4">
            <div className="text-center">
              <div className="text-sm font-bold text-green-300 mb-3 uppercase tracking-wide flex items-center justify-center gap-2">
                <NextImage src="/images/icons/coins.svg" alt="TESTVBMS" width={20} height={20} className="w-5 h-5" />
                TESTVBMS BALANCE
              </div>
              <div className="text-6xl font-bold text-green-100 mb-2">
                {testvbmsBalance.toLocaleString()}
              </div>
              <div className="text-xs text-green-300/60 mt-2">
                Available to convert
              </div>
            </div>
          </div>

          {/* VBMS Balance (blockchain) - REMOVED, not showing wallet balance anymore */}

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
                  <NextImage src="/images/icons/convert.svg" alt="Convert" width={20} height={20} className="w-5 h-5" />
                  <span>Convert {testvbmsBalance.toLocaleString()} → VBMS</span>
                </span>
                <span className="text-xs opacity-80 bg-black/20 px-2 py-1 rounded">Pay Gas</span>
              </div>
            </button>
          ) : (
            <div className="text-center py-6">
              <div className="flex justify-center mb-3 opacity-20">
                <NextImage src="/images/icons/coins.svg" alt="Coins" width={48} height={48} className="w-12 h-12" />
              </div>
              <p className="text-vintage-gold/60 text-sm">
                Minimum 100 TESTVBMS required
              </p>
              <p className="text-vintage-gold/40 text-xs mt-1">
                Complete battles to earn more!
              </p>
            </div>
          )}

          {/* DEX Link - Sell VBMS for ETH */}
          <Link
            href="/dex"
            className="w-full group relative overflow-hidden rounded-xl p-4 font-bold transition-all bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <span className="text-xl">💱</span>
            <span>Sell VBMS → ETH (DEX)</span>
          </Link>
          </div>
        </div>
          </div>
        </div>,
        document.body
      )}

      {/* Transaction History Modal - Separate Portal */}
      {showHistory && address && (
        <CoinsHistoryModal
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          address={address}
        />
      )}
    </>
  );
}
