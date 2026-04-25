"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount, useBalance, useChainId, useReadContract, useWriteContract } from "wagmi";
import { useReconnectTimeout } from "@/hooks/useReconnectTimeout";
import { WalletGateScreen } from "@/components/WalletGateScreen";
import LoadingSpinner, { PageLoadingSpinner } from "@/components/LoadingSpinner";
import { useProfile } from "@/contexts/ProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFarcasterVBMSBalance, useFarcasterTransferVBMS, useFarcasterApproveVBMS } from "@/lib/hooks/useFarcasterVBMS";
import { useClaimVBMS } from "@/lib/hooks/useVBMSContracts";
import { getFarcasterProvider as getFarcasterSdkProvider, isBaseAppWebView } from "@/lib/utils/miniapp";
import { CONTRACTS } from "@/lib/contracts";
import { parseEther } from "viem";
import { toast } from "sonner";
import { sdk } from "@farcaster/miniapp-sdk";
import SlotMachine from "@/components/SlotMachine";
import { useMiniappFrameContext } from "@/components/MiniappFrame";
import { useMusic } from "@/contexts/MusicContext";

type DepositStep = "amount" | "approving" | "transferring" | "done";
type WithdrawStep = "amount" | "withdrawing" | "done";
type DepositMode = "vbms" | "buy";

const DEPOSIT_PRESETS = [100, 250, 500, 1000];

const SLOT_SHOP_BASE  = '0x9D7e843F2c096434747B453381105f85D1cf2E9e' as const;
const SLOT_SHOP_ARB   = '0x3736a48Bd8CE9BeE0602052B48254Fc44ffC0daA' as const;
const USDC_BASE       = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
const USDN_ARB        = '0x4ecf61a6c2fab8a047ceb3b3b263b401763e9d49' as const;

const SHOP_ABI = [
  { name: 'buyCoins',          type: 'function', stateMutability: 'payable',    inputs: [{ name: 'coinAmount', type: 'uint256' }], outputs: [] },
  { name: 'buyCoinsWithToken', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'token', type: 'address' }, { name: 'coinAmount', type: 'uint256' }], outputs: [] },
  { name: 'pricePerHundredETH', type: 'function', stateMutability: 'view',      inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'tokenPricePer100',   type: 'function', stateMutability: 'view',      inputs: [{ name: 'token', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

const ERC20_APPROVE_ABI = [
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;
const DEPOSIT_MAX = 10000;

const SLOT_DISCLAIMER: Record<string, { title: string; body: string; checkLabel: string; accept: string }> = {
  en:      { title: "⚠️ Play Responsibly", body: "Casino games carry risk. The house always wins in the long run — do not treat slots as an investment. Tukka Slots is designed for low bets and pure fun. Play only while it's fun.", checkLabel: "I understand the risks and want to play for fun only.", accept: "Let's play!" },
  "pt-BR": { title: "⚠️ Jogue com Responsabilidade", body: "Jogos de cassino envolvem riscos. A casa sempre ganha a longo prazo — não trate slots como investimento. O Tukka Slots foi feito para apostas baixas e diversão pura. Jogue apenas enquanto for divertido.", checkLabel: "Entendo os riscos e quero jogar apenas por diversão.", accept: "Vamos jogar!" },
  es:      { title: "⚠️ Juega Responsablemente", body: "Los juegos de casino conllevan riesgos. La casa siempre gana a largo plazo — no trates los slots como una inversión. Tukka Slots está diseñado para apuestas bajas y pura diversión. Juega solo mientras sea divertido.", checkLabel: "Entiendo los riesgos y quiero jugar solo por diversión.", accept: "¡A jugar!" },
  hi:      { title: "⚠️ जिम्मेदारी से खेलें", body: "कैसीनो गेम में जोखिम होता है। लंबे समय में हमेशा घर जीतता है — स्लॉट्स को निवेश न समझें। Tukka Slots कम दांव और शुद्ध मनोरंजन के लिए बना है। तभी तक खेलें जब तक मजा आए।", checkLabel: "मैं जोखिम समझता हूं और केवल मनोरंजन के लिए खेलना चाहता हूं।", accept: "चलो खेलते हैं!" },
  ru:      { title: "⚠️ Играйте Ответственно", body: "Азартные игры несут риск. Заведение всегда выигрывает в долгосрочной перспективе — не рассматривайте слоты как инвестицию. Tukka Slots создан для маленьких ставок и чистого удовольствия. Играйте, только пока это приносит радость.", checkLabel: "Я понимаю риски и хочу играть только ради удовольствия.", accept: "Играть!" },
  "zh-CN": { title: "⚠️ 理性游戏", body: "赌场游戏存在风险。从长远来看庄家总是赢家——不要将老虎机视为投资。Tukka Slots 专为低额投注和纯粹娱乐而设计。只在感到快乐时游玩。", checkLabel: "我了解风险，只想娱乐。", accept: "开始游戏！" },
  id:      { title: "⚠️ Bermain dengan Bijak", body: "Permainan kasino memiliki risiko. Rumah selalu menang dalam jangka panjang — jangan anggap slot sebagai investasi. Tukka Slots dirancang untuk taruhan kecil dan kesenangan murni. Bermainlah hanya selama masih menyenangkan.", checkLabel: "Saya memahami risikonya dan ingin bermain hanya untuk bersenang-senang.", accept: "Ayo main!" },
  fr:      { title: "⚠️ Jouez Responsablement", body: "Les jeux de casino comportent des risques. La maison gagne toujours sur le long terme — ne traitez pas les slots comme un investissement. Tukka Slots est conçu pour de petites mises et le pur plaisir. Jouez uniquement tant que c'est amusant.", checkLabel: "Je comprends les risques et veux jouer uniquement pour le plaisir.", accept: "On joue !" },
  ja:      { title: "⚠️ 責任あるプレイ", body: "カジノゲームにはリスクがあります。長期的には常にハウスが勝ちます。スロットを投資として扱わないでください。Tukka Slotsは低い賭け金と純粋な楽しみのために設計されています。楽しい間だけプレイしてください。", checkLabel: "リスクを理解し、楽しみのためだけにプレイします。", accept: "プレイ開始！" },
  it:      { title: "⚠️ Gioca Responsabilmente", body: "I giochi da casinò comportano rischi. Il banco vince sempre nel lungo periodo — non trattare gli slot come un investimento. Tukka Slots è progettato per puntate basse e puro divertimento. Gioca solo finché è divertente.", checkLabel: "Capisco i rischi e voglio giocare solo per divertimento.", accept: "Giochiamo!" },
};

// Translations
const translations = {
  en: {
    title: "Tukka Slots", back: "Back", credits: "Credits", vbms: "VBMS",
    freeSpins: "Free Spins", deposit: "Deposit", withdraw: "Withdraw",
    error: "Error", depositing: "Depositing...", withdrawing: "Withdrawing...",
    success: "Success", depositSuccess: "Deposited successfully!", withdrawSuccess: "Withdrawn successfully!",
    insufficientBalance: "Insufficient balance", approveFirst: "Approve VBMS first",
    connectWallet: "Connect wallet", rulesTitle: "Slot Rules",
    rules: ["Match 4 cards forming a pattern (horizontal, vertical, diagonal or L-shape)!","Higher rank combos = bigger prizes","Quad (4 identical) pays 3× more","5 free spins daily","Foil cards survive combos and accumulate"],
    settings: "Settings", language: "Language",
    musicBg: "Background Music", musicBgDesc: "Casino BGM during gameplay",
    volume: "Volume", musicSource: "Music Source",
    defaultMode: "🎰 Default", playlistMode: "🎵 Playlist",
    comboNarration: "Combo Narration", comboNarrationDesc: "Exclusive voice for each combo",
    on: "🔊 On", off: "🔇 Mute",
    addTrack: "MP3 or YouTube URL...", noTracks: "No tracks added",
    trackCount: (n: number) => `${n} track${n !== 1 ? "s" : ""} • plays in sequence`,
    rulesAndPrizes: "Rules & Prizes", prizes: "Prizes", prizesNote: "Prizes multiply by bet amount",
  },
  "pt-BR": {
    title: "Tukka Slots", back: "Voltar", credits: "Créditos", vbms: "VBMS",
    freeSpins: "Giros Grátis", deposit: "Depositar", withdraw: "Sacar",
    error: "Erro", depositing: "Depositando...", withdrawing: "Sacando...",
    success: "Sucesso", depositSuccess: "Depositado com sucesso!", withdrawSuccess: "Sacado com sucesso!",
    insufficientBalance: "Saldo insuficiente", approveFirst: "Aprove VBMS primeiro",
    connectWallet: "Conecte a carteira", rulesTitle: "Regras do Slot",
    rules: ["Combine 4 cartas formando um padrão (horizontal, vertical, diagonal ou L)!","Ranks maiores = prêmios maiores","Quad (4 idênticas) paga 3× mais","5 giros grátis por dia","Cartas foil sobrevivem aos combos e acumulam"],
    settings: "Configurações", language: "Idioma",
    musicBg: "Música de Fundo", musicBgDesc: "BGM do cassino durante o jogo",
    volume: "Volume", musicSource: "Fonte da música",
    defaultMode: "🎰 Padrão", playlistMode: "🎵 Playlist",
    comboNarration: "Narração dos Combos", comboNarrationDesc: "Voz exclusiva ao ativar cada combo",
    on: "🔊 Ligado", off: "🔇 Mudo",
    addTrack: "URL MP3 ou YouTube...", noTracks: "Nenhuma faixa adicionada",
    trackCount: (n: number) => `${n} faixa${n !== 1 ? "s" : ""} • toca em sequência`,
    rulesAndPrizes: "Regras & Prêmios", prizes: "Prêmios",
  },
  es: {
    title: "Tukka Slots", back: "Volver", credits: "Créditos", vbms: "VBMS",
    freeSpins: "Giros Gratis", deposit: "Depositar", withdraw: "Retirar",
    error: "Error", depositing: "Depositando...", withdrawing: "Retirando...",
    success: "Éxito", depositSuccess: "¡Depositado con éxito!", withdrawSuccess: "¡Retirado con éxito!",
    insufficientBalance: "Saldo insuficiente", approveFirst: "Aprueba VBMS primero",
    connectWallet: "Conecta la billetera", rulesTitle: "Reglas del Slot",
    rules: ["¡Combina 4 cartas formando un patrón (horizontal, vertical, diagonal o L)!","Rangos más altos = premios mayores","Quad (4 idénticas) paga 3× más","5 giros gratis por día","Las cartas foil sobreviven a los combos"],
    settings: "Configuración", language: "Idioma",
    musicBg: "Música de Fondo", musicBgDesc: "BGM del casino durante el juego",
    volume: "Volumen", musicSource: "Fuente de música",
    defaultMode: "🎰 Por defecto", playlistMode: "🎵 Playlist",
    comboNarration: "Narración de Combos", comboNarrationDesc: "Voz exclusiva al activar cada combo",
    on: "🔊 Activado", off: "🔇 Mudo",
    addTrack: "URL MP3 o YouTube...", noTracks: "Sin pistas añadidas",
    trackCount: (n: number) => `${n} pista${n !== 1 ? "s" : ""} • reproduce en secuencia`,
    rulesAndPrizes: "Reglas y Premios", prizes: "Premios",
  },
  hi: {
    title: "Tukka Slots", back: "वापस", credits: "क्रेडिट", vbms: "VBMS",
    freeSpins: "मुफ्त स्पिन", deposit: "जमा करें", withdraw: "निकालें",
    error: "त्रुटि", depositing: "जमा हो रहा है...", withdrawing: "निकाला जा रहा है...",
    success: "सफलता", depositSuccess: "सफलतापूर्वक जमा!", withdrawSuccess: "सफलतापूर्वक निकाला!",
    insufficientBalance: "अपर्याप्त शेष", approveFirst: "पहले VBMS स्वीकृत करें",
    connectWallet: "वॉलेट कनेक्ट करें", rulesTitle: "स्लॉट नियम",
    rules: ["जीतने के लिए एक ही रैंक के 4 कार्ड मिलाएं!","उच्च रैंक = बड़े पुरस्कार","क्वाड (4 समान) 3× अधिक देता है","प्रतिदिन 10 मुफ्त स्पिन","फॉइल कार्ड कॉम्बो में बचते हैं"],
    settings: "सेटिंग्स", language: "भाषा",
    musicBg: "बैकग्राउंड संगीत", musicBgDesc: "गेमप्ले के दौरान कैसीनो BGM",
    volume: "वॉल्यूम", musicSource: "संगीत स्रोत",
    defaultMode: "🎰 डिफ़ॉल्ट", playlistMode: "🎵 प्लेलिस्ट",
    comboNarration: "कॉम्बो नैरेशन", comboNarrationDesc: "प्रत्येक कॉम्बो पर एक्सक्लूसिव वॉइस",
    on: "🔊 चालू", off: "🔇 म्यूट",
    addTrack: "MP3 या YouTube URL...", noTracks: "कोई ट्रैक नहीं जोड़ा",
    trackCount: (n: number) => `${n} ट्रैक • क्रम में चलता है`,
    rulesAndPrizes: "नियम और पुरस्कार", prizes: "पुरस्कार",
  },
  ru: {
    title: "Tukka Slots", back: "Назад", credits: "Кредиты", vbms: "VBMS",
    freeSpins: "Бесплатные спины", deposit: "Пополнить", withdraw: "Вывести",
    error: "Ошибка", depositing: "Пополнение...", withdrawing: "Вывод...",
    success: "Успех", depositSuccess: "Пополнено успешно!", withdrawSuccess: "Выведено успешно!",
    insufficientBalance: "Недостаточно средств", approveFirst: "Сначала одобрите VBMS",
    connectWallet: "Подключить кошелёк", rulesTitle: "Правила слота",
    rules: ["Собери 4 карты одного ранга!","Высший ранг = большие призы","Квад (4 одинаковых) платит 3×","10 бесплатных спинов в день","Фойл-карты выживают в комбо"],
    settings: "Настройки", language: "Язык",
    musicBg: "Фоновая музыка", musicBgDesc: "BGM казино во время игры",
    volume: "Громкость", musicSource: "Источник музыки",
    defaultMode: "🎰 По умолчанию", playlistMode: "🎵 Плейлист",
    comboNarration: "Озвучка комбо", comboNarrationDesc: "Эксклюзивный голос при каждом комбо",
    on: "🔊 Вкл", off: "🔇 Выкл",
    addTrack: "URL MP3 или YouTube...", noTracks: "Треки не добавлены",
    trackCount: (n: number) => `${n} трек${n > 4 ? "ов" : n > 1 ? "а" : ""} • воспроизводится по очереди`,
    rulesAndPrizes: "Правила и призы", prizes: "Призы",
  },
  "zh-CN": {
    title: "Tukka Slots", back: "返回", credits: "积分", vbms: "VBMS",
    freeSpins: "免费旋转", deposit: "存入", withdraw: "提取",
    error: "错误", depositing: "存入中...", withdrawing: "提取中...",
    success: "成功", depositSuccess: "存入成功！", withdrawSuccess: "提取成功！",
    insufficientBalance: "余额不足", approveFirst: "请先授权VBMS",
    connectWallet: "连接钱包", rulesTitle: "老虎机规则",
    rules: ["组合4张同等级牌获胜！","等级越高奖励越大","四同（4张相同）奖励3×","每天10次免费旋转","闪卡在组合后保留"],
    settings: "设置", language: "语言",
    musicBg: "背景音乐", musicBgDesc: "游戏过程中的赌场BGM",
    volume: "音量", musicSource: "音乐来源",
    defaultMode: "🎰 默认", playlistMode: "🎵 播放列表",
    comboNarration: "连击解说", comboNarrationDesc: "每次连击的专属配音",
    on: "🔊 开", off: "🔇 静音",
    addTrack: "MP3或YouTube链接...", noTracks: "未添加曲目",
    trackCount: (n: number) => `${n}首 • 顺序播放`,
    rulesAndPrizes: "规则与奖励", prizes: "奖励",
  },
  id: {
    title: "Tukka Slots", back: "Kembali", credits: "Kredit", vbms: "VBMS",
    freeSpins: "Putaran Gratis", deposit: "Setor", withdraw: "Tarik",
    error: "Kesalahan", depositing: "Menyetor...", withdrawing: "Menarik...",
    success: "Berhasil", depositSuccess: "Berhasil disetor!", withdrawSuccess: "Berhasil ditarik!",
    insufficientBalance: "Saldo tidak cukup", approveFirst: "Setujui VBMS dulu",
    connectWallet: "Hubungkan dompet", rulesTitle: "Aturan Slot",
    rules: ["Cocokkan 4 kartu rank sama untuk menang!","Rank lebih tinggi = hadiah lebih besar","Quad (4 identik) bayar 3×","10 putaran gratis per hari","Kartu foil bertahan setelah kombo"],
    settings: "Pengaturan", language: "Bahasa",
    musicBg: "Musik Latar", musicBgDesc: "BGM kasino selama bermain",
    volume: "Volume", musicSource: "Sumber musik",
    defaultMode: "🎰 Bawaan", playlistMode: "🎵 Playlist",
    comboNarration: "Narasi Kombo", comboNarrationDesc: "Suara eksklusif saat kombo aktif",
    on: "🔊 Aktif", off: "🔇 Bisu",
    addTrack: "URL MP3 atau YouTube...", noTracks: "Belum ada trek",
    trackCount: (n: number) => `${n} trek • diputar berurutan`,
    rulesAndPrizes: "Aturan & Hadiah", prizes: "Hadiah",
  },
  fr: {
    title: "Tukka Slots", back: "Retour", credits: "Crédits", vbms: "VBMS",
    freeSpins: "Tours Gratuits", deposit: "Déposer", withdraw: "Retirer",
    error: "Erreur", depositing: "Dépôt en cours...", withdrawing: "Retrait en cours...",
    success: "Succès", depositSuccess: "Déposé avec succès !", withdrawSuccess: "Retiré avec succès !",
    insufficientBalance: "Solde insuffisant", approveFirst: "Approuvez VBMS d'abord",
    connectWallet: "Connecter le portefeuille", rulesTitle: "Règles du Slot",
    rules: ["Combinez 4 cartes de même rang pour gagner !","Rang plus élevé = prix plus grand","Quad (4 identiques) paie 3×","10 tours gratuits par jour","Les cartes foil survivent aux combos"],
    settings: "Paramètres", language: "Langue",
    musicBg: "Musique de fond", musicBgDesc: "BGM casino pendant le jeu",
    volume: "Volume", musicSource: "Source musicale",
    defaultMode: "🎰 Défaut", playlistMode: "🎵 Playlist",
    comboNarration: "Narration des combos", comboNarrationDesc: "Voix exclusive à chaque combo",
    on: "🔊 Activé", off: "🔇 Muet",
    addTrack: "URL MP3 ou YouTube...", noTracks: "Aucune piste ajoutée",
    trackCount: (n: number) => `${n} piste${n !== 1 ? "s" : ""} • lecture séquentielle`,
    rulesAndPrizes: "Règles & Prix", prizes: "Prix",
  },
  ja: {
    title: "Tukka Slots", back: "戻る", credits: "クレジット", vbms: "VBMS",
    freeSpins: "フリースピン", deposit: "入金", withdraw: "出金",
    error: "エラー", depositing: "入金中...", withdrawing: "出金中...",
    success: "成功", depositSuccess: "入金完了！", withdrawSuccess: "出金完了！",
    insufficientBalance: "残高不足", approveFirst: "先にVBMSを承認してください",
    connectWallet: "ウォレットを接続", rulesTitle: "スロットルール",
    rules: ["同じランクの4枚でコンボ！","ランクが高いほど賞金大","クワッド（4枚同一）は3×","毎日フリースピン10回","フォイルカードはコンボ後も残る"],
    settings: "設定", language: "言語",
    musicBg: "バックグラウンドミュージック", musicBgDesc: "ゲーム中のカジノBGM",
    volume: "音量", musicSource: "音楽ソース",
    defaultMode: "🎰 デフォルト", playlistMode: "🎵 プレイリスト",
    comboNarration: "コンボナレーション", comboNarrationDesc: "各コンボの専用ボイス",
    on: "🔊 オン", off: "🔇 ミュート",
    addTrack: "MP3またはYouTube URL...", noTracks: "トラックなし",
    trackCount: (n: number) => `${n}曲 • 順番に再生`,
    rulesAndPrizes: "ルールと賞品", prizes: "賞品",
  },
  it: {
    title: "Tukka Slots", back: "Indietro", credits: "Crediti", vbms: "VBMS",
    freeSpins: "Giri Gratuiti", deposit: "Deposita", withdraw: "Preleva",
    error: "Errore", depositing: "Deposito in corso...", withdrawing: "Prelievo in corso...",
    success: "Successo", depositSuccess: "Depositato con successo!", withdrawSuccess: "Prelevato con successo!",
    insufficientBalance: "Saldo insufficiente", approveFirst: "Approva prima VBMS",
    connectWallet: "Collega portafoglio", rulesTitle: "Regole dello Slot",
    rules: ["Abbina 4 carte dello stesso rango per vincere!","Rango più alto = premi maggiori","Quad (4 identiche) paga 3×","10 giri gratuiti al giorno","Le carte foil sopravvivono ai combo"],
    settings: "Impostazioni", language: "Lingua",
    musicBg: "Musica di sottofondo", musicBgDesc: "BGM casinò durante il gioco",
    volume: "Volume", musicSource: "Fonte musicale",
    defaultMode: "🎰 Predefinito", playlistMode: "🎵 Playlist",
    comboNarration: "Narrazione Combo", comboNarrationDesc: "Voce esclusiva per ogni combo",
    on: "🔊 Attivo", off: "🔇 Muto",
    addTrack: "URL MP3 o YouTube...", noTracks: "Nessuna traccia aggiunta",
    trackCount: (n: number) => `${n} tracc${n !== 1 ? "e" : "ia"} • riproduzione sequenziale`,
    rulesAndPrizes: "Regole e Premi", prizes: "Premi",
  },
};

export default function SlotPage() {
  const { lang, setLang } = useLanguage();
  const { isConnected, address, status } = useAccount();
  const searchParams = useSearchParams();
  const replaySid = searchParams.get("replay");
  const replayUser = searchParams.get("user") ?? undefined;
  const chainId = useChainId();
  const isReconnecting = useReconnectTimeout(status);
  const { userProfile } = useProfile();
  // Detecta se está dentro do MiniappFrame do site (desktop)
  const isInFrame = useMiniappFrameContext();

  // Disclaimer — show once per device (skip in replay mode)
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  useEffect(() => {
    if (replaySid) return;
    if (typeof window !== "undefined" && !localStorage.getItem("slotDisclaimerSeen")) {
      setShowDisclaimer(true);
    }
  }, [replaySid]);
  function acceptDisclaimer() {
    localStorage.setItem("slotDisclaimerSeen", "1");
    setShowDisclaimer(false);
  }

  // VBMS hooks
  const { balance: vbmsBalance, refetch: refetchVBMS } = useFarcasterVBMSBalance(address || '');
  const { approve } = useFarcasterApproveVBMS();
  const { transfer } = useFarcasterTransferVBMS();
  const { claimVBMS } = useClaimVBMS();

  const replaySpinsRaw = useQuery(
    api.slot.getSpinsBySession,
    replaySid ? { sessionId: replaySid } : "skip"
  );

  const [replayPfp, setReplayPfp] = useState<string | undefined>();
  useEffect(() => {
    if (!replayUser || /^0x[0-9a-fA-F]{10,}/.test(replayUser)) return;
    fetch(`https://haatz.quilibrium.com/v2/farcaster/user/by-username?username=${encodeURIComponent(replayUser)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user?.pfp_url) setReplayPfp(d.user.pfp_url); })
      .catch(() => {});
  }, [replayUser]);
  const replaySpins = replaySpinsRaw?.map((s: { spinId: string; finalGrid: string[]; winAmount: number; foilCount: number; triggeredBonus: boolean }) => ({
    spinId: String(s.spinId),
    finalGrid: s.finalGrid,
    winAmount: s.winAmount,
    foilCount: s.foilCount,
    triggeredBonus: s.triggeredBonus,
  }));

  // SlotCoinShop state (must be declared before hooks that use them)
  const [buyCoinsAmount, setBuyCoinsAmount] = useState("1000");
  const [buyOption, setBuyOption] = useState<"vbms-deposit"|"base-eth"|"base-usdc"|"arb-eth"|"arb-usdn">("base-eth");
  const [buyDropOpen, setBuyDropOpen] = useState(false);
  const [buyStep, setBuyStep] = useState<"idle" | "approving" | "buying" | "done">("idle");

  // SlotCoinShop hooks
  const buyIsBase     = buyOption.startsWith("base");
  const buyIsETH      = buyOption.endsWith("eth");
  const buyShopAddr   = buyIsBase ? SLOT_SHOP_BASE : SLOT_SHOP_ARB;
  const buyStableAddr = buyIsBase ? USDC_BASE : USDN_ARB;
  const buyStableSym  = buyIsBase ? "USDC" : "USDN";
  const buyChainId    = buyIsBase ? 8453 : 42161;

  const { data: per100ETHRaw } = useReadContract({
    address: buyShopAddr,
    abi: SHOP_ABI,
    functionName: 'pricePerHundredETH',
    chainId: buyChainId,
    query: { staleTime: 30_000 },
  });
  const { data: per100StableRaw } = useReadContract({
    address: buyShopAddr,
    abi: SHOP_ABI,
    functionName: 'tokenPricePer100',
    args: [buyStableAddr],
    chainId: buyChainId,
    query: { staleTime: 30_000 },
  });

  // price per 100 coins in human units
  const per100ETH    = per100ETHRaw    ? Number(per100ETHRaw    as bigint) / 1e18 : 0;
  const per100Stable = per100StableRaw ? Number(per100StableRaw as bigint) / 1e6  : 0;

  // wallet balances for the selected buy option
  const { data: ethBalData } = useBalance({
    address: address as `0x${string}` | undefined,
    chainId: buyChainId,
    query: { enabled: !!address && buyIsETH && buyOption !== 'vbms-deposit', staleTime: 15_000 },
  });
  const { data: stableBalRaw } = useReadContract({
    address: buyStableAddr,
    abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }] as const,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    chainId: buyChainId,
    query: { enabled: !!address && !buyIsETH && buyOption !== 'vbms-deposit', staleTime: 15_000 },
  });
  const walletBalDisplay = buyOption === 'vbms-deposit' ? null
    : buyIsETH
      ? (ethBalData ? `${parseFloat(ethBalData.formatted).toFixed(4)} ETH` : null)
      : (stableBalRaw != null ? `${(Number(stableBalRaw as bigint) / 1e6).toFixed(2)} ${buyStableSym}` : null);

  const { writeContractAsync } = useWriteContract();

  const handleBuyCoins = async () => {
    if (!isConnected || !address) { toast.error(tr("connectWallet")); return; }
    if (buyStep !== "idle") return;

    const coins = Math.ceil((Number(buyCoinsAmount) || 0) / 100) * 100;
    if (coins < 100) { toast.error("Mínimo 100 coins"); return; }
    const hundreds = coins / 100;

    try {
      if (buyIsETH) {
        // add 1% slippage buffer
        const totalWei = BigInt(Math.round(per100ETH * hundreds * 1e18 * 1.01));
        setBuyStep("buying");
        setTxStatus(tr("depositing"));
        await writeContractAsync({
          address: buyShopAddr, abi: SHOP_ABI, functionName: 'buyCoins',
          args: [BigInt(coins)], value: totalWei, chainId: buyChainId,
        });
      } else {
        const totalStable = BigInt(Math.round(per100Stable * hundreds * 1e6));
        setBuyStep("approving");
        setTxStatus(`${tr("approveFirst")} ${buyStableSym}...`);
        await writeContractAsync({
          address: buyStableAddr, abi: ERC20_APPROVE_ABI, functionName: 'approve',
          args: [buyShopAddr, totalStable], chainId: buyChainId,
        });
        setBuyStep("buying");
        setTxStatus(tr("depositing"));
        await writeContractAsync({
          address: buyShopAddr, abi: SHOP_ABI, functionName: 'buyCoinsWithToken',
          args: [buyStableAddr, BigInt(coins)], chainId: buyChainId,
        });
      }
      setBuyStep("done");
      toast.success(`${coins.toLocaleString()} coins chegando!`);
      setTimeout(() => { setBuyStep("idle"); setShowDeposit(false); }, 2500);
    } catch (err: any) {
      console.error("[handleBuyCoins]", err);
      toast.error(err?.shortMessage || err?.message || tr("error"));
      setBuyStep("idle");
    } finally {
      setTxStatus("");
    }
  };

  const convex = useConvex();
  const statsQuery = useQuery(api.slot.getSlotDailyStats, {
    address: address || "",
  });

  // Altura real do viewport (window.innerHeight é confiável em WebViews/Farcaster)
  const [vh, setVh] = useState(0);
  const [isBaseApp, setIsBaseApp] = useState(false);
  useEffect(() => {
    setIsBaseApp(isBaseAppWebView());
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
  const [walletTab, setWalletTab] = useState<"deposit" | "withdraw" | "vbms">("deposit");
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
  }, [slotMusicMode, slotMusicEnabled, slotBgmBaseVolume]); // eslint-disable-line react-hooks/exhaustive-deps

  // Atualiza playlist no MusicContext sem reiniciar a track atual
  useEffect(() => {
    if (slotMusicMode === "playlist") {
      setGlobalPlaylist(slotPlaylist);
    }
  }, [slotPlaylist]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const currentVBMSBalance = vbmsBalance ? Number(vbmsBalance) : 0;

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

    setDepositStep("transferring");
    setTxStatus(tr("depositing"));
    setErrorMsg(null);

    try {
      const contract = getVBMSContract();
      const amountWei = parseEther(depositAmount);

      // Real ERC20 transfer to VBMSPoolTroll contract
      const txHash = await transfer(contract, amountWei);

      // Credit coins in Convex after real tx confirmed
      await convex.mutation(api.slot.depositVBMS, { address, amount, txHash });

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
      // Step 1: Prepare claim via REST (deducts coins + returns signature)
      const res = await fetch('/api/slot/prepare-withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, amount }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || tr("error"));

      toast.info("🔐 Aguardando assinatura da carteira...");

      // Step 2: Submit on-chain claim immediately after REST (preserves wallet popup gesture)
      let signingAddress = address as string;
      try {
        const provider = await getFarcasterSdkProvider();
        if (provider) {
          const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
          if (accounts && accounts.length > 0) signingAddress = accounts[0];
        }
      } catch (_) { /* use wagmi address */ }

      await claimVBMS(
        result.amount.toString(),
        result.nonce as `0x${string}`,
        result.signature as `0x${string}`
      );

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

  if (isReconnecting) return <PageLoadingSpinner />;

  if (!address) return <WalletGateScreen />;

  const disclaimerLang = SLOT_DISCLAIMER[lang] ?? SLOT_DISCLAIMER["en"]!;

  return (
    <>
      {/* ── DISCLAIMER MODAL ── */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.88)" }}>
          <div className="w-full max-w-sm rounded-2xl border-2 border-yellow-500 p-6 flex flex-col gap-4" style={{ background: "#0d0500", boxShadow: "0 0 40px rgba(200,121,65,0.4)" }}>
            <div className="text-center text-xl font-black text-yellow-400">{disclaimerLang.title}</div>
            <p className="text-sm text-gray-300 leading-relaxed text-center">{disclaimerLang.body}</p>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                id="disclaimer-check"
                checked={disclaimerChecked}
                onChange={e => setDisclaimerChecked(e.target.checked)}
                className="w-5 h-5 accent-yellow-400 cursor-pointer"
              />
              <span className="text-sm text-gray-300">{disclaimerLang.checkLabel}</span>
            </label>
            <button
              onClick={acceptDisclaimer}
              disabled={!disclaimerChecked}
              className="w-full h-12 rounded-xl border-2 border-black font-black text-sm uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              style={{ background: "linear-gradient(180deg,#ffd700,#c87941)", color: "#020617", boxShadow: "0 4px 0 #000" }}
            >
              {disclaimerLang.accept}
            </button>
          </div>
        </div>
      )}
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
          paddingTop: 'max(0.25rem, env(safe-area-inset-top))',
          paddingBottom: '0.25rem',
          borderBottom: '1px solid rgba(255,215,0,0.2)',
        }}>
          <Link href="/" className="px-2 py-1 bg-[#CC2222] hover:bg-[#AA1111] text-white text-[11px] font-black uppercase tracking-widest transition-all z-10">
            ← {tr("back")}
          </Link>
          <div className="flex-1 text-center">
            <h1 className="text-4xl font-extrabold tracking-tighter" style={{
              fontFamily: 'var(--font-cinzel)',
              letterSpacing: '-0.05em',
              color: 'transparent',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundImage: isBaseApp ? 'linear-gradient(180deg,#fff1a8 0%,#ffd700 45%,#c87941 100%)' : 'url("/slot-gifs/casino-slot-animation.gif")',
              backgroundSize: isBaseApp ? '100% 100%' : '190px auto',
              backgroundPosition: isBaseApp ? 'center' : 'center calc(50% + 82px)',
              backgroundRepeat: 'no-repeat',
              transform: 'scaleY(1.4)',
              display: 'inline-block',
              lineHeight: 1,
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
                <span className="font-black text-sm uppercase tracking-widest" style={{ color: '#FFD700' }}>⚙️ {tr("settings")}</span>
                <button onClick={() => setShowSlotSettings(false)} className="w-6 h-6 rounded-full bg-red-600 border-2 border-black font-black text-white text-sm flex items-center justify-center">×</button>
              </div>

              <div className="overflow-y-auto flex-1 p-4 space-y-5">
                {/* ── Idioma ── */}
                <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: '#1a0800', border: '1px solid #3a2000' }}>
                  <span className="text-sm font-black text-yellow-300">🌐 {tr("language")}</span>
                  <select
                    value={lang}
                    onChange={e => setLang(e.target.value as any)}
                    className="text-[11px] font-bold rounded border-2 border-[#c87941] px-2 py-1 outline-none cursor-pointer"
                    style={{ background: '#0d0500', color: '#FFD700' }}
                  >
                    <option value="en">🇺🇸 English</option>
                    <option value="pt-BR">🇧🇷 Português</option>
                    <option value="es">🇪🇸 Español</option>
                    <option value="hi">🇮🇳 हिन्दी</option>
                    <option value="ru">🇷🇺 Русский</option>
                    <option value="zh-CN">🇨🇳 中文</option>
                    <option value="id">🇮🇩 Indonesia</option>
                    <option value="fr">🇫🇷 Français</option>
                    <option value="ja">🇯🇵 日本語</option>
                    <option value="it">🇮🇹 Italiano</option>
                  </select>
                </div>

                <div style={{ height: 1, background: '#3a2000' }} />

                {/* ── Música ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-yellow-300">🎵 {tr("musicBg")}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{tr("musicBgDesc")}</div>
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
                    >{!slotMusicEnabled ? tr("off") : tr("on")}</button>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: '#1a0800', border: '1px solid #3a2000' }}>
                    <span className="text-[11px] font-bold text-yellow-300">🔉 {tr("volume")}</span>
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
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{tr("musicSource")}</div>
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
                        >{mode === "default" ? tr("defaultMode") : tr("playlistMode")}</button>
                      ))}
                    </div>

                    {/* Playlist */}
                    {slotMusicMode === "playlist" && (
                      <div className="space-y-2 pt-1">
                        {/* Add URL row */}
                        <div className="flex gap-2">
                          <input
                            type="url"
                            placeholder={tr("addTrack")}
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
                          <div className="text-center text-[10px] text-gray-600 py-2">{tr("noTracks")}</div>
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
                            {(tr("trackCount") as any)(slotPlaylist.length)}
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
                    <div className="text-sm font-black text-yellow-300">🎙️ {tr("comboNarration")}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{tr("comboNarrationDesc")}</div>
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
                  >{narrationMuted ? tr("off") : tr("on")}</button>
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
                <span className="font-black text-xs uppercase tracking-widest text-black">{tr("rulesAndPrizes")}</span>
                <button onClick={() => setShowRules(false)} className="rounded-full flex items-center justify-center" style={{ background: '#DC2626', width: 24, height: 24, color: '#fff', fontSize: 16, lineHeight: 1, fontWeight: 700 }}>×</button>
              </div>
              <div className="overflow-y-auto p-4 space-y-4">
                {/* Rules */}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-yellow-400 mb-2">{tr("rulesTitle")}</div>
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
                  <div className="text-[10px] font-black uppercase tracking-widest text-yellow-400 mb-2">{tr("prizes")}</div>
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
                  <p className="text-[9px] text-center text-gray-500 pt-2">{tr("prizesNote") || "Prizes multiply by bet amount"}</p>
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
            replaySpins={replaySpins}
            replayUsername={replayUser}
            replayPfp={replayPfp}
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
                <button key={tab} onClick={() => setWalletTab(tab)}
                  className="flex-1 py-2 font-black text-xs uppercase tracking-widest transition-colors"
                  style={{
                    background: walletTab === tab ? (tab === "deposit" ? "#7c3aed" : "#1d4ed8") : "#100500",
                    color: walletTab === tab ? "#fff" : "#6b7280",
                    borderBottom: walletTab === tab ? "2px solid #FFD700" : "none",
                    textShadow: walletTab === tab ? "1px 1px 0 #000" : "none",
                  }}
                >
                  {tab === "deposit" ? "Depositar" : "Sacar VBMS"}
                </button>
              ))}
            </div>

            <div className="p-4">
              {walletTab === "deposit" ? (
                /* ── Depositar: dropdown com VBMS + cripto ── */
                buyStep === "done" ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">🎰</div>
                    <div className="font-black text-green-400 text-lg">Coins chegando!</div>
                    <div className="text-gray-400 text-xs mt-1">Crédito em instantes via blockchain</div>
                  </div>
                ) : buyStep !== "idle" || depositStep !== "amount" ? (
                  <div className="text-center py-8">
                    <div className="text-xl font-black text-[#FFD700] mb-4">⏳</div>
                    <div className="text-white font-bold text-sm">{txStatus}</div>
                    {errorMsg && <div className="text-red-400 text-sm mt-2">{errorMsg}</div>}
                  </div>
                ) : (
                  <>
                    {/* Dropdown customizado com logos de rede */}
                    {(() => {
                      const PAY_OPTS = [
                        { key:"vbms-deposit", label:"VBMS", sub:"da carteira",  logo: <img src="/tokens/vbms.png"  alt="VBMS" className="w-5 h-5 rounded-full object-cover border border-black shrink-0" /> },
                        { key:"base-eth",     label:"ETH",  sub:"Base",         logo: <img src="/tokens/eth.png"   alt="ETH"  className="w-5 h-5 rounded-full object-cover border border-black shrink-0" /> },
                        { key:"base-usdc",    label:"USDC", sub:"Base",         logo: <img src="/tokens/usdc.png"  alt="USDC" className="w-5 h-5 rounded-full object-cover border border-black shrink-0" /> },
                        { key:"arb-eth",      label:"ETH",  sub:"Arbitrum",     logo: <img src="/tokens/eth.png"   alt="ETH"  className="w-5 h-5 rounded-full object-cover border border-black shrink-0" /> },
                        { key:"arb-usdn",     label:"USDN", sub:"Arbitrum",     logo: <img src="/tokens/usnd.avif" alt="USDN" className="w-5 h-5 rounded-full object-cover border border-black shrink-0" /> },
                      ] as const;
                      const selected = PAY_OPTS.find(o => o.key === buyOption)!;
                      return (
                        <div className="mb-3 relative">
                          <label className="text-gray-400 text-xs font-bold mb-1.5 block">Trocar por coins</label>
                          <button
                            onClick={() => setBuyDropOpen(v => !v)}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-[#0a0a0a] border-2 border-[#c87941]/60 rounded text-left"
                          >
                            {selected.logo}
                            <span className="font-black text-white text-sm">{selected.label}</span>
                            <span className="text-gray-500 text-xs">{selected.sub}</span>
                            <span className="ml-auto text-gray-400 text-xs">{buyDropOpen ? "▲" : "▼"}</span>
                          </button>
                          {buyDropOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border-2 border-[#c87941]/40 rounded overflow-hidden shadow-xl">
                              {PAY_OPTS.map(opt => (
                                <button key={opt.key}
                                  onClick={() => { setBuyOption(opt.key); setBuyDropOpen(false); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-colors"
                                  style={{ background: opt.key === buyOption ? "#1a1a0a" : undefined }}>
                                  {opt.logo}
                                  <span className="font-black text-white text-sm">{opt.label}</span>
                                  <span className="text-gray-500 text-xs">{opt.sub}</span>
                                  {opt.key === buyOption && <span className="ml-auto text-yellow-400 text-xs">✓</span>}
                                </button>
                              ))}
                            </div>
                          )}
                          {/* Exchange rate */}
                          {buyOption !== "vbms-deposit" && (
                            <div className="text-xs text-gray-500 mt-1.5 pl-1 flex items-center gap-2 flex-wrap">
                              {per100ETH > 0 || per100Stable > 0 ? (
                                <>
                                  <span>100K coins ≈ </span>
                                  <span className="text-yellow-400 font-bold">
                                    {buyIsETH
                                      ? `${(per100ETH * 1000).toFixed(6)} ETH`
                                      : `$${(per100Stable * 1000).toFixed(4)}`}
                                  </span>
                                  {buyIsETH && per100Stable > 0 && (
                                    <span className="text-gray-600">(≈ ${(per100Stable * 1000).toFixed(2)})</span>
                                  )}
                                </>
                              ) : <span>carregando taxa...</span>}
                              {walletBalDisplay && (
                                <span className="ml-auto text-gray-400">
                                  saldo: <span className="text-blue-400 font-bold">{walletBalDisplay}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Input de quantidade */}
                    <div className="mb-3">
                      <label className="text-white text-xs font-bold mb-1.5 block">
                        {buyOption === "vbms-deposit" ? "Quantidade (VBMS)" : "Quantidade de Coins"}
                      </label>
                      {buyOption === "vbms-deposit" ? (
                        <>
                          <input
                            type="number" value={depositAmount}
                            onChange={e => setDepositAmount(e.target.value)}
                            className="w-full bg-black border-2 border-green-500/50 rounded px-3 py-2.5 text-white font-bold text-lg focus:outline-none focus:border-green-500"
                            placeholder="100" min="1" max={DEPOSIT_MAX}
                          />
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-gray-500">Saldo: <span className="text-green-400 font-bold">{currentVBMSBalance.toFixed(2)} VBMS</span></span>
                            <span className="text-gray-600">Máx: {DEPOSIT_MAX}</span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            {DEPOSIT_PRESETS.map(p => (
                              <button key={p} onClick={() => setDepositAmount(p.toString())}
                                className="py-1.5 border border-green-500/30 rounded text-green-400 font-bold text-sm hover:bg-green-600/20">{p}</button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <input
                          type="number" value={buyCoinsAmount}
                          onChange={e => setBuyCoinsAmount(e.target.value)}
                          className="w-full bg-black border-2 border-[#c87941]/50 rounded px-3 py-2.5 text-white font-bold text-lg focus:outline-none focus:border-[#c87941]"
                          placeholder="1000" min="100" step="100"
                        />
                      )}
                    </div>

                    {/* Summary para cripto */}
                    {buyOption !== "vbms-deposit" && (() => {
                      const coins = Math.ceil((Number(buyCoinsAmount) || 0) / 100) * 100;
                      const hundreds = coins / 100;
                      const total = buyIsETH ? per100ETH * hundreds : per100Stable * hundreds;
                      return coins > 0 ? (
                        <div className="bg-[#0a0a0a] rounded-lg p-3 mb-3 border border-[#c87941]/20 text-xs">
                          <div className="flex justify-between text-gray-400 mb-1.5">
                            <span>Você recebe</span>
                            <span className="text-yellow-400 font-black">{coins.toLocaleString()} coins</span>
                          </div>
                          <div className="flex justify-between font-black text-sm border-t border-[#c87941]/20 pt-1.5">
                            <span className="text-gray-300">Total</span>
                            <div className="text-right">
                              <div className="text-white">
                                {buyIsETH ? `${total.toFixed(6)} ETH` : `$${total.toFixed(4)} ${buyStableSym}`}
                              </div>
                              {buyIsETH && per100Stable > 0 && (
                                <div className="text-gray-500 text-xs font-normal">≈ ${(per100Stable * hundreds).toFixed(4)} USD</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Botão */}
                    {buyOption === "vbms-deposit" ? (
                      <button onClick={handleDeposit}
                        disabled={!depositAmount || Number(depositAmount) <= 0 || Number(depositAmount) > Math.min(currentVBMSBalance, DEPOSIT_MAX)}
                        className="w-full py-3 font-black text-sm uppercase border-2 border-black disabled:opacity-50"
                        style={{ background:"linear-gradient(180deg,#22c55e,#15803d)", color:"#fff", textShadow:"1px 1px 0 #000" }}>
                        Depositar VBMS
                      </button>
                    ) : (
                      <button onClick={handleBuyCoins}
                        disabled={buyIsETH ? per100ETH === 0 : per100Stable === 0}
                        className="w-full py-3 font-black text-sm uppercase border-2 border-black disabled:opacity-50"
                        style={{ background:"linear-gradient(180deg,#c87941,#7a4520)", color:"#fff", textShadow:"1px 1px 0 #000" }}>
                        Comprar Coins
                      </button>
                    )}
                  </>
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
