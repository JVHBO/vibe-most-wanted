"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { useProfile } from "@/contexts/ProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFarcasterVBMSBalance, useFarcasterTransferVBMS, useFarcasterApproveVBMS } from "@/lib/hooks/useFarcasterVBMS";
import { CONTRACTS } from "@/lib/contracts";
import { parseEther } from "viem";
import { toast } from "sonner";
import { sdk } from "@farcaster/miniapp-sdk";
import SlotMachine from "@/components/SlotMachine";
import { useMiniappFrameContext } from "@/components/MiniappFrame";
import { useMusic } from "@/contexts/MusicContext";

type DepositStep = "amount" | "approving" | "transferring" | "done";
type WithdrawStep = "amount" | "withdrawing" | "done";

const DEPOSIT_PRESETS = [100, 250, 500, 1000];
const DEPOSIT_MAX = 1000;

// Translations
const translations = {
  en: {
    title: "Tukka Slots",
    back: "Back",
    credits: "Credits",
    vbms: "VBMS",
    freeSpins: "Free Spins",
    deposit: "Deposit",
    withdraw: "Withdraw",
    error: "Error",
    depositing: "Depositing...",
    withdrawing: "Withdrawing...",
    success: "Success",
    depositSuccess: "Deposited successfully!",
    withdrawSuccess: "Withdrawn successfully!",
    insufficientBalance: "Insufficient balance",
    approveFirst: "Approve VBMS first",
    connectWallet: "Connect wallet",
    rulesTitle: "Slot Rules",
    rules: [
      "Match 4 cards to win coins!",
      "Higher rarity combinations = bigger prizes",
      "Mythic cards are the rarest",
      "10 free spins daily for VibeFID badge holders",
      "Use coins to buy additional spins (10 coins each)",
    ],
  },
  pt: {
    title: "Tukka Slots",
    back: "Voltar",
    credits: "Créditos",
    vbms: "VBMS",
    freeSpins: "Spins Grátis",
    deposit: "Depositar",
    withdraw: "Sacar",
    error: "Erro",
    depositing: "Depositando...",
    withdrawing: "Sacando...",
    success: "Sucesso",
    depositSuccess: "Depositado com sucesso!",
    withdrawSuccess: "Sacado com sucesso!",
    insufficientBalance: "Saldo insuficiente",
    approveFirst: "Aprove VBMS primeiro",
    connectWallet: "Conecte a carteira",
    rulesTitle: "Regras do Slot",
    rules: [
      "Combine 4 cartas para ganhar moedas!",
      "Combinações de raridade maior = prêmios maiores",
      "Cartas Míticas são as mais raras",
      "10 spins grátis diários para titulares do badge VibeFID",
      "Use moedas para comprar spins adicionais (10 moedas cada)",
    ],
  },
};

export default function SlotPage() {
  const { lang } = useLanguage();
  const { isConnected, address } = useAccount();
  const { userProfile } = useProfile();
  // Detecta se está dentro do MiniappFrame do site (desktop)
  const isInFrame = useMiniappFrameContext();

  // VBMS hooks
  const { balance: vbmsBalance, refetch: refetchVBMS } = useFarcasterVBMSBalance(address || '');
  const { approve } = useFarcasterApproveVBMS();
  const { transfer } = useFarcasterTransferVBMS();

  const convex = useConvex();
  const statsQuery = useQuery(api.slot.getSlotDailyStats, {
    address: address || "",
  });

  // Altura real do viewport (window.innerHeight é confiável em WebViews/Farcaster)
  const [vh, setVh] = useState(0);
  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Pausar BGM do miniapp enquanto estamos na página do slot
  const { pause: pauseMusic, play: playMusic, isPaused: musicWasPaused } = useMusic();
  const musicWasPausedRef = useRef(false);
  useEffect(() => {
    musicWasPausedRef.current = musicWasPaused;
    pauseMusic();
    return () => {
      if (!musicWasPausedRef.current) playMusic();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [walletTab, setWalletTab] = useState<"deposit" | "withdraw">("deposit");
  const [depositAmount, setDepositAmount] = useState("100");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositStep, setDepositStep] = useState<DepositStep>("amount");
  const [withdrawStep, setWithdrawStep] = useState<WithdrawStep>("amount");
  const [txStatus, setTxStatus] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [bgmMuted, setBgmMuted] = useState(false);
  const [bgmReady, setBgmReady] = useState(false);
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  // Casino BGM — toca apenas nesta página, para ao sair
  useEffect(() => {
    const audio = new Audio('/sounds/casino-bgm.mp3');
    audio.loop = true;
    audio.volume = 0.18; // baixinho no fundo
    bgmRef.current = audio;
    audio.play().then(() => setBgmReady(true)).catch(() => {
      // Autoplay bloqueado — aguarda clique do usuário
      const unlock = () => {
        audio.play().then(() => setBgmReady(true)).catch(() => {});
        window.removeEventListener('click', unlock);
        window.removeEventListener('touchstart', unlock);
      };
      window.addEventListener('click', unlock, { once: true });
      window.addEventListener('touchstart', unlock, { once: true });
    });
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Sincronizar mute
  useEffect(() => {
    if (bgmRef.current) bgmRef.current.muted = bgmMuted;
  }, [bgmMuted]);

  const handleWin = (amount: number) => {
    console.log("Player won:", amount);
  };

  const currentVBMSBalance = vbmsBalance ? Number(vbmsBalance) / 1e18 : 0;

  const getVBMSContract = () => {
    // Slot machine uses VBMSPoolTroll contract on Base
    return CONTRACTS.VBMSPoolTroll as `0x${string}`;
  };

  const handleDeposit = async () => {
    if (!isConnected || !address) {
      toast.error(tr("connectWallet"));
      return;
    }

    const amount = Number(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(tr("error"));
      return;
    }

    if (amount > DEPOSIT_MAX) {
      toast.error(`Máximo de depósito: ${DEPOSIT_MAX} VBMS`);
      return;
    }

    if (amount > currentVBMSBalance) {
      toast.error(tr("insufficientBalance"));
      return;
    }

    setDepositStep("approving");
    setTxStatus("Approving VBMS...");
    setErrorMsg(null);

    try {
      // Approve VBMS transfer
      const contract = getVBMSContract();
      const amountWei = parseEther(depositAmount);

      // Call approve
      await approve(contract, amountWei);

      setDepositStep("transferring");
      setTxStatus("Transferring VBMS...");

      // Transfer VBMS to game contract
      // Note: The actual transfer would happen here, but we'll need the game contract address
      // For now, we'll simulate

      await new Promise(resolve => setTimeout(resolve, 2000));

      // After successful deposit, we would call a Convex mutation to add credits
      // await convex.mutation(api.slot.depositVBMS, { address, amount });

      setDepositStep("done");
      toast.success(tr("depositSuccess"));
      setShowDeposit(false);
      setDepositAmount("100");

      refetchVBMS();
    } catch (error: any) {
      console.error("Deposit error:", error);
      setErrorMsg(error.message || tr("error"));
      setDepositStep("amount");
    } finally {
      setTxStatus("");
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected || !address) {
      toast.error(tr("connectWallet"));
      return;
    }

    const amount = Number(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(tr("error"));
      return;
    }

    const credits = userProfile?.coins || 0;
    if (amount > credits) {
      toast.error(tr("insufficientBalance"));
      return;
    }

    setWithdrawStep("withdrawing");
    setTxStatus(tr("withdrawing"));
    setErrorMsg(null);

    try {
      // Withdraw: spend credits in-game and mint VBMS
      // The Convex mutation would:
      // 1. Validate user has enough coins
      // 2. Deduct coins from profile
      // 3. Trigger VBMS mint to user wallet
      // await convex.mutation(api.slot.withdrawVBMS, { address, amount });

      // Simulate
      await new Promise(resolve => setTimeout(resolve, 2000));

      setWithdrawStep("done");
      toast.success(tr("withdrawSuccess"));
      setShowWithdraw(false);
      setWithdrawAmount("");

      refetchVBMS();
    } catch (error: any) {
      console.error("Withdraw error:", error);
      setErrorMsg(error.message || tr("error"));
      setWithdrawStep("amount");
    } finally {
      setTxStatus("");
    }
  };

  const tr = (key: string) => {
    const langTranslations = translations[lang as keyof typeof translations] || translations.en;
    return (langTranslations as any)[key] || translations.en[key as keyof typeof translations.en] || key;
  };

  return (
    <>
      <style jsx global>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1); opacity: 0.15; }
          10%  { opacity: 0.25; }
          90%  { opacity: 0.2; }
          100% { transform: translateY(-110vh) scale(0.7); opacity: 0; }
        }
        @keyframes coin-rain {
          0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      <div
        className="relative flex flex-col overflow-hidden overscroll-none"
        style={{
          // MiniappFrame (site): usa 100% para herdar o height do data-phone-body (max 660px)
          // Farcaster / mobile real: usa window.innerHeight exato
          height: isInFrame ? '100%' : (vh ? `${vh}px` : '100svh'),
          background: 'radial-gradient(ellipse at 50% 20%, #1a0800 0%, #080200 60%, #000 100%)',
        }}
      >
        {/* Header */}
        <div className="relative shrink-0 z-10 flex items-center px-4" style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid rgba(255,215,0,0.2)',
        }}>
          <Link href="/" className="text-sm font-medium" style={{ color: 'rgba(255,215,0,0.7)' }}>
            ← {tr("back")}
          </Link>
          <div className="flex-1 text-center relative">
            <h1 className="text-2xl font-extrabold tracking-tighter" style={{
              fontFamily: 'var(--font-cinzel)',
              color: 'transparent',
              letterSpacing: '-0.05em',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundImage: 'url("/slot-gifs/gen4-turbo-idle-breathing.gif")',
              backgroundSize: '80% 80%', /* Decreased zoom - shows more of the GIF with spacing */
              backgroundPosition: 'center top',
              backgroundRepeat: 'no-repeat',
              backgroundBlendMode: 'overlay',
              textShadow: '0 0 2px rgba(0,0,0,0.5)',
              transform: 'scaleY(1.2)' /* Vertically stretch the text */
            }}>
              {tr("title")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Mute BGM */}
            <button
              onClick={() => setBgmMuted(m => !m)}
              className="w-7 h-7 flex items-center justify-center text-base border-2 border-black rounded-full"
              style={{ background: '#1a1a1a', color: bgmMuted ? '#6b7280' : '#FFD400' }}
              title={bgmMuted ? "Ligar música" : "Mutar música"}
            >
              {bgmMuted ? "🔇" : "🎵"}
            </button>
            <button
              onClick={() => setShowRules(true)}
              className="w-7 h-7 flex items-center justify-center font-bold text-sm border-2 border-black rounded-full"
              style={{ background: '#1a1a1a', color: '#FFD400' }}
            >?</button>
          </div>
        </div>

        {/* Rules + Payouts Modal */}
        {showRules && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85" onClick={() => setShowRules(false)}>
            <div
              className="w-full max-w-sm border-4 border-black rounded-2xl overflow-hidden bg-gray-900 max-h-[80vh] flex flex-col"
              style={{ boxShadow: '4px 4px 0px #FFD700' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#FFD700] border-b-4 border-black px-3 py-1.5 flex items-center justify-between shrink-0">
                <span className="font-black text-xs uppercase tracking-widest text-black">Regras & Prêmios</span>
                <button onClick={() => setShowRules(false)} className="rounded-full flex items-center justify-center" style={{ background: '#DC2626', width: 24, height: 24, color: '#fff', fontSize: 16, lineHeight: 1, fontWeight: 700 }}>×</button>
              </div>
              <div className="overflow-y-auto p-4 space-y-4">
                {/* Rules */}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-yellow-400 mb-2">Regras</div>
                  <ul className="space-y-1.5">
                    {translations.en.rules.map((rule, i) => (
                      <li key={i} className="text-white text-xs flex items-start gap-2">
                        <span className="text-yellow-400 mt-0.5 shrink-0">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Payout Table */}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-yellow-400 mb-2">Tabela de Prêmios</div>
                  <div className="space-y-1">
                    {[
                      ["4× Mythic",   "50.000","#a855f7"],["4× Legendary","5.000", "#f59e0b"],
                      ["4× Epic",     "800",   "#ec4899"],["4× Rare",     "120",   "#3b82f6"],["4× Common","12","#6b7280"],
                      ["3× Mythic",   "2.000", "#a855f7"],["3× Legendary","300",   "#f59e0b"],
                      ["3× Epic",     "80",    "#ec4899"],["3× Rare",     "20",    "#3b82f6"],["3× Common","4", "#6b7280"],
                      ["2× Mythic",   "100",   "#a855f7"],["2× Legendary","20",    "#f59e0b"],
                      ["VBMS ×4 (scatter)","30.000","#FFD700"],["VBMS ×3","1.500","#FFD700"],["VBMS ×2","100","#FFD700"],
                    ].map(([k, v, col]) => (
                      <div key={k} className="flex justify-between items-center px-2 py-1 rounded border border-white/5" style={{ background:"#100500" }}>
                        <span className="text-[11px] font-bold" style={{ color: col as string }}>{k}</span>
                        <span className="text-[11px] font-black text-yellow-400">{v} coins</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-center text-gray-500 pt-2">Prêmios multiplicam pelo valor da aposta</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Slot machine preenche espaço restante */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <SlotMachine onWalletOpen={() => { setShowDeposit(true); setWalletTab("deposit"); }} />
        </div>
      </div>

      {/* Unified Wallet Modal */}
      {showDeposit && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85"
          onClick={() => { if (depositStep === 'amount' && withdrawStep === 'amount') setShowDeposit(false); }}
        >
          <div
            className="w-full max-w-sm border-4 rounded-2xl overflow-hidden"
            style={{ background:"#0d0500", borderColor:"#c87941", boxShadow:"4px 4px 0 #000" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="px-4 py-2 border-b-4 border-[#c87941] flex items-center justify-between"
              style={{ background:"linear-gradient(180deg,#7a4520,#3d1c02)" }}
            >
              <span className="font-black text-sm uppercase tracking-widest" style={{ color:"#FFD700", textShadow:"1px 1px 0 #000" }}>WALLET</span>
              <button onClick={() => setShowDeposit(false)} className="w-6 h-6 rounded-full bg-red-600 border-2 border-black font-black text-white text-sm flex items-center justify-center">×</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b-2 border-[#c87941]">
              {(["deposit","withdraw"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setWalletTab(tab)}
                  className="flex-1 py-2 font-black text-xs uppercase tracking-widest transition-colors"
                  style={{
                    background: walletTab === tab ? (tab === "deposit" ? "#15803d" : "#1d4ed8") : "#100500",
                    color: walletTab === tab ? "#fff" : "#6b7280",
                    borderBottom: walletTab === tab ? "2px solid #FFD700" : "none",
                    textShadow: walletTab === tab ? "1px 1px 0 #000" : "none",
                  }}
                >
                  {tab === "deposit" ? "Deposit VBMS" : "Withdraw VBMS"}
                </button>
              ))}
            </div>

            <div className="p-4">
              {walletTab === "deposit" ? (
                depositStep === "amount" ? (
                  <>
                    <div className="mb-3">
                      <label className="text-white text-xs font-bold mb-1 block">Quantidade (VBMS)</label>
                      <input
                        type="number" value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        className="w-full bg-black border-2 border-green-500/50 rounded px-3 py-2 text-white font-bold text-lg focus:outline-none focus:border-green-500"
                        placeholder="100" min="1" max={DEPOSIT_MAX}
                      />
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-500">Saldo VBMS: <span className="text-green-400 font-bold">{currentVBMSBalance.toFixed(2)}</span></span>
                        <span className="text-gray-600">Máx: {DEPOSIT_MAX}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {DEPOSIT_PRESETS.map(p => (
                        <button key={p} onClick={() => setDepositAmount(p.toString())}
                          className="py-2 border border-green-500/30 rounded text-green-400 font-bold text-sm hover:bg-green-600/20">{p}</button>
                      ))}
                    </div>
                    <button onClick={handleDeposit}
                      disabled={!depositAmount || Number(depositAmount) <= 0 || Number(depositAmount) > Math.min(currentVBMSBalance, DEPOSIT_MAX)}
                      className="w-full py-3 font-black text-sm uppercase border-2 border-black disabled:opacity-50"
                      style={{ background:"linear-gradient(180deg,#22c55e,#15803d)", color:"#fff", textShadow:"1px 1px 0 #000" }}>
                      Depositar
                    </button>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-xl font-black text-[#c87941] mb-4">...</div>
                    <div className="text-white font-bold">{txStatus}</div>
                    {errorMsg && <div className="text-red-400 text-sm mt-2">{errorMsg}</div>}
                  </div>
                )
              ) : (
                withdrawStep === "amount" ? (
                  <>
                    <div className="mb-3">
                      <label className="text-white text-xs font-bold mb-1 block">Fichas do Slot (coins)</label>
                      <input
                        type="number" value={withdrawAmount}
                        onChange={e => setWithdrawAmount(e.target.value)}
                        className="w-full bg-black border-2 border-blue-500/50 rounded px-3 py-2 text-white font-bold text-lg focus:outline-none focus:border-blue-500"
                        placeholder="100" min="100"
                      />
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-500">Fichas: <span className="text-blue-400 font-bold">{(userProfile?.coins || 0).toLocaleString()}</span></span>
                        <span className="text-gray-600">Mín: 100</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {[100, 500, 1000, 2500].map(p => (
                        <button key={p} onClick={() => setWithdrawAmount(p.toString())}
                          className="py-2 border border-blue-500/30 rounded text-blue-400 font-bold text-sm hover:bg-blue-600/20">{p}</button>
                      ))}
                    </div>
                    <button onClick={handleWithdraw}
                      disabled={!withdrawAmount || Number(withdrawAmount) < 100 || Number(withdrawAmount) > (userProfile?.coins || 0)}
                      className="w-full py-3 font-black text-sm uppercase border-2 border-black disabled:opacity-50"
                      style={{ background:"linear-gradient(180deg,#3b82f6,#1d4ed8)", color:"#fff", textShadow:"1px 1px 0 #000" }}>
                      Sacar (claim on-chain)
                    </button>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-xl font-black text-[#c87941] mb-4">...</div>
                    <div className="text-white font-bold">{txStatus}</div>
                    {errorMsg && <div className="text-red-400 text-sm mt-2">{errorMsg}</div>}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
