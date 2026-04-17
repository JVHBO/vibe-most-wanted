import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const APP_URL = "https://vibemostwanted.xyz";
const VIBE_MARKET_URL = "https://vibechain.com/market/vibe-most-wanted";
const VBMS_CONTRACT = "0xf14c1dc8ce5fe65413379f76c43fa1460c31e728";

const PRIZE_POOL = [
  { tokenId: 15173, name: "Horsefarts",      img: "/images/baccarat/10%20clubs%2C%20horsefarts.png" },
  { tokenId: 15199, name: "JC Denton",       img: "/images/baccarat/10%20spades%2C%20jc%20denton.png" },
  { tokenId: 15172, name: "Beeper",          img: "/images/baccarat/10%20diamonds%2C%20beeper.png" },
  { tokenId: 14106, name: "Vibe Intern",     img: "/images/baccarat/9%20spades%2C%20vibe%20intern.png" },
  { tokenId: 15156, name: "Sartocrates",     img: "/images/baccarat/9%20hearts%2C%20sartocrates.png" },
  { tokenId: 15161, name: "Brian Armstrong", img: "/images/baccarat/jack%20clubs%2C%20brian%20armstrong.png" },
  { tokenId: 14768, name: "Jack the Sniper", img: "/images/baccarat/10%20hearts%2C%20jack%20the%20sniper.png" },
  { tokenId: 15218, name: "NFTKid",          img: "/images/baccarat/jack%20spades%2C%20nftkid.png" },
  { tokenId: 14440, name: "Slaterg",         img: "/images/baccarat/jack%20diamonds%2C%20slaterg.png" },
  { tokenId: 15164, name: "Zurkchad",        img: "/images/baccarat/jack%20hearts%2C%20zurkchad.png" },
];

const TIER_MILESTONES = [
  { tickets: 1,   cards: 1,  winners: 1 },
  { tickets: 20,  cards: 2,  winners: 1 },
  { tickets: 50,  cards: 4,  winners: 2 },
  { tickets: 100, cards: 6,  winners: 2 },
  { tickets: 150, cards: 8,  winners: 2 },
  { tickets: 200, cards: 10, winners: 2 },
];

// ── Translations ─────────────────────────────────────────────────────────────

type Lang = "en" | "pt-BR" | "es" | "hi" | "ru" | "zh-CN" | "id" | "fr" | "ja" | "it";

const VALID_LANGS: Lang[] = ["en", "pt-BR", "es", "hi", "ru", "zh-CN", "id", "fr", "ja", "it"];

const LANG_LABELS: Record<Lang, string> = {
  "en":    "🇺🇸 English",
  "pt-BR": "🇧🇷 Português",
  "es":    "🇪🇸 Español",
  "hi":    "🇮🇳 हिन्दी",
  "ru":    "🇷🇺 Русский",
  "zh-CN": "🇨🇳 中文",
  "id":    "🇮🇩 Bahasa",
  "fr":    "🇫🇷 Français",
  "ja":    "🇯🇵 日本語",
  "it":    "🇮🇹 Italiano",
};

interface Strings {
  header: string;
  tickets: string;
  pool: string;
  ended: string;
  timeLeft: (h: number) => string;
  nextTier: (t: number, w: number, c: number) => string;
  maxTier: string;
  tierInfo: (w: number, c: number) => string;
  buyTicket: string;
  prizePool: string;
  winners: string;
  share: string;
  shareText: string;
  prizeHeader: string;
  cardCounter: (n: number, t: number) => string;
  backRaffle: string;
  prev: string;
  next: string;
  winnersHeader: string;
  backToRaffle: string;
  chooseLang: string;
  langSub: string;
}

const T: Record<Lang, Strings> = {
  "en": {
    header: "🎰 Vibe Most Wanted Raffle · Epoch",
    tickets: "tickets",
    pool: "$25 pool",
    ended: "Ended",
    timeLeft: (h) => h > 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h left`,
    nextTier: (t, w, c) => `Next: ${t} tickets → ${w} winner${w > 1 ? "s" : ""} · ${c} cards`,
    maxTier: "🏆 Max tier reached! 2 winners · 10 cards",
    tierInfo: (w, c) => `Current tier: ${w} winner${w > 1 ? "s" : ""} · ${c} cards each · $0.06/ticket`,
    buyTicket: "Buy Ticket",
    prizePool: "Prize Pool",
    winners: "Winners",
    share: "Share",
    shareText: `🎰 Vibe Most Wanted Raffle\n$25 prize pool · 10 Epic VBMS Cards\n$0.06/ticket · Buy on Base or Arb!\n${APP_URL}/raffle`,
    prizeHeader: "🎁 Prize Pool · 10 Epic VBMS Cards",
    cardCounter: (n, t) => `Card ${n} of ${t} · $2.50 value`,
    backRaffle: "← Raffle",
    prev: "← Prev",
    next: "Next →",
    winnersHeader: "🏆 Past Winners",
    backToRaffle: "← Back to Raffle",
    chooseLang: "🌐 Choose your language",
    langSub: "$25 Prize Pool · 10 Epic Cards · $0.06/ticket",
  },
  "pt-BR": {
    header: "🎰 Vibe Most Wanted Raffle · Época",
    tickets: "ingressos",
    pool: "Pool $25",
    ended: "Encerrado",
    timeLeft: (h) => h > 24 ? `${Math.floor(h / 24)}d ${h % 24}h restantes` : `${h}h restantes`,
    nextTier: (t, w, c) => `Próximo: ${t} ingressos → ${w} vencedor${w > 1 ? "es" : ""} · ${c} cartas`,
    maxTier: "🏆 Nível máximo! 2 vencedores · 10 cartas",
    tierInfo: (w, c) => `Nível atual: ${w} vencedor${w > 1 ? "es" : ""} · ${c} cartas cada · $0,06/ingresso`,
    buyTicket: "Comprar Ingresso",
    prizePool: "Premiação",
    winners: "Vencedores",
    share: "Compartilhar",
    shareText: `🎰 Vibe Most Wanted Raffle\nPool de $25 · 10 Cartas VBMS Épicas\n$0,06/ingresso · Compre na Base ou Arb!\n${APP_URL}/raffle`,
    prizeHeader: "🎁 Premiação · 10 Cartas VBMS Épicas",
    cardCounter: (n, t) => `Carta ${n} de ${t} · Valor $2,50`,
    backRaffle: "← Raffle",
    prev: "← Ant.",
    next: "Próx. →",
    winnersHeader: "🏆 Vencedores Anteriores",
    backToRaffle: "← Voltar ao Raffle",
    chooseLang: "🌐 Escolha seu idioma",
    langSub: "Pool de $25 · 10 Cartas Épicas · $0,06/ingresso",
  },
  "es": {
    header: "🎰 Vibe Most Wanted Raffle · Época",
    tickets: "boletos",
    pool: "Pool $25",
    ended: "Finalizado",
    timeLeft: (h) => h > 24 ? `${Math.floor(h / 24)}d ${h % 24}h restantes` : `${h}h restantes`,
    nextTier: (t, w, c) => `Siguiente: ${t} boletos → ${w} ganador${w > 1 ? "es" : ""} · ${c} cartas`,
    maxTier: "🏆 ¡Nivel máximo! 2 ganadores · 10 cartas",
    tierInfo: (w, c) => `Nivel actual: ${w} ganador${w > 1 ? "es" : ""} · ${c} cartas cada uno · $0.06/boleto`,
    buyTicket: "Comprar Boleto",
    prizePool: "Premios",
    winners: "Ganadores",
    share: "Compartir",
    shareText: `🎰 Vibe Most Wanted Raffle\nPool de $25 · 10 Cartas VBMS Épicas\n$0.06/boleto · ¡Compra en Base o Arb!\n${APP_URL}/raffle`,
    prizeHeader: "🎁 Premios · 10 Cartas VBMS Épicas",
    cardCounter: (n, t) => `Carta ${n} de ${t} · $2.50`,
    backRaffle: "← Raffle",
    prev: "← Ant.",
    next: "Sig. →",
    winnersHeader: "🏆 Ganadores Anteriores",
    backToRaffle: "← Volver al Raffle",
    chooseLang: "🌐 Elige tu idioma",
    langSub: "Pool $25 · 10 Cartas Épicas · $0.06/boleto",
  },
  "hi": {
    header: "🎰 Vibe Most Wanted Raffle · Epoch",
    tickets: "टिकट",
    pool: "$25 पूल",
    ended: "समाप्त",
    timeLeft: (h) => h > 24 ? `${Math.floor(h / 24)}दिन ${h % 24}घंटे बाकी` : `${h}घंटे बाकी`,
    nextTier: (t, w, c) => `अगला: ${t} टिकट → ${w} विजेता · ${c} कार्ड`,
    maxTier: "🏆 अधिकतम स्तर! 2 विजेता · 10 कार्ड",
    tierInfo: (w, c) => `वर्तमान स्तर: ${w} विजेता · ${c} कार्ड प्रत्येक · $0.06/टिकट`,
    buyTicket: "टिकट खरीदें",
    prizePool: "पुरस्कार",
    winners: "विजेता",
    share: "शेयर",
    shareText: `🎰 Vibe Most Wanted Raffle\n$25 पुरस्कार पूल · 10 VBMS कार्ड\n$0.06/टिकट · Base या Arb पर खरीदें!\n${APP_URL}/raffle`,
    prizeHeader: "🎁 पुरस्कार · 10 VBMS एपिक कार्ड",
    cardCounter: (n, t) => `कार्ड ${n}/${t} · $2.50`,
    backRaffle: "← Raffle",
    prev: "← पिछला",
    next: "अगला →",
    winnersHeader: "🏆 पिछले विजेता",
    backToRaffle: "← Raffle पर वापस",
    chooseLang: "🌐 अपनी भाषा चुनें",
    langSub: "$25 पुरस्कार पूल · 10 एपिक कार्ड · $0.06/टिकट",
  },
  "ru": {
    header: "🎰 Vibe Most Wanted Raffle · Эпоха",
    tickets: "билетов",
    pool: "Пул $25",
    ended: "Завершён",
    timeLeft: (h) => h > 24 ? `${Math.floor(h / 24)}д ${h % 24}ч осталось` : `${h}ч осталось`,
    nextTier: (t, w, c) => `Следующий: ${t} билетов → ${w} победит. · ${c} карт`,
    maxTier: "🏆 Макс. уровень! 2 победителя · 10 карт",
    tierInfo: (w, c) => `Уровень: ${w} победит. · ${c} карт каждому · $0.06/билет`,
    buyTicket: "Купить билет",
    prizePool: "Призы",
    winners: "Победители",
    share: "Поделиться",
    shareText: `🎰 Vibe Most Wanted Raffle\nПул $25 · 10 эпических карт VBMS\n$0.06/билет · Base или Arb!\n${APP_URL}/raffle`,
    prizeHeader: "🎁 Призы · 10 карт VBMS",
    cardCounter: (n, t) => `Карта ${n} из ${t} · $2.50`,
    backRaffle: "← Raffle",
    prev: "← Назад",
    next: "Вперёд →",
    winnersHeader: "🏆 Прошлые победители",
    backToRaffle: "← Назад к Raffle",
    chooseLang: "🌐 Выберите язык",
    langSub: "Пул $25 · 10 эпических карт · $0.06/билет",
  },
  "zh-CN": {
    header: "🎰 Vibe Most Wanted Raffle · 第",
    tickets: "张票",
    pool: "$25 奖池",
    ended: "已结束",
    timeLeft: (h) => h > 24 ? `剩余${Math.floor(h / 24)}天${h % 24}小时` : `剩余${h}小时`,
    nextTier: (t, w, c) => `下一级: ${t}张票 → ${w}位获奖者 · ${c}张牌`,
    maxTier: "🏆 最高级别！2位获奖者 · 10张牌",
    tierInfo: (w, c) => `当前级别: ${w}位获奖者 · 每人${c}张牌 · $0.06/票`,
    buyTicket: "购买彩票",
    prizePool: "奖品",
    winners: "获奖者",
    share: "分享",
    shareText: `🎰 Vibe Most Wanted Raffle\n$25奖池 · 10张史诗VBMS卡\n$0.06/票 · 在Base或Arb购买！\n${APP_URL}/raffle`,
    prizeHeader: "🎁 奖品 · 10张VBMS史诗卡",
    cardCounter: (n, t) => `第${n}张/共${t}张 · $2.50`,
    backRaffle: "← Raffle",
    prev: "← 上一张",
    next: "下一张 →",
    winnersHeader: "🏆 历届获奖者",
    backToRaffle: "← 返回Raffle",
    chooseLang: "🌐 选择语言",
    langSub: "$25奖池 · 10张史诗卡 · $0.06/票",
  },
  "id": {
    header: "🎰 Vibe Most Wanted Raffle · Epoch",
    tickets: "tiket",
    pool: "Pool $25",
    ended: "Selesai",
    timeLeft: (h) => h > 24 ? `${Math.floor(h / 24)}h ${h % 24}j tersisa` : `${h}j tersisa`,
    nextTier: (t, w, c) => `Berikutnya: ${t} tiket → ${w} pemenang · ${c} kartu`,
    maxTier: "🏆 Level maks! 2 pemenang · 10 kartu",
    tierInfo: (w, c) => `Level saat ini: ${w} pemenang · ${c} kartu masing-masing · $0.06/tiket`,
    buyTicket: "Beli Tiket",
    prizePool: "Hadiah",
    winners: "Pemenang",
    share: "Bagikan",
    shareText: `🎰 Vibe Most Wanted Raffle\nPool $25 · 10 Kartu VBMS Epik\n$0.06/tiket · Beli di Base atau Arb!\n${APP_URL}/raffle`,
    prizeHeader: "🎁 Hadiah · 10 Kartu VBMS Epik",
    cardCounter: (n, t) => `Kartu ${n} dari ${t} · $2.50`,
    backRaffle: "← Raffle",
    prev: "← Sebelum",
    next: "Berikut →",
    winnersHeader: "🏆 Pemenang Sebelumnya",
    backToRaffle: "← Kembali ke Raffle",
    chooseLang: "🌐 Pilih bahasa Anda",
    langSub: "Pool $25 · 10 Kartu Epik · $0.06/tiket",
  },
  "fr": {
    header: "🎰 Vibe Most Wanted Raffle · Époque",
    tickets: "billets",
    pool: "Cagnotte $25",
    ended: "Terminé",
    timeLeft: (h) => h > 24 ? `${Math.floor(h / 24)}j ${h % 24}h restantes` : `${h}h restantes`,
    nextTier: (t, w, c) => `Prochain: ${t} billets → ${w} gagnant${w > 1 ? "s" : ""} · ${c} cartes`,
    maxTier: "🏆 Niveau max! 2 gagnants · 10 cartes",
    tierInfo: (w, c) => `Niveau actuel: ${w} gagnant${w > 1 ? "s" : ""} · ${c} cartes chacun · $0.06/billet`,
    buyTicket: "Acheter un billet",
    prizePool: "Prix",
    winners: "Gagnants",
    share: "Partager",
    shareText: `🎰 Vibe Most Wanted Raffle\nCagnotte $25 · 10 Cartes VBMS Épiques\n$0.06/billet · Achetez sur Base ou Arb!\n${APP_URL}/raffle`,
    prizeHeader: "🎁 Prix · 10 Cartes VBMS Épiques",
    cardCounter: (n, t) => `Carte ${n} sur ${t} · $2.50`,
    backRaffle: "← Raffle",
    prev: "← Préc.",
    next: "Suiv. →",
    winnersHeader: "🏆 Anciens Gagnants",
    backToRaffle: "← Retour au Raffle",
    chooseLang: "🌐 Choisissez votre langue",
    langSub: "Cagnotte $25 · 10 Cartes Épiques · $0.06/billet",
  },
  "ja": {
    header: "🎰 Vibe Most Wanted Raffle · Epoch",
    tickets: "枚のチケット",
    pool: "$25 プール",
    ended: "終了",
    timeLeft: (h) => h > 24 ? `残り${Math.floor(h / 24)}日${h % 24}時間` : `残り${h}時間`,
    nextTier: (t, w, c) => `次: ${t}枚 → ${w}名当選 · ${c}枚のカード`,
    maxTier: "🏆 最高ランク達成！2名当選 · 10枚",
    tierInfo: (w, c) => `現在のランク: ${w}名当選 · 各${c}枚 · $0.06/チケット`,
    buyTicket: "チケット購入",
    prizePool: "賞品",
    winners: "当選者",
    share: "シェア",
    shareText: `🎰 Vibe Most Wanted Raffle\n$25賞金 · 10枚のVBMSカード\n$0.06/チケット · BaseまたはArbで購入！\n${APP_URL}/raffle`,
    prizeHeader: "🎁 賞品 · 10枚のVBMSカード",
    cardCounter: (n, t) => `カード ${n}/${t} · $2.50`,
    backRaffle: "← Raffle",
    prev: "← 前へ",
    next: "次へ →",
    winnersHeader: "🏆 過去の当選者",
    backToRaffle: "← Raffleに戻る",
    chooseLang: "🌐 言語を選択",
    langSub: "$25賞金プール · 10枚のエピックカード · $0.06/チケット",
  },
  "it": {
    header: "🎰 Vibe Most Wanted Raffle · Epoca",
    tickets: "biglietti",
    pool: "Pool $25",
    ended: "Terminato",
    timeLeft: (h) => h > 24 ? `${Math.floor(h / 24)}g ${h % 24}h rimanenti` : `${h}h rimanenti`,
    nextTier: (t, w, c) => `Prossimo: ${t} biglietti → ${w} vincitor${w > 1 ? "i" : "e"} · ${c} carte`,
    maxTier: "🏆 Livello max! 2 vincitori · 10 carte",
    tierInfo: (w, c) => `Livello attuale: ${w} vincitor${w > 1 ? "i" : "e"} · ${c} carte ciascuno · $0.06/biglietto`,
    buyTicket: "Acquista biglietto",
    prizePool: "Premi",
    winners: "Vincitori",
    share: "Condividi",
    shareText: `🎰 Vibe Most Wanted Raffle\nPool $25 · 10 Carte VBMS Epiche\n$0.06/biglietto · Acquista su Base o Arb!\n${APP_URL}/raffle`,
    prizeHeader: "🎁 Premi · 10 Carte VBMS Epiche",
    cardCounter: (n, t) => `Carta ${n} di ${t} · $2.50`,
    backRaffle: "← Raffle",
    prev: "← Prec.",
    next: "Succ. →",
    winnersHeader: "🏆 Vincitori Precedenti",
    backToRaffle: "← Torna al Raffle",
    chooseLang: "🌐 Scegli la tua lingua",
    langSub: "Pool $25 · 10 Carte Epiche · $0.06/biglietto",
  },
};

function getLang(raw: string | null): Lang {
  if (raw && VALID_LANGS.includes(raw as Lang)) return raw as Lang;
  return "en";
}

function langKey(lang: Lang) {
  return lang.replace(/[^a-zA-Z0-9]/g, "_");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTier(total: number) {
  let tier = TIER_MILESTONES[0];
  for (const t of TIER_MILESTONES) {
    if (total >= t.tickets) tier = t;
  }
  return tier;
}

function getNextTier(total: number) {
  return TIER_MILESTONES.find(t => total < t.tickets) ?? null;
}

function opensea(tokenId: number) {
  return `https://opensea.io/assets/base/${VBMS_CONTRACT}/${tokenId}`;
}

function snapUrl(params: Record<string, string | number>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) q.set(k, String(v));
  return `${APP_URL}/api/snap/raffle?${q.toString()}`;
}

// ── Views ─────────────────────────────────────────────────────────────────────

function buildLangView(): object {
  const row1 = VALID_LANGS.slice(0, 5);
  const row2 = VALID_LANGS.slice(5);

  const elements: Record<string, object> = {
    root: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["header", "row1", "row2"],
    },
    header: {
      type: "text",
      props: {
        content: "🎰 Vibe Most Wanted\n$25 Prize Pool · 10 Epic Cards · $0.06/ticket\n\n🌐 Choose your language",
        weight: "bold",
        size: "md",
        align: "center",
      },
    },
    row1: {
      type: "stack",
      props: { direction: "horizontal", gap: "sm", justify: "center" },
      children: row1.map(l => `btn_${langKey(l)}`),
    },
    row2: {
      type: "stack",
      props: { direction: "horizontal", gap: "sm", justify: "center" },
      children: row2.map(l => `btn_${langKey(l)}`),
    },
  };

  for (const lang of VALID_LANGS) {
    elements[`btn_${langKey(lang)}`] = {
      type: "button",
      props: { label: LANG_LABELS[lang], variant: "secondary" },
      on: {
        press: {
          action: "submit",
          params: { target: snapUrl({ view: "main", lang }) },
        },
      },
    };
  }

  return { version: "2.0", theme: { accent: "yellow" }, ui: { root: "root", elements } };
}

function buildMainView(totalTickets: number, epoch: number, timeLeftHours: number | null, lang: Lang): object {
  const s = T[lang];
  const tier = getTier(totalTickets);
  const nextTier = getNextTier(totalTickets);
  const timeStr = timeLeftHours != null ? s.timeLeft(timeLeftHours) : s.ended;

  const elements: Record<string, object> = {
    root: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["header", "stats_row", "progress_bar", "tier_info", "btns"],
    },
    header: {
      type: "text",
      props: { content: `${s.header} ${epoch}`, weight: "bold", size: "md", align: "center" },
    },
    stats_row: {
      type: "stack",
      props: { direction: "horizontal", gap: "md", justify: "between" },
      children: ["tickets_badge", "pool_badge", "time_badge"],
    },
    tickets_badge: {
      type: "badge",
      props: { label: `${totalTickets} ${s.tickets}`, color: "accent" },
    },
    pool_badge: {
      type: "badge",
      props: { label: s.pool, color: "accent" },
    },
    time_badge: {
      type: "badge",
      props: { label: timeStr, color: "accent" },
    },
    progress_bar: {
      type: "progress",
      props: {
        value: nextTier ? totalTickets : 200,
        max: nextTier ? nextTier.tickets : 200,
        label: nextTier
          ? s.nextTier(nextTier.tickets, nextTier.winners, nextTier.cards)
          : s.maxTier,
      },
    },
    tier_info: {
      type: "text",
      props: {
        content: s.tierInfo(tier.winners, tier.cards / tier.winners),
        size: "sm",
        align: "center",
      },
    },
    btns: {
      type: "stack",
      props: { direction: "horizontal", gap: "sm", justify: "center" },
      children: ["btn_buy", "btn_prizes", "btn_winners", "btn_share"],
    },
    btn_buy: {
      type: "button",
      props: { label: s.buyTicket, variant: "primary", icon: "ticket" },
      on: { press: { action: "open_mini_app", params: { target: `${APP_URL}/raffle` } } },
    },
    btn_prizes: {
      type: "button",
      props: { label: s.prizePool, variant: "secondary", icon: "gift" },
      on: { press: { action: "submit", params: { target: snapUrl({ view: "prize", page: 0, lang }) } } },
    },
    btn_winners: {
      type: "button",
      props: { label: s.winners, variant: "secondary", icon: "trophy" },
      on: { press: { action: "submit", params: { target: snapUrl({ view: "winners", lang }) } } },
    },
    btn_share: {
      type: "button",
      props: { label: s.share, variant: "secondary", icon: "share" },
      on: { press: { action: "compose_cast", params: { text: s.shareText } } },
    },
  };

  return { version: "2.0", theme: { accent: "yellow" }, ui: { root: "root", elements } };
}

function buildPrizeView(page: number, lang: Lang): object {
  const s = T[lang];
  const card = PRIZE_POOL[page];
  const total = PRIZE_POOL.length;
  const imgUrl = APP_URL + card.img;

  const elements: Record<string, object> = {
    root: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["header", "card_img", "card_name", "card_counter", "links_row", "nav_btns"],
    },
    header: {
      type: "text",
      props: { content: s.prizeHeader, weight: "bold", size: "md", align: "center" },
    },
    card_img: {
      type: "image",
      props: { url: imgUrl, aspect: "1:1", alt: card.name },
    },
    card_name: {
      type: "text",
      props: { content: `#${page + 1} — ${card.name}`, weight: "bold", size: "md", align: "center" },
    },
    card_counter: {
      type: "text",
      props: { content: s.cardCounter(page + 1, total), size: "sm", align: "center" },
    },
    links_row: {
      type: "stack",
      props: { direction: "horizontal", gap: "sm", justify: "center" },
      children: ["btn_opensea", "btn_market"],
    },
    btn_opensea: {
      type: "button",
      props: { label: "OpenSea", variant: "secondary", icon: "external-link" },
      on: { press: { action: "open_url", params: { target: opensea(card.tokenId) } } },
    },
    btn_market: {
      type: "button",
      props: { label: "VibeMarket", variant: "secondary", icon: "external-link" },
      on: { press: { action: "open_url", params: { target: VIBE_MARKET_URL } } },
    },
    nav_btns: {
      type: "stack",
      props: { direction: "horizontal", gap: "sm", justify: "between" },
      children: [
        "btn_back_main",
        ...(page > 0 ? ["btn_prev"] : []),
        ...(page < total - 1 ? ["btn_next"] : []),
        "btn_buy",
      ],
    },
    btn_back_main: {
      type: "button",
      props: { label: s.backRaffle, variant: "secondary" },
      on: { press: { action: "submit", params: { target: snapUrl({ view: "main", lang }) } } },
    },
    btn_buy: {
      type: "button",
      props: { label: s.buyTicket, variant: "primary", icon: "ticket" },
      on: { press: { action: "open_mini_app", params: { target: `${APP_URL}/raffle` } } },
    },
  };

  if (page > 0) {
    elements["btn_prev"] = {
      type: "button",
      props: { label: s.prev, variant: "secondary" },
      on: { press: { action: "submit", params: { target: snapUrl({ view: "prize", page: page - 1, lang }) } } },
    };
  }

  if (page < total - 1) {
    elements["btn_next"] = {
      type: "button",
      props: { label: s.next, variant: "primary" },
      on: { press: { action: "submit", params: { target: snapUrl({ view: "prize", page: page + 1, lang }) } } },
    };
  }

  return { version: "2.0", theme: { accent: "yellow" }, ui: { root: "root", elements } };
}

function buildWinnersView(results: any[], lang: Lang): object {
  const s = T[lang];

  const elements: Record<string, object> = {
    root: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["header", "results_group", "btn_back"],
    },
    header: {
      type: "text",
      props: { content: s.winnersHeader, weight: "bold", size: "md", align: "center" },
    },
    results_group: {
      type: "item_group",
      props: { border: true, separator: true },
      children: results.slice(0, 6).map((_, i) => `result_${i}`),
    },
    btn_back: {
      type: "button",
      props: { label: s.backToRaffle, variant: "secondary" },
      on: { press: { action: "submit", params: { target: snapUrl({ view: "main", lang }) } } },
    },
  };

  results.slice(0, 6).forEach((r, i) => {
    const winner = r.username ? `@${r.username}` : r.winner ? r.winner.slice(0, 8) + "…" : "Unknown";
    const chain = r.winnerChain ? r.winnerChain.toUpperCase() : "";
    const prize = r.prizeDescription ?? "Prize";
    elements[`result_${i}`] = {
      type: "item",
      props: {
        title: `Epoch #${r.epoch} — ${winner}`,
        description: `Ticket #${r.winnerTicket} · ${chain} · ${prize.slice(0, 60)}`,
      },
    };
  });

  return { version: "2.0", theme: { accent: "yellow" }, ui: { root: "root", elements } };
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getRaffleData() {
  try {
    const convex = new ConvexHttpClient(CONVEX_URL);
    const [config, liveState] = await Promise.all([
      convex.query(api.raffle.getRaffleConfig),
      convex.action(api.raffle.getLiveRaffleState),
    ]);
    const totalTickets = (liveState as any)?.totalTickets ?? 0;
    const epoch = (config as any)?.epoch ?? 6;
    const updatedAt = (config as any)?.updatedAt ?? Date.now();
    const durationDays = (config as any)?.durationDays ?? 7;
    const endsAt = updatedAt + durationDays * 86400000;
    const diffMs = endsAt - Date.now();
    const timeLeftHours = diffMs > 0 ? Math.floor(diffMs / 3600000) : null;
    return { totalTickets, epoch, timeLeftHours };
  } catch {
    return { totalTickets: 0, epoch: 6, timeLeftHours: null };
  }
}

async function getPastResults() {
  try {
    const convex = new ConvexHttpClient(CONVEX_URL);
    const results = await convex.query(api.raffle.getAllRaffleResults);
    return (results as any[]).reverse();
  } catch {
    return [];
  }
}

// ── Route handlers ────────────────────────────────────────────────────────────

const SNAP_CONTENT_TYPE = "application/vnd.farcaster.snap+json";

const SNAP_HEADERS = {
  "Content-Type": SNAP_CONTENT_TYPE,
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: SNAP_HEADERS });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") ?? "lang";
  const page = Math.max(0, Math.min(9, parseInt(searchParams.get("page") ?? "0")));
  const lang = getLang(searchParams.get("lang"));

  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("application/vnd.farcaster.snap")) {
    return NextResponse.redirect(APP_URL + "/raffle");
  }

  let snap: object;
  if (view === "lang") {
    snap = buildLangView();
  } else if (view === "prize") {
    snap = buildPrizeView(page, lang);
  } else if (view === "winners") {
    const results = await getPastResults();
    snap = buildWinnersView(results, lang);
  } else {
    const data = await getRaffleData();
    snap = buildMainView(data.totalTickets, data.epoch, data.timeLeftHours, lang);
  }

  return NextResponse.json(snap, { headers: SNAP_HEADERS });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") ?? "lang";
  const page = Math.max(0, Math.min(9, parseInt(searchParams.get("page") ?? "0")));
  const lang = getLang(searchParams.get("lang"));

  let snap: object;
  if (view === "lang") {
    snap = buildLangView();
  } else if (view === "prize") {
    snap = buildPrizeView(page, lang);
  } else if (view === "winners") {
    const results = await getPastResults();
    snap = buildWinnersView(results, lang);
  } else {
    const data = await getRaffleData();
    snap = buildMainView(data.totalTickets, data.epoch, data.timeLeftHours, lang);
  }

  return NextResponse.json(snap, { headers: SNAP_HEADERS });
}
