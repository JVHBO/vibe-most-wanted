"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { createPortal } from "react-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useClaimVBMS, useDailyClaimInfo } from "@/lib/hooks/useVBMSContracts";
import { useFarcasterVBMSBalance } from "@/lib/hooks/useFarcasterVBMS"; // Miniapp-compatible
import { sdk } from "@farcaster/miniapp-sdk";
import { CONTRACTS, POOL_ABI } from "@/lib/contracts";
import { encodeFunctionData, parseEther } from "viem";
import { BUILDER_CODE, dataSuffix } from "@/lib/hooks/useWriteContractWithAttribution";
import Image from "next/image";
import { useBodyScrollLock, useEscapeKey } from "@/hooks";
import { Z_INDEX } from "@/lib/z-index";
import CoinsHistoryModal from "./CoinsHistoryModal";

const NextImage = Image;

interface CoinsInboxModalProps {
  inboxStatus: {
    inbox: number; // TESTVBMS inbox (rewards accumulate here)
    coins: number; // TESTVBMS balance (after claiming from inbox)
    lifetimeEarned: number;
    cooldownRemaining?: number; // Seconds until next conversion allowed
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
  const [cooldown, setCooldown] = useState(inboxStatus.cooldownRemaining || 0);

  // Cooldown countdown timer
  useEffect(() => {
    setCooldown(inboxStatus.cooldownRemaining || 0);
  }, [inboxStatus.cooldownRemaining]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown > 0]);

  // Modal accessibility hooks
  useBodyScrollLock(true);
  useEscapeKey(onClose);

    // Check if we should use Farcaster SDK for transactions
  // ONLY enable if we have a valid SDK context with user - this is the ONLY reliable miniapp detection
  useEffect(() => {
    const checkFarcasterSDK = async () => {
      try {
        // Check if SDK is available first
        if (!sdk || typeof sdk.wallet === 'undefined') {
          console.log('[CoinsInboxModal] SDK not available, using wagmi');
          setUseFarcasterSDK(false);
          return;
        }

        // REQUIRE valid SDK context with user - this ONLY works inside Farcaster miniapp
        let sdkContext;
        try {
          const contextPromise = sdk.context;
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SDK context timeout')), 3000)
          );
          sdkContext = await Promise.race([contextPromise, timeoutPromise]);
          console.log('[CoinsInboxModal] SDK context received:', sdkContext ? 'valid' : 'null');
        } catch (contextError) {
          console.log('[CoinsInboxModal] SDK context timeout - NOT in miniapp');
          setUseFarcasterSDK(false);
          return;
        }

        // Must have valid context with user to be in miniapp
        if (!sdkContext || !(sdkContext as { user?: unknown }).user) {
          console.log('[CoinsInboxModal] No valid SDK context/user - NOT in miniapp');
          setUseFarcasterSDK(false);
          return;
        }

        // Only now check for provider
        const provider = await sdk.wallet.getEthereumProvider();
        if (provider) {
          setUseFarcasterSDK(true);
          console.log('[CoinsInboxModal] Valid miniapp context + provider - using Farcaster SDK');
        } else {
          console.log('[CoinsInboxModal] No provider available, using wagmi');
          setUseFarcasterSDK(false);
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
  const recoverFailedConversion = useMutation(api.vbmsClaim.recoverFailedConversion);
  const { claimVBMS } = useClaimVBMS();

  // Get VBMS wallet balance from blockchain (using Farcaster-compatible hook for miniapp)
  const { balance: vbmsWalletBalance } = useFarcasterVBMSBalance(address);

  // Get daily claim limits from contract
  const { remaining: dailyRemaining, resetTime, isLoading: isLoadingLimits } = useDailyClaimInfo(address as `0x${string}` | undefined);
  const dailyRemainingNum = parseFloat(dailyRemaining);

  // Calculate time until reset
  const getResetTimeString = () => {
    const now = Math.floor(Date.now() / 1000);
    const diff = resetTime - now;
    if (diff <= 0) return "Available now";
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  // Helper function to get actual wallet address from Farcaster SDK
  const getFarcasterWalletAddress = async (): Promise<string> => {
    const provider = await sdk.wallet.getEthereumProvider();
    if (!provider) {
      throw new Error("Farcaster wallet not available");
    }

    // Get the actual address from the provider
    const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found in Farcaster wallet");
    }

    console.log('[CoinsInboxModal] Farcaster wallet address:', accounts[0]);
    return accounts[0];
  };

  // Helper function to claim via Farcaster SDK
  const claimViaFarcasterSDK = async (amount: string, nonce: string, signature: string, walletAddress: string) => {
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
      from: walletAddress, // Use actual wallet address
      to: CONTRACTS.VBMSPoolTroll,
      chainId: CONTRACTS.CHAIN_ID
    });

    // Encode the function call
    const data = encodeFunctionData({
      abi: POOL_ABI,
      functionName: 'claimVBMS',
      args: [parseEther(amount), nonce as `0x${string}`, signature as `0x${string}`],
    });

    // Append builder code suffix for Base attribution
    const dataWithBuilderCode = (data + dataSuffix.slice(2)) as `0x${string}`;

    console.log('[CoinsInboxModal] Encoded data with builder code:', dataWithBuilderCode, 'Builder:', BUILDER_CODE);

    try {
      // Send transaction via Farcaster SDK with builder code
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress as `0x${string}`, // Use actual wallet address
          to: CONTRACTS.VBMSPoolTroll,
          data: dataWithBuilderCode,
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

  // Check if conversion would exceed daily limit
  const exceedsDailyLimit = testvbmsBalance > dailyRemainingNum;
  const isOnCooldown = cooldown > 0;
  const canConvertTESTVBMS = testvbmsBalance >= 100 && !isProcessing && !exceedsDailyLimit && !isOnCooldown;

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
      // 🔑 CRITICAL: For Farcaster SDK, get the ACTUAL wallet address from provider
      // This is the address that will be msg.sender in the contract
      // It may differ from the address prop (which comes from userProfile)
      let signingAddress = address;
      if (useFarcasterSDK) {
        try {
          signingAddress = await getFarcasterWalletAddress();
          console.log('[CoinsInboxModal] Using Farcaster wallet address for signature:', signingAddress);
          console.log('[CoinsInboxModal] Original address from prop:', address);
          if (signingAddress.toLowerCase() !== address?.toLowerCase()) {
            console.log('[CoinsInboxModal] ⚠️ Address mismatch! Using provider address for signature.');
          }
        } catch (error) {
          console.error('[CoinsInboxModal] Failed to get Farcaster wallet address:', error);
          toast.error('Erro ao obter endereço da carteira');
          setIsProcessing(false);
          return;
        }
      }

      console.log('[CoinsInboxModal] Converting TESTVBMS to VBMS...');
      // Use the actual wallet address for signature generation
      const result = await convertTESTVBMS({ address: signingAddress });

      toast.info("🔐 Aguardando assinatura da carteira...");

      // Use Farcaster SDK if available, otherwise wagmi
      const txHash = useFarcasterSDK
        ? await claimViaFarcasterSDK(
            result.amount.toString(),
            result.nonce,
            result.signature,
            signingAddress // Pass the correct address
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
        address: signingAddress, // Use the actual signing address
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

      // Show recovery option after 5 minutes
      toast.info("Se a TX falhou, você pode recuperar seus TESTVBMS em 5 minutos clicando no botão 'Recuperar'", {
        duration: 10000,
      });

      setIsProcessing(false);
    }
  };

  // Handle recovery of failed conversion
  const handleRecoverConversion = async () => {
    if (!address) {
      toast.error("Conecte sua carteira");
      return;
    }

    setIsProcessing(true);

    try {
      const result = await recoverFailedConversion({ address });
      toast.success(`✅ Recuperados ${result.recoveredAmount.toLocaleString()} TESTVBMS!`);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('[CoinsInboxModal] Error recovering TESTVBMS:', error);
      toast.error(error.message || "Erro ao recuperar TESTVBMS");
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

        <div className="px-6 pb-6 space-y-3">
          {/* TESTVBMS Balance (what you can convert) - Compact */}
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/40 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <NextImage src="/images/icons/coins.svg" alt="TESTVBMS" width={24} height={24} className="w-6 h-6" />
                <span className="text-xs font-bold text-green-300 uppercase">TESTVBMS</span>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-100">
                  {testvbmsBalance.toLocaleString()}
                </div>
                <div className="text-xs text-green-300/50">to convert</div>
              </div>
            </div>
          </div>

          {/* VBMS Balance (blockchain) - REMOVED, not showing wallet balance anymore */}

          {/* Daily Claim Limits - Compact Display */}
          <div className="bg-vintage-deep-black/60 border border-vintage-gold/20 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-vintage-gold/60">Daily Limit Remaining:</span>
              <span className={`font-bold ${exceedsDailyLimit ? 'text-red-400' : 'text-green-400'}`}>
                {isLoadingLimits ? '...' : `${Number(dailyRemaining).toLocaleString()} VBMS`}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-vintage-gold/40">Resets in:</span>
              <span className="text-vintage-gold/60">{getResetTimeString()}</span>
            </div>
            {exceedsDailyLimit && testvbmsBalance >= 100 && (
              <div className="mt-2 p-2 bg-red-500/20 border border-red-500/40 rounded text-xs text-red-300 text-center">
                ⚠️ Your balance ({testvbmsBalance.toLocaleString()}) exceeds daily limit ({Number(dailyRemaining).toLocaleString()})
              </div>
            )}
            {isOnCooldown && (
              <div className="mt-2 p-2 bg-orange-500/20 border border-orange-500/40 rounded text-xs text-orange-300 text-center">
                ⏳ Cooldown: {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, '0')} until next conversion
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
          {/* Convert button - ONLY in miniapp (iframe), disabled in browser */}
          {useFarcasterSDK ? (
            // MINIAPP: Show convert button
            testvbmsBalance >= 100 ? (
              <button
                onClick={handleConvertTESTVBMS}
                disabled={!canConvertTESTVBMS || isProcessing}
                className={`w-full group relative overflow-hidden rounded-lg p-3 font-bold transition-all text-sm ${
                  canConvertTESTVBMS
                    ? "bg-gradient-to-r from-vintage-gold to-vintage-burnt-gold hover:from-vintage-burnt-gold hover:to-vintage-gold text-vintage-deep-black shadow-lg shadow-vintage-gold/20 hover:shadow-vintage-gold/40 hover:scale-[1.01]"
                    : "bg-vintage-deep-black/50 text-vintage-gold/30 cursor-not-allowed border border-vintage-gold/10"
                }`}
              >
                <div className="relative flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <NextImage src="/images/icons/convert.svg" alt="Convert" width={16} height={16} className="w-4 h-4" />
                    <span>Convert {testvbmsBalance.toLocaleString()} → VBMS</span>
                  </span>
                  <span className="text-xs opacity-80 bg-black/20 px-2 py-0.5 rounded">Gas</span>
                </div>
              </button>
            ) : (
              <div className="text-center py-3">
                <p className="text-vintage-gold/60 text-xs">
                  Minimum 100 TESTVBMS required to convert
                </p>
              </div>
            )
          ) : (
            // BROWSER: Show disabled message with miniapp redirect
            <div className="bg-purple-950/30 border-2 border-purple-800/50 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">📱</div>
              <h3 className="text-purple-400 font-bold text-lg mb-2">USE MINIAPP TO CLAIM</h3>
              <p className="text-purple-400/70 text-sm mb-3">
                TESTVBMS → VBMS conversion is only available in the Farcaster miniapp for security.
              </p>
              <a
                href="https://farcaster.xyz/miniapps/UpOGC4pheWVP/vibe-most-wanted"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-lg transition-all"
              >
                Open Miniapp →
              </a>
              {testvbmsBalance > 0 && (
                <div className="mt-4 bg-vintage-black/50 rounded-lg p-3">
                  <p className="text-vintage-gold/60 text-xs">Your TESTVBMS Balance:</p>
                  <p className="text-vintage-gold font-bold text-xl">{testvbmsBalance.toLocaleString()}</p>
                </div>
              )}
            </div>
          )}

          {/* Recovery button for failed conversions - only in miniapp */}
          {useFarcasterSDK && (
            <button
              onClick={handleRecoverConversion}
              disabled={isProcessing}
              className="w-full text-xs py-2 px-3 rounded-lg bg-orange-900/30 hover:bg-orange-900/50 border border-orange-500/30 text-orange-300/80 hover:text-orange-200 transition-all disabled:opacity-50"
            >
              🔄 Recover Failed TX (after 5 min)
            </button>
          )}

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
