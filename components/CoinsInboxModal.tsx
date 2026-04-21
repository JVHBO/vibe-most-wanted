"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { createPortal } from "react-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useClaimVBMS, useDailyClaimInfo } from "@/lib/hooks/useVBMSContracts";
import { useFarcasterVBMSBalance } from "@/lib/hooks/useFarcasterVBMS"; // Miniapp-compatible
import { useFarcasterContext } from "@/lib/hooks/useFarcasterContext"; // 🔒 For FID verification
import { CONTRACTS, POOL_ABI } from "@/lib/contracts";
import { encodeFunctionData, parseEther } from "viem";
import { BUILDER_CODE, dataSuffix } from "@/lib/hooks/useWriteContractWithAttribution";
import Image from "next/image";
import { useBodyScrollLock, useEscapeKey } from "@/hooks";
import { Z_INDEX } from "@/lib/z-index";
import CoinsHistoryModal from "./CoinsHistoryModal";
import { usePlayerCards } from "@/contexts/PlayerCardsContext";
import { useProfile } from "@/contexts/ProfileContext";
import { translateClaimError, isClaimErrorCode, getSupportText, SupportLink } from "@/lib/claimErrorTranslator";
import { SupportedLanguage } from "@/lib/translations";
import { getFarcasterProvider as getFarcasterSdkProvider } from "@/lib/utils/miniapp";

const NextImage = Image;

interface CoinsInboxModalProps {
  inboxStatus: {
    inbox: number; // TESTVBMS inbox (rewards accumulate here)
    coins: number; // TESTVBMS balance (after claiming from inbox)
    lifetimeEarned: number;
    cooldownRemaining?: number; // Seconds until next conversion allowed
    pendingConversion?: number; // Coins stuck in failed conversion
    pendingConversionTimestamp?: number | null;
  };
  onClose: () => void;
  userAddress?: string; // Pass address from parent (for Farcaster mobile)
}

export function CoinsInboxModal({ inboxStatus, onClose, userAddress }: CoinsInboxModalProps) {
  const { address: wagmiAddress } = useAccount();
  // Use userAddress prop if provided (Farcaster mobile), otherwise wagmi
  const address = userAddress || wagmiAddress;
  const hasWagmiSigner = Boolean(wagmiAddress);

  // 🔄 Get refresh functions from both contexts
  const { refreshUserProfile } = usePlayerCards();
  const { refreshProfile, userProfile } = useProfile();
  const { t, lang } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [useFarcasterSDK, setUseFarcasterSDK] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [cooldown, setCooldown] = useState(inboxStatus.cooldownRemaining || 0);
  const [convertAmount, setConvertAmount] = useState("");

  // 🔒 Get Farcaster context for FID verification
  // Fallback to profile FID for browser/web users (not in miniapp)
  const farcasterContext = useFarcasterContext();
  const userFid = farcasterContext.user?.fid
    || userProfile?.farcasterFid
    || (userProfile?.fid ? parseInt(userProfile.fid) : undefined);
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
  // Only in actual Farcaster iframe (Warpcast), never in Base App
  useEffect(() => {
    const checkFarcasterSDK = async () => {
      try {
        const provider = await getFarcasterSdkProvider();
        setUseFarcasterSDK(Boolean(provider));
      } catch (error) {
        console.log('[CoinsInboxModal] Farcaster SDK not available, using wagmi:', error);
        setUseFarcasterSDK(false);
      }
    };
    checkFarcasterSDK();
  }, []);

  // Use FC SDK when available - in native Farcaster app, wagmi/Privy can't open popups
  const shouldUseFarcasterTx = useFarcasterSDK;

  const claimInboxAsTESTVBMS = useMutation(api.vbmsClaim.claimInboxAsTESTVBMS);
  const convertTESTVBMS = useAction(api.vbmsClaim.convertTESTVBMStoVBMS);
  const recordTESTVBMSConversion = useMutation(api.vbmsClaim.recordTESTVBMSConversion);
  const recoverPendingConversion = useMutation(api.vbmsClaim.recoverPendingConversion);
  const { claimVBMS } = useClaimVBMS();

  // Get VBMS wallet balance from blockchain (using Farcaster-compatible hook for miniapp)
  const { balance: vbmsWalletBalance } = useFarcasterVBMSBalance(address);

  // Get daily claim limits from contract
  const { remaining: dailyRemaining, resetTime, isLoading: isLoadingLimits, hasError: hasLimitError, refetch: refetchDailyLimit } = useDailyClaimInfo(address as `0x${string}` | undefined);

  // Get Convex-side daily conversion count limits
  const vbmsDashboard = useQuery(api.vbmsClaim.getPlayerEconomy, address ? { address } : "skip");
  const dailyConvertCountUsed = vbmsDashboard?.dailyConvertCountUsed ?? 0;
  const dailyConvertCountLimit = vbmsDashboard?.dailyConvertCountLimit ?? 1;
  const conversionsLeft = Math.max(0, dailyConvertCountLimit - dailyConvertCountUsed);
  const dailyRemainingNum = parseFloat(dailyRemaining);
  const canCheckLimit = !isLoadingLimits && !hasLimitError && dailyRemainingNum > 0;

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
    const provider = await getFarcasterSdkProvider();
    if (!provider) throw new Error("Farcaster wallet not available");
    const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
    if (!accounts || accounts.length === 0) throw new Error("No accounts found in Farcaster wallet");
    return accounts[0];
  };

  const getFarcasterProvider = async () => {
    const provider = await getFarcasterSdkProvider();
    if (!provider) {
      throw new Error("Farcaster wallet not available");
    }

    return provider;
  };

  // Helper function to claim via Farcaster SDK
  const claimViaFarcasterSDK = async (amount: string, nonce: string, signature: string, walletAddress: string) => {
    const provider = await getFarcasterProvider();

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
      // Force Base chain — claim contract is on Base only
      const BASE_CHAIN_ID_HEX = '0x2105'; // 8453
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_CHAIN_ID_HEX }],
        });
        console.log('[CoinsInboxModal] Switched to Base chain for claim');
      } catch (switchError: any) {
        console.warn('[CoinsInboxModal] Could not switch chain:', switchError?.message);
        // Proceed anyway — some SDKs handle chain internally
      }

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
  const stuckPending = inboxStatus.pendingConversion || 0;
  const stuckTimestamp = inboxStatus.pendingConversionTimestamp || 0;
  const canRecover = stuckPending > 0 && (Date.now() - stuckTimestamp) >= 30 * 60 * 1000;

  // Auto-recover stuck pending conversion when modal opens (if 30min passed)
  useEffect(() => {
    if (!address || !canRecover) return;
    recoverPendingConversion({ address })
      .then((result: any) => {
        if (result?.restored > 0) {
          toast.success(`↩️ ${result.restored.toLocaleString()} coins devolvidos (conversão anterior falhou)`);
          refreshProfile();
        }
      })
      .catch(() => { /* silent — user will see pending banner if not recovered */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parse conversion amount
  const selectedAmount = parseInt(convertAmount) || 0;

  // Check if conversion would exceed daily limit or balance
  const exceedsDailyLimit = canCheckLimit && selectedAmount > dailyRemainingNum;
  const exceedsBalance = selectedAmount > testvbmsBalance;
  const isOnCooldown = cooldown > 0;
  const limitUnavailable = !isLoadingLimits && (hasLimitError || dailyRemainingNum === 0);
  // Block conversion if: limit exceeded, balance exceeded, on cooldown, limit data unavailable, or daily count maxed
  const canConvertTESTVBMS = selectedAmount >= 100 && !isProcessing && !exceedsDailyLimit && !exceedsBalance && !isOnCooldown && !limitUnavailable && conversionsLeft > 0;

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
      // 🔄 Refresh profile to update balance display
      await Promise.all([refreshUserProfile(), refreshProfile()]);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || "Erro ao coletar inbox");
    }
  };

  // Convert TESTVBMS saldo → VBMS blockchain tokens
  const handleConvertTESTVBMS = async () => {
    // 📊 Log conversion attempt details for debugging
    console.log('[CoinsInboxModal] 🔄 Conversion attempt:', {
      address,
      userFid,
      selectedAmount,
      testvbmsBalance,
      dailyRemaining,
      dailyRemainingNum,
      isLoadingLimits,
      hasLimitError,
      limitUnavailable,
      exceedsDailyLimit,
      exceedsBalance,
      isOnCooldown,
      cooldown,
      canConvertTESTVBMS,
      useFarcasterSDK,
      shouldUseFarcasterTx,
    });

    if (!address) {
      console.error('[CoinsInboxModal] ❌ No address connected');
      toast.error("Conecte sua carteira");
      return;
    }

    if (!canConvertTESTVBMS) {
      if (selectedAmount < 100) {
        console.warn('[CoinsInboxModal] ⚠️ Amount too low:', selectedAmount);
        toast.error("Mínimo de 100 coins para converter");
      } else if (exceedsBalance) {
        console.warn('[CoinsInboxModal] ⚠️ Exceeds balance:', { selectedAmount, testvbmsBalance });
        toast.error("Valor maior que seu saldo");
      } else if (exceedsDailyLimit) {
        console.warn('[CoinsInboxModal] ⚠️ Exceeds daily limit:', { selectedAmount, dailyRemainingNum });
        toast.error(`Valor excede o limite diário (restante: ${Math.floor(dailyRemainingNum).toLocaleString()})`);
      } else if (limitUnavailable) {
        console.warn('[CoinsInboxModal] ⚠️ Daily limit unavailable:', { hasLimitError, dailyRemainingNum });
        toast.error("Limite diário indisponível. Tente novamente em alguns segundos.");
      } else if (isOnCooldown) {
        console.warn('[CoinsInboxModal] ⚠️ On cooldown:', cooldown);
        toast.error(`Aguarde ${Math.ceil(cooldown / 60)} minutos para converter novamente`);
      }
      return;
    }

    setIsProcessing(true);

    try {
      // 🔑 CRITICAL: For Farcaster SDK, get the ACTUAL wallet address from provider
      // This is the address that will be msg.sender in the contract
      // It may differ from the address prop (which comes from userProfile)
      // ALWAYS try to get actual wallet address from provider (works in miniapp AND browser)
      let signingAddress = address as string;
      if (shouldUseFarcasterTx) {
        signingAddress = await getFarcasterWalletAddress();
        console.log('[CoinsInboxModal] Using provider address:', signingAddress, '(prop was:', address, ')');
      } else if (wagmiAddress) {
        signingAddress = wagmiAddress;
      } else {
        throw new Error("Wallet signer unavailable. Reconnect the wallet and try again.");
      }

      console.log('[CoinsInboxModal] Converting TESTVBMS to VBMS...', { amount: selectedAmount, fid: userFid });
      // 🔒 Use REST API (not Convex useAction) so mobile wallet popup fires immediately after
      const convertRes = await fetch('/api/vbms/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: signingAddress, fid: userFid, amount: selectedAmount }),
      });
      const result = await convertRes.json();
      if (!convertRes.ok) throw Object.assign(new Error(result.error || 'Conversion failed'), { data: result.error });

      toast.info("🔐 Aguardando assinatura da carteira...");

      // Prefer the live wagmi signer when available. Farcaster SDK is fallback-only.
      const txHash = shouldUseFarcasterTx
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
      toast.success(`✅ ${result.amount.toLocaleString()} coins convertidos para VBMS!`);

      // 🔄 Refetch daily limit after successful conversion
      refetchDailyLimit();
      // 🔄 Refresh profile to update TESTVBMS balance
      await Promise.all([refreshUserProfile(), refreshProfile()]);

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error: any) {
      // 📊 Detailed error logging
      console.error('[CoinsInboxModal] ❌ Conversion FAILED:', {
        error: error.message,
        errorCode: error.code,
        errorData: error.data,
        stack: error.stack,
        attemptedAmount: selectedAmount,
        dailyRemaining: dailyRemainingNum,
        address,
        useFarcasterSDK,
        shouldUseFarcasterTx,
      });

      toast.dismiss("conversion-wait");

      // ConvexError passes message via error.data; regular Error via error.message
      const rawErrMsg: string = error.data || error.message || '';

      // Check if it's a claim error code that needs translation
      if (isClaimErrorCode(rawErrMsg)) {
        const { message: translatedMsg, showSupport } = translateClaimError(rawErrMsg, lang as SupportedLanguage);
        if (showSupport) {
          toast.error(
            <div className="flex flex-col gap-1">
              <span>{translatedMsg}</span>
              <span className="text-sm opacity-80">{getSupportText(lang as SupportedLanguage)} <SupportLink /></span>
            </div>,
            { duration: 10000 }
          );
        } else {
          toast.error(translatedMsg);
        }
      } else {
        // Parse error message for user-friendly display (legacy handling)
        let userMessage = "Erro ao converter coins";
        const errMsg = rawErrMsg.toLowerCase();

        if (errMsg.includes('daily') || errMsg.includes('limit')) {
          userMessage = "Limite diário excedido no contrato. Aguarde o reset.";
        } else if (errMsg.includes('insufficient') || errMsg.includes('balance')) {
          userMessage = "Saldo insuficiente no pool do contrato.";
        } else if (errMsg.includes('signature') || errMsg.includes('sign')) {
          userMessage = "Assinatura cancelada ou inválida.";
        } else if (errMsg.includes('rejected') || errMsg.includes('denied') || errMsg.includes('user denied') || errMsg.includes('user rejected')) {
          userMessage = "Transação cancelada pelo usuário.";
        } else if (errMsg.includes('nonce')) {
          userMessage = "Nonce já usado. Tente novamente.";
        } else if (error.message) {
          userMessage = error.message;
        }

        toast.error(userMessage);
      }
    } finally {
      // 🔒 ALWAYS reset processing state
      setIsProcessing(false);
    }
  };


  // SSR check
  if (typeof window === 'undefined') return null;

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/85"
          style={{ zIndex: Z_INDEX.modal }}
          onClick={onClose}
        >
          <div
            className="relative bg-[#1E1E1E] border-4 border-black shadow-[6px_6px_0px_#000] max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Header bar - gold strip */}
        <div className="bg-[#FFD700] border-b-4 border-black px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black flex items-center justify-center border-2 border-black">
              <NextImage src="/images/icons/convert.svg" alt="Convert" width={20} height={20} className="w-5 h-5" style={{ filter: 'brightness(0) saturate(100%) invert(91%) sepia(50%) saturate(800%) hue-rotate(5deg)' }} />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-black leading-none">{t('convertTitle')}</h2>
              <p className="text-[10px] font-bold text-black/60 uppercase tracking-wider">{t('convertSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* History button */}
            <button
              onClick={() => setShowHistory(true)}
              className="w-9 h-9 bg-black text-[#FFD700] border-2 border-black flex items-center justify-center hover:bg-[#333] transition shadow-[2px_2px_0px_rgba(0,0,0,0.4)]"
              title="Histórico"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </button>
            {/* Close button */}
            <button
              onClick={onClose}
              className="w-9 h-9 text-red-500 hover:text-red-400 font-bold flex items-center justify-center transition-all text-base leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* COINS Balance */}
          <div className="bg-[#1A4A1A] border-3 border-black shadow-[3px_3px_0px_#000] p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <NextImage src="/images/icons/coins.svg" alt="Coins" width={24} height={24} className="w-6 h-6" />
              <span className="text-xs font-bold text-[#00FF85] uppercase tracking-wider">{t('convertCoins')}</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white font-mono">{testvbmsBalance.toLocaleString()}</div>
              <div className="text-[10px] text-[#00FF85]/60 font-bold uppercase">{t('convertToConvert')}</div>
            </div>
          </div>

          {/* Daily Limits */}
          <div className="bg-[#252525] border-2 border-[#444] p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#aaa] font-bold uppercase tracking-wide">{t('convertDailyLimit')}</span>
              <span className={`font-bold font-mono ${exceedsDailyLimit ? 'text-[#FF3B3B]' : 'text-[#00FF85]'}`}>
                {isLoadingLimits ? '...' : `${Number(dailyRemaining).toLocaleString()} VBMS`}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-[#666]">{t('convertResetsIn')}</span>
              <span className="text-[#aaa] font-mono">{getResetTimeString()}</span>
            </div>
            {exceedsDailyLimit && testvbmsBalance >= 100 && (
              <div className="mt-2 p-2 bg-[#FF3B3B]/20 border border-[#FF3B3B]/50 text-[10px] text-[#FF6666] text-center font-bold">
                Balance ({testvbmsBalance.toLocaleString()}) exceeds limit ({Number(dailyRemaining).toLocaleString()})
              </div>
            )}
            {isOnCooldown && (
              <div className="mt-2 p-2 bg-orange-900/40 border border-orange-500/40 text-[10px] text-orange-300 text-center font-bold">
                Cooldown: {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, '0')}
              </div>
            )}
            {limitUnavailable && (
              <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-500/40 text-[10px] text-yellow-300 text-center font-bold">
                Daily limit reached. Try again later.
              </div>
            )}
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-[#333]">
              <span className="text-[#aaa] font-bold uppercase tracking-wide">Conversions today</span>
              <span className={`font-bold font-mono ${conversionsLeft === 0 ? 'text-[#FF3B3B]' : 'text-[#00FF85]'}`}>
                {dailyConvertCountUsed}/{dailyConvertCountLimit}
              </span>
            </div>
            {conversionsLeft === 0 && (
              <div className="mt-2 p-2 bg-[#FF3B3B]/20 border border-[#FF3B3B]/50 text-[10px] text-[#FF6666] text-center font-bold">
                Daily conversion limit reached. Increase your Aura level for more.
              </div>
            )}
          </div>

          {/* DEX Info Banner */}
          <div className="bg-[#0A1628] border-2 border-[#12AAFF]/40 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#12AAFF] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span className="text-[11px] font-bold text-[#12AAFF]/80">{(t as (k: string) => string)('convertDexInfo')}</span>
            </div>
            <a
              href="/dex"
              onClick={onClose}
              className="shrink-0 px-3 py-1.5 bg-[#12AAFF] border-2 border-black text-black font-black text-[10px] uppercase tracking-wider shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all whitespace-nowrap"
            >
              {(t as (k: string) => string)('convertDexButton')} →
            </a>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
          {testvbmsBalance >= 100 ? (
              <>
                {/* Amount Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#aaa] font-bold uppercase tracking-wider">{t('convertAmountLabel')}</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={convertAmount}
                      onChange={(e) => setConvertAmount(e.target.value)}
                      placeholder="Enter amount..."
                      min="100"
                      max={Math.min(testvbmsBalance, dailyRemainingNum)}
                      className="flex-1 px-3 py-2 bg-[#2C2C2C] border-2 border-[#555] text-white text-sm focus:border-[#FFD700] focus:outline-none font-mono"
                    />
                    <button
                      onClick={() => setConvertAmount(Math.min(testvbmsBalance, dailyRemainingNum).toString())}
                      className="px-3 py-2 bg-[#FFD700] border-2 border-black text-black text-xs font-bold shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all"
                    >
                      {t('convertMax')}
                    </button>
                  </div>
                  {exceedsBalance && <p className="text-[#FF3B3B] text-xs font-bold">Exceeds balance ({testvbmsBalance.toLocaleString()})</p>}
                  {exceedsDailyLimit && !exceedsBalance && <p className="text-[#FF3B3B] text-xs font-bold">Exceeds daily limit ({Math.floor(dailyRemainingNum).toLocaleString()})</p>}
                </div>
                {/* Convert Button */}
                <button
                  onClick={handleConvertTESTVBMS}
                  disabled={!canConvertTESTVBMS || isProcessing}
                  className={`w-full py-3 px-4 font-bold text-sm flex items-center justify-between transition-all ${
                    canConvertTESTVBMS
                      ? 'bg-[#FFD700] border-3 border-black text-black shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000]'
                      : 'bg-[#333] border-2 border-[#555] text-[#666] cursor-not-allowed'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <NextImage src="/images/icons/convert.svg" alt="" width={16} height={16} className="w-4 h-4" style={{ filter: 'brightness(0)' }} />
                    {t('convertButton')} {selectedAmount > 0 ? selectedAmount.toLocaleString() : '0'} → VBMS
                  </span>
                  <span className="text-[10px] bg-black text-[#FFD700] border border-[#FFD700] px-2 py-0.5 font-mono font-bold">Gas</span>
                </button>
              </>
            ) : (
              <div className="text-center py-4 bg-[#252525] border-2 border-[#444]">
                <p className="text-[#aaa] text-xs font-bold">{t('convertMinRequired')}</p>
              </div>
            )
          }


          {/* Stuck pending conversion — show info only, auto-recovered on modal open after 30min */}
          {stuckPending > 0 && !canRecover && (
            <div className="mt-3 border-2 border-[#555] bg-[#1a1a1a] p-3">
              <p className="text-white font-bold text-xs mb-1">
                {stuckPending.toLocaleString()} coins pending conversion
              </p>
              <p className="text-[#888] text-[11px]">
                Auto-recovery in {Math.ceil((30 * 60 * 1000 - (Date.now() - stuckTimestamp)) / 60000)} min
                — transaction may still confirm
              </p>
            </div>
          )}

          </div>
        </div>
          </div>
        </div>,
        document.querySelector('[data-phone-body]') || document.body
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
