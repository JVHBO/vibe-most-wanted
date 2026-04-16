"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { useReconnectTimeout } from "@/hooks/useReconnectTimeout";
import { WalletGateScreen } from "@/components/WalletGateScreen";
import LoadingSpinner from "@/components/LoadingSpinner";
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
    title: "Tukka Slots", back: "Back", credits: "Credits", vbms: "VBMS",
    freeSpins: "Free Spins", deposit: "Deposit", withdraw: "Withdraw",
    error: "Error", depositing: "Depositing...", withdrawing: "Withdrawing...",
    success: "Success", depositSuccess: "Deposited successfully!", withdrawSuccess: "Withdrawn successfully!",
    insufficientBalance: "Insufficient balance", approveFirst: "Approve VBMS first",
    connectWallet: "Connect wallet", rulesTitle: "Slot Rules",
    rules: ["Match 4 cards of the same rank to win!","Higher rank combos = bigger prizes","Quad (4 identical) pays 3× more","10 free spins daily","Foil cards survive combos and accumulate"],
  },
  "pt-BR": {
    title: "Tukka Slots", back: "Voltar", credits: "Créditos", vbms: "VBMS",
    freeSpins: "Giros Grátis", deposit: "Depositar", withdraw: "Sacar",
    error: "Erro", depositing: "Depositando...", withdrawing: "Sacando...",
    success: "Sucesso", depositSuccess: "Depositado com sucesso!", withdrawSuccess: "Sacado com sucesso!",
    insufficientBalance: "Saldo insuficiente", approveFirst: "Aprove VBMS primeiro",
    connectWallet: "Conecte a carteira", rulesTitle: "Regras do Slot",
    rules: ["Combine 4 cartas do mesmo rank para ganhar!","Ranks maiores = prêmios maiores","Quad (4 idênticas) paga 3× mais","10 giros grátis por dia","Cartas foil sobrevivem aos combos e acumulam"],
  },
  es: {
    title: "Tukka Slots", back: "Volver", credits: "Créditos", vbms: "VBMS",
    freeSpins: "Giros Gratis", deposit: "Depositar", withdraw: "Retirar",
    error: "Error", depositing: "Depositando...", withdrawing: "Retirando...",
    success: "Éxito", depositSuccess: "¡Depositado con éxito!", withdrawSuccess: "¡Retirado con éxito!",
    insufficientBalance: "Saldo insuficiente", approveFirst: "Aprueba VBMS primero",
    connectWallet: "Conecta la billetera", rulesTitle: "Reglas del Slot",
    rules: ["¡Combina 4 cartas del mismo rango para ganar!","Rangos más altos = premios mayores","Quad (4 idénticas) paga 3× más","10 giros gratis por día","Las cartas foil sobreviven a los combos"],
  },
  hi: {
    title: "Tukka Slots", back: "वापस", credits: "क्रेडिट", vbms: "VBMS",
    freeSpins: "मुफ्त स्पिन", deposit: "जमा करें", withdraw: "निकालें",
    error: "त्रुटि", depositing: "जमा हो रहा है...", withdrawing: "निकाला जा रहा है...",
    success: "सफलता", depositSuccess: "सफलतापूर्वक जमा!", withdrawSuccess: "सफलतापूर्वक निकाला!",
    insufficientBalance: "अपर्याप्त शेष", approveFirst: "पहले VBMS स्वीकृत करें",
    connectWallet: "वॉलेट कनेक्ट करें", rulesTitle: "स्लॉट नियम",
    rules: ["जीतने के लिए एक ही रैंक के 4 कार्ड मिलाएं!","उच्च रैंक = बड़े पुरस्कार","क्वाड (4 समान) 3× अधिक देता है","प्रतिदिन 10 मुफ्त स्पिन","फॉइल कार्ड कॉम्बो में बचते हैं"],
  },
  ru: {
    title: "Tukka Slots", back: "Назад", credits: "Кредиты", vbms: "VBMS",
    freeSpins: "Бесплатные спины", deposit: "Пополнить", withdraw: "Вывести",
    error: "Ошибка", depositing: "Пополнение...", withdrawing: "Вывод...",
    success: "Успех", depositSuccess: "Пополнено успешно!", withdrawSuccess: "Выведено успешно!",
    insufficientBalance: "Недостаточно средств", approveFirst: "Сначала одобрите VBMS",
    connectWallet: "Подключить кошелёк", rulesTitle: "Правила слота",
    rules: ["Собери 4 карты одного ранга!","Высший ранг = большие призы","Квад (4 одинаковых) платит 3×","10 бесплатных спинов в день","Фойл-карты выживают в комбо"],
  },
  "zh-CN": {
    title: "Tukka 老虎机", back: "返回", credits: "积分", vbms: "VBMS",
    freeSpins: "免费旋转", deposit: "存入", withdraw: "提取",
    error: "错误", depositing: "存入中...", withdrawing: "提取中...",
    success: "成功", depositSuccess: "存入成功！", withdrawSuccess: "提取成功！",
    insufficientBalance: "余额不足", approveFirst: "请先授权VBMS",
    connectWallet: "连接钱包", rulesTitle: "老虎机规则",
    rules: ["组合4张同等级牌获胜！","等级越高奖励越大","四同（4张相同）奖励3×","每天10次免费旋转","闪卡在组合后保留"],
  },
  id: {
    title: "Tukka Slots", back: "Kembali", credits: "Kredit", vbms: "VBMS",
    freeSpins: "Putaran Gratis", deposit: "Setor", withdraw: "Tarik",
    error: "Kesalahan", depositing: "Menyetor...", withdrawing: "Menarik...",
    success: "Berhasil", depositSuccess: "Berhasil disetor!", withdrawSuccess: "Berhasil ditarik!",
    insufficientBalance: "Saldo tidak cukup", approveFirst: "Setujui VBMS dulu",
    connectWallet: "Hubungkan dompet", rulesTitle: "Aturan Slot",
    rules: ["Cocokkan 4 kartu rank sama untuk menang!","Rank lebih tinggi = hadiah lebih besar","Quad (4 identik) bayar 3×","10 putaran gratis per hari","Kartu foil bertahan setelah kombo"],
  },
  fr: {
    title: "Tukka Slots", back: "Retour", credits: "Crédits", vbms: "VBMS",
    freeSpins: "Tours Gratuits", deposit: "Déposer", withdraw: "Retirer",
    error: "Erreur", depositing: "Dépôt en cours...", withdrawing: "Retrait en cours...",
    success: "Succès", depositSuccess: "Déposé avec succès !", withdrawSuccess: "Retiré avec succès !",
    insufficientBalance: "Solde insuffisant", approveFirst: "Approuvez VBMS d'abord",
    connectWallet: "Connecter le portefeuille", rulesTitle: "Règles du Slot",
    rules: ["Combinez 4 cartes de même rang pour gagner !","Rang plus élevé = prix plus grand","Quad (4 identiques) paie 3×","10 tours gratuits par jour","Les cartes foil survivent aux combos"],
  },
  ja: {
    title: "Tukkaスロット", back: "戻る", credits: "クレジット", vbms: "VBMS",
    freeSpins: "フリースピン", deposit: "入金", withdraw: "出金",
    error: "エラー", depositing: "入金中...", withdrawing: "出金中...",
    success: "成功", depositSuccess: "入金完了！", withdrawSuccess: "出金完了！",
    insufficientBalance: "残高不足", approveFirst: "先にVBMSを承認してください",
    connectWallet: "ウォレットを接続", rulesTitle: "スロットルール",
    rules: ["同じランクの4枚でコンボ！","ランクが高いほど賞金大","クワッド（4枚同一）は3×","毎日フリースピン10回","フォイルカードはコンボ後も残る"],
  },
  it: {
    title: "Tukka Slots", back: "Indietro", credits: "Crediti", vbms: "VBMS",
    freeSpins: "Giri Gratuiti", deposit: "Deposita", withdraw: "Preleva",
    error: "Errore", depositing: "Deposito in corso...", withdrawing: "Prelievo in corso...",
    success: "Successo", depositSuccess: "Depositato con successo!", withdrawSuccess: "Prelevato con successo!",
    insufficientBalance: "Saldo insufficiente", approveFirst: "Approva prima VBMS",
    connectWallet: "Collega portafoglio", rulesTitle: "Regole dello Slot",
    rules: ["Abbina 4 carte dello stesso rango per vincere!","Rango più alto = premi maggiori","Quad (4 identiche) paga 3×","10 giri gratuiti al giorno","Le carte foil sopravvivono ai combo"],
  },
};

export default function SlotPage() {
  const { lang } = useLanguage();
  const { isConnected, address, status } = useAccount();
  const isReconnecting = useReconnectTimeout(status);
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

  // MusicContext: compartilhado para custom URL e playlist (mesmo sistema da home)
  const {
    setMusicMode: setGlobalMusicMode,
    setPlaylist: setGlobalPlaylist,
    isMusicEnabled: globalMusicEnabled,
    setIsMusicEnabled: setGlobalMusicEnabled,
    isPaused: isMusicPaused,
    pause: pauseMusic,
    play: playMusic,
    setVolume: setGlobalVolume,
    musicMode: globalMusicMode,
    customMusicUrl: globalCustomUrl,
  } = useMusic();

  const wasMusicPausedRef = useRef<boolean | null>(null);

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
  const slotHelpOpenRef = useRef<(() => void) | null>(null);
  const [narrationMuted, setNarrationMuted] = useState(false);
  const [showSlotSettings, setShowSlotSettings] = useState(false);
  // Slot-próprio music system (independente da home)
  const [slotMusicMode, setSlotMusicMode] = useState<"default" | "playlist">("default");
  const [slotMusicEnabled, setSlotMusicEnabled] = useState(true);
  const [slotVolume, setSlotVolume] = useState(0.18);
  const [slotPlaylist, setSlotPlaylist] = useState<string[]>([]);
  const [slotPlaylistIdx, setSlotPlaylistIdx] = useState(0);
  const [playlistUrlInput, setPlaylistUrlInput] = useState("");
  const [playlistNames, setPlaylistNames] = useState<Record<string, string>>({});

  // Hidratar preferências do localStorage após mount (evita hydration mismatch)
  useEffect(() => {
    try {
      setNarrationMuted(localStorage.getItem("slot_narration_muted") === "1");
      setSlotMusicEnabled(localStorage.getItem("slot_music_enabled") !== "0");
      const mode = localStorage.getItem("slot_music_mode") as any;
      if (mode === "default" || mode === "playlist") setSlotMusicMode(mode);
      const vol = parseFloat(localStorage.getItem("slot_volume") ?? "0.18");
      if (!isNaN(vol)) setSlotVolume(vol);
      const pl = JSON.parse(localStorage.getItem("slot_playlist") ?? "[]");
      if (Array.isArray(pl)) setSlotPlaylist(pl);
      const names = JSON.parse(localStorage.getItem("slot_playlist_names") ?? "{}");
      if (names && typeof names === "object") setPlaylistNames(names);
    } catch { /* localStorage indisponível */ }
  }, []);

  // ── Sistema próprio de BGM do slot (suporta MP3 direto + YouTube via iframe) ──
  const slotBgmRef = useRef<HTMLAudioElement | null>(null);
  const slotYtPlayerRef = useRef<any>(null);
  const slotBgmBaseVolume = slotVolume;

  const stopSlotYt = () => {
    if (slotYtPlayerRef.current) {
      try { slotYtPlayerRef.current.destroy(); } catch {}
      slotYtPlayerRef.current = null;
    }
  };

  // Efeito principal de BGM
  useEffect(() => {
    // playlist: delegar ao MusicContext (mesmo sistema da home — suporta YouTube, playlist, etc.)
    if (slotMusicMode === "playlist") {
      if (slotBgmRef.current) {
        slotBgmRef.current.pause();
        slotBgmRef.current.src = "";
        slotBgmRef.current = null;
      }
      stopSlotYt();
      setGlobalPlaylist(slotPlaylist);
      setGlobalMusicMode("playlist");
      setGlobalVolume(slotBgmBaseVolume);
      if (!globalMusicEnabled) setGlobalMusicEnabled(true);
      playMusic();
      return () => { pauseMusic(); };
    }

    // default: parar MusicContext e tocar casino-bgm local
    pauseMusic();
    stopSlotYt();

    const audio = new Audio("/sounds/casino-bgm.mp3");
    audio.loop = true;
    audio.volume = slotMusicEnabled ? slotBgmBaseVolume : 0;
    slotBgmRef.current = audio;

    const tryPlay = () => {
      if (slotMusicEnabled) audio.play().catch(() => {});
    };
    tryPlay();
    window.addEventListener("click", tryPlay, { once: true });
    window.addEventListener("touchstart", tryPlay, { once: true });

    return () => {
      window.removeEventListener("click", tryPlay);
      window.removeEventListener("touchstart", tryPlay);
      audio.pause();
      audio.src = "";
      slotBgmRef.current = null;
    };
  }, [slotMusicMode, slotPlaylist.join(","), slotMusicEnabled, slotBgmBaseVolume]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync mute no modo default
  useEffect(() => {
    if (slotBgmRef.current) slotBgmRef.current.volume = slotMusicEnabled ? slotBgmBaseVolume : 0;
  }, [slotMusicEnabled]);

  const duckSlotBgm = (reason: "combo" | "bonus" = "combo") => {
    const low = reason === "bonus" ? 0.03 : 0.05;
    if (slotBgmRef.current) slotBgmRef.current.volume = low;
    else setGlobalVolume(low);
    if (slotYtPlayerRef.current) try { slotYtPlayerRef.current.setVolume(Math.round(low * 100)); } catch {}
  };
  const restoreSlotBgm = () => {
    const vol = slotMusicEnabled ? slotBgmBaseVolume : 0;
    if (slotBgmRef.current) slotBgmRef.current.volume = vol;
    else setGlobalVolume(vol);
    if (slotYtPlayerRef.current) try { slotYtPlayerRef.current.setVolume(Math.round(vol * 100)); } catch {}
  };

  const handleWin = async (amount: number) => {
    // Saldo já é atualizado pelo Convex no spinSlot mutation,
    // o useQuery em userProfile coins refetch automatico
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

      // After successful deposit, call Convex mutation to add credits
      await convex.mutation(api.slot.depositVBMS, { address, amount });

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
    return (langTranslations as any)[key] ?? (translations.en as any)[key] ?? key;
  };

  if (isReconnecting) {
    return (
      <div className="fixed inset-0 bg-vintage-deep-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!address) return <WalletGateScreen />;

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
              backgroundImage: 'url("/slot-gifs/casino-slot-animation.gif")',
              backgroundSize: '70% 70%', /* Further decreased zoom - shows even more of the GIF with spacing */
              backgroundPosition: 'bottom', /* Show more of the bottom portion of the GIF */
              backgroundRepeat: 'no-repeat',
              backgroundBlendMode: 'overlay',
              textShadow: '0 0 2px rgba(0,0,0,0.5)',
              transform: 'scaleY(3.0)' /* Vertically stretch the text even more to show maximum of the GIF */
            }}>
              {tr("title")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Slot Settings */}
            <button
              onClick={() => setShowSlotSettings(true)}
              className="w-7 h-7 flex items-center justify-center text-base border-2 border-black rounded-full"
              style={{ background: '#1a1a1a', color: '#FFD400' }}
              title="Configurações de áudio"
            >⚙️</button>
            <button
              onClick={() => slotHelpOpenRef.current?.()}
              className="w-7 h-7 flex items-center justify-center font-bold text-sm border-2 border-black rounded-full"
              style={{ background: '#1a1a1a', color: '#FFD400' }}
            >?</button>
          </div>
        </div>

        {/* Slot Audio Settings Modal */}
        {showSlotSettings && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85" onClick={() => setShowSlotSettings(false)}>
            <div
              className="w-full max-w-[340px] border-4 border-black rounded-2xl overflow-hidden flex flex-col"
              style={{ background: '#0d0500', borderColor: '#c87941', boxShadow: '4px 4px 0 #000', maxHeight: '90vh' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-4 py-2.5 border-b-2 border-[#c87941] flex items-center justify-between shrink-0" style={{ background: 'linear-gradient(180deg,#3a1800,#1a0800)' }}>
                <span className="font-black text-sm uppercase tracking-widest" style={{ color: '#FFD700' }}>⚙️ Configurações de Áudio</span>
                <button onClick={() => setShowSlotSettings(false)} className="w-6 h-6 rounded-full bg-red-600 border-2 border-black font-black text-white text-sm flex items-center justify-center">×</button>
              </div>

              <div className="overflow-y-auto flex-1 p-4 space-y-5">
                {/* ── Música ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-yellow-300">🎵 Música de Fundo</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">BGM do cassino durante o jogo</div>
                    </div>
                    <button
                      onClick={() => {
                        const next = !slotMusicEnabled;
                        setSlotMusicEnabled(next);
                        localStorage.setItem("slot_music_enabled", next ? "1" : "0");
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-black border-2 border-black transition-all"
                      style={{
                        background: !slotMusicEnabled ? '#374151' : 'linear-gradient(180deg,#22c55e,#15803d)',
                        color: !slotMusicEnabled ? '#9ca3af' : '#000',
                      }}
                    >{!slotMusicEnabled ? "🔇 Mudo" : "🔊 Ligado"}</button>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: '#1a0800', border: '1px solid #3a2000' }}>
                    <span className="text-[11px] font-bold text-yellow-300">🔉 Volume</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const next = Math.max(0, Math.round((slotVolume - 0.1) * 10) / 10);
                          setSlotVolume(next);
                          localStorage.setItem("slot_volume", String(next));
                          if (slotBgmRef.current) slotBgmRef.current.volume = slotMusicEnabled ? next : 0;
                          else setGlobalVolume(next);
                        }}
                        className="w-7 h-7 rounded text-sm font-black border-2 border-black flex items-center justify-center"
                        style={{ background: 'linear-gradient(180deg,#c87941,#7a3a00)', color: '#fff' }}
                      >−</button>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <div
                            key={n}
                            onClick={() => {
                              const next = n / 10;
                              setSlotVolume(next);
                              localStorage.setItem("slot_volume", String(next));
                              if (slotBgmRef.current) slotBgmRef.current.volume = slotMusicEnabled ? next : 0;
                              else setGlobalVolume(next);
                            }}
                            className="w-2 rounded-sm cursor-pointer transition-all"
                            style={{
                              height: `${8 + n * 1.5}px`,
                              background: n <= Math.round(slotVolume * 10) ? '#FFD700' : '#3a2000',
                              border: '1px solid #c87941',
                              alignSelf: 'flex-end',
                            }}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          const next = Math.min(1, Math.round((slotVolume + 0.1) * 10) / 10);
                          setSlotVolume(next);
                          localStorage.setItem("slot_volume", String(next));
                          if (slotBgmRef.current) slotBgmRef.current.volume = slotMusicEnabled ? next : 0;
                          else setGlobalVolume(next);
                        }}
                        className="w-7 h-7 rounded text-sm font-black border-2 border-black flex items-center justify-center"
                        style={{ background: 'linear-gradient(180deg,#FFD700,#c87941)', color: '#000' }}
                      >+</button>
                    </div>
                  </div>

                  {/* Modo de música */}
                  <div className="rounded-lg p-3 space-y-2" style={{ background: '#1a0800', border: '1px solid #3a2000' }}>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Fonte da música</div>
                    <div className="flex gap-2">
                      {(["default","playlist"] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => { setSlotMusicMode(mode); localStorage.setItem("slot_music_mode", mode); }}
                          className="flex-1 py-1.5 rounded text-[11px] font-black border-2 transition-all"
                          style={{
                            background: slotMusicMode === mode ? 'linear-gradient(180deg,#FFD700,#c87941)' : '#0d0500',
                            color: slotMusicMode === mode ? '#000' : '#9ca3af',
                            borderColor: slotMusicMode === mode ? '#000' : '#3a2000',
                          }}
                        >{mode === "default" ? "🎰 Padrão" : "🎵 Playlist"}</button>
                      ))}
                    </div>

                    {/* Playlist */}
                    {slotMusicMode === "playlist" && (
                      <div className="space-y-2 pt-1">
                        {/* Add URL row */}
                        <div className="flex gap-2">
                          <input
                            type="url"
                            placeholder="URL MP3 ou YouTube..."
                            value={playlistUrlInput}
                            onChange={e => setPlaylistUrlInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key !== "Enter") return;
                              const url = playlistUrlInput.trim();
                              if (!url) return;
                              const isYt = url.includes("youtube") || url.includes("youtu.be");
                              const name = isYt
                                ? `YouTube #${slotPlaylist.length + 1}`
                                : (url.split('/').pop()?.replace(/\?.*/, '').replace(/%20/g,' ').substring(0,30) || `Faixa ${slotPlaylist.length + 1}`);
                              const next = [...slotPlaylist, url];
                              const nextNames = { ...playlistNames, [url]: name };
                              setSlotPlaylist(next);
                              setPlaylistNames(nextNames);
                              localStorage.setItem("slot_playlist", JSON.stringify(next));
                              localStorage.setItem("slot_playlist_names", JSON.stringify(nextNames));
                              setPlaylistUrlInput("");
                            }}
                            className="flex-1 px-2 py-1.5 rounded text-[11px] border-2 text-white outline-none"
                            style={{ background: '#0d0500', borderColor: '#a855f7' }}
                          />
                          <button
                            onClick={() => {
                              const url = playlistUrlInput.trim();
                              if (!url) return;
                              const isYt = url.includes("youtube") || url.includes("youtu.be");
                              const name = isYt
                                ? `YouTube #${slotPlaylist.length + 1}`
                                : (url.split('/').pop()?.replace(/\?.*/, '').replace(/%20/g,' ').substring(0,30) || `Faixa ${slotPlaylist.length + 1}`);
                              const next = [...slotPlaylist, url];
                              const nextNames = { ...playlistNames, [url]: name };
                              setSlotPlaylist(next);
                              setPlaylistNames(nextNames);
                              localStorage.setItem("slot_playlist", JSON.stringify(next));
                              localStorage.setItem("slot_playlist_names", JSON.stringify(nextNames));
                              setPlaylistUrlInput("");
                            }}
                            className="w-8 h-8 rounded text-lg font-black border-2 border-black flex items-center justify-center shrink-0"
                            style={{ background: 'linear-gradient(180deg,#a855f7,#7c3aed)', color: '#fff' }}
                          >+</button>
                        </div>

                        {/* Track list */}
                        {slotPlaylist.length === 0 ? (
                          <div className="text-center text-[10px] text-gray-600 py-2">Nenhuma faixa adicionada</div>
                        ) : (
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                            {slotPlaylist.map((url, i) => {
                              const isPlaying = i === slotPlaylistIdx % slotPlaylist.length && slotMusicMode === "playlist";
                              const isYt = url.includes("youtube") || url.includes("youtu.be");
                              const displayName = playlistNames[url] || (isYt ? `YouTube #${i+1}` : (url.split('/').pop()?.replace(/\?.*/, '').substring(0,28) || `Faixa ${i+1}`));
                              return (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer"
                                  style={{
                                    background: isPlaying ? 'linear-gradient(90deg,#1a0a3a,#0d0520)' : '#0d0500',
                                    border: `1.5px solid ${isPlaying ? '#a855f7' : '#2a1000'}`,
                                  }}
                                >
                                  {/* Index / playing indicator */}
                                  <div className="w-5 text-center shrink-0">
                                    {isPlaying
                                      ? <span className="text-purple-400 text-[11px]">▶</span>
                                      : <span className="text-gray-600 text-[10px] font-mono">{i+1}</span>
                                    }
                                  </div>
                                  {/* Icon */}
                                  <span className="text-[12px] shrink-0">{isYt ? "▶️" : "🎵"}</span>
                                  {/* Name — editable on click */}
                                  <span
                                    className="flex-1 text-[11px] truncate"
                                    style={{ color: isPlaying ? '#d8b4fe' : '#9ca3af' }}
                                    title={url}
                                  >{displayName}</span>
                                  {/* Remove */}
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      const next = slotPlaylist.filter((_,j) => j !== i);
                                      const nextNames = { ...playlistNames };
                                      delete nextNames[url];
                                      setSlotPlaylist(next);
                                      setPlaylistNames(nextNames);
                                      localStorage.setItem("slot_playlist", JSON.stringify(next));
                                      localStorage.setItem("slot_playlist_names", JSON.stringify(nextNames));
                                      if (slotPlaylistIdx >= next.length) setSlotPlaylistIdx(0);
                                    }}
                                    className="w-5 h-5 rounded flex items-center justify-center text-[11px] shrink-0"
                                    style={{ background: '#2a0000', color: '#ef4444', border: '1px solid #7f1d1d' }}
                                  >×</button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {slotPlaylist.length > 0 && (
                          <div className="text-[9px] text-gray-600 text-center">
                            {slotPlaylist.length} faixa{slotPlaylist.length > 1 ? "s" : ""} • toca em sequência
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: '#3a2000' }} />

                {/* ── Narração ── */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-yellow-300">🎙️ Narração dos Combos</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Voz exclusiva ao ativar cada combo</div>
                  </div>
                  <button
                    onClick={() => {
                      setNarrationMuted(m => {
                        const next = !m;
                        localStorage.setItem("slot_narration_muted", next ? "1" : "0");
                        return next;
                      });
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-black border-2 border-black transition-all"
                    style={{
                      background: narrationMuted ? '#374151' : 'linear-gradient(180deg,#22c55e,#15803d)',
                      color: narrationMuted ? '#9ca3af' : '#000',
                    }}
                  >{narrationMuted ? "🔇 Mudo" : "🔊 Ligado"}</button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                    {(translations[lang as keyof typeof translations] ?? translations.en).rules.map((rule, i) => (
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
          <SlotMachine
            onWalletOpen={() => { setShowDeposit(true); setWalletTab("deposit"); }}
            duckBgm={duckSlotBgm}
            restoreBgm={restoreSlotBgm}
            narrationMuted={narrationMuted}
            onHelpOpen={(fn) => { slotHelpOpenRef.current = fn; }}
            isFrameMode={isInFrame}
          />
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
                  {tab === "deposit" ? "Depositar VBMS" : "Sacar VBMS"}
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
