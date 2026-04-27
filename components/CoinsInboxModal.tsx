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

  // Transaction history for Recent Rewards section
  const transactionHistory = useQuery(
    api.coinsInbox.getTransactionHistory,
    address ? { address, limit: 20 } : 'skip'
  );

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

  const ICON_MAP: Record<string, { icon: string; color: string }> = {
    pve:              { icon: '⚔️', color: '#22C55E' },
    pvp:              { icon: '🎮', color: '#22C55E' },
    attack_win:       { icon: '🗡️', color: '#22C55E' },
    attack:           { icon: '🗡️', color: '#22C55E' },
    mission:          { icon: '🎯', color: '#22C55E' },
    daily_quest:      { icon: '📜', color: '#22C55E' },
    weekly_quest:     { icon: '📜', color: '#22C55E' },
    boss:             { icon: '👹', color: '#DC2626' },
    raid_boss_reward: { icon: '👹', color: '#DC2626' },
    buy_pack:         { icon: '🎴', color: '#A855F7' },
    poker_cpu:        { icon: '🃏', color: '#A855F7' },
    pvp_entry:        { icon: '🎲', color: '#DC2626' },
    leaderboard:      { icon: '🏆', color: '#FFD700' },
    blockchain:       { icon: '⛓️', color: '#00C6FF' },
    slot:             { icon: '🎰', color: '#FFD700' },
    mecha_arena:      { icon: '🎰', color: '#FFD700' },
    shame:            { icon: '🔔', color: '#C0C0C0' },
    earn:             { icon: '💰', color: '#22C55E' },
    claim:            { icon: '📥', color: '#22C55E' },
    convert:          { icon: '🔄', color: '#00C6FF' },
    spend:            { icon: '💸', color: '#DC2626' },
    bonus:            { icon: '⭐', color: '#FFD700' },
  };

  const getHistoryIcon = (type: string, source?: string) => {
    const src = source ?? '';
    const key = Object.keys(ICON_MAP).find(k => src.includes(k) || type?.includes(k));
    return ICON_MAP[key ?? 'earn'];
  };

  const timeAgo = (ts: number) => {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 bg-vintage-black flex flex-col" style={{ zIndex: 50 }}>
          <div className="flex flex-col h-full max-w-sm w-full mx-auto">

            {/* Header */}
            <div className="flex items-center bg-[#1a1a1a] border-b-4 border-black">
              <button
                onClick={onClose}
                className="bg-[#CC2222] px-4 py-4 font-modern font-bold text-sm text-white uppercase tracking-wide"
              >
                ← BACK
              </button>
              <h1 className="flex-1 text-center font-display font-black text-vintage-gold uppercase tracking-widest text-sm py-4">
                REDEEM
              </h1>
              <div className="w-[76px]" />
            </div>

            {/* Scrollable content — pt-[80px] pb-[64px] to clear fixed header and nav */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-[64px]">

              {/* Hero — claimable balance */}
              <div className="text-center rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #2d1b4e, #1E3A8A)', border: '1px solid rgba(255,215,0,0.2)' }}>
                <p className="font-modern uppercase tracking-wide text-white/40" style={{ fontSize: 9 }}>{(t as (k: string) => string)('redeemClaimableBalance')}</p>
                <p className="font-modern font-black text-vintage-gold leading-none my-1" style={{ fontSize: 32 }}>
                  {testvbmsBalance.toLocaleString()} <span style={{ fontSize: 18 }}>$VBMS</span>
                </p>
                <p className="font-modern text-purple-400" style={{ fontSize: 10 }}>
                  + {(userProfile?.stats?.aura ?? 0).toLocaleString()} Aura
                </p>
                {inboxAmount > 0 && (
                  <p className="font-modern text-vintage-gold/60 mt-2" style={{ fontSize: 10 }}>
                    +{inboxAmount.toLocaleString()} no inbox pendente
                  </p>
                )}
              </div>

              {/* Convert section — only when balance ≥ 100 */}
              {testvbmsBalance >= 100 && (
                <div className="rounded-xl p-4 space-y-3" style={{ background: '#1a1a1a', border: '1px solid rgba(255,215,0,0.15)' }}>
                  <p className="font-modern uppercase tracking-wide" style={{ fontSize: 9, color: 'rgba(255,215,0,0.5)' }}>
                    {(t as (k: string) => string)('convertTitle')} → VBMS
                  </p>
                  <div className="flex justify-between">
                    <span className="font-modern text-vintage-silver" style={{ fontSize: 10 }}>{(t as (k: string) => string)('convertDailyLimit')}</span>
                    <span className={`font-modern font-bold ${exceedsDailyLimit ? 'text-neo-attack' : 'text-neo-win'}`} style={{ fontSize: 10 }}>
                      {isLoadingLimits ? '...' : `${Number(dailyRemaining).toLocaleString()} VBMS`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-modern text-vintage-silver" style={{ fontSize: 10 }}>{(t as (k: string) => string)('convertResetsIn')}</span>
                    <span className="font-modern text-vintage-silver" style={{ fontSize: 10 }}>{getResetTimeString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={convertAmount}
                      onChange={(e) => setConvertAmount(e.target.value)}
                      placeholder={(t as (k: string) => string)('convertAmountLabel')}
                      min="100"
                      max={Math.min(testvbmsBalance, dailyRemainingNum)}
                      className="flex-1 px-3 py-2 rounded-lg text-white text-sm focus:outline-none font-modern"
                      style={{ background: '#252525', border: '1px solid #444', fontSize: 13 }}
                    />
                    <button
                      onClick={() => setConvertAmount(Math.min(testvbmsBalance, dailyRemainingNum).toString())}
                      className="px-3 py-2 rounded-lg font-modern font-bold text-black text-xs"
                      style={{ background: '#FFD700' }}
                    >
                      {(t as (k: string) => string)('convertMax')}
                    </button>
                  </div>
                  {exceedsBalance && <p className="font-modern text-neo-attack" style={{ fontSize: 10 }}>{(t as (k: string) => string)('convertMinRequired')}</p>}
                  {exceedsDailyLimit && !exceedsBalance && <p className="font-modern text-neo-attack" style={{ fontSize: 10 }}>{(t as (k: string) => string)('convertDailyLimit')} ({Math.floor(dailyRemainingNum).toLocaleString()})</p>}
                  {isOnCooldown && <p className="font-modern text-orange-400 text-center" style={{ fontSize: 10 }}>Cooldown: {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, '0')}</p>}
                  {conversionsLeft === 0 && <p className="font-modern text-neo-attack text-center" style={{ fontSize: 10 }}>Limite de conversões diárias atingido</p>}
                  <button
                    onClick={handleConvertTESTVBMS}
                    disabled={!canConvertTESTVBMS || isProcessing}
                    className="w-full py-3 rounded-lg font-modern font-black text-sm uppercase tracking-wide"
                    style={{
                      background: canConvertTESTVBMS ? '#FFD700' : '#333',
                      color: canConvertTESTVBMS ? '#000' : '#666',
                      opacity: isProcessing ? 0.7 : 1,
                      cursor: (!canConvertTESTVBMS || isProcessing) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {(t as (k: string) => string)('convertButton')} {selectedAmount > 0 ? selectedAmount.toLocaleString() : '0'} → VBMS
                  </button>
                  {stuckPending > 0 && !canRecover && (
                    <p className="font-modern text-vintage-silver text-center" style={{ fontSize: 10 }}>
                      {stuckPending.toLocaleString()} coins pendentes — recovery em {Math.ceil((30 * 60 * 1000 - (Date.now() - stuckTimestamp)) / 60000)} min
                    </p>
                  )}
                </div>
              )}

              {/* Recent Rewards */}
              <div className="space-y-2">
                <p className="font-modern uppercase tracking-wide" style={{ fontSize: 9, color: 'rgba(255,215,0,0.5)' }}>
                  {(t as (k: string) => string)('redeemRecentRewards')}
                </p>
                {transactionHistory === undefined ? (
                  <div className="text-center py-6">
                    <div className="w-6 h-6 border-2 border-vintage-gold border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : transactionHistory && transactionHistory.length > 0 ? (
                  transactionHistory.map((item: any, i: number) => {
                    const { icon, color } = getHistoryIcon(item.type, item.source);
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 rounded-xl"
                        style={{ background: '#1A1A1A', border: `1px solid ${color}20`, padding: '9px 12px' }}
                      >
                        <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-modern font-bold text-white truncate" style={{ fontSize: 12 }}>{item.description || item.type}</p>
                          <p className="font-modern" style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{timeAgo(item.createdAt ?? item.timestamp ?? Date.now())}</p>
                        </div>
                        <span className="font-modern font-bold shrink-0" style={{ fontSize: 12, color: (item.amount ?? 0) >= 0 ? '#22C55E' : '#DC2626' }}>
                          {(item.amount ?? 0) >= 0 ? '+' : ''}{(item.amount ?? 0).toLocaleString()} $VBMS
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <p style={{ fontSize: 32 }}>🎴</p>
                    <p className="font-modern mt-2" style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                      {(t as (k: string) => string)('redeemEmpty')}
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <p className="font-modern text-center py-3" style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>
              {(t as (k: string) => string)('redeemFooter')}
            </p>

          </div>
        </div>,
        document.querySelector('[data-phone-body]') || document.body
      )}

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
