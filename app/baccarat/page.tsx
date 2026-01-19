"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AudioManager } from "@/lib/audio-manager";
import { useFarcasterVBMSBalance, useFarcasterTransferVBMS, useFarcasterApproveVBMS } from "@/lib/hooks/useFarcasterVBMS";
import { CONTRACTS } from "@/lib/contracts";
import { useClaimVBMS } from "@/lib/hooks/useVBMSContracts";
import { parseEther } from "viem";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useAccount } from "wagmi";
import { sdk } from "@farcaster/miniapp-sdk";
import { openMarketplace } from "@/lib/marketplace-utils";

type BetChoice = "player" | "banker" | "tie";
type GamePhase = "betting" | "dealing" | "result";
type DepositStep = "amount" | "approving" | "transferring" | "done";
type CashoutStep = "idle" | "withdrawing" | "done" | "error";

// Betting limits to protect the pool
const BET_LIMITS = {
  MIN_BET: 1,        // Minimum bet per area
  MAX_BET: 500,      // Maximum bet per area
  MAX_TOTAL: 1000,   // Maximum total bet per round
};

// Daily play limits based on VibeFID Badge status
const DAILY_LIMITS = {
  NO_BADGE: 5,           // Players without VibeFID Badge
  WITH_BADGE: 50,        // VibeFID Badge holders
};

// Chip values and colors - vintage elegant style
const CHIP_VALUES = [1, 5, 10, 25, 100, 500];
const CHIP_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  1: { bg: "bg-vintage-silver", border: "border-gray-500", text: "text-gray-900" },
  5: { bg: "bg-vintage-wine", border: "border-red-900", text: "text-vintage-ice" },
  10: { bg: "bg-blue-900", border: "border-blue-700", text: "text-vintage-ice" },
  25: { bg: "bg-emerald-900", border: "border-emerald-700", text: "text-vintage-ice" },
  100: { bg: "bg-vintage-charcoal", border: "border-vintage-gold-dark", text: "text-vintage-gold" },
  500: { bg: "bg-vintage-purple", border: "border-purple-600", text: "text-vintage-gold" },
};

// Card suit symbols
const SUIT_SYMBOLS: Record<string, string> = {
  hearts: "\u2665",
  diamonds: "\u2666",
  clubs: "\u2663",
  spades: "\u2660",
};

// Card images mapping
const CARD_IMAGES: Record<string, string> = {
  "A_hearts": "ace hearts, anon.png", "A_diamonds": "ace diamonds, linda xied.png",
  "A_clubs": "ace clubs, vitalik jumpterin.png", "A_spades": "ace spades, jesse.png",
  "2_hearts": "2 hearts, rachel.png", "2_diamonds": "2 diamonds, claude.png",
  "2_clubs": "2 clubs, gozaru.png", "2_spades": "2 spades, ink.png",
  "3_hearts": "3 hearts, casa.png", "3_diamonds": "3 diamonds, groko.png",
  "3_clubs": "3 clubs, rizkybegitu.png", "3_spades": "3 spades, thosmur.png",
  "4_hearts": "4 hearts, brainpasta.png", "4_diamonds": "4 diamonds, gaypt.png",
  "4_clubs": "4 clubs, dan romero.png", "4_spades": "4 spades, morlacos.png",
  "5_hearts": "5 hearts, landmine.png", "5_diamonds": "5 diamonds, linux.png",
  "5_clubs": "5 clubs, joonx.png", "5_spades": "5 spades, don filthy.png",
  "6_hearts": "6 hearts, pooster.png", "6_diamonds": "6 diamonds, john porn.png",
  "6_clubs": "6 clubs, scum.png", "6_spades": "6 spades, vlady.png",
  "7_hearts": "7 hearts, smolemaru.png", "7_diamonds": "7 diamonds, ventra.png",
  "7_clubs": "7 clubs, bradymck.png", "7_spades": "7 spades, shills.png",
  "8_hearts": "8 hearts, betobutter.png", "8_diamonds": "8 diamonds, qrcodo.png",
  "8_clubs": "8 clubs, loground.png", "8_spades": "8 spades, melted.png",
  "9_hearts": "9 hearts, sartocrates.png", "9_diamonds": "9 diamonds, 0xdeployer.png",
  "9_clubs": "9 clubs, lombra jr.png", "9_spades": "9 spades, vibe intern.png",
  "10_hearts": "10 hearts, jack the sniper.png", "10_diamonds": "10 diamonds, beeper.png",
  "10_clubs": "10 clubs, horsefarts.png", "10_spades": "10 spades, jc denton.png",
  "J_hearts": "jack hearts, zurkchad.png", "J_diamonds": "jack diamonds, slaterg.png",
  "J_clubs": "jack clubs, brian armstrong.png", "J_spades": "jack spades, nftkid.png",
  "Q_hearts": "queen hearts, antonio.png", "Q_diamonds": "queen diamonds, goofy romero.png",
  "Q_clubs": "queen clubs, tukka.png", "Q_spades": "queen spades, chilipepper.png",
  "K_hearts": "king hearts, miguel.png", "K_diamonds": "king diamonds, naughty santa.png",
  "K_clubs": "king clubs, ye.png", "K_spades": "king spades, nico.png",
};

const getCardImageUrl = (rank: string, suit: string) => {
  if (!rank || !suit) {
    console.warn('[Baccarat] Card missing rank or suit:', { rank, suit });
    return null;
  }
  const key = `${rank}_${suit}`;
  const filename = CARD_IMAGES[key];
  if (!filename) {
    console.warn('[Baccarat] No image found for key:', key);
    return null;
  }
  // Encode the full filename for URL compatibility
  return `/images/baccarat/${encodeURIComponent(filename)}`;
};

const getBaccaratValue = (rank: string): number => {
  if (rank === 'A') return 1;
  if (['10', 'J', 'Q', 'K'].includes(rank)) return 0;
  return parseInt(rank) || 0;
};

// Calculate hand value for display (sum mod 10)
const calculateHandValue = (cards: { rank: string }[]): number => {
  const sum = cards.reduce((acc, card) => acc + getBaccaratValue(card.rank), 0);
  return sum % 10;
};

// Calculate raw sum (before mod 10) for display
const calculateRawSum = (cards: { rank: string }[]): number => {
  return cards.reduce((acc, card) => acc + getBaccaratValue(card.rank), 0);
};

// Chip component
function Chip({ value, size = "md", selected = false, onClick, stacked = false }: {
  value: number;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  onClick?: () => void;
  stacked?: boolean;
}) {
  const colors = CHIP_COLORS[value] || CHIP_COLORS[1];
  const sizeClasses = {
    sm: "w-8 h-8 text-[10px]",
    md: "w-12 h-12 text-sm",
    lg: "w-14 h-14 text-base",
  };

  return (
    <div
      onClick={onClick}
      className={`
        ${sizeClasses[size]} ${colors.bg} ${colors.text}
        rounded-full border-4 ${colors.border}
        flex items-center justify-center font-bold
        shadow-lg cursor-pointer
        transition-all duration-200
        ${selected ? "ring-2 ring-vintage-gold ring-offset-2 ring-offset-vintage-charcoal scale-110" : "hover:scale-105"}
        ${stacked ? "absolute" : ""}
      `}
      style={stacked ? { boxShadow: "0 2px 4px rgba(0,0,0,0.5)" } : {}}
    >
      {value}
    </div>
  );
}

// Stacked chips display
function ChipStack({ total, small = false }: { total: number; small?: boolean }) {
  if (total === 0) return null;

  // Break down total into chips
  const chips: number[] = [];
  let remaining = total;
  const values = [...CHIP_VALUES].reverse();

  for (const v of values) {
    while (remaining >= v && chips.length < 5) {
      chips.push(v);
      remaining -= v;
    }
  }

  return (
    <div className="relative" style={{ height: small ? 32 : 48, width: small ? 32 : 48 }}>
      {chips.slice(0, 5).map((v, i) => (
        <div
          key={i}
          className={`absolute ${small ? "w-8 h-8" : "w-12 h-12"}`}
          style={{ bottom: i * 3, left: 0 }}
        >
          <div className={`
            w-full h-full rounded-full border-4
            ${CHIP_COLORS[v].bg} ${CHIP_COLORS[v].border}
            flex items-center justify-center
            ${small ? "text-[8px]" : "text-xs"} font-bold ${CHIP_COLORS[v].text}
            shadow-md
          `}>
            {i === chips.length - 1 ? total : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

// Card component
function Card({ card, delay = 0, revealed = true, small = false }: { card: any; delay?: number; revealed?: boolean; small?: boolean }) {
  const [isFlipped, setIsFlipped] = useState(!revealed);
  const [imgError, setImgError] = useState(false);
  const imgUrl = getCardImageUrl(card.rank, card.suit);
  const baccaratValue = getBaccaratValue(card.rank);
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  useEffect(() => {
    if (revealed && delay > 0) {
      const timer = setTimeout(() => setIsFlipped(false), delay);
      return () => clearTimeout(timer);
    } else if (revealed) {
      setIsFlipped(false);
    }
  }, [revealed, delay]);

  const sizeClass = small ? "w-10 h-14" : "w-14 h-20 sm:w-16 sm:h-24";
  const showImage = imgUrl && !imgError;

  return (
    <div className={`relative ${sizeClass} transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''}`} style={{ perspective: '1000px' }}>
      <div className={`absolute inset-0 rounded-lg shadow-xl border-2 border-vintage-gold/50 overflow-hidden transition-all duration-500 ${isFlipped ? 'opacity-0' : 'opacity-100'}`}>
        {showImage ? (
          <img
            src={imgUrl}
            alt={`${card.rank} ${card.suit}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.warn('[Baccarat] Image failed to load:', imgUrl);
              setImgError(true);
            }}
          />
        ) : (
          <div className="w-full h-full bg-white flex flex-col items-center justify-center">
            <span className={`${small ? "text-sm" : "text-lg"} font-bold ${isRed ? "text-red-500" : "text-black"}`}>{card.rank}</span>
            <span className={`${small ? "text-lg" : "text-2xl"} ${isRed ? "text-red-500" : "text-black"}`}>{SUIT_SYMBOLS[card.suit]}</span>
          </div>
        )}
        <div className="absolute top-0 left-0 bg-black/80 px-1 py-0.5 rounded-br-md flex flex-col items-center leading-none">
          <span className={`${small ? "text-[8px]" : "text-xs"} font-bold ${isRed ? 'text-red-400' : 'text-white'}`}>{card.rank}</span>
          <span className={`${small ? "text-[6px]" : "text-[10px]"} ${isRed ? 'text-red-400' : 'text-white'}`}>{SUIT_SYMBOLS[card.suit]}</span>
        </div>
        <div className="absolute bottom-0 right-0 bg-vintage-gold px-1.5 py-0.5 rounded-tl-md">
          <span className={`${small ? "text-[8px]" : "text-xs"} font-bold text-black`}>{baccaratValue}</span>
        </div>
      </div>
      <div className={`absolute inset-0 rounded-lg bg-gradient-to-br from-red-800 to-red-950 border-2 border-vintage-gold/50 flex items-center justify-center transition-all duration-500 ${isFlipped ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-vintage-gold text-xl font-bold">V</span>
      </div>
    </div>
  );
}

export default function BaccaratPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { userProfile } = useProfile();
  const { address } = useAccount();
  const soundEnabled = true;
  const [isInFarcaster, setIsInFarcaster] = useState(false);

  // Detect Farcaster context
  useEffect(() => {
    const checkFarcaster = async () => {
      try {
        const context = await sdk.context;
        if (context?.client?.clientFid) {
          setIsInFarcaster(true);
        }
      } catch {
        setIsInFarcaster(false);
      }
    };
    checkFarcaster();
  }, []);

  // Game state
  const [gamePhase, setGamePhase] = useState<GamePhase>("betting");
  const [selectedChip, setSelectedChip] = useState<number>(10);
  const [bets, setBets] = useState<{ player: number; banker: number; tie: number }>({ player: 0, banker: 0, tie: 0 });
  const [lastBets, setLastBets] = useState<{ player: number; banker: number; tie: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameResult, setGameResult] = useState<any>(null);
  const [dealPhase, setDealPhase] = useState<number>(0); // 0=none, 1=initial4, 2=reveal, 3=player3rd, 4=banker3rd, 5=result
  const [showResultModal, setShowResultModal] = useState(false); // Full screen result modal

  // Daily limit state
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(true); // Auto-open on first visit
  const [todayPlays, setTodayPlays] = useState(0);

  // Cashout state
  const [showCashoutModal, setShowCashoutModal] = useState(false);
  const [cashoutResult, setCashoutResult] = useState<{ amount: number; profit: number; txHash?: string } | null>(null);
  const [cashoutStep, setCashoutStep] = useState<CashoutStep>("idle");
  const [cashoutError, setCashoutError] = useState<string | null>(null);

  // Minimum cashout (contract requirement)
  const MIN_CASHOUT = 100;

  // Victory and loss media (same as GamePopups)
  const VICTORY_CONFIGS = [
    { image: '/victory-1.jpg', audio: '/win-sound.mp3' },
    { image: '/victory-2.jpg', audio: '/marvin-victory.mp3' },
    { image: '/bom.jpg', audio: '/victory-sound.mp3' },
    { image: '/victory-3.jpg', audio: '/victory-3.mp3' },
  ];
  const LOSS_CONFIGS = [
    { media: 'https://preview.redd.it/ceetrhas51441.jpg?width=640&crop=smart&auto=webp&s=90022f1d648fb5c0596063c2777c656b148b8d26', isVideo: false },
    { media: '/davyjones.mp4', isVideo: true },
    { media: '/derrotanumeronsei.mp4', isVideo: true },
    { media: '/littlebird.mp4', isVideo: true },
  ];
  const [victoryConfig, setVictoryConfig] = useState(VICTORY_CONFIGS[0]);
  const [lossMedia, setLossMedia] = useState(LOSS_CONFIGS[0]);

  // Baccarat rules translations
  const baccaratRules: Record<string, { title: string; rules: string[] }> = {
    en: {
      title: "Baccarat Rules",
      rules: [
        "Card Values: A=1, 2-9=face value, 10/J/Q/K=0",
        "Score = last digit of sum (e.g., 2+9+2=13→3)",
        "Natural: 8 or 9 on first 2 cards = automatic win, no more cards",
        "Player draws 3rd card if total is 0-5, stands on 6-7",
        "Banker follows complex drawing rules based on Player's 3rd card",
        "Highest hand wins (max 9). Tie if both equal",
        "Payouts: Player 1.8x | Banker 1.7x | Tie 5x",
        "On Tie: Player/Banker bets are returned (push)"
      ]
    },
    "pt-BR": {
      title: "Regras do Baccarat",
      rules: [
        "Valores: A=1, 2-9=valor da face, 10/J/Q/K=0",
        "Pontuação = último dígito da soma (ex: 2+9+2=13→3)",
        "Natural: 8 ou 9 nas 2 primeiras cartas = vitória automática",
        "Player puxa 3ª carta se total é 0-5, para em 6-7",
        "Banker segue regras complexas baseado na 3ª carta do Player",
        "Maior mão vence (máx 9). Empate se iguais",
        "Pagamentos: Player 1.8x | Banker 1.7x | Empate 5x",
        "Em Empate: Apostas em Player/Banker são devolvidas"
      ]
    },
    es: {
      title: "Reglas del Baccarat",
      rules: [
        "Valores: A=1, 2-9=valor facial, 10/J/Q/K=0",
        "Puntuación = último dígito de la suma (ej: 2+9+2=13→3)",
        "Natural: 8 o 9 en las primeras 2 cartas = victoria automática",
        "Player toma 3ª carta si total es 0-5, se planta en 6-7",
        "Banker sigue reglas complejas según la 3ª carta del Player",
        "La mano más alta gana (máx 9). Empate si iguales",
        "Pagos: Player 1.8x | Banker 1.7x | Empate 5x",
        "En Empate: Apuestas en Player/Banker se devuelven"
      ]
    },
    hi: {
      title: "बाकारा नियम",
      rules: [
        "कार्ड मान: A=1, 2-9=अंकित मान, 10/J/Q/K=0",
        "स्कोर = योग का अंतिम अंक (उदा: 2+9+2=13→3)",
        "नेचुरल: पहले 2 कार्डों में 8 या 9 = स्वचालित जीत",
        "Player 0-5 पर तीसरा कार्ड लेता है, 6-7 पर रुकता है",
        "Banker, Player के तीसरे कार्ड के आधार पर नियमों का पालन करता है",
        "सबसे ऊंचा हाथ जीतता है (अधिकतम 9)",
        "भुगतान: Player 1.8x | Banker 1.7x | टाई 5x",
        "टाई पर: Player/Banker की शर्तें वापस"
      ]
    },
    ru: {
      title: "Правила Баккары",
      rules: [
        "Значения карт: A=1, 2-9=номинал, 10/J/Q/K=0",
        "Очки = последняя цифра суммы (напр: 2+9+2=13→3)",
        "Натурал: 8 или 9 в первых 2 картах = автопобеда",
        "Player берёт 3-ю карту при 0-5, стоит при 6-7",
        "Banker следует сложным правилам по 3-й карте Player",
        "Высшая рука побеждает (макс 9). Ничья при равенстве",
        "Выплаты: Player 1.8x | Banker 1.7x | Ничья 5x",
        "При Ничьей: ставки на Player/Banker возвращаются"
      ]
    },
    "zh-CN": {
      title: "百家乐规则",
      rules: [
        "牌值: A=1, 2-9=面值, 10/J/Q/K=0",
        "点数 = 总和的个位数 (例: 2+9+2=13→3)",
        "天牌: 前2张牌为8或9 = 自动获胜",
        "闲家总和0-5时补牌，6-7不补",
        "庄家根据闲家第3张牌决定是否补牌",
        "点数高者获胜 (最高9点)。相同则和局",
        "赔率: 闲1.8倍 | 庄1.7倍 | 和5倍",
        "和局时: 闲/庄投注退还"
      ]
    },
    id: {
      title: "Aturan Baccarat",
      rules: [
        "Nilai Kartu: A=1, 2-9=nilai muka, 10/J/Q/K=0",
        "Skor = digit terakhir dari jumlah (misal: 2+9+2=13→3)",
        "Natural: 8 atau 9 di 2 kartu pertama = menang otomatis",
        "Player ambil kartu ke-3 jika total 0-5, berhenti di 6-7",
        "Banker mengikuti aturan kompleks berdasarkan kartu ke-3 Player",
        "Tangan tertinggi menang (maks 9). Seri jika sama",
        "Pembayaran: Player 1.8x | Banker 1.7x | Seri 5x",
        "Saat Seri: Taruhan Player/Banker dikembalikan"
      ]
    },
    fr: {
      title: "Règles du Baccarat",
      rules: [
        "Valeurs: A=1, 2-9=valeur faciale, 10/J/Q/K=0",
        "Score = dernier chiffre de la somme (ex: 2+9+2=13→3)",
        "Naturel: 8 ou 9 aux 2 premières cartes = victoire auto",
        "Le Player tire une 3e carte si total 0-5, reste sur 6-7",
        "Le Banker suit des règles complexes selon la 3e carte du Player",
        "La main la plus haute gagne (max 9). Égalité si égaux",
        "Paiements: Player 1.8x | Banker 1.7x | Égalité 5x",
        "En Égalité: Les paris Player/Banker sont remboursés"
      ]
    },
    ja: {
      title: "バカラのルール",
      rules: [
        "カード値: A=1, 2-9=額面, 10/J/Q/K=0",
        "スコア = 合計の下一桁 (例: 2+9+2=13→3)",
        "ナチュラル: 最初の2枚で8か9 = 自動勝利",
        "プレイヤーは0-5で3枚目を引き、6-7でスタンド",
        "バンカーはプレイヤーの3枚目に基づくルールに従う",
        "高いハンドが勝ち (最大9)。同点は引き分け",
        "配当: プレイヤー1.8倍 | バンカー1.7倍 | タイ5倍",
        "タイ時: プレイヤー/バンカーの賭けは返金"
      ]
    },
    it: {
      title: "Regole del Baccarat",
      rules: [
        "Valori: A=1, 2-9=valore facciale, 10/J/Q/K=0",
        "Punteggio = ultima cifra della somma (es: 2+9+2=13→3)",
        "Naturale: 8 o 9 nelle prime 2 carte = vittoria automatica",
        "Il Player pesca la 3ª carta se totale 0-5, sta su 6-7",
        "Il Banker segue regole complesse in base alla 3ª carta del Player",
        "La mano più alta vince (max 9). Pareggio se uguali",
        "Pagamenti: Player 1.8x | Banker 1.7x | Pareggio 5x",
        "In Pareggio: Le puntate su Player/Banker sono rimborsate"
      ]
    }
  };

  // Deposit state
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositStep, setDepositStep] = useState<DepositStep>("amount");
  const [depositAmount, setDepositAmount] = useState<string>("100");
  const [depositError, setDepositError] = useState<string | null>(null);

  // VBMS hooks
  const { balance: vbmsBalance } = useFarcasterVBMSBalance(address || '');
  const { approve } = useFarcasterApproveVBMS();
  const { transfer } = useFarcasterTransferVBMS();

  // Queries
  const convex = useConvex();
  const bettingCredits = useQuery(api.bettingCredits.getBettingCredits, address ? { address } : "skip");
  const recentHistory = useQuery(api.baccarat.getRecentHistory);

  // 🚀 BANDWIDTH FIX: Manual query with cache instead of reactive useQuery
  const [dailyPlaysCount, setDailyPlaysCount] = useState<number>(0);
  const dailyPlaysLoaded = useRef(false);

  useEffect(() => {
    if (!address || dailyPlaysLoaded.current) return;

    const fetchDailyPlays = async () => {
      try {
        const result = await convex.query(api.baccarat.getDailyPlays, { address });
        setDailyPlaysCount(result?.count || 0);
        dailyPlaysLoaded.current = true;
      } catch (e) {
        console.error("Failed to fetch daily plays:", e);
      }
    };
    fetchDailyPlays();
  }, [address, convex]);

  // Mutations
  const playPvE = useMutation(api.baccarat.playPvE);

  // Claim VBMS hook for cashout
  const { claimVBMS, isPending: isClaimPending } = useClaimVBMS();

  const credits = bettingCredits?.balance || 0;
  const totalBet = bets.player + bets.banker + bets.tie;
  const DEPOSIT_PRESETS = [100, 500, 1000, 2500];

  // Check VibeFID Badge status from profile
  const hasVibeBadge = userProfile?.hasVibeBadge || false;

  // Calculate daily limit based on VibeFID Badge
  const dailyLimit = hasVibeBadge ? DAILY_LIMITS.WITH_BADGE : DAILY_LIMITS.NO_BADGE;

  const currentPlays = dailyPlaysCount;
  const playsRemaining = Math.max(0, dailyLimit - currentPlays);
  const isLimitReached = playsRemaining === 0;

  // Place bet on area with limits
  const placeBet = (area: BetChoice) => {
    if (gamePhase !== "betting") return;
    if (credits - totalBet < selectedChip) return;

    // Check area limit
    if (bets[area] + selectedChip > BET_LIMITS.MAX_BET) {
      if (soundEnabled) AudioManager.buttonError();
      return;
    }

    // Check total limit
    if (totalBet + selectedChip > BET_LIMITS.MAX_TOTAL) {
      if (soundEnabled) AudioManager.buttonError();
      return;
    }

    setBets(prev => ({ ...prev, [area]: prev[area] + selectedChip }));
    if (soundEnabled) AudioManager.buttonClick();
  };

  // Clear all bets
  const clearBets = () => {
    setBets({ player: 0, banker: 0, tie: 0 });
    if (soundEnabled) AudioManager.buttonClick();
  };

  // Rebet last bet
  const rebet = () => {
    if (lastBets && credits >= lastBets.player + lastBets.banker + lastBets.tie) {
      setBets(lastBets);
      if (soundEnabled) AudioManager.buttonClick();
    }
  };

  // Play the round
  const handleDeal = async () => {
    if (totalBet === 0 || !address || isPlaying) return;

    // Check daily limit
    if (isLimitReached) {
      setShowLimitModal(true);
      return;
    }

    // Check minimum bet per area that has a bet
    const hasBet = (bets.player > 0 || bets.banker > 0 || bets.tie > 0);
    if (!hasBet) return;

    // Validate each area has at least MIN_BET if any bet placed
    const invalidBets = (
      (bets.player > 0 && bets.player < BET_LIMITS.MIN_BET) ||
      (bets.banker > 0 && bets.banker < BET_LIMITS.MIN_BET) ||
      (bets.tie > 0 && bets.tie < BET_LIMITS.MIN_BET)
    );
    if (invalidBets) {
      alert(`Minimum bet is ${BET_LIMITS.MIN_BET} per area`);
      return;
    }

    // Determine main bet (largest bet)
    const mainBet: BetChoice = bets.tie > bets.player && bets.tie > bets.banker ? "tie" :
                               bets.banker > bets.player ? "banker" : "player";

    setIsPlaying(true);
    setGamePhase("dealing");
    setDealPhase(0);
    setLastBets({ ...bets });

    // Play shuffle/deal sound
    if (soundEnabled) {
      AudioManager.shuffle();
    }

    try {
      const result = await playPvE({
        address,
        username: userProfile?.username || 'Player',
        betOn: mainBet,
        amount: totalBet,
        // Send individual bets for multi-area betting support
        playerBet: bets.player,
        bankerBet: bets.banker,
        tieBet: bets.tie,
      });

      // Calculate actual winnings based on conservative payouts
      // Player: 1.8x, Banker: 1.7x, Tie: 5x
      let payout = 0;
      if (result.winner === "player" && bets.player > 0) payout += Math.floor(bets.player * 1.8);
      if (result.winner === "banker" && bets.banker > 0) payout += Math.floor(bets.banker * 1.7);
      if (result.winner === "tie" && bets.tie > 0) payout += Math.floor(bets.tie * 5);
      // Push: return non-tie bets if result is tie
      if (result.winner === "tie") {
        if (bets.player > 0) payout += bets.player;
        if (bets.banker > 0) payout += bets.banker;
      }

      const hasPlayer3rd = result.playerCards?.length > 2;
      const hasBanker3rd = result.bankerCards?.length > 2;

      setGameResult({ ...result, totalBet, payout, actualWin: payout - totalBet, bets: { ...bets } });

      // Phase 1: Show initial 4 cards (face down)
      setDealPhase(1);

      // Phase 2: Reveal initial 4 cards (after 600ms)
      setTimeout(() => {
        setDealPhase(2);
        if (soundEnabled) AudioManager.playHand();
      }, 600);

      // Phase 3: Player's 3rd card (if any) - after 1800ms
      setTimeout(() => {
        if (hasPlayer3rd) {
          setDealPhase(3);
          if (soundEnabled) AudioManager.playHand();
        } else if (hasBanker3rd) {
          // Skip to banker's 3rd
          setDealPhase(4);
          if (soundEnabled) AudioManager.playHand();
        } else {
          // No 3rd cards, go to result
          setDealPhase(5);
        }
      }, 1800);

      // Phase 4: Banker's 3rd card (if any) - after 2800ms
      setTimeout(() => {
        if (hasPlayer3rd && hasBanker3rd) {
          setDealPhase(4);
          if (soundEnabled) AudioManager.playHand();
        } else if (hasPlayer3rd && !hasBanker3rd) {
          // Player had 3rd, no banker 3rd, go to result
          setDealPhase(5);
        }
        // If no player 3rd but banker 3rd, already handled above
      }, 2800);

      // Phase 5: Show result - after 3800ms (or earlier if no 3rd cards)
      const resultDelay = hasPlayer3rd || hasBanker3rd ? 3800 : 2400;
      setTimeout(() => {
        setDealPhase(5);
        setGamePhase("result");
        // Play win/lose/tie sound
        if (soundEnabled) {
          if (result.winner === "tie" && bets.tie > 0) {
            AudioManager.win();
          } else if (payout > totalBet) {
            AudioManager.win();
          } else if (payout === totalBet) {
            AudioManager.tie();
          } else {
            AudioManager.lose();
            setTimeout(() => AudioManager.evilLaugh(), 400);
          }
        }
        // Skip result modal - go straight to next round
        // setTimeout(() => setShowResultModal(true), 800);
      }, resultDelay);

    } catch (err: any) {
      console.error("Failed to play:", err);
      alert(err.message || "Failed to play");
      setGamePhase("betting");
    } finally {
      setIsPlaying(false);
    }
  };

  // Play again
  const handlePlayAgain = () => {
    setShowResultModal(false);
    setGamePhase("betting");
    setGameResult(null);
    setBets({ player: 0, banker: 0, tie: 0 });
    setDealPhase(0);
  };

  // Cash out - gets signature from API, then player claims from pool contract
  const handleCashOut = async () => {
    if (!address) return;

    // Check minimum
    if (credits < MIN_CASHOUT) {
      setCashoutError(`Minimum cashout is ${MIN_CASHOUT} VBMS. You have ${credits} credits.`);
      setShowCashoutModal(true);
      return;
    }

    setCashoutStep("withdrawing");
    setCashoutError(null);
    setShowCashoutModal(true);

    try {
      // Step 1: Get signature from API
      const response = await fetch('/api/betting/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get signature');
      }

      const { amount, nonce, signature, profit } = data;

      // Step 2: Call claimVBMS on VBMSPoolTroll contract (player pays gas)
      const txHash = await claimVBMS(
        amount.toString(),
        nonce as string,
        signature as `0x${string}`
      );

      setCashoutResult({ amount, profit, txHash });
      setCashoutStep("done");

      // Select random victory/loss/tie media and play matching audio
      if (profit > 0) {
        // Win
        const selected = VICTORY_CONFIGS[Math.floor(Math.random() * VICTORY_CONFIGS.length)];
        setVictoryConfig(selected);
        if (soundEnabled) {
          const audio = new Audio(selected.audio);
          audio.volume = 0.5;
          audio.play().catch(err => console.error('Failed to play victory audio:', err));
        }
      } else if (profit === 0) {
        // Tie/Break even
        if (soundEnabled) {
          const audio = new Audio('/tie-music.mp3');
          audio.volume = 0.7;
          audio.play().catch(err => console.error('Failed to play tie audio:', err));
        }
      } else {
        // Loss
        setLossMedia(LOSS_CONFIGS[Math.floor(Math.random() * LOSS_CONFIGS.length)]);
        if (soundEnabled) {
          AudioManager.lose();
          setTimeout(() => AudioManager.evilLaugh(), 400);
        }
      }
    } catch (err: any) {
      console.error("Cashout error:", err);
      setCashoutError(err.message || "Failed to withdraw");
      setCashoutStep("error");
      if (soundEnabled) AudioManager.buttonError();
    }
  };

  // Handle cashout close and redirect
  const handleCashoutClose = () => {
    setShowCashoutModal(false);
    setCashoutResult(null);
    setCashoutStep("idle");
    setCashoutError(null);
    if (cashoutStep === "done") {
      router.push('/');
    }
  };

  // Deposit
  const handleDeposit = async () => {
    if (!address || !depositAmount) return;
    const amountNum = parseFloat(depositAmount);

    if (amountNum < 100) { setDepositError("Min: 100 VBMS"); return; }
    if (amountNum > 5000) { setDepositError("Max: 5,000 VBMS"); return; }
    if (parseFloat(vbmsBalance) < amountNum) { setDepositError("Insufficient VBMS"); return; }

    setDepositError(null);
    try {
      setDepositStep("approving");
      await approve(CONTRACTS.VBMSPoolTroll as `0x${string}`, parseEther(depositAmount));

      setDepositStep("transferring");
      const txHash = await transfer(CONTRACTS.VBMSPoolTroll as `0x${string}`, parseEther(depositAmount));

      const response = await fetch('/api/betting/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, amount: depositAmount, txHash }),
      });

      if (!response.ok) throw new Error('Failed to process deposit');

      setDepositStep("done");
      if (soundEnabled) AudioManager.buttonSuccess();
      setTimeout(() => { setShowDeposit(false); setDepositStep("amount"); }, 1500);
    } catch (err: any) {
      setDepositError(err.message || "Failed");
      setDepositStep("amount");
    }
  };

  if (!userProfile || !address) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-black flex items-center justify-center">
        <div className="text-vintage-gold text-center">
          <div className="animate-spin w-10 h-10 border-2 border-vintage-gold border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="font-display">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal via-vintage-deep-black to-vintage-black flex flex-col">
      {/* Header */}
      <div className="bg-vintage-charcoal/90 border-b-2 border-vintage-gold/30 px-4 py-2">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => router.push('/')} className="text-vintage-burnt-gold hover:text-vintage-gold text-sm font-modern">
            {t('baccaratBack')}
          </button>
          <h1 className="text-2xl font-display font-bold text-vintage-gold tracking-wider" style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}>
            {t('baccaratTitle')}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRulesModal(true)}
              className="w-7 h-7 rounded-full bg-vintage-gold/20 hover:bg-vintage-gold/30 border border-vintage-gold/50 flex items-center justify-center text-vintage-gold font-bold text-sm transition-all"
            >
              ?
            </button>
            <span className="text-vintage-gold font-bold">{credits}</span>
            <span className="text-vintage-burnt-gold text-xs">{t('baccaratCredits')}</span>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
        {/* Casino Table */}
        <div className="flex-1 relative mx-2 mt-2 rounded-t-[100px] border-4 border-vintage-gold/40 shadow-2xl overflow-hidden"
          style={{
            backgroundImage: "radial-gradient(ellipse at center, #0d3d2d 0%, #061a14 100%)",
            boxShadow: "inset 0 0 100px rgba(0,0,0,0.4), 0 10px 30px rgba(0,0,0,0.5), 0 0 40px rgba(255,215,0,0.1)"
          }}>

          {/* Decorative Lines - vintage gold */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
            <ellipse cx="200" cy="20" rx="180" ry="15" fill="none" stroke="rgba(255,215,0,0.15)" strokeWidth="1" />
            <path d="M 20 80 Q 200 40 380 80" fill="none" stroke="rgba(255,215,0,0.1)" strokeWidth="1" />
            <line x1="133" y1="80" x2="133" y2="250" stroke="rgba(255,215,0,0.1)" strokeWidth="1" />
            <line x1="267" y1="80" x2="267" y2="250" stroke="rgba(255,215,0,0.1)" strokeWidth="1" />
          </svg>

          {/* Cards Display Area (during dealing/result) - Vertical Layout */}
          {(gamePhase === "dealing" || gamePhase === "result") && gameResult && dealPhase >= 1 && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-4 py-6 rounded-t-[100px] animate-fadeIn"
              style={{ background: "radial-gradient(ellipse at center, #0a2e22 0%, #041510 100%)" }}>

              {/* Player Section - Top */}
              <div className="flex flex-col items-center">
                <div className={`mb-2 px-4 py-1 rounded-lg border-2 ${dealPhase >= 5 && gameResult.winner === 'player' ? 'bg-blue-900/90 border-vintage-gold animate-pulse' : 'bg-blue-900/50 border-blue-700/50'}`}>
                  <span className="text-vintage-neon-blue font-display text-sm tracking-widest">PLAYER</span>
                  {dealPhase >= 2 && (() => {
                    const cards = dealPhase >= 3 && gameResult.playerCards?.length > 2
                      ? gameResult.playerCards
                      : gameResult.playerCards?.slice(0, 2) || [];
                    const rawSum = calculateRawSum(cards);
                    const finalScore = rawSum % 10;
                    const showBreakdown = rawSum >= 10;
                    return (
                      <span className="ml-3">
                        {showBreakdown && (
                          <span className="text-vintage-neon-blue/50 text-sm line-through mr-1">{rawSum}</span>
                        )}
                        <span className="text-vintage-neon-blue font-bold text-2xl">{finalScore}</span>
                      </span>
                    );
                  })()}
                </div>
                <div className="flex gap-2">
                  {gameResult.playerCards?.slice(0, 2).map((card: any, i: number) => (
                    <Card key={i} card={card} delay={0} revealed={dealPhase >= 2} />
                  ))}
                  {gameResult.playerCards?.length > 2 && dealPhase >= 3 && (
                    <Card key="p3" card={gameResult.playerCards[2]} delay={200} revealed={true} />
                  )}
                </div>
              </div>

              {/* VS Indicator */}
              <div className="text-vintage-gold/40 font-display text-sm my-1">VS</div>

              {/* Banker Section - Bottom */}
              <div className="flex flex-col items-center">
                <div className={`mb-2 px-4 py-1 rounded-lg border-2 ${dealPhase >= 5 && gameResult.winner === 'banker' ? 'bg-vintage-wine/90 border-vintage-gold animate-pulse' : 'bg-vintage-wine/50 border-red-700/50'}`}>
                  <span className="text-red-300 font-display text-sm tracking-widest">BANKER</span>
                  {dealPhase >= 2 && (() => {
                    const cards = dealPhase >= 4 && gameResult.bankerCards?.length > 2
                      ? gameResult.bankerCards
                      : gameResult.bankerCards?.slice(0, 2) || [];
                    const rawSum = calculateRawSum(cards);
                    const finalScore = rawSum % 10;
                    const showBreakdown = rawSum >= 10;
                    return (
                      <span className="ml-3">
                        {showBreakdown && (
                          <span className="text-red-300/50 text-sm line-through mr-1">{rawSum}</span>
                        )}
                        <span className="text-red-200 font-bold text-2xl">{finalScore}</span>
                      </span>
                    );
                  })()}
                </div>
                <div className="flex gap-2">
                  {gameResult.bankerCards?.slice(0, 2).map((card: any, i: number) => (
                    <Card key={i} card={card} delay={0} revealed={dealPhase >= 2} />
                  ))}
                  {gameResult.bankerCards?.length > 2 && dealPhase >= 4 && (
                    <Card key="b3" card={gameResult.bankerCards[2]} delay={200} revealed={true} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Betting Areas - hidden during dealing/result */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 transition-opacity duration-300 ${gamePhase === "betting" ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            {/* TIE Area */}
            <div
              onClick={() => placeBet("tie")}
              className={`
                relative w-56 h-16 rounded-xl border-2
                flex flex-col items-center justify-center cursor-pointer
                transition-all duration-200
                ${gamePhase === "betting" ? "hover:border-vintage-gold/60 hover:bg-vintage-gold/10" : ""}
                ${bets.tie > 0 ? "border-vintage-gold/80 bg-vintage-gold/20" : "border-vintage-gold/30 bg-vintage-charcoal/30"}
              `}
            >
              <span className="text-vintage-gold font-display text-2xl tracking-wider">{t('baccaratTie')}</span>
              <span className="text-vintage-gold/50 text-[10px] font-modern">5x</span>
              {bets.tie > 0 && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                  <ChipStack total={bets.tie} small />
                </div>
              )}
            </div>

            {/* BANKER Area */}
            <div
              onClick={() => placeBet("banker")}
              className={`
                relative w-56 h-16 rounded-xl border-2
                flex flex-col items-center justify-center cursor-pointer
                transition-all duration-200
                ${gamePhase === "betting" ? "hover:border-vintage-wine hover:bg-vintage-wine/20" : ""}
                ${bets.banker > 0 ? "border-red-400/70 bg-vintage-wine/40" : "border-vintage-wine/50 bg-vintage-wine/20"}
              `}
            >
              <span className="text-red-200 font-display text-2xl tracking-widest">{t('baccaratBanker')}</span>
              <span className="text-red-300/50 text-[10px] font-modern">1.7x</span>
              {bets.banker > 0 && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                  <ChipStack total={bets.banker} small />
                </div>
              )}
            </div>

            {/* PLAYER Area */}
            <div
              onClick={() => placeBet("player")}
              className={`
                relative w-56 h-16 rounded-xl border-2
                flex flex-col items-center justify-center cursor-pointer
                transition-all duration-200
                ${gamePhase === "betting" ? "hover:border-vintage-neon-blue/70 hover:bg-blue-900/30" : ""}
                ${bets.player > 0 ? "border-vintage-neon-blue/70 bg-blue-900/40" : "border-blue-800/50 bg-blue-900/20"}
              `}
            >
              <span className="text-vintage-neon-blue font-display text-2xl tracking-widest">{t('baccaratPlayer')}</span>
              <span className="text-blue-300/50 text-[10px] font-modern">1.8x</span>
              {bets.player > 0 && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                  <ChipStack total={bets.player} small />
                </div>
              )}
            </div>
          </div>

          {/* Result Overlay - Shows each bet PROFIT/LOSS */}
          {gamePhase === "result" && gameResult && (
            <div className="absolute right-1 bottom-1 z-30 flex flex-col gap-0.5">
              {/* TIE Result - profit = bet * 4 (since 5x return means 4x profit) */}
              <div className="bg-black/95 rounded px-2 py-0.5 border border-vintage-gold/30">
                <span className="text-vintage-gold text-[10px] font-display mr-2">TIE</span>
                <span className={`text-xs font-bold ${gameResult.winner === 'tie' && gameResult.bets?.tie > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {gameResult.winner === 'tie' && gameResult.bets?.tie > 0
                    ? `+${Math.floor(gameResult.bets.tie * 4)}`
                    : gameResult.bets?.tie > 0 ? `-${gameResult.bets.tie}` : '-'}
                </span>
              </div>

              {/* BANKER Result - profit = bet * 0.7 (since 1.7x return) */}
              <div className="bg-black/95 rounded px-2 py-0.5 border border-red-700/30">
                <span className="text-red-300 text-[10px] font-display mr-2">BANKER</span>
                <span className={`text-xs font-bold ${gameResult.winner === 'banker' && gameResult.bets?.banker > 0 ? 'text-emerald-400' : gameResult.winner === 'tie' && gameResult.bets?.banker > 0 ? 'text-vintage-gold' : 'text-red-400'}`}>
                  {gameResult.winner === 'banker' && gameResult.bets?.banker > 0
                    ? `+${Math.floor(gameResult.bets.banker * 0.7)}`
                    : gameResult.winner === 'tie' && gameResult.bets?.banker > 0
                    ? `0`
                    : gameResult.bets?.banker > 0 ? `-${gameResult.bets.banker}` : '-'}
                </span>
              </div>

              {/* PLAYER Result - profit = bet * 0.8 (since 1.8x return) */}
              <div className="bg-black/95 rounded px-2 py-0.5 border border-blue-700/30">
                <span className="text-vintage-neon-blue text-[10px] font-display mr-2">PLAYER</span>
                <span className={`text-xs font-bold ${gameResult.winner === 'player' && gameResult.bets?.player > 0 ? 'text-emerald-400' : gameResult.winner === 'tie' && gameResult.bets?.player > 0 ? 'text-vintage-gold' : 'text-red-400'}`}>
                  {gameResult.winner === 'player' && gameResult.bets?.player > 0
                    ? `+${Math.floor(gameResult.bets.player * 0.8)}`
                    : gameResult.winner === 'tie' && gameResult.bets?.player > 0
                    ? `0`
                    : gameResult.bets?.player > 0 ? `-${gameResult.bets.player}` : '-'}
                </span>
              </div>

              {/* Total */}
              <div className={`rounded px-2 py-1 border-2 text-center ${gameResult.actualWin > 0 ? 'bg-emerald-900/90 border-emerald-500' : gameResult.actualWin === 0 ? 'bg-vintage-gold/20 border-vintage-gold' : 'bg-red-900/90 border-red-500'}`}>
                <span className={`text-base font-display font-bold ${gameResult.actualWin > 0 ? 'text-emerald-400' : gameResult.actualWin === 0 ? 'text-vintage-gold' : 'text-red-400'}`}>
                  {gameResult.actualWin >= 0 ? `+${gameResult.actualWin}` : `${gameResult.actualWin}`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Panel */}
        <div className="bg-vintage-charcoal border-t-2 border-vintage-gold/30 p-3">
          {/* Limits Display */}
          <div className="flex items-center justify-between mb-2 text-[10px] text-vintage-burnt-gold/70 font-modern px-1">
            <div className="flex gap-3">
              <span>{t('baccaratMin')}: {BET_LIMITS.MIN_BET}</span>
              <span>{t('baccaratMax')}: {BET_LIMITS.MAX_TOTAL}</span>
            </div>
            <div className={`flex items-center gap-1 ${playsRemaining <= 2 ? 'text-red-400' : ''}`}>
              <span>{t('baccaratPlays')}: {currentPlays}/{dailyLimit}</span>
              {!hasVibeBadge && <span className="text-vintage-gold">🔒</span>}
            </div>
          </div>

          {/* Credits and Actions Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-vintage-black/70 rounded-lg px-3 py-1 border border-vintage-gold/30">
                <span className="text-vintage-gold font-bold">{credits - totalBet}</span>
                <span className="text-vintage-burnt-gold text-xs ml-1">{t('baccaratAvail')}</span>
              </div>
              {totalBet > 0 && (
                <div className={`bg-emerald-900/50 rounded-lg px-3 py-1 border ${totalBet >= BET_LIMITS.MAX_TOTAL ? 'border-red-500/50' : 'border-emerald-600/40'}`}>
                  <span className={`font-bold ${totalBet >= BET_LIMITS.MAX_TOTAL ? 'text-red-400' : 'text-emerald-400'}`}>{totalBet}</span>
                  <span className="text-emerald-300/50 text-xs ml-1">/{BET_LIMITS.MAX_TOTAL}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDeposit(true)} className="px-3 py-1 bg-emerald-900/50 hover:bg-emerald-800/50 border border-emerald-600/40 rounded-lg text-emerald-300 text-xs font-bold font-modern">
                {t('baccaratDeposit')}
              </button>
              {credits > 0 && totalBet === 0 && (
                <button
                  onClick={handleCashOut}
                  disabled={credits < MIN_CASHOUT || isClaimPending}
                  className={`px-3 py-1 border rounded-lg text-xs font-bold font-modern ${
                    credits >= MIN_CASHOUT && !isClaimPending
                      ? 'bg-vintage-gold/20 hover:bg-vintage-gold/30 border-vintage-gold/40 text-vintage-gold'
                      : 'bg-vintage-charcoal/50 border-vintage-burnt-gold/30 text-vintage-burnt-gold/50 cursor-not-allowed'
                  }`}
                  title={credits < MIN_CASHOUT ? `Min: ${MIN_CASHOUT} VBMS` : undefined}
                >
                  {isClaimPending ? '...' : credits >= MIN_CASHOUT ? t('baccaratCashout') : t('baccaratMinCashout').replace('{amount}', MIN_CASHOUT.toString())}
                </button>
              )}
            </div>
          </div>

          {/* Chips Row - only during betting */}
          <div className={`transition-all duration-300 overflow-hidden ${gamePhase === "betting" ? "max-h-24 opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="flex items-center justify-center gap-3 mb-3 py-2 px-1">
              {CHIP_VALUES.filter(v => v <= credits).map(value => (
                <Chip
                  key={value}
                  value={value}
                  size="md"
                  selected={selectedChip === value}
                  onClick={() => { setSelectedChip(value); if (soundEnabled) AudioManager.buttonClick(); }}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons - only during betting */}
          <div className={`transition-all duration-300 overflow-hidden ${gamePhase === "betting" ? "max-h-20 opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="flex gap-2">
              <button
                onClick={clearBets}
                disabled={totalBet === 0}
                className="flex-1 py-3 bg-vintage-black/50 hover:bg-vintage-black/70 border border-vintage-burnt-gold/40 rounded-xl text-vintage-burnt-gold font-bold font-modern transition-all disabled:opacity-30"
              >
                {t('baccaratClear')}
              </button>
              <button
                onClick={rebet}
                disabled={!lastBets || credits < (lastBets.player + lastBets.banker + lastBets.tie)}
                className="flex-1 py-3 bg-vintage-gold/10 hover:bg-vintage-gold/20 border border-vintage-gold/40 rounded-xl text-vintage-gold font-bold font-modern transition-all disabled:opacity-30"
              >
                {t('baccaratRebet')}
              </button>
              <button
                onClick={isLimitReached ? () => setShowLimitModal(true) : handleDeal}
                disabled={!isLimitReached && (totalBet === 0 || isPlaying)}
                className={`flex-[2] py-3 border-2 rounded-xl font-display text-xl transition-all shadow-lg ${
                  isLimitReached
                    ? 'bg-gradient-to-r from-yellow-900 to-amber-900 hover:from-yellow-800 hover:to-amber-800 border-yellow-500/50 text-yellow-300 cursor-pointer'
                    : 'bg-gradient-to-r from-vintage-wine to-red-900 hover:from-red-800 hover:to-red-700 border-red-400/50 text-vintage-ice disabled:opacity-30'
                }`}
              >
                {isPlaying ? "..." : isLimitReached ? "🔒 LIMIT" : t('baccaratDeal')}
              </button>
            </div>
          </div>

          {/* Result Button */}
          <div className={`transition-all duration-300 overflow-hidden ${gamePhase === "result" ? "max-h-20 opacity-100" : "max-h-0 opacity-0"}`}>
            <button
              onClick={handlePlayAgain}
              className="w-full py-4 bg-gradient-to-r from-emerald-900 to-emerald-800 hover:from-emerald-800 hover:to-emerald-700 border-2 border-emerald-500/50 rounded-xl text-vintage-ice font-display text-xl transition-all shadow-lg"
            >
              NEW GAME
            </button>
          </div>

          {/* Dealing Indicator */}
          <div className={`transition-all duration-300 overflow-hidden ${gamePhase === "dealing" ? "max-h-16 opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="text-center py-4">
              <div className="animate-pulse text-vintage-gold font-display tracking-wider">Dealing cards...</div>
            </div>
          </div>
        </div>

        {/* Recent History */}
        {recentHistory && recentHistory.length > 0 && (
          <div className="bg-vintage-black/90 px-3 py-2 flex items-center gap-2 border-t border-vintage-gold/10">
            <span className="text-vintage-burnt-gold text-xs font-modern">{t('baccaratResults')}:</span>
            <div className="flex gap-1 overflow-x-auto">
              {recentHistory.slice(0, 20).map((h: any, i: number) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 border
                    ${h.winner === "player" ? "bg-blue-900/80 text-vintage-neon-blue border-blue-700/50" : h.winner === "banker" ? "bg-vintage-wine/80 text-red-200 border-red-700/50" : "bg-vintage-gold/20 text-vintage-gold border-vintage-gold/40"}`}
                >
                  {h.winner === "player" ? "P" : h.winner === "banker" ? "B" : "T"}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4" onClick={() => setShowDeposit(false)}>
          <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-black rounded-2xl border-2 border-vintage-gold/40 max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-vintage-gold font-display text-xl">Deposit VBMS</h3>
              <button onClick={() => setShowDeposit(false)} className="text-vintage-burnt-gold hover:text-vintage-gold text-xl">&times;</button>
            </div>
            <p className="text-vintage-burnt-gold text-sm mb-2 font-modern">Your VBMS: {parseFloat(vbmsBalance).toFixed(0)}</p>
            <p className="text-vintage-burnt-gold/60 text-xs mb-4 font-modern">Deposit limit: 100 - 5,000 VBMS</p>

            {depositStep === "amount" && (
              <>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {DEPOSIT_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setDepositAmount(amt.toString())}
                      disabled={parseFloat(vbmsBalance) < amt}
                      className={`py-2 rounded-lg border text-sm font-bold font-modern transition-all ${depositAmount === amt.toString() ? "bg-emerald-900/40 border-emerald-500/50 text-emerald-400" : parseFloat(vbmsBalance) < amt ? "bg-vintage-black/20 border-vintage-gold/10 text-vintage-burnt-gold/30" : "bg-vintage-black/30 border-vintage-gold/20 text-vintage-ice hover:border-vintage-gold/50"}`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  max={5000}
                  className={`w-full px-4 py-3 bg-vintage-black/70 border rounded-lg text-vintage-ice mb-2 focus:outline-none font-modern ${parseFloat(depositAmount) > 5000 ? 'border-red-500 focus:border-red-500' : 'border-vintage-gold/30 focus:border-vintage-gold'}`}
                />
                {parseFloat(depositAmount) > 5000 && (
                  <p className="text-red-400 text-xs mb-2 font-modern">⚠️ Max deposit is 5,000 VBMS</p>
                )}
                {parseFloat(depositAmount) < 100 && parseFloat(depositAmount) > 0 && (
                  <p className="text-red-400 text-xs mb-2 font-modern">⚠️ Min deposit is 100 VBMS</p>
                )}
                {depositError && <p className="text-red-400 text-sm mb-2 font-modern">{depositError}</p>}
                <button
                  onClick={handleDeposit}
                  disabled={!depositAmount || parseFloat(depositAmount) < 100 || parseFloat(depositAmount) > 5000}
                  className="w-full py-3 bg-emerald-900/40 hover:bg-emerald-900/60 border border-emerald-500/50 rounded-xl text-emerald-400 font-bold font-modern transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  Deposit {Math.min(parseFloat(depositAmount) || 0, 5000)} VBMS
                </button>
              </>
            )}

            {(depositStep === "approving" || depositStep === "transferring") && (
              <div className="text-center py-8">
                <div className="animate-spin w-10 h-10 border-2 border-vintage-gold border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-vintage-gold font-modern">{depositStep === "approving" ? "Approving..." : "Depositing..."}</p>
              </div>
            )}

            {depositStep === "done" && (
              <div className="text-center py-8">
                <p className="text-5xl mb-4">✓</p>
                <p className="text-emerald-400 font-display text-xl">Done!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Daily Limit Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setShowLimitModal(false)}>
          <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-black rounded-2xl border-2 border-vintage-gold/40 max-w-sm w-full p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-4">🎰</div>
            <h3 className="text-vintage-gold font-display text-xl mb-3">Daily Limit Reached</h3>

            {!hasVibeBadge ? (
              <>
                <p className="text-vintage-burnt-gold text-sm mb-4 font-modern">
                  You've played {currentPlays}/{dailyLimit} rounds today.
                </p>
                <p className="text-vintage-ice/80 text-sm mb-6 font-modern">
                  Get a <span className="text-vintage-gold font-bold">VibeFID card</span> and claim the <span className="text-vintage-gold font-bold">VIBE Badge</span> in missions to get {DAILY_LIMITS.WITH_BADGE} plays/day!
                </p>
                <button
                  onClick={() => openMarketplace('https://farcaster.xyz/miniapps/aisYLhjuH5_G/vibefid', sdk, isInFarcaster)}
                  className="w-full py-3 bg-vintage-gold/20 hover:bg-vintage-gold/30 border border-vintage-gold rounded-xl text-vintage-gold font-bold font-modern transition-all mb-2"
                >
                  Get VibeFID ↗
                </button>
                <button
                  onClick={() => { setShowLimitModal(false); router.push('/missions'); }}
                  className="w-full py-3 bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-600/50 rounded-xl text-emerald-400 font-bold font-modern transition-all mb-3"
                >
                  Claim Badge in Missions
                </button>
              </>
            ) : (
              <>
                <p className="text-vintage-burnt-gold text-sm mb-4 font-modern">
                  You've played {currentPlays}/{dailyLimit} rounds today.
                </p>
                <p className="text-vintage-ice/80 text-sm mb-6 font-modern">
                  Come back tomorrow for more rounds!
                </p>
              </>
            )}

            <button
              onClick={() => setShowLimitModal(false)}
              className="w-full py-2 text-vintage-burnt-gold hover:text-vintage-gold text-sm font-modern transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setShowRulesModal(false)}>
          <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-black rounded-2xl border-2 border-vintage-gold/40 max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-vintage-gold font-display text-xl">
                {t('baccaratRulesTitle')}
              </h3>
              <button onClick={() => setShowRulesModal(false)} className="text-vintage-burnt-gold hover:text-vintage-gold text-2xl leading-none">&times;</button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {(baccaratRules[lang]?.rules || baccaratRules.en.rules).map((rule, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-vintage-gold font-bold text-sm mt-0.5">{i + 1}.</span>
                  <p className="text-vintage-ice/90 text-sm font-modern leading-relaxed">{rule}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-vintage-gold/20">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-blue-900/30 rounded-lg py-2 px-1 border border-blue-700/30">
                  <p className="text-vintage-neon-blue font-display text-sm">PLAYER</p>
                  <p className="text-vintage-ice text-lg font-bold">1.8x</p>
                </div>
                <div className="bg-vintage-wine/30 rounded-lg py-2 px-1 border border-red-700/30">
                  <p className="text-red-300 font-display text-sm">BANKER</p>
                  <p className="text-vintage-ice text-lg font-bold">1.7x</p>
                </div>
                <div className="bg-vintage-gold/10 rounded-lg py-2 px-1 border border-vintage-gold/30">
                  <p className="text-vintage-gold font-display text-sm">TIE</p>
                  <p className="text-vintage-ice text-lg font-bold">5x</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full mt-4 py-3 bg-vintage-gold/20 hover:bg-vintage-gold/30 border border-vintage-gold/50 rounded-xl text-vintage-gold font-bold font-modern transition-all"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Cashout Modal - handles withdrawing, error, and result states */}
      {showCashoutModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[400]" onClick={cashoutStep === "done" ? handleCashoutClose : undefined}>
          <div className="relative flex flex-col items-center gap-3 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>

            {/* Withdrawing State */}
            {cashoutStep === "withdrawing" && (
              <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-black rounded-2xl border-2 border-vintage-gold/40 p-8 text-center w-full">
                <div className="animate-spin w-12 h-12 border-3 border-vintage-gold border-t-transparent rounded-full mx-auto mb-4"></div>
                <h3 className="text-vintage-gold font-display text-xl mb-2">{t('baccaratWithdrawing')}</h3>
                <p className="text-vintage-burnt-gold text-sm font-modern">{t('baccaratProcessingTx')}</p>
                <p className="text-vintage-burnt-gold/60 text-xs font-modern mt-2">{t('baccaratPleaseWait')}</p>
              </div>
            )}

            {/* Error State */}
            {cashoutStep === "error" && (
              <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-black rounded-2xl border-2 border-red-500/40 p-6 text-center w-full">
                <div className="text-5xl mb-4">❌</div>
                <h3 className="text-red-400 font-display text-xl mb-2">{t('baccaratWithdrawFailed')}</h3>
                <p className="text-vintage-burnt-gold text-sm font-modern mb-4">{cashoutError}</p>
                <button
                  onClick={handleCashoutClose}
                  className="px-6 py-2 bg-vintage-silver hover:bg-vintage-burnt-gold text-vintage-black rounded-lg font-display font-bold text-sm transition-all"
                >
                  Close
                </button>
              </div>
            )}

            {/* Success State - Using game win/loss screens */}
            {cashoutStep === "done" && cashoutResult && (
              <>
                {/* Victory, Tie, or Loss Media */}
                {cashoutResult.profit > 0 ? (
                  // Victory
                  <img
                    src={victoryConfig.image}
                    alt="Victory!"
                    className="max-w-[85vw] max-h-[40vh] object-contain rounded-xl shadow-2xl shadow-yellow-500/50 border-2 border-yellow-400"
                  />
                ) : cashoutResult.profit === 0 ? (
                  // Tie - break even
                  <video
                    src="/tie.mp4"
                    autoPlay
                    loop
                    muted={!soundEnabled}
                    playsInline
                    className="max-w-[85vw] max-h-[40vh] object-contain rounded-xl shadow-2xl shadow-vintage-gold/50 border-2 border-vintage-gold"
                  />
                ) : lossMedia.isVideo ? (
                  // Loss video
                  <video
                    src={lossMedia.media}
                    autoPlay
                    loop
                    muted={!soundEnabled}
                    playsInline
                    className="max-w-[85vw] max-h-[40vh] object-contain rounded-xl shadow-2xl shadow-red-500/50 border-2 border-red-500"
                  />
                ) : (
                  // Loss image
                  <img
                    src={lossMedia.media}
                    alt="Loss"
                    className="max-w-[85vw] max-h-[40vh] object-contain rounded-xl shadow-2xl shadow-red-500/50 border-2 border-red-500"
                  />
                )}

                {/* Result Info */}
                <div className={`text-center px-4 py-3 rounded-xl w-full ${
                  cashoutResult.profit > 0 ? 'bg-yellow-900/50 border border-yellow-500/50' :
                  cashoutResult.profit === 0 ? 'bg-vintage-gold/20 border border-vintage-gold/50' :
                  'bg-red-900/50 border border-red-500/50'
                }`}>
                  <p className={`text-xl font-bold ${
                    cashoutResult.profit > 0 ? 'text-yellow-400' :
                    cashoutResult.profit === 0 ? 'text-vintage-gold' :
                    'text-red-400'
                  } animate-pulse`}>
                    {cashoutResult.profit > 0 ? `+${cashoutResult.profit} VBMS ${t('baccaratProfit')}!` :
                     cashoutResult.profit === 0 ? t('baccaratBreakEven') :
                     `${cashoutResult.profit} VBMS`}
                  </p>
                  <p className="text-vintage-gold text-lg font-bold mt-1">
                    {cashoutResult.amount} {t('baccaratWithdrawn')}
                  </p>
                  {cashoutResult.txHash && (
                    <a
                      href={`https://basescan.org/tx/${cashoutResult.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-vintage-neon-blue text-xs font-modern underline mt-2 block"
                    >
                      {t('baccaratViewBasescan')} ↗
                    </a>
                  )}
                </div>

                {/* Close button */}
                <button
                  onClick={handleCashoutClose}
                  className={`w-full py-3 rounded-lg font-display font-bold shadow-lg transition-all hover:scale-105 ${
                    cashoutResult.profit >= 0
                      ? 'bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black'
                      : 'bg-vintage-silver hover:bg-vintage-burnt-gold text-vintage-black'
                  }`}
                >
                  {t('baccaratContinue')}
                </button>

                {/* X button */}
                <button
                  onClick={handleCashoutClose}
                  className={`absolute top-2 right-2 rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold shadow-lg ${
                    cashoutResult.profit >= 0
                      ? 'bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black'
                      : 'bg-vintage-silver hover:bg-vintage-burnt-gold text-vintage-black'
                  }`}
                >
                  ×
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Round Result Modal - REMOVED (user requested to only show cashout modal) */}
    </div>
  );
}
