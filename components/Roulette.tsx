'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAccount } from 'wagmi';
import { AudioManager } from '@/lib/audio-manager';
import { toast } from 'sonner';
import { sdk } from '@farcaster/miniapp-sdk';
import haptics from '@/lib/haptics';
import { CONTRACTS } from '@/lib/contracts';
import { encodeFunctionData, parseEther, erc20Abi } from 'viem';
import { encodeBuilderCodeSuffix, BUILDER_CODE } from '@/lib/builder-code';
import { useLanguage } from '@/contexts/LanguageContext';
import { useArbValidator, ARB_CLAIM_TYPE } from '@/lib/hooks/useArbValidator';

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
  { amount: 100, label: "100", color: "#00008B", image: "https://ipfs.filebase.io/ipfs/QmeLCtF8Ytq7FKKzY5r9AiYCwQPzxtvfYz1GPGvfRHAL2U" }, // Dark blue
  { amount: 500, label: "500", color: "#006400", image: "https://ipfs.filebase.io/ipfs/QmaWpsAeMKMC796hRUtmKWfs2gnqpDNo2YpnKFxi8bK9oq" }, // Dark green
  { amount: 1000, label: "1K", color: "#8B8B00", image: "https://ipfs.filebase.io/ipfs/QmZxc6QK1mPkVLha4Kr1Bh3bwQX351998TsJ3MxoWL8Av5" }, // Dark yellow
  { amount: 10000, label: "10K", color: "#4B0082", image: "https://ipfs.filebase.io/ipfs/QmTCd36KKyTSbY3NRrewz8NzdcRAAg3zBQnhfudgAVkyWd" }, // Indigo
  { amount: 50000, label: "50K", color: "#FFD700", image: "https://ipfs.filebase.io/ipfs/QmdjNEN5URcfQtyG4VWMBjGcsFm8FXYMm56uL3qyB6jZNF" }, // Gold
];

const SEGMENT_COUNT = PRIZES.length;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

interface RouletteProps {
  onClose?: () => void;
}

export function Roulette({ onClose }: RouletteProps) {
  const { address } = useAccount();
  const { lang } = useLanguage();
  const t = rouletteTranslations[lang as keyof typeof rouletteTranslations] || rouletteTranslations.en;
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ prize: number; index: number } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);
  const lastTickSegment = useRef<number>(-1);
  const animationRef = useRef<number | null>(null);

  const canSpinData = useQuery(
    api.roulette.canSpin,
    address ? { address } : "skip"
  );
  const spinMutation = useMutation(api.roulette.spin);
  const recordPaidSpinMutation = useMutation(api.roulette.recordPaidSpin);
  const canBuyPaidSpinData = useQuery(
    api.roulette.canBuyPaidSpin,
    address ? { address } : "skip"
  );
  const paidSpinCostData = useQuery(api.roulette.getPaidSpinCost);
  const claimSmallPrizeMutation = useMutation(api.roulette.claimSmallPrize);
  const { validateOnArb } = useArbValidator();

  const canSpin = canSpinData?.canSpin ?? false;
  const spinsRemaining = canSpinData?.spinsRemaining ?? 0;
  const isVibeFidHolder = canSpinData?.isVibeFidHolder ?? false;
  const [isClaiming, setIsClaiming] = useState(false);
  const [isBuyingPaidSpin, setIsBuyingPaidSpin] = useState(false);
  const [useFarcasterSDK, setUseFarcasterSDK] = useState(false);

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
  // CLAIM handler - prizes go to inbox + Arb validation tx
  const handleClaim = async () => {
    if (!address || !result || isClaiming) return;

    setIsClaiming(true);
    try {
      // 1. Claim to inbox via Convex
      const claimResult = await claimSmallPrizeMutation({ address });

      toast.success(`✅ ${claimResult.amount.toLocaleString()} coins adicionados ao inbox!`);

      // 2. Arb validation tx
      await validateOnArb(claimResult.amount, ARB_CLAIM_TYPE.ROULETTE_CLAIM);

      // Close modal
      setTimeout(() => {
        onClose?.();
      }, 1500);

    } catch (error: any) {
      console.error('Claim error:', error);
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

  const handleSpin = async () => {
    if (!address || isSpinning || !canSpin) return;

    AudioManager.buttonClick();
    haptics.action(); // Haptic on spin start
    setIsSpinning(true);
    setShowResult(false);
    setResult(null);
    lastTickSegment.current = -1;

    try {
      const response = await spinMutation({ address });

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

        // Animate with physics
        const startRotation = rotation;
        const startTime = Date.now();
        const duration = 5000; // 5 seconds

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Easing: cubic-bezier like deceleration
          const easeOut = 1 - Math.pow(1 - progress, 3);

          const currentRotation = startRotation + totalRotation * easeOut;
          setRotation(currentRotation);

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
            // Animation complete
            setResult({ prize: response.prize!, index: response.prizeIndex });
            setShowResult(true);
            setIsSpinning(false);
            AudioManager.win();
            haptics.spinResult(); // Heavy haptic on result

            // Validate free spin on Arbitrum
            await validateOnArb(response.prize!, ARB_CLAIM_TYPE.ROULETTE_SPIN);
          }
        };

        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
      }
    } catch (error) {
      console.error('Spin error:', error);
      setIsSpinning(false);
    }
  };

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
      const dataSuffix = encodeBuilderCodeSuffix(BUILDER_CODE);
      const dataWithBuilderCode = (transferData + dataSuffix.slice(2)) as `0x${string}`;
      console.log('[Roulette] Paid spin with builder code:', BUILDER_CODE);

      let txHash: string;

      if (useFarcasterSDK) {
        const provider = await sdk.wallet.getEthereumProvider();
        if (!provider) throw new Error("Farcaster wallet not available");

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

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 3000));

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

      // Animate
      const startRotation = rotation;
      const startTime = Date.now();
      const duration = 5000;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentRotation = startRotation + totalRotation * easeOut;
        setRotation(currentRotation);

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
          setResult({ prize: response.prize!, index: response.prizeIndex! });
          setShowResult(true);
          setIsSpinning(false);
          AudioManager.win();
          haptics.spinResult();
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
          {/* Segment with image or color */}
          {prize.image ? (
            <>
              <path
                d={pathD}
                fill={prize.color}
                stroke="#1a1a1a"
                strokeWidth="0.5"
              />
              <image
                href={prize.image}
                x="0"
                y="0"
                width="100"
                height="100"
                clipPath={`url(#segment-clip-${i})`}
                preserveAspectRatio="xMidYMid slice"
              />
              {/* Prize value label on top of image */}
              <text
                x={textX}
                y={textY}
                fill="white"
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  textShadow: '2px 2px 4px black, -2px -2px 4px black, 0 0 8px black',
                  transform: `rotate(${midAngle + 90}deg)`,
                  transformOrigin: `${textX}px ${textY}px`
                }}
              >
                {prize.label}
              </text>
            </>
          ) : (
            <>
              <path
                d={pathD}
                fill={prize.color}
                stroke="#1a1a1a"
                strokeWidth="0.5"
              />
              <text
                x={textX}
                y={textY}
                fill="white"
                fontSize="7"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  textShadow: '1px 1px 2px black, -1px -1px 2px black',
                  transform: `rotate(${midAngle + 90}deg)`,
                  transformOrigin: `${textX}px ${textY}px`
                }}
              >
                {prize.label}
              </text>
            </>
          )}
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

  return (
    <div className={`bg-vintage-charcoal border-2 border-vintage-gold rounded-2xl p-4 mx-auto overflow-y-auto ${
      showResult ? 'w-full max-w-lg' : 'max-w-sm max-h-[90vh]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-vintage-gold font-bold text-xl">{t.title}</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-vintage-gold hover:text-vintage-burnt-gold text-xl font-bold"
          >
            x
          </button>
        )}
      </div>

      {/* Spins Info */}
      {!showResult && (
        <div className="text-center mb-3 text-sm">
          {canSpinData?.testMode ? (
            <span className="text-yellow-400">{t.testMode}</span>
          ) : (
            <>
              <span className="text-vintage-ice">
                {spinsRemaining > 0 ? (
                  <>{t.spinsRemaining}: <span className="text-vintage-gold font-bold">{spinsRemaining}</span></>
                ) : (
                  <span className="text-red-400">{t.noSpinsToday}</span>
                )}
              </span>
              <span className="text-vintage-ice/50 ml-2">
                ({t.freeSpin}{isVibeFidHolder && <span className="text-purple-400"> {t.vibefidBonus}</span>})
              </span>
            </>
          )}
        </div>
      )}

      {/* Wheel Container - hide when showing result */}
      {!showResult && (
        <div className="relative w-72 h-72 mx-auto mb-4">
          {/* Outer ring decoration */}
          <div className="absolute inset-0 rounded-full border-4 border-vintage-gold shadow-gold" />

          {/* Pointer/Arrow at top */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
            <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-red-600 drop-shadow-lg"
                 style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
          </div>

          {/* Wheel */}
          <div
            ref={wheelRef}
            className="w-full h-full"
            style={{
              transform: `rotate(${rotation}deg)`,
            }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
              {/* Background circle */}
              <circle cx="50" cy="50" r="49" fill="#0C0C0C" stroke="#FFD700" strokeWidth="1" />

              {/* Segments and pins */}
              {createWheelSegments()}

              {/* Center hub */}
              <circle cx="50" cy="50" r="10" fill="#1A1A1A" stroke="#FFD700" strokeWidth="2" />
              <circle cx="50" cy="50" r="6" fill="#FFD700" />
              <text
                x="50"
                y="50"
                fill="#1A1A1A"
                fontSize="4"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                VBMS
              </text>
            </svg>
          </div>
        </div>
      )}

      {/* Result */}
      {showResult && result && (
        <div className="text-center mb-4 space-y-3">
          {/* Special video for 100 VBMS prize */}
          {result.prize === 100 && (
            <video
              src="https://ipfs.filebase.io/ipfs/Qmf8tTdyMgeFSZJmYUSfKCUTtRFtsXgBzMD8WxJ1bAtyqq"
              autoPlay
              loop
              playsInline
              className="w-full max-w-md max-h-[50vh] object-contain rounded-xl mb-3"
            />
          )}
          {/* Special video for 500 VBMS prize */}
          {result.prize === 500 && (
            <video
              src="https://ipfs.filebase.io/ipfs/QmTTM6dmwWieeBWv6nA9NfY7qWq8Ckt8dqdB2T5Mvtc8yR"
              autoPlay
              loop
              playsInline
              className="w-full max-w-md max-h-[50vh] object-contain rounded-xl mb-3"
            />
          )}
          {/* Special video for 1K VBMS prize */}
          {result.prize === 1000 && (
            <video
              src="https://ipfs.filebase.io/ipfs/Qmb3XNDr9UtBNjKWmLALhaz7arg2d8ygZDNjtpsLBKYigT"
              autoPlay
              loop
              playsInline
              className="w-full max-w-md max-h-[50vh] object-contain rounded-xl mb-3"
            />
          )}
          {/* Special video for 10K VBMS prize */}
          {result.prize === 10000 && (
            <video
              src="https://ipfs.filebase.io/ipfs/QmYrLyWyeYccvowPdtdRp7BbhZLBRTkihFae3FaXcKKp38"
              autoPlay
              loop
              playsInline
              className="w-full max-w-md max-h-[50vh] object-contain rounded-xl mb-3"
            />
          )}
          {/* Special video for 50K VBMS prize */}
          {result.prize === 50000 && (
            <video
              src="https://ipfs.filebase.io/ipfs/QmcLDi8srKnwuTgBayiPzpgBbZFLFG8p8hdSy522EcKhnE"
              autoPlay
              loop
              playsInline
              className="w-full max-w-md max-h-[50vh] object-contain rounded-xl mb-3"
            />
          )}
          <div className="bg-gradient-to-r from-vintage-gold/20 to-yellow-500/20 border-2 border-vintage-gold rounded-xl p-4">
            <p className="text-vintage-ice text-sm mb-1">{t.youWon}</p>
            <p className="text-vintage-gold text-3xl font-bold animate-pulse">
              {result.prize.toLocaleString()} VBMS
            </p>
          </div>

          {/* Claim Button */}
          <button
            onClick={handleClaim}
            disabled={isClaiming || isClaimPending}
            className={`w-full py-3 font-bold text-lg rounded-xl transition-all shadow-lg ${
              isClaiming || isClaimPending
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white'
            }`}
          >
            {isClaiming || isClaimPending ? t.claiming : `${t.claim} ${result.prize.toLocaleString()} VBMS`}
          </button>
        </div>
      )}

      {/* Spin Button - hide when showing result */}
      {!showResult && (
        <>
          <button
            onClick={handleSpin}
            disabled={isSpinning || !canSpin}
            className={`w-full py-4 rounded-xl font-bold text-xl transition-all ${
              isSpinning || !canSpin
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-vintage-gold to-yellow-500 text-black hover:from-yellow-400 hover:to-vintage-gold shadow-gold hover:shadow-gold-lg transform hover:scale-105'
            }`}
          >
            {isSpinning ? t.spinning : canSpin ? t.spin : t.noSpinsToday}
          </button>

          {/* Paid Spin Button - show when no free spins left */}
          {!canSpin && paidSpinCostData && canBuyPaidSpinData && (
            <div className="mt-3 space-y-2">
              <button
                onClick={handlePaidSpin}
                disabled={isSpinning || isBuyingPaidSpin || !canBuyPaidSpinData.canBuy}
                className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${
                  isSpinning || isBuyingPaidSpin || !canBuyPaidSpinData.canBuy
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-500 hover:to-purple-400 shadow-lg'
                }`}
              >
                {isBuyingPaidSpin ? t.buyingPaidSpin : `${t.paidSpin} (${paidSpinCostData.cost} VBMS)`}
              </button>
              <p className="text-center text-vintage-ice/50 text-xs">
                {canBuyPaidSpinData.remaining}/{canBuyPaidSpinData.maxPaidSpins} paid spins remaining today
              </p>
            </div>
          )}

          {/* Info */}
          <p className="text-center text-vintage-ice/50 text-xs mt-3">
            1 free spin per day
          </p>
        </>
      )}
    </div>
  );
}

export default Roulette;
