'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAccount } from 'wagmi';
import { AudioManager } from '@/lib/audio-manager';
import { useClaimVBMS } from '@/lib/hooks/useVBMSContracts';
import { toast } from 'sonner';
import { sdk } from '@farcaster/miniapp-sdk';
import { CONTRACTS, POOL_ABI } from '@/lib/contracts';
import { encodeFunctionData, parseEther } from 'viem';
import { BUILDER_CODE, dataSuffix } from '@/lib/hooks/useWriteContractWithAttribution';

const PRIZES = [
  { amount: 1, label: "1", color: "#8B0000", image: "https://ipfs.filebase.io/ipfs/QmTzbEj7fpBNaTQr1CWdykNb1iwcNBW273e2bbNTruwN4e" },
  { amount: 10, label: "10", color: "#006400", image: "https://ipfs.filebase.io/ipfs/QmaWpsAeMKMC796hRUtmKWfs2gnqpDNo2YpnKFxi8bK9oq" },   // Dark green
  { amount: 100, label: "100", color: "#00008B", image: "https://ipfs.filebase.io/ipfs/QmeLCtF8Ytq7FKKzY5r9AiYCwQPzxtvfYz1GPGvfRHAL2U" }, // Dark blue
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
  const prepareClaimAction = useAction(api.roulette.prepareRouletteClaim);
  const recordClaimMutation = useMutation(api.roulette.recordRouletteClaim);
  const { claimVBMS, isPending: isClaimPending } = useClaimVBMS();

  const canSpin = canSpinData?.canSpin ?? false;
  const spinsRemaining = canSpinData?.spinsRemaining ?? 0;
  const isVibeFidHolder = canSpinData?.isVibeFidHolder ?? false;
  const [isClaiming, setIsClaiming] = useState(false);
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
  const claimViaFarcasterSDK = async (amount: string, nonce: string, signature: string) => {
    const provider = await sdk.wallet.getEthereumProvider();
    if (!provider) throw new Error("Farcaster wallet not available");

    const data = encodeFunctionData({
      abi: POOL_ABI,
      functionName: 'claimVBMS',
      args: [parseEther(amount), nonce as `0x${string}`, signature as `0x${string}`],
    });

    const dataWithBuilderCode = (data + dataSuffix.slice(2)) as `0x${string}`;

    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: address as `0x${string}`,
        to: CONTRACTS.VBMSPoolTroll,
        data: dataWithBuilderCode,
      }],
    });

    return txHash;
  };

  // CLAIM handler - ALL prizes use blockchain TX
  const handleClaim = async () => {
    if (!address || !result || isClaiming) return;

    setIsClaiming(true);
    try {
      toast.info("🔐 Preparing blockchain claim...");

      // 1. Get signature from backend
      const claimData = await prepareClaimAction({ address });

      toast.info("🔐 Sign the transaction...");

      // 2. Send blockchain TX
      const txHash = useFarcasterSDK
        ? await claimViaFarcasterSDK(
            claimData.amount.toString(),
            claimData.nonce,
            claimData.signature
          )
        : await claimVBMS(
            claimData.amount.toString(),
            claimData.nonce as `0x${string}`,
            claimData.signature as `0x${string}`
          );

      toast.loading("⏳ Confirming on blockchain...", { id: "claim-wait" });

      // 3. Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 4. Record claim in backend
      await recordClaimMutation({
        address,
        amount: claimData.amount,
        txHash: txHash as string,
      });

      toast.dismiss("claim-wait");
      toast.success(`✅ ${claimData.amount.toLocaleString()} VBMS claimed!`);

      // Close modal
      setTimeout(() => {
        onClose?.();
      }, 1500);

    } catch (error: any) {
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

  const handleShare = useCallback(async () => {
    if (!result) return;

    const text = `I just won ${result.prize.toLocaleString()} VBMS on the Roleta Diaria! Try your luck too!`;
    const url = 'https://www.vibemostwanted.xyz';

    // Try to use Farcaster SDK first
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      await sdk.actions.openUrl(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`);
    } catch {
      // Fallback to window.open
      window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`, '_blank');
    }
  }, [result]);

  const handleSpin = async () => {
    if (!address || isSpinning || !canSpin) return;

    AudioManager.buttonClick();
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
        <p className="text-vintage-gold">Connect wallet to spin!</p>
      </div>
    );
  }

  return (
    <div className={`bg-vintage-charcoal border-2 border-vintage-gold rounded-2xl p-4 mx-auto overflow-y-auto ${
      showResult ? 'w-full max-w-lg' : 'max-w-sm max-h-[90vh]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-vintage-gold font-bold text-xl">Daily Roulette</h2>
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
            <span className="text-yellow-400">Modo Teste (spins ilimitados)</span>
          ) : (
            <>
              <span className="text-vintage-ice">
                {spinsRemaining > 0 ? (
                  <>Spins restantes: <span className="text-vintage-gold font-bold">{spinsRemaining}</span></>
                ) : (
                  <span className="text-red-400">Sem spins hoje</span>
                )}
              </span>
              <span className="text-vintage-ice/50 ml-2">
                (1 free spin{isVibeFidHolder && <span className="text-purple-400"> +2 VibeFID</span>})
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
          {/* Special video for 1 VBMS prize */}
          {result.prize === 1 && (
            <video
              src="https://ipfs.filebase.io/ipfs/QmZnXW6eh76nBc9YBr3BSY3htcuCrVX9EYEvgEEqQZ6hxY"
              autoPlay
              loop
              playsInline
              className="w-full max-w-md max-h-[50vh] object-contain rounded-xl mb-3"
            />
          )}
          {/* Special video for 10 VBMS prize */}
          {result.prize === 10 && (
            <video
              src="https://ipfs.filebase.io/ipfs/QmTTM6dmwWieeBWv6nA9NfY7qWq8Ckt8dqdB2T5Mvtc8yR"
              autoPlay
              loop
              playsInline
              className="w-full max-w-md max-h-[50vh] object-contain rounded-xl mb-3"
            />
          )}
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
            <p className="text-vintage-ice text-sm mb-1">Voce ganhou</p>
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
            {isClaiming || isClaimPending ? 'RESGATANDO...' : `CLAIM ${result.prize.toLocaleString()} VBMS`}
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
            </svg>
            Compartilhar
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
            {isSpinning ? 'GIRANDO...' : canSpin ? 'GIRAR!' : 'Volte amanha!'}
          </button>

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
