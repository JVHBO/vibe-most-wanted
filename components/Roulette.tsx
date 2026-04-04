'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAccount, usePublicClient, useSignMessage } from 'wagmi';
import { AudioManager } from '@/lib/audio-manager';
import { useClaimVBMS } from '@/lib/hooks/useVBMSContracts';
import { toast } from 'sonner';
import { sdk } from '@farcaster/miniapp-sdk';
import haptics from '@/lib/haptics';
import { CONTRACTS, POOL_ABI } from '@/lib/contracts';
import { encodeFunctionData, parseEther, erc20Abi } from 'viem';
import { dataSuffix as ATTRIBUTION_SUFFIX, BUILDER_CODE } from '@/lib/hooks/useWriteContractWithAttribution';
import { useLanguage } from '@/contexts/LanguageContext';
import { useArbValidator, ARB_CLAIM_TYPE } from '@/lib/hooks/useArbValidator';
import { isMiniappMode, isWarpcastClient } from '@/lib/utils/miniapp';


// Roulette translations
const rouletteTranslations = {
  en: {
    title: "Daily Roulette",
    connectWallet: "Connect wallet to spin!",
    testMode: "Test Mode (unlimited spins)",
    spinsRemaining: "Spins remaining",
    noSpinsToday: "No spins today",
    freeSpin: "1 free spin",
    vibefidBonus: "+2 VibeFID",
    spin: "SPIN",
    spinning: "Spinning...",
    youWon: "You won",
    vbms: "VBMS",
    claim: "Claim",
    claiming: "Claiming...",
    spinAgain: "Spin Again",
    close: "Close",
    shareWin: "Share Win",
    alreadySpun: "Already spun today",
    error: "Error",
    paidSpin: "Buy Spin",
    paidSpinCost: "coins",
    notEnoughCoins: "Not enough coins",
    buyingPaidSpin: "Buying...",
  },
  "pt-BR": {
    title: "Roleta Diaria",
    connectWallet: "Conecte a carteira para girar!",
    testMode: "Modo Teste (spins ilimitados)",
    spinsRemaining: "Spins restantes",
    noSpinsToday: "Sem spins hoje",
    freeSpin: "1 spin gratis",
    vibefidBonus: "+2 VibeFID",
    spin: "GIRAR",
    spinning: "Girando...",
    youWon: "Voce ganhou",
    vbms: "VBMS",
    claim: "Resgatar",
    claiming: "Resgatando...",
    spinAgain: "Girar Novamente",
    close: "Fechar",
    shareWin: "Compartilhar",
    alreadySpun: "Ja girou hoje",
    error: "Erro",
    paidSpin: "Купить Спин",
    paidSpinCost: "coins",
    notEnoughCoins: "Недостаточно монет",
    buyingPaidSpin: "Покупаю...",
  },
  es: {
    title: "Ruleta Diaria",
    connectWallet: "Conecta tu wallet para girar!",
    testMode: "Modo Prueba (spins ilimitados)",
    spinsRemaining: "Spins restantes",
    noSpinsToday: "Sin spins hoy",
    freeSpin: "1 spin gratis",
    vibefidBonus: "+2 VibeFID",
    spin: "GIRAR",
    spinning: "Girando...",
    youWon: "Ganaste",
    vbms: "VBMS",
    claim: "Reclamar",
    claiming: "Reclamando...",
    spinAgain: "Girar de Nuevo",
    close: "Cerrar",
    shareWin: "Compartir",
    alreadySpun: "Ya giraste hoy",
    error: "Error",
    paidSpin: "Comprar Spin",
    paidSpinCost: "coins",
    notEnoughCoins: "Coins insuficientes",
    buyingPaidSpin: "Comprando...",
  },
  ru: {
    title: "Ежедневная Рулетка",
    connectWallet: "Подключите кошелек!",
    testMode: "Тестовый режим (безлимит)",
    spinsRemaining: "Осталось спинов",
    noSpinsToday: "Нет спинов сегодня",
    freeSpin: "1 бесплатный спин",
    vibefidBonus: "+2 VibeFID",
    spin: "КРУТИТЬ",
    spinning: "Кручу...",
    youWon: "Вы выиграли",
    vbms: "VBMS",
    claim: "Забрать",
    claiming: "Забираю...",
    spinAgain: "Крутить снова",
    close: "Закрыть",
    shareWin: "Поделиться",
    alreadySpun: "Уже крутили сегодня",
    error: "Ошибка",
    paidSpin: "स्पिन खरीदें",
    paidSpinCost: "coins",
    notEnoughCoins: "पर्याप्त coins नहीं",
    buyingPaidSpin: "खरीद रहा है...",
  },
  hi: {
    title: "दैनिक रूलेट",
    connectWallet: "स्पिन के लिए वॉलेट कनेक्ट करें!",
    testMode: "टेस्ट मोड (असीमित स्पिन)",
    spinsRemaining: "बाकी स्पिन",
    noSpinsToday: "आज कोई स्पिन नहीं",
    freeSpin: "1 फ्री स्पिन",
    vibefidBonus: "+2 VibeFID",
    spin: "स्पिन",
    spinning: "स्पिन हो रहा है...",
    youWon: "आपने जीता",
    vbms: "VBMS",
    claim: "क्लेम",
    claiming: "क्लेम हो रहा है...",
    spinAgain: "फिर से स्पिन",
    close: "बंद करें",
    shareWin: "शेयर करें",
    alreadySpun: "आज पहले से स्पिन किया",
    error: "त्रुटि",
    paidSpin: "购买旋转",
    paidSpinCost: "coins",
    notEnoughCoins: "coins不足",
    buyingPaidSpin: "购买中...",
  },
  "zh-CN": {
    title: "每日轮盘",
    connectWallet: "连接钱包开始转盘!",
    testMode: "测试模式 (无限次)",
    spinsRemaining: "剩余次数",
    noSpinsToday: "今日已无次数",
    freeSpin: "1次免费",
    vibefidBonus: "+2 VibeFID",
    spin: "转",
    spinning: "转动中...",
    youWon: "你赢了",
    vbms: "VBMS",
    claim: "领取",
    claiming: "领取中...",
    spinAgain: "再转一次",
    close: "关闭",
    shareWin: "分享",
    alreadySpun: "今日已转",
    error: "错误",
    paidSpin: "Beli Spin",
    paidSpinCost: "coins",
    notEnoughCoins: "Koin tidak cukup",
    buyingPaidSpin: "Membeli...",
  },
  id: {
    title: "Roulette Harian",
    connectWallet: "Hubungkan wallet untuk spin!",
    testMode: "Mode Test (spin unlimited)",
    spinsRemaining: "Spin tersisa",
    noSpinsToday: "Tidak ada spin hari ini",
    freeSpin: "1 spin gratis",
    vibefidBonus: "+2 VibeFID",
    spin: "PUTAR",
    spinning: "Memutar...",
    youWon: "Kamu menang",
    vbms: "VBMS",
    claim: "Klaim",
    claiming: "Mengklaim...",
    spinAgain: "Putar Lagi",
    close: "Tutup",
    shareWin: "Bagikan",
    alreadySpun: "Sudah spin hari ini",
    error: "Error",
    paidSpin: "Comprar Spin",
    paidSpinCost: "coins",
    notEnoughCoins: "Coins insuficientes",
    buyingPaidSpin: "Comprando...",
  },
  fr: {
    title: "Roulette Quotidienne",
    connectWallet: "Connectez votre wallet!",
    testMode: "Mode Test (spins illimités)",
    spinsRemaining: "Spins restants",
    noSpinsToday: "Plus de spins aujourd'hui",
    freeSpin: "1 spin gratuit",
    vibefidBonus: "+2 VibeFID",
    spin: "TOURNER",
    spinning: "Tourne...",
    youWon: "Vous avez gagné",
    vbms: "VBMS",
    claim: "Réclamer",
    claiming: "Réclamation...",
    spinAgain: "Rejouer",
    close: "Fermer",
    shareWin: "Partager",
    alreadySpun: "Déjà joué aujourd'hui",
    error: "Erreur",
    paidSpin: "Acheter Spin",
    paidSpinCost: "coins",
    notEnoughCoins: "Coins insuffisants",
    buyingPaidSpin: "Achat en cours...",
  },
  ja: {
    title: "デイリールーレット",
    connectWallet: "ウォレットを接続してスピン!",
    testMode: "テストモード (無制限)",
    spinsRemaining: "残りスピン",
    noSpinsToday: "本日のスピンなし",
    freeSpin: "1回無料",
    vibefidBonus: "+2 VibeFID",
    spin: "スピン",
    spinning: "回転中...",
    youWon: "獲得",
    vbms: "VBMS",
    claim: "請求",
    claiming: "請求中...",
    spinAgain: "もう一度",
    close: "閉じる",
    shareWin: "シェア",
    alreadySpun: "本日スピン済み",
    error: "エラー",
    paidSpin: "スピン購入",
    paidSpinCost: "coins",
    notEnoughCoins: "コイン不足",
    buyingPaidSpin: "購入中...",
  },
  it: {
    title: "Roulette Giornaliera",
    connectWallet: "Connetti wallet per girare!",
    testMode: "Modalità Test (giri illimitati)",
    spinsRemaining: "Giri rimanenti",
    noSpinsToday: "Nessun giro oggi",
    freeSpin: "1 giro gratis",
    vibefidBonus: "+2 VibeFID",
    spin: "GIRA",
    spinning: "Girando...",
    youWon: "Hai vinto",
    vbms: "VBMS",
    claim: "Riscuoti",
    claiming: "Riscuotendo...",
    spinAgain: "Gira Ancora",
    close: "Chiudi",
    shareWin: "Condividi",
    alreadySpun: "Già girato oggi",
    error: "Errore",
    paidSpin: "Compra Spin",
    paidSpinCost: "coins",
    notEnoughCoins: "Coins insufficienti",
    buyingPaidSpin: "Acquistando...",
  },
};

const PRIZES = [
  { amount: 100,   label: "100", color: "#111111", image: "https://ipfs.filebase.io/ipfs/QmeLCtF8Ytq7FKKzY5r9AiYCwQPzxtvfYz1GPGvfRHAL2U" }, // Black
  { amount: 500,   label: "500", color: "#8B0000", image: "https://ipfs.filebase.io/ipfs/QmaWpsAeMKMC796hRUtmKWfs2gnqpDNo2YpnKFxi8bK9oq" }, // Red
  { amount: 1000,  label: "1K",  color: "#111111", image: "https://ipfs.filebase.io/ipfs/QmZxc6QK1mPkVLha4Kr1Bh3bwQX351998TsJ3MxoWL8Av5" }, // Black
  { amount: 10000, label: "10K", color: "#8B0000", image: "https://ipfs.filebase.io/ipfs/QmTCd36KKyTSbY3NRrewz8NzdcRAAg3zBQnhfudgAVkyWd" }, // Red
  { amount: 50000, label: "50K", color: "#1a5c1a", image: "https://ipfs.filebase.io/ipfs/QmdjNEN5URcfQtyG4VWMBjGcsFm8FXYMm56uL3qyB6jZNF" }, // Green jackpot
];

const SEGMENT_COUNT = PRIZES.length;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

interface RouletteProps {
  onClose?: () => void;
  pfpUrl?: string;
  onChainChange?: (chain: 'base' | 'arbitrum') => void;
}

export function Roulette({ onClose, pfpUrl, onChainChange }: RouletteProps) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { lang } = useLanguage();
  const { validateOnArb } = useArbValidator();
  const publicClient = usePublicClient({ chainId: CONTRACTS.CHAIN_ID });
  const t = rouletteTranslations[lang as keyof typeof rouletteTranslations] || rouletteTranslations.en;
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ prize: number; index: number } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);
  const lastTickSegment = useRef<number>(-1);
  const animationRef = useRef<number | null>(null);
  const idleRafRef = useRef<number | null>(null);
  const spinActiveRef = useRef(false);

  const canSpinData = useQuery(
    api.roulette.canSpin,
    address ? { address } : "skip"
  );
  const profileDashboard = useQuery(
    api.profiles.getProfileDashboard,
    address ? { address: address.toLowerCase() } : "skip"
  );
  const spinMutation = useMutation(api.roulette.spin);
  const recordPaidSpinMutation = useMutation(api.roulette.recordPaidSpin);
  const setPreferredChainMutation = useMutation(api.missions.setPreferredChain);
  const canBuyPaidSpinData = useQuery(
    api.roulette.canBuyPaidSpin,
    address ? { address } : "skip"
  );
  const paidSpinCostData = useQuery(api.roulette.getPaidSpinCost);
  const prepareClaimAction = useAction(api.roulette.prepareRouletteClaim);
  const recordClaimMutation = useMutation(api.roulette.recordRouletteClaim);
  const releaseClaimLockMutation = useMutation(api.roulette.releaseRouletteClaimLock);
  const { claimVBMS, isPending: isClaimPending } = useClaimVBMS();

  const canSpin = canSpinData?.canSpin ?? false;
  const spinsRemaining = canSpinData?.spinsRemaining ?? 0;
  const isVibeFidHolder = canSpinData?.isVibeFidHolder ?? false;
  const isArbMode = canSpinData?.isArbMode ?? false;
  const [isClaiming, setIsClaiming] = useState(false);
  const [isBuyingPaidSpin, setIsBuyingPaidSpin] = useState(false);
  const [ballSettling, setBallSettling] = useState(false);
  const ballOrbitAngleRef = useRef(-90); // degrees; -90 = top of wheel
  const ballOrbitRadiusRef = useRef(136); // pixels from center (300px wheel)
  const ballFallStartAngleRef = useRef<number | null>(null); // angle recorded at fall-phase start
  const [ballOrbit, setBallOrbit] = useState({ angle: -90, radius: 136 });
  const [useFarcasterSDK, setUseFarcasterSDK] = useState(false);
  const [ballY, setBallY] = useState(0);
  const [isDraggingBall, setIsDraggingBall] = useState(false);
  const dragStartYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const ballYRef = useRef(0);
  const canSpinRef = useRef(false);
  const isSpinningRef = useRef(false);
  const [arbSupported, setArbSupported] = useState(false);

  const [localChain, setLocalChain] = useState<'base' | 'arbitrum'>('arbitrum');
  useEffect(() => {
    const c = (profileDashboard as any)?.preferredChain;
    if (c) setLocalChain(c);
  }, [(profileDashboard as any)?.preferredChain]);
  const currentChain = localChain;

  useEffect(() => {
    if (!isMiniappMode()) { setArbSupported(true); return; }
    const checkArb = async () => {
      try {
        const ctx = await sdk.context;
        setArbSupported(isWarpcastClient(ctx?.client?.clientFid));
      } catch { setArbSupported(false); }
    };
    const timer = setTimeout(checkArb, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSwitchChain = async (chain: 'base' | 'arbitrum') => {
    setLocalChain(chain);
    if (!address) return;
    try { await setPreferredChainMutation({ address, chain }); }
    catch (e) { console.error('Failed to switch chain:', e); }
  };

  useEffect(() => { onChainChange?.(currentChain); }, [currentChain]); // eslint-disable-line

  // Check for Farcaster SDK
  useEffect(() => {
    const checkFarcasterSDK = async () => {
      if (sdk && typeof sdk.wallet !== 'undefined') {
        const provider = await sdk.wallet.getEthereumProvider();
        if (provider) {
          setUseFarcasterSDK(true);
        }
      }
    };
    checkFarcasterSDK();
  }, []);

  // Helper function to claim via Farcaster SDK
  const claimViaFarcasterSDK = async (amount: string, nonce: string, signature: string, walletAddress?: string) => {
    const provider = await sdk.wallet.getEthereumProvider();
    if (!provider) throw new Error("Farcaster wallet not available");

    const data = encodeFunctionData({
      abi: POOL_ABI,
      functionName: 'claimVBMS',
      args: [parseEther(amount), nonce as `0x${string}`, signature as `0x${string}`],
    });

    const dataSuffix = ATTRIBUTION_SUFFIX;
    const dataWithBuilderCode = (data + dataSuffix.slice(2)) as `0x${string}`;

    // Force Base chain — claim contract is on Base only
    const BASE_CHAIN_ID_HEX = '0x2105'; // 8453
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_ID_HEX }],
      });
    } catch (switchError: any) {
      console.warn('[Roulette] Could not switch chain:', switchError?.message);
    }

    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: (walletAddress || address) as `0x${string}`,
        to: CONTRACTS.VBMSPoolTroll,
        data: dataWithBuilderCode,
      }],
    });

    return txHash;
  };

  const waitForBaseReceipt = useCallback(async (txHash: string, errorMessage: string) => {
    if (!publicClient) {
      throw new Error("Base public client unavailable");
    }

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
      confirmations: 1,
      pollingInterval: 1000,
      timeout: 60_000,
    });

    if (receipt.status !== 'success') {
      throw new Error(errorMessage);
    }

    return receipt;
  }, [publicClient]);

  // CLAIM handler - ALL prizes use blockchain TX
  const handleClaim = async () => {
    if (!address || !result || isClaiming) return;

    let signingAddress = address;
    let preparedSpinId: Id<"rouletteSpins"> | null = null;
    let txSubmitted = false;

    setIsClaiming(true);
    try {
      toast.info("🔐 Preparing blockchain claim...");

      // 1. Get actual signing address — ALWAYS try eth_accounts first (works in miniapp AND browser)
      try {
        const provider = await sdk.wallet.getEthereumProvider();
        if (provider) {
          const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
          if (accounts && accounts.length > 0) {
            signingAddress = accounts[0] as `0x${string}`;
            console.log('[Roulette] Using provider address:', signingAddress, '(useAccount was:', address, ')');
          }
        }
      } catch (e) {
        console.warn('[Roulette] Could not get provider address, using useAccount:', address);
      }

      // 2. Prove wallet ownership — cached daily so user only signs once per day
      const dayTimestamp = Math.floor(Date.now() / 86400000);
      const proofCacheKey = `vmw_roulette_proof_${signingAddress.toLowerCase()}_${dayTimestamp}`;
      let ownershipProof = localStorage.getItem(proofCacheKey);
      if (!ownershipProof) {
        toast.info("🔐 Prove wallet ownership (once per day)...");
        const ownershipMessage = `VMW Roulette Daily - ${signingAddress.toLowerCase()} - ${dayTimestamp}`;
        ownershipProof = await signMessageAsync({ message: ownershipMessage });
        localStorage.setItem(proofCacheKey, ownershipProof);
      }

      // 3. Get signature from backend using actual wallet address
      const claimData = await prepareClaimAction({ address: signingAddress, ownershipProof, timestamp: dayTimestamp });
      preparedSpinId = claimData.spinId;

      toast.info("🔐 Sign the transaction...");

      // 3. Send blockchain TX
      const txHash = useFarcasterSDK
        ? await claimViaFarcasterSDK(
            claimData.amount.toString(),
            claimData.nonce,
            claimData.signature,
            signingAddress
          )
        : await claimVBMS(
            claimData.amount.toString(),
            claimData.nonce as `0x${string}`,
            claimData.signature as `0x${string}`
          );
      txSubmitted = true;

      toast.loading("⏳ Confirming on blockchain...", { id: "claim-wait" });

      await waitForBaseReceipt(txHash as string, "Claim transaction reverted");

      // 4. Record claim in backend
      await recordClaimMutation({
        address: signingAddress,
        spinId: claimData.spinId,
        txHash: txHash as string,
      });

      toast.dismiss("claim-wait");
      toast.success(`✅ ${claimData.amount.toLocaleString()} VBMS claimed!`);

      if (onClose) {
        setTimeout(() => {
          setIsClaiming(false);
          onClose();
        }, 1500);
      } else {
        setIsClaiming(false);
        setShowResult(false);
        setResult(null);
      }

    } catch (error: any) {
      if (preparedSpinId && !txSubmitted) {
        try {
          await releaseClaimLockMutation({
            address: signingAddress,
            spinId: preparedSpinId,
          });
        } catch (releaseError) {
          console.error('Failed to release roulette claim lock:', releaseError);
        }
      }
      console.error('Claim error:', error);
      toast.dismiss("claim-wait");
      toast.error(error.message || "Claim failed");
      setIsClaiming(false);
    }
  };

  // Create tick sound using Web Audio API
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const playTick = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 800 + Math.random() * 200;
      oscillator.type = 'square';

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.05);
    } catch (e) {
      // Silently fail if audio not available
    }
  }, []);

  // Idle slow rotation
  useEffect(() => {
    if (isSpinning || showResult) return;
    const step = () => {
      if (spinActiveRef.current) return;
      setRotation(r => r + 0.15);
      idleRafRef.current = requestAnimationFrame(step);
    };
    idleRafRef.current = requestAnimationFrame(step);
    return () => { if (idleRafRef.current) cancelAnimationFrame(idleRafRef.current); };
  }, [isSpinning, showResult]); // eslint-disable-line

  // Keep refs updated every render (no stale closures in drag handlers)
  canSpinRef.current = canSpin;
  isSpinningRef.current = isSpinning;

  // Ball drag handlers — all use refs so closures are always fresh
  const handleBallDragStart = useCallback((clientY: number) => {
    if (!canSpinRef.current || isSpinningRef.current) return;
    dragStartYRef.current = clientY;
    isDraggingRef.current = true;
    setIsDraggingBall(true);
  }, []); // eslint-disable-line

  const handleBallDragMove = useCallback((clientY: number) => {
    if (!isDraggingRef.current) return;
    const dy = clientY - dragStartYRef.current;
    const newY = Math.min(0, dy);
    ballYRef.current = newY;
    setBallY(newY);
  }, []); // eslint-disable-line

  const handleSpinRef = useRef<(() => void) | null>(null);

  const handleBallDragEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDraggingBall(false);
    if (ballYRef.current < -70 && canSpinRef.current && !isSpinningRef.current) {
      ballYRef.current = -260;
      setBallY(-260);
      setTimeout(() => { setBallY(0); ballYRef.current = 0; }, 900);
      handleSpinRef.current?.();
    } else {
      setBallY(0);
      ballYRef.current = 0;
    }
  }, []); // eslint-disable-line

  const handleSpin = async () => {
    if (!address || isSpinning || !canSpin) return;
    spinActiveRef.current = true;
    if (idleRafRef.current) { cancelAnimationFrame(idleRafRef.current); idleRafRef.current = null; }

    AudioManager.buttonClick();
    haptics.action(); // Haptic on spin start
    setIsSpinning(true);
    setShowResult(false);
    setResult(null);
    lastTickSegment.current = -1;

    try {
      const chain = (profileDashboard as any)?.preferredChain || "arbitrum";
      // Arb: validation TX before spin (Base doesn't need TX on spin, only on claim)
      if (chain === "arbitrum") {
        await validateOnArb(0, ARB_CLAIM_TYPE.ROULETTE_SPIN);
      }
      const response = await spinMutation({ address, chain });

      if (response.success && response.prizeIndex !== null) {
        // Calculate final rotation
        const targetIndex = response.prizeIndex;
        const spins = Math.floor(5 + Math.random() * 3); // 5, 6, or 7 FULL spins (must be integer!)

        // Target angle where segment i is at the pointer (top)
        // At R=330, segment 0 center is at pointer
        // At R=270, segment 1 center is at pointer
        // Formula: R = (SEGMENT_COUNT - targetIndex - 0.5) * SEGMENT_ANGLE
        const offset = 0.3 + Math.random() * 0.4; // 0.3 to 0.7
        const targetFinalAngle = (SEGMENT_COUNT - targetIndex - offset) * SEGMENT_ANGLE;

        // Calculate rotation needed from current position to reach target
        const currentMod = ((rotation % 360) + 360) % 360; // Current position (0-360)
        let additionalRotation = targetFinalAngle - currentMod;
        if (additionalRotation < 0) additionalRotation += 360; // Ensure positive

        const totalRotation = spins * 360 + additionalRotation;

        const expectedFinalAngle = (rotation + totalRotation) % 360;
        console.log('🎰 Roulette Debug:', {
          targetIndex,
          targetPrize: PRIZES[targetIndex].amount + ' VBMS',
          spins,
          targetFinalAngle,
          expectedFinalAngle,
          match: Math.abs(expectedFinalAngle - targetFinalAngle) < 1 ? '✅' : '❌ BUG!'
        });

        // Animate with physics + ball orbit
        const startRotation = rotation;
        const startTime = Date.now();
        const duration = 5000; // 5 seconds
        // Ball starts counter-clockwise at rim
        ballOrbitAngleRef.current = -90;
        ballOrbitRadiusRef.current = 136;
        ballFallStartAngleRef.current = null;
        setBallOrbit({ angle: -90, radius: 136 });

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Easing: cubic-bezier like deceleration
          const easeOut = 1 - Math.pow(1 - progress, 3);

          const currentRotation = startRotation + totalRotation * easeOut;
          setRotation(currentRotation);

          // Ball orbit: counter-clockwise while spinning, steers to winning slot in fall phase
          let r = 136;
          if (progress <= 0.72) {
            const speed = (1 - easeOut) * 14 + 0.8;
            ballOrbitAngleRef.current -= speed;
          } else {
            if (ballFallStartAngleRef.current === null) {
              ballFallStartAngleRef.current = ballOrbitAngleRef.current;
              playTick();
            }
            const fallP = (progress - 0.72) / 0.28;
            const easedFall = fallP * fallP;
            r = 136 - easedFall * 80; // 136 → 56
            // Steer toward -90° (top = winning slot)
            const startA = ballFallStartAngleRef.current;
            const n = Math.round((startA + 90) / 360);
            const targetAbsolute = -90 + n * 360;
            ballOrbitAngleRef.current = startA + (targetAbsolute - startA) * easedFall;
          }
          ballOrbitRadiusRef.current = r;
          setBallOrbit({ angle: ballOrbitAngleRef.current, radius: r });

          // Play tick sound when crossing segment boundary
          const normalizedRotation = currentRotation % 360;
          const currentSegment = Math.floor(normalizedRotation / SEGMENT_ANGLE);
          if (currentSegment !== lastTickSegment.current) {
            playTick();
            haptics.tick(); // Haptic on each segment
            lastTickSegment.current = currentSegment;
          }

          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
          } else {
            // Ball at winning slot — settle with bounce
            ballFallStartAngleRef.current = null;
            setBallOrbit({ angle: -90, radius: 56 });
            setIsSpinning(false); // BEFORE setBallSettling so isSettling = true
            setBallSettling(true);
            spinActiveRef.current = false;
            playTick();
            setTimeout(() => {
              setBallSettling(false);
              setResult({ prize: response.prize!, index: response.prizeIndex });
              setShowResult(true);
              AudioManager.win();
              haptics.spinResult();
              window.dispatchEvent(new CustomEvent('roulette:win'));
            }, 900);
          }
        };

        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
      }
    } catch (error) {
      console.error('Spin error:', error);
      spinActiveRef.current = false;
      setIsSpinning(false);
    }
  };

  // Keep handleSpinRef updated
  useEffect(() => { handleSpinRef.current = handleSpin; }); // eslint-disable-line

  // Handle paid spin with VBMS token transfer
  const handlePaidSpin = async () => {
    if (!address || isSpinning || isBuyingPaidSpin) return;
    if (!canBuyPaidSpinData?.canBuy) {
      toast.error(t.notEnoughCoins || 'Daily limit reached');
      return;
    }

    AudioManager.buttonClick();
    setIsBuyingPaidSpin(true);
    setShowResult(false);
    setResult(null);
    lastTickSegment.current = -1;

    try {
      toast.info("🔐 Sign transfer of 500 VBMS...");

      // 1. Transfer 500 VBMS to pool with builder code
      const transferData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [CONTRACTS.VBMSPoolTroll as `0x${string}`, parseEther('500')],
      });

      // Append builder code for Base attribution
      const dataSuffix = ATTRIBUTION_SUFFIX;
      const dataWithBuilderCode = (transferData + dataSuffix.slice(2)) as `0x${string}`;
      console.log('[Roulette] Paid spin with builder code:', BUILDER_CODE);

      let txHash: string;

      if (useFarcasterSDK) {
        const provider = await sdk.wallet.getEthereumProvider();
        if (!provider) throw new Error("Farcaster wallet not available");

        // Force Base chain — VBMS token and pool are on Base only
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x2105' }], // Base = 8453
          });
        } catch (switchError: any) {
          console.warn('[Roulette] Could not switch chain:', switchError?.message);
        }

        txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: address as `0x${string}`,
            to: CONTRACTS.VBMSToken as `0x${string}`,
            data: dataWithBuilderCode,
          }],
        }) as string;
      } else {
        // Use wagmi/viem for non-Farcaster with builder code
        const { sendTransaction } = await import('wagmi/actions');
        const { config } = await import('@/lib/wagmi');
        const result = await sendTransaction(config, {
          to: CONTRACTS.VBMSToken as `0x${string}`,
          data: dataWithBuilderCode,
        });
        txHash = result;
      }

      toast.loading("⏳ Confirming transfer...", { id: "paid-spin-tx" });

      await waitForBaseReceipt(txHash as string, "Paid spin transaction reverted");

      // 2. Record paid spin in backend
      const response = await recordPaidSpinMutation({
        address,
        txHash: txHash as string,
      });

      toast.dismiss("paid-spin-tx");

      if (!response.success) {
        toast.error(response.error || 'Failed to record spin');
        setIsBuyingPaidSpin(false);
        return;
      }

      toast.success("✅ 500 VBMS paid! Spinning...");

      // Start spinning animation
      setIsSpinning(true);
      setIsBuyingPaidSpin(false);
      haptics.action();

      // Calculate final rotation (same as free spin)
      const targetIndex = response.prizeIndex!;
      const spins = Math.floor(5 + Math.random() * 3);
      const offset = 0.3 + Math.random() * 0.4;
      const targetFinalAngle = (SEGMENT_COUNT - targetIndex - offset) * SEGMENT_ANGLE;
      const currentMod = ((rotation % 360) + 360) % 360;
      let additionalRotation = targetFinalAngle - currentMod;
      if (additionalRotation < 0) additionalRotation += 360;
      const totalRotation = spins * 360 + additionalRotation;

      // Animate + ball orbit
      const startRotation = rotation;
      const startTime = Date.now();
      const duration = 5000;
      ballOrbitAngleRef.current = -90;
      ballOrbitRadiusRef.current = 136;
      ballFallStartAngleRef.current = null;
      setBallOrbit({ angle: -90, radius: 136 });

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentRotation = startRotation + totalRotation * easeOut;
        setRotation(currentRotation);

        let r = 136;
        if (progress <= 0.72) {
          const speed = (1 - easeOut) * 14 + 0.8;
          ballOrbitAngleRef.current -= speed;
        } else {
          if (ballFallStartAngleRef.current === null) {
            ballFallStartAngleRef.current = ballOrbitAngleRef.current;
            playTick();
          }
          const fallP = (progress - 0.72) / 0.28;
          const easedFall = fallP * fallP;
          r = 136 - easedFall * 80;
          const startA = ballFallStartAngleRef.current;
          const n = Math.round((startA + 90) / 360);
          const targetAbsolute = -90 + n * 360;
          ballOrbitAngleRef.current = startA + (targetAbsolute - startA) * easedFall;
        }
        ballOrbitRadiusRef.current = r;
        setBallOrbit({ angle: ballOrbitAngleRef.current, radius: r });

        const normalizedRotation = currentRotation % 360;
        const currentSegment = Math.floor(normalizedRotation / SEGMENT_ANGLE);
        if (currentSegment !== lastTickSegment.current) {
          playTick();
          haptics.tick();
          lastTickSegment.current = currentSegment;
        }

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          ballFallStartAngleRef.current = null;
          setBallOrbit({ angle: -90, radius: 56 });
          setIsSpinning(false);
          setBallSettling(true);
          spinActiveRef.current = false;
          playTick();
          setTimeout(() => {
            setBallSettling(false);
            setResult({ prize: response.prize!, index: response.prizeIndex! });
            setShowResult(true);
            AudioManager.win();
            haptics.spinResult();
            window.dispatchEvent(new CustomEvent('roulette:win'));
          }, 900);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    } catch (error: any) {
      console.error('Paid spin error:', error);
      toast.dismiss("paid-spin-tx");
      toast.error(error.message || 'Transaction failed');
      setIsBuyingPaidSpin(false);
    }
  };


  // Create wheel segments with dividers
  const createWheelSegments = () => {
    const segments = [];

    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const startAngle = i * SEGMENT_ANGLE - 90;
      const endAngle = (i + 1) * SEGMENT_ANGLE - 90;

      const startRad = startAngle * (Math.PI / 180);
      const endRad = endAngle * (Math.PI / 180);

      const x1 = 50 + 48 * Math.cos(startRad);
      const y1 = 50 + 48 * Math.sin(startRad);
      const x2 = 50 + 48 * Math.cos(endRad);
      const y2 = 50 + 48 * Math.sin(endRad);

      const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;
      const pathD = `M 50 50 L ${x1} ${y1} A 48 48 0 ${largeArc} 1 ${x2} ${y2} Z`;

      // Text position
      const midAngle = (startAngle + endAngle) / 2;
      const midRad = midAngle * (Math.PI / 180);
      const textX = 50 + 30 * Math.cos(midRad);
      const textY = 50 + 30 * Math.sin(midRad);

      const prize = PRIZES[i] as { amount: number; label: string; color: string; image?: string };

      segments.push(
        <g key={i}>
          {/* Clip path for image segments */}
          {prize.image && (
            <defs>
              <clipPath id={`segment-clip-${i}`}>
                <path d={pathD} />
              </clipPath>
            </defs>
          )}
          {/* Segment */}
          <path d={pathD} fill={prize.color} stroke="#1a1a1a" strokeWidth="0.5" />
          {prize.image && (
            <image href={prize.image} x="0" y="0" width="100" height="100"
              clipPath={`url(#segment-clip-${i})`} preserveAspectRatio="xMidYMid slice" />
          )}
          {/* Dark overlay on image */}
          {prize.image && (
            <path d={pathD} fill="rgba(0,0,0,0.52)" stroke="none" />
          )}
          {/* Prize label */}
          <text
            x={textX} y={textY}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={prize.label.length > 2 ? 7 : 8}
            fontWeight="bold"
            fill="#FFD700"
            style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.9))' }}
            transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
          >{prize.label}</text>
        </g>
      );
    }

    // Add divider pins (the "pegs" that make the click sound)
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const angle = (i * SEGMENT_ANGLE - 90) * (Math.PI / 180);
      const pinX = 50 + 46 * Math.cos(angle);
      const pinY = 50 + 46 * Math.sin(angle);

      segments.push(
        <circle
          key={`pin-${i}`}
          cx={pinX}
          cy={pinY}
          r="2"
          fill="#FFD700"
          stroke="#1a1a1a"
          strokeWidth="0.5"
        />
      );
    }

    return segments;
  };

  if (!address) {
    return (
      <div className="bg-vintage-charcoal border-2 border-vintage-gold rounded-2xl p-6 text-center">
        <p className="text-vintage-gold">{t.connectWallet}</p>
      </div>
    );
  }

  const FALLBACK_BALL_IMG = "https://ipfs.filebase.io/ipfs/QmdjNEN5URcfQtyG4VWMBjGcsFm8FXYMm56uL3qyB6jZNF";

  return (
    <div className="relative flex flex-col flex-1" style={{ minHeight: '100%', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Chain selector — Normal / Ultra */}
      {arbSupported && (
        <div className="flex justify-center pt-3 pb-1">
          <div style={{ display:'flex', gap:'4px', background:'rgba(0,0,0,0.5)', padding:'4px', borderRadius:'10px', border:'1px solid rgba(255,215,0,0.15)' }}>
            <button
              onClick={() => handleSwitchChain('base')}
              style={{
                display:'flex', alignItems:'center', gap:'4px',
                padding:'5px 14px', borderRadius:'7px', fontSize:'11px', fontWeight:'700', letterSpacing:'0.06em',
                cursor:'pointer', border:'none',
                background: currentChain === 'base' ? '#0052FF' : 'transparent',
                color: currentChain === 'base' ? '#fff' : 'rgba(255,255,255,0.4)',
              }}
            >
              <img src="/images/base-chain.png" width="11" height="11" style={{ borderRadius:'50%', pointerEvents:'none' }} alt="" />
              Normal
            </button>
            <button
              onClick={() => handleSwitchChain('arbitrum')}
              style={{
                display:'flex', alignItems:'center', gap:'4px',
                padding:'5px 12px', borderRadius:'7px', fontSize:'11px', fontWeight:'700', letterSpacing:'0.06em',
                cursor:'pointer', border:'none',
                background: currentChain === 'arbitrum' ? '#12AAFF' : 'transparent',
                color: currentChain === 'arbitrum' ? '#000' : 'rgba(255,255,255,0.4)',
              }}
            >
              <img src="/images/arb-chain.png" width="11" height="11" style={{ borderRadius:'50%', pointerEvents:'none' }} alt="" />
              Ultra
            </button>
          </div>
        </div>
      )}
      {onClose && (
        <button onClick={onClose} className="absolute top-3 right-4 z-10 text-xl font-bold" style={{ color: 'rgba(255,215,0,0.5)' }}>×</button>
      )}


      {/* 3D Roulette wheel — just the inclined disc, no wooden container */}
      {!showResult && (
        <div className="relative mx-auto" style={{ width: '300px', height: '200px', marginTop: '8px' }}>
          <div style={{ perspective: '500px', perspectiveOrigin: '50% 5%', width: '300px', height: '300px' }}>
            {/* Clipped circle — no box-shadow (causes corner lines in 3D) */}
            <div className="relative" style={{
              width: '300px', height: '300px',
              borderRadius: '50%',
              overflow: 'hidden',
              transform: 'rotateX(48deg)',
              WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 97%, transparent 100%)',
              maskImage: 'radial-gradient(circle at 50% 50%, black 97%, transparent 100%)',
            }}>
              {/* Spinning segments fill the full circle */}
              <div ref={wheelRef} className="absolute inset-0" style={{ transform: `rotate(${rotation}deg)` }}>
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                  <circle cx="50" cy="50" r="50" fill="#0a0a0a" />
                  {createWheelSegments()}
                  {/* Gold outer ring — inside SVG, no corner artifacts */}
                  <circle cx="50" cy="50" r="48.5" fill="none" stroke="rgba(255,215,0,0.45)" strokeWidth="1.2" />
                  <circle cx="50" cy="50" r="10" fill="#1A1A1A" stroke="#FFD700" strokeWidth="2.5" />
                  <circle cx="50" cy="50" r="6"  fill="#FFD700" />
                  <circle cx="50" cy="50" r="2.5" fill="#1A1A1A" />
                </svg>
              </div>
              {/* Ball orbiting the wheel — physics-based position */}
              {(isSpinning || ballSettling) && (() => {
                const rad = ballOrbit.angle * (Math.PI / 180);
                const bx = 150 + ballOrbit.radius * Math.cos(rad); // px from left
                const by = 150 + ballOrbit.radius * Math.sin(rad); // px from top
                const isSettling = ballSettling && !isSpinning;
                const isArb = currentChain === 'arbitrum';
                const glowColor = isArb ? 'rgba(40,160,240,0.55)' : 'rgba(68,119,255,0.55)';
                const sphereGrad = isArb
                  ? 'radial-gradient(circle at 34% 28%, #d0f0ff 0%, #28a0f0 22%, #0060a8 56%, #000e1e 100%)'
                  : 'radial-gradient(circle at 34% 28%, #ccd8ff 0%, #4477ff 22%, #0030b8 56%, #00021e 100%)';
                return (
                  <>
                  {/* Segment glow — lights up the wheel where the ball is */}
                  <div style={{
                    position: 'absolute',
                    left: `${bx}px`, top: `${by}px`,
                    transform: 'translate(-50%, -50%)',
                    width: '56px', height: '56px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
                    mixBlendMode: 'screen',
                    pointerEvents: 'none',
                    zIndex: 15,
                  }} />
                  {/* Outer wrapper — handles bounce/position, no border-radius (so animation works) */}
                  <div style={{
                    position: 'absolute',
                    left: `${bx}px`, top: `${by}px`,
                    transform: 'translate(-50%, -50%)',
                    width: '22px', height: '22px',
                    zIndex: 20,
                    animation: isSettling ? 'ballBounce 0.9s ease-out forwards' : 'none',
                  }}>
                    {/* Sphere body */}
                    <div style={{
                      width: '100%', height: '100%', borderRadius: '50%', position: 'relative',
                      overflow: 'hidden',
                      background: sphereGrad,
                      boxShadow: `0 0 ${isSettling ? 22 : 10}px ${isArb ? 'rgba(40,160,240,0.9)' : 'rgba(68,119,255,0.9)'}, inset 0 2px 6px rgba(0,0,0,0.5)`,
                    }}>
                      {/* Spinning logo layer — rotateZ avoids foreshortening flicker */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: !isSettling ? 'innerSpin 0.9s linear infinite' : 'none',
                        transformOrigin: 'center',
                      }}>
                        <img src={isArb ? '/images/arb-chain.png' : '/images/base-chain.png'}
                             width="15" height="15"
                             style={{ borderRadius: '50%', opacity: 0.88, pointerEvents: 'none' }} alt="" />
                      </div>
                      {/* Specular highlight — always static on top */}
                      <div style={{ position: 'absolute', top: '8%', left: '12%', width: '30%', height: '24%', background: 'radial-gradient(ellipse, rgba(255,255,255,0.95) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
                    </div>
                  </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Result overlay */}
      {showResult && result && (
        <div className="flex flex-col items-center px-4 pt-4 pb-2 gap-3">
          {[
            [100,   "https://ipfs.filebase.io/ipfs/Qmf8tTdyMgeFSZJmYUSfKCUTtRFtsXgBzMD8WxJ1bAtyqq"],
            [500,   "https://ipfs.filebase.io/ipfs/QmTTM6dmwWieeBWv6nA9NfY7qWq8Ckt8dqdB2T5Mvtc8yR"],
            [1000,  "https://ipfs.filebase.io/ipfs/Qmb3XNDr9UtBNjKWmLALhaz7arg2d8ygZDNjtpsLBKYigT"],
            [10000, "https://ipfs.filebase.io/ipfs/QmYrLyWyeYccvowPdtdRp7BbhZLBRTkihFae3FaXcKKp38"],
            [50000, "https://ipfs.filebase.io/ipfs/QmcLDi8srKnwuTgBayiPzpgBbZFLFG8p8hdSy522EcKhnE"],
          ].map(([prize, src]) => result.prize === prize && (
            <video key={prize as number} src={src as string} autoPlay loop playsInline
              className="w-full rounded-xl object-contain" style={{ maxHeight: '44vh' }} />
          ))}
          <div className="w-full rounded-xl p-4 text-center" style={{ background: 'rgba(255,215,0,0.08)', border: '2px solid rgba(255,215,0,0.4)' }}>
            <p className="text-sm mb-1" style={{ color: 'rgba(255,215,0,0.6)' }}>{t.youWon}</p>
            <p className="text-3xl font-bold" style={{ color: '#FFD700' }}>{result.prize.toLocaleString()} VBMS</p>
          </div>
          <button
            onClick={handleClaim}
            disabled={isClaiming}
            className="rlt-claim-btn w-full py-3 font-bold text-lg rounded-xl transition-all"
          >
            {isClaiming ? t.claiming : `${t.claim} ${result.prize.toLocaleString()} VBMS`}
          </button>
        </div>
      )}

      {/* Draggable ball — fixed at bottom of viewport */}
      {!showResult && (
        <div className="fixed left-1/2 z-50 flex flex-col items-center"
          style={{ bottom: 'max(28px, env(safe-area-inset-bottom, 28px))', transform: 'translateX(-50%)' }}>
          {/* Spin counter + hint */}
          {!isSpinning && (
            <div className="mb-1 flex flex-col items-center gap-0.5">
              {(() => {
                // Mirror Convex formula: base = (vibeFID?3:1) + auraBonus, arb = base×2
                const freeBase = (isVibeFidHolder ? 3 : 1);
                const freeCount = isArbMode ? freeBase * 2 : freeBase;
                const paidCount = Math.max(0, spinsRemaining - freeCount);
                const NetworkIcon = ({ size = 14 }: { size?: number }) => (
                  <img src={currentChain === 'arbitrum' ? '/images/arb-chain.png' : '/images/base-chain.png'}
                       width={size} height={size} style={{ borderRadius: '50%', pointerEvents: 'none' }} alt="" />
                );
                return (
                  <>
                    <div className="flex items-center gap-1 mb-0.5 flex-wrap justify-center">
                      {/* Spin count */}
                      <NetworkIcon size={16} />
                      <span style={{ color: '#FFD700', fontSize: '13px', fontWeight: '800', textShadow: '0 0 8px rgba(255,215,0,0.6)', marginLeft: '2px' }}>
                        ×{spinsRemaining}
                      </span>
                      {/* ARB 2x badge */}
                      {isArbMode && (
                        <span style={{ fontSize: '9px', fontWeight: '700', color: '#12AAFF', background: 'rgba(18,170,255,0.15)', border: '1px solid rgba(18,170,255,0.4)', borderRadius: '4px', padding: '1px 4px' }}>2x</span>
                      )}
                      {/* Inline "+" buy button */}
                      {canBuyPaidSpinData?.canBuy && (
                        <button
                          onClick={handlePaidSpin}
                          disabled={isBuyingPaidSpin}
                          style={{
                            width: '22px', height: '22px', borderRadius: '50%', fontSize: '15px', fontWeight: '900',
                            color: '#FFD700', background: 'rgba(255,215,0,0.12)', border: '1.5px solid rgba(255,215,0,0.45)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0,
                            cursor: isBuyingPaidSpin ? 'wait' : 'pointer',
                          }}
                        >
                          {isBuyingPaidSpin ? '…' : '+'}
                        </button>
                      )}
                    </div>
                    {canSpin ? (
                      <div style={{ animation: 'swipeHint 1.6s ease-in-out infinite' }} className="flex flex-col items-center gap-0.5">
                        <span style={{ color: 'rgba(255,215,0,0.5)', fontSize: '16px', lineHeight: 1 }}>↑</span>
                        <span style={{ color: 'rgba(255,215,0,0.35)', fontSize: '10px', letterSpacing: '0.08em' }}>drag to throw</span>
                      </div>
                    ) : (
                      <span style={{ color: '#f87171', fontSize: '11px', marginBottom: '4px' }}>{t.noSpinsToday}</span>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          {isSpinning && (
            <p style={{ color: 'rgba(255,215,0,0.5)', fontSize: '11px', marginBottom: '6px' }}>{t.spinning}</p>
          )}

          {/* The ball */}
          <div
            style={{
              transform: `translateY(${ballY}px) translateX(0)`,
              transition: isDraggingBall ? 'none' : 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
              touchAction: 'none',
              cursor: canSpin && !isSpinning ? 'grab' : 'default',
            }}
            onTouchStart={e => { e.preventDefault(); handleBallDragStart(e.touches[0].clientY); }}
            onTouchMove={e => { e.preventDefault(); handleBallDragMove(e.touches[0].clientY); }}
            onTouchEnd={e => { e.preventDefault(); handleBallDragEnd(); }}
            onMouseDown={e => {
              e.preventDefault();
              handleBallDragStart(e.clientY);
              const onMove = (ev: MouseEvent) => { ev.preventDefault(); handleBallDragMove(ev.clientY); };
              const onUp   = () => { handleBallDragEnd(); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
            }}
            onDragStart={e => e.preventDefault()}
          >
            {/* 3D sphere — gradient body + spinning logo + specular highlight */}
            {(() => {
              const isArb = currentChain === 'arbitrum';
              const glow = Math.abs(ballY) > 55 ? 'rgba(255,215,0,0.9)' : (isArb ? `rgba(40,160,240,${0.4 + Math.abs(ballY)/120})` : `rgba(68,119,255,${0.4 + Math.abs(ballY)/120})`);
              const border = Math.abs(ballY) > 55 ? '#FFD700' : (isArb ? 'rgba(40,160,240,0.95)' : 'rgba(68,119,255,0.95)');
              return (
                <div style={{
                  width: '62px', height: '62px',
                  borderRadius: '50%', position: 'relative',
                  overflow: 'hidden',
                  border: `3px solid ${border}`,
                  boxShadow: `0 0 ${20 + Math.abs(ballY)/3}px ${glow}, 0 6px 20px rgba(0,0,0,0.9)`,
                  opacity: (isSpinning || ballSettling) ? 0.22 : 1,
                  background: isArb
                    ? 'radial-gradient(circle at 34% 28%, #d0f0ff 0%, #28a0f0 20%, #0060a8 55%, #000e1e 100%)'
                    : 'radial-gradient(circle at 34% 28%, #ccd8ff 0%, #4477ff 20%, #0030b8 55%, #00021e 100%)',
                }}>
                  {/* Logo spins on Y-axis — 3D perspective effect */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transformOrigin: 'center',
                  }}>
                    <img src={isArb ? '/images/arb-chain.png' : '/images/base-chain.png'}
                         width="44" height="44"
                         style={{ borderRadius: '50%', opacity: 0.9, pointerEvents: 'none' }} alt="" />
                  </div>
                  {/* Primary specular highlight (top-left bright spot) */}
                  <div style={{ position: 'absolute', top: '6%', left: '12%', width: '34%', height: '26%', background: 'radial-gradient(ellipse, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.3) 45%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
                  {/* Secondary reflection (bottom-right subtle) */}
                  <div style={{ position: 'absolute', bottom: '8%', right: '10%', width: '22%', height: '18%', background: 'radial-gradient(ellipse, rgba(255,255,255,0.22) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
                </div>
              );
            })()}
          </div>

          {/* hidden button for swipe-from-page compat */}
          <button data-spin-button onClick={() => { if (canSpin && !isSpinning) handleSpin(); }} style={{ display:'none' }} />

          {/* Paid spin cost hint — shows below ball when "+" is available */}
          {!isSpinning && canBuyPaidSpinData?.canBuy && paidSpinCostData && (
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px', marginTop: '2px' }}>
              +spin = {paidSpinCostData.cost} VBMS · {canBuyPaidSpinData.remaining}/{canBuyPaidSpinData.maxPaidSpins} left
            </p>
          )}
        </div>
      )}

    </div>
  );
}

export default Roulette;
