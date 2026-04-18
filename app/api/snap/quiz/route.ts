import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const APP_URL   = "https://vibemostwanted.xyz";
const SNAP_URL  = `${APP_URL}/api/snap/quiz`;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const ALTERNATE_LINK = `<${SNAP_URL}>; rel="alternate"; type="application/vnd.farcaster.snap+json", <${SNAP_URL}>; rel="alternate"; type="text/html"`;

const SNAP_HEADERS = {
  "Content-Type": "application/vnd.farcaster.snap+json",
  "Cache-Control": "no-store",
  "Vary": "Accept",
  "Link": ALTERNATE_LINK,
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

// The ONE true hetero
const JVHBO_FID = 214746; // @jvhbo

// Images
const IMG_Q1     = `${APP_URL}/profile-bg.jpg`;
const IMG_NEYNAR = `${APP_URL}/vibemail/neymar.png`;
const IMG_PARTY  = `${APP_URL}/easteregg-background.png`;

type MaybeRecord = Record<string, unknown>;

// ── Languages ─────────────────────────────────────────────────────────────────

type Lang = "en" | "pt" | "es" | "fr" | "it";
const LANGS: Lang[] = ["en", "pt", "es", "fr", "it"];
const LANG_LABELS: Record<Lang, string> = {
  en: "English", pt: "Portugues", es: "Espanol", fr: "Francais", it: "Italiano",
};

// ── Translations ──────────────────────────────────────────────────────────────

interface Question {
  q: string; sub: string;
  a: string; scoreA: number;
  b: string; scoreB: number;
  c?: string; scoreC?: number;
}

interface T {
  title: string; sub: string; start: string;
  qof: (n: number, t: number) => string;
  changeLang: string; share: string; retry: string; seeResults: string;
  neynarQ: string; neynarSub: string; neynarPlaceholder: string; neynarNext: string;
  questions: Question[];
  resultTitle: (attempts: number) => string;
  resultDesc: (attempts: number) => string;
  shareText: (attempts: number, username: string) => string;
  congratsText: (username: string) => string;
  congrats: string;
  leaderboardTitle: string;
  leaderboardBack: string;
  heteroLabel: string;
  gayLabel: (attempts: number) => string;
}

const STRINGS: Record<Lang, T> = {
  en: {
    title: "Are You Gay? 🏳️‍🌈",
    sub: "A highly scientific 5-question quiz to reveal your true self.",
    start: "Find out the truth",
    qof: (n, t) => `Question ${n} of ${t}`,
    changeLang: "Change Language",
    share: "🔁 Share this quiz",
    retry: "↩ Try again (gay x2)",
    seeResults: "🏆 See others' results",
    congrats: "🎉 Congratulate me!",
    neynarQ: "What do you think about Neynar?",
    neynarSub: "Your answer won't change the result. Or will it? 👀",
    neynarPlaceholder: "Type your opinion...",
    neynarNext: "Submit →",
    questions: [
      { q: "Have you ever had sexual relations with someone of the same sex?", sub: "No judgment. This is science.", a: "Absolutely not", scoreA: 0, b: "I mean... maybe", scoreB: 1 },
      { q: "Do you organize your wardrobe by color?", sub: "This one reveals everything.", a: "I just throw stuff in", scoreA: 0, b: "By color AND texture", scoreB: 1 },
      { q: "At a sausage party, do you bring sausages... or buns?", sub: "Choose wisely.", a: "🌭 Sausages", scoreA: 1, b: "🥖 Buns", scoreB: 1, c: "👩 My mom", scoreC: 0 },
      { q: "At a BBQ, how do you eat the sausage?", sub: "No wrong answers... or are there?", a: "Normal, with bread", scoreA: 0, b: "I refuse to answer that", scoreB: 1 },
    ],
    resultTitle: (a) => a === 1 ? "You are Gay 🏳️‍🌈" : `You are Gay x${a} 🏳️‍🌈`,
    resultDesc: (a) => a === 1
      ? "Science has spoken. The rainbow has claimed you. Welcome to the team."
      : `You came back ${a} times. Every attempt doubles your gayness. Science is relentless.`,
    shareText: (a, u) => a === 1
      ? `I just took the 'Are You Gay?' quiz on @vibemostwanted and I AM GAY 🏳️‍🌈 (confirmed by science). Take it yourself:`
      : `I took the 'Are You Gay?' quiz on @vibemostwanted ${a} times. I am GAY x${a} 🏳️‍🌈. The more I try, the gayer I get. Take it:`,
    congratsText: (u) => `🎉 Congratulations to @${u} for coming out! 🏳️‍🌈 Science has confirmed it — you are officially GAY. We're proud of you! Take the quiz:`,
    leaderboardTitle: "🏳️‍🌈 Hall of Gay",
    leaderboardBack: "← Back",
    heteroLabel: "Hetero (unique)",
    gayLabel: (a) => a > 1 ? `Gay x${a}` : "Gay",
  },
  pt: {
    title: "Você Seria Gay? 🏳️‍🌈",
    sub: "Um questionário científico com 5 perguntas para revelar sua verdadeira essência.",
    start: "Descobrir minha verdade",
    qof: (n, t) => `Pergunta ${n} de ${t}`,
    changeLang: "Mudar Idioma",
    share: "🔁 Compartilhar o quiz",
    retry: "↩ Tentar de novo (gay x2)",
    seeResults: "🏆 Ver resultados",
    congrats: "🎉 Parabéns p/ mim!",
    neynarQ: "O que você pensa do Neynar?",
    neynarSub: "Sua resposta não muda o resultado. Ou muda? 👀",
    neynarPlaceholder: "Digite sua opinião...",
    neynarNext: "Enviar →",
    questions: [
      { q: "Você já teve relações com pessoas do mesmo sexo?", sub: "Sem julgamentos. Isso é ciência.", a: "Absolutamente não", scoreA: 0, b: "Tipo... talvez", scoreB: 1 },
      { q: "Você organiza seu guarda-roupa por cor?", sub: "Essa revela tudo.", a: "Jogo tudo dentro e fecho", scoreA: 0, b: "Por cor E textura", scoreB: 1 },
      { q: "Você numa festa de p*nis e bunda. O que você prefere levar?", sub: "Escolha com sabedoria.", a: "🍆 P*nis", scoreA: 1, b: "🍑 Bunda", scoreB: 1, c: "👩 A minha mãe", scoreC: 0 },
      { q: "No churrasco, você come a linguiça de qual jeito?", sub: "Não tem resposta errada... ou tem.", a: "Normal, com pão", scoreA: 0, b: "Não vou responder isso", scoreB: 1 },
    ],
    resultTitle: (a) => a === 1 ? "Você é Gay 🏳️‍🌈" : `Você é Gay x${a} 🏳️‍🌈`,
    resultDesc: (a) => a === 1
      ? "A ciência falou. O arco-íris te reivindicou. Bem-vindo ao time."
      : `Você voltou ${a} vezes. Cada tentativa dobra a sua gayness. A ciência é implacável.`,
    shareText: (a, u) => a === 1
      ? `Fiz o quiz 'Você Seria Gay?' no @vibemostwanted e EU SOU GAY 🏳️‍🌈 (confirmado pela ciência). Faça o seu:`
      : `Fiz o quiz 'Você Seria Gay?' no @vibemostwanted ${a} vezes. Sou GAY x${a} 🏳️‍🌈. Quanto mais tento, mais gay fico. Faça o seu:`,
    congratsText: (u) => `🎉 Parabéns para @${u} por se assumir! 🏳️‍🌈 A ciência confirmou — você é oficialmente GAY. Estamos orgulhosos! Faça o quiz:`,
    leaderboardTitle: "🏳️‍🌈 Hall of Gay",
    leaderboardBack: "← Voltar",
    heteroLabel: "Hétero (único)",
    gayLabel: (a) => a > 1 ? `Gay x${a}` : "Gay",
  },
  es: {
    title: "¿Eres Gay? 🏳️‍🌈",
    sub: "Un cuestionario científico de 5 preguntas para revelar tu verdadero yo.",
    start: "Descubrir la verdad",
    qof: (n, t) => `Pregunta ${n} de ${t}`,
    changeLang: "Cambiar Idioma",
    share: "🔁 Compartir el quiz",
    retry: "↩ Intentar de nuevo (gay x2)",
    seeResults: "🏆 Ver resultados",
    congrats: "🎉 ¡Felicítame!",
    neynarQ: "¿Qué piensas de Neynar?",
    neynarSub: "Tu respuesta no cambia el resultado. ¿O sí? 👀",
    neynarPlaceholder: "Escribe tu opinión...",
    neynarNext: "Enviar →",
    questions: [
      { q: "¿Has tenido relaciones con alguien del mismo sexo?", sub: "Sin juicios. Esto es ciencia.", a: "Absolutamente no", scoreA: 0, b: "Bueno... quizás", scoreB: 1 },
      { q: "¿Organizas tu armario por colores?", sub: "Esta lo revela todo.", a: "Tiro todo y cierro", scoreA: 0, b: "Por color Y textura", scoreB: 1 },
      { q: "Estás en una fiesta de p*nis y traseros. ¿Qué prefieres llevar?", sub: "Elige sabiamente.", a: "🍆 P*nis", scoreA: 1, b: "🍑 Trasero", scoreB: 1, c: "👩 Mi mamá", scoreC: 0 },
      { q: "En un asado, ¿cómo comes la salchicha?", sub: "No hay respuesta incorrecta... ¿o sí?", a: "Normal, con pan", scoreA: 0, b: "Me niego a responder", scoreB: 1 },
    ],
    resultTitle: (a) => a === 1 ? "Eres Gay 🏳️‍🌈" : `Eres Gay x${a} 🏳️‍🌈`,
    resultDesc: (a) => a === 1
      ? "La ciencia ha hablado. El arcoíris te ha reclamado. Bienvenido al equipo."
      : `Volviste ${a} veces. Cada intento duplica tu gayness. La ciencia es implacable.`,
    shareText: (a, u) => a === 1
      ? `Hice el quiz '¿Eres Gay?' en @vibemostwanted y SOY GAY 🏳️‍🌈 (confirmado por la ciencia). Pruébalo:`
      : `Hice el quiz '¿Eres Gay?' en @vibemostwanted ${a} veces. Soy GAY x${a} 🏳️‍🌈. Cuanto más intento, más gay soy. Pruébalo:`,
    congratsText: (u) => `🎉 ¡Felicidades a @${u} por salir del clóset! 🏳️‍🌈 La ciencia lo ha confirmado — eres oficialmente GAY. ¡Estamos orgullosos! Haz el quiz:`,
    leaderboardTitle: "🏳️‍🌈 Hall of Gay",
    leaderboardBack: "← Volver",
    heteroLabel: "Hetero (único)",
    gayLabel: (a) => a > 1 ? `Gay x${a}` : "Gay",
  },
  fr: {
    title: "Es-tu Gay? 🏳️‍🌈",
    sub: "Un quiz scientifique de 5 questions pour révéler ta vraie nature.",
    start: "Découvrir la vérité",
    qof: (n, t) => `Question ${n} sur ${t}`,
    changeLang: "Changer la Langue",
    share: "🔁 Partager le quiz",
    retry: "↩ Réessayer (gay x2)",
    seeResults: "🏆 Voir les résultats",
    congrats: "🎉 Félicitez-moi!",
    neynarQ: "Que penses-tu de Neynar?",
    neynarSub: "Ta réponse ne changera pas le résultat. Ou si? 👀",
    neynarPlaceholder: "Donne ton avis...",
    neynarNext: "Envoyer →",
    questions: [
      { q: "As-tu eu des relations avec quelqu'un du même sexe?", sub: "Sans jugement. C'est de la science.", a: "Absolument pas", scoreA: 0, b: "Disons... peut-être", scoreB: 1 },
      { q: "Organises-tu ta garde-robe par couleur?", sub: "Celle-ci révèle tout.", a: "Je jette tout dedans", scoreA: 0, b: "Par couleur ET texture", scoreB: 1 },
      { q: "Tu es à une soirée de p*nis et fesses. Que préfères-tu apporter?", sub: "Choisis bien.", a: "🍆 P*nis", scoreA: 1, b: "🍑 Fesses", scoreB: 1, c: "👩 Ma maman", scoreC: 0 },
      { q: "Au barbecue, comment manges-tu la saucisse?", sub: "Il n'y a pas de mauvaise réponse... ou si?", a: "Normalement, avec du pain", scoreA: 0, b: "Je refuse de répondre", scoreB: 1 },
    ],
    resultTitle: (a) => a === 1 ? "Tu es Gay 🏳️‍🌈" : `Tu es Gay x${a} 🏳️‍🌈`,
    resultDesc: (a) => a === 1
      ? "La science a parlé. L'arc-en-ciel t'a réclamé. Bienvenue dans l'équipe."
      : `Tu es revenu ${a} fois. Chaque tentative double ta gayness. La science est implacable.`,
    shareText: (a, u) => a === 1
      ? `Je viens de faire le quiz 'Es-tu Gay?' sur @vibemostwanted et JE SUIS GAY 🏳️‍🌈 (confirmé par la science). Essaie le tien:`
      : `J'ai fait le quiz 'Es-tu Gay?' sur @vibemostwanted ${a} fois. Je suis GAY x${a} 🏳️‍🌈. Plus j'essaie, plus je suis gay. Essaie:`,
    congratsText: (u) => `🎉 Félicitations à @${u} pour être sorti du placard! 🏳️‍🌈 La science le confirme — tu es officiellement GAY. Nous sommes fiers de toi! Fais le quiz:`,
    leaderboardTitle: "🏳️‍🌈 Hall of Gay",
    leaderboardBack: "← Retour",
    heteroLabel: "Hétéro (unique)",
    gayLabel: (a) => a > 1 ? `Gay x${a}` : "Gay",
  },
  it: {
    title: "Sei Gay? 🏳️‍🌈",
    sub: "Un quiz scientifico di 5 domande per rivelare il tuo vero io.",
    start: "Scopri la verità",
    qof: (n, t) => `Domanda ${n} di ${t}`,
    changeLang: "Cambia Lingua",
    share: "🔁 Condividi il quiz",
    retry: "↩ Riprova (gay x2)",
    seeResults: "🏆 Vedi i risultati",
    congrats: "🎉 Congratulami!",
    neynarQ: "Cosa pensi di Neynar?",
    neynarSub: "La risposta non cambia il risultato. O sì? 👀",
    neynarPlaceholder: "Scrivi la tua opinione...",
    neynarNext: "Invia →",
    questions: [
      { q: "Hai mai avuto relazioni con qualcuno dello stesso sesso?", sub: "Senza giudizi. Questa è scienza.", a: "Assolutamente no", scoreA: 0, b: "Tipo... forse", scoreB: 1 },
      { q: "Organizzi il tuo armadio per colore?", sub: "Questa la rivela tutto.", a: "Butto tutto dentro", scoreA: 0, b: "Per colore E texture", scoreB: 1 },
      { q: "Sei a una festa di p*nis e sedere. Cosa preferisci portare?", sub: "Scegli con saggezza.", a: "🍆 P*nis", scoreA: 1, b: "🍑 Sedere", scoreB: 1, c: "👩 Mia mamma", scoreC: 0 },
      { q: "Al barbecue, come mangi la salsiccia?", sub: "Non c'è risposta sbagliata... o sì?", a: "Normalmente, col pane", scoreA: 0, b: "Rifiuto di rispondere", scoreB: 1 },
    ],
    resultTitle: (a) => a === 1 ? "Sei Gay 🏳️‍🌈" : `Sei Gay x${a} 🏳️‍🌈`,
    resultDesc: (a) => a === 1
      ? "La scienza ha parlato. L'arcobaleno ti ha rivendicato. Benvenuto nella squadra."
      : `Sei tornato ${a} volte. Ogni tentativo raddoppia la tua gayness. La scienza è implacabile.`,
    shareText: (a, u) => a === 1
      ? `Ho appena fatto il quiz 'Sei Gay?' su @vibemostwanted e SONO GAY 🏳️‍🌈 (confermato dalla scienza). Provalo:`
      : `Ho fatto il quiz 'Sei Gay?' su @vibemostwanted ${a} volte. Sono GAY x${a} 🏳️‍🌈. Più ci provo, più sono gay. Provalo:`,
    congratsText: (u) => `🎉 Congratulazioni a @${u} per essersi dichiarato! 🏳️‍🌈 La scienza lo conferma — sei ufficialmente GAY. Siamo orgogliosi! Fai il quiz:`,
    leaderboardTitle: "🏳️‍🌈 Hall of Gay",
    leaderboardBack: "← Indietro",
    heteroLabel: "Etero (unico)",
    gayLabel: (a) => a > 1 ? `Gay x${a}` : "Gay",
  },
};

const TOTAL_STEPS = 5;

// ── Snap builder ──────────────────────────────────────────────────────────────

function snap(ui: object) {
  return NextResponse.json({ version: "2.0", ui }, { headers: SNAP_HEADERS });
}

function htmlFallback() {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Are You Gay? | Vibe Most Wanted</title>
    <meta name="description" content="A highly scientific 5-question quiz to reveal your true self." />
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #111111;
        color: #f5f5f5;
        font-family: Arial, sans-serif;
      }
      main {
        max-width: 520px;
        padding: 32px 24px;
        text-align: center;
      }
      a {
        display: inline-block;
        margin-top: 20px;
        padding: 12px 18px;
        background: #facc15;
        color: #111111;
        text-decoration: none;
        font-weight: 700;
      }
      p {
        color: #d4d4d4;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Are You Gay? 🏳️‍🌈</h1>
      <p>A highly scientific 5-question quiz to reveal your true self.</p>
      <a href="${APP_URL}/">Open Vibe Most Wanted</a>
    </main>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Vary": "Accept",
      "Link": ALTERNATE_LINK,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
    },
  });
}

function dotBar(filled: number, total: number) {
  return Array.from({ length: total }, (_, i) => i < filled ? "●" : "○").join(" ");
}

function asRecord(value: unknown): MaybeRecord {
  return value && typeof value === "object" ? (value as MaybeRecord) : {};
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string") {
      const normalized = value.trim().replace(/^@+/, "");
      if (normalized) return normalized.slice(0, 64);
    }
  }
  return null;
}

function readNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return 0;
}

function extractSnapUser(body: unknown) {
  const root = asRecord(body);
  const untrusted = asRecord(root.untrustedData);
  const trusted = asRecord(root.trustedData);
  const user = asRecord(root.user);
  const context = asRecord(root.context);
  const contextUser = asRecord(context.user);
  const interactor = asRecord(untrusted.interactor);

  const fid = readNumber(
    untrusted.fid,
    trusted.fid,
    user.fid,
    contextUser.fid,
    interactor.fid,
    root.fid,
  );

  const username = readString(
    untrusted.username,
    user.username,
    contextUser.username,
    interactor.username,
    root.username,
    untrusted.displayName,
    user.displayName,
    contextUser.displayName,
  ) ?? (fid ? `fid${fid}` : "unknown");

  return { fid, username };
}

// ── Views ─────────────────────────────────────────────────────────────────────

function viewLang(returnTarget: string) {
  const els: Record<string, object> = {
    root: { type: "stack", props: { direction: "vertical", gap: 2, padding: 3 }, children: ["hdr", ...LANGS.map(l => `btn_${l}`)] },
    hdr:  { type: "text", props: { content: "Choose language / Escolha o idioma", weight: "bold", size: "md", align: "center" } },
  };
  for (const l of LANGS) {
    els[`btn_${l}`] = {
      type: "button", props: { label: LANG_LABELS[l], variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${returnTarget}&lang=${l}` } } },
    };
  }
  return snap({ root: "root", elements: els });
}

function viewIntro(lang: Lang) {
  const s = STRINGS[lang];
  return snap({
    root: "root",
    elements: {
      root:      { type: "stack", props: { direction: "vertical", gap: 3, padding: 4 }, children: ["title", "sub", "btn_start", "btn_lang"] },
      title:     { type: "text", props: { content: s.title, weight: "bold", size: "xl", align: "center" } },
      sub:       { type: "text", props: { content: s.sub, size: "sm", align: "center", color: "muted" } },
      btn_start: { type: "button", props: { label: s.start, variant: "primary" }, on: { press: { action: "submit", params: { target: `${SNAP_URL}?view=q1&s=0&lang=${lang}` } } } },
      btn_lang:  { type: "button", props: { label: s.changeLang, variant: "secondary" }, on: { press: { action: "submit", params: { target: `${SNAP_URL}?view=lang&ret=${encodeURIComponent(`${SNAP_URL}?view=intro`)}` } } } },
    },
  });
}

// Step 1 — image profile-bg.jpg
function viewQ1(score: number, lang: Lang) {
  const s = STRINGS[lang];
  const q = s.questions[0];
  return snap({
    root: "root",
    elements: {
      root:     { type: "stack", props: { direction: "vertical", gap: 2, padding: 3 }, children: ["prog", "bar", "img", "question", "sub", "btn_a", "btn_b"] },
      prog:     { type: "text", props: { content: s.qof(1, TOTAL_STEPS), size: "xs", color: "muted", align: "center" } },
      bar:      { type: "text", props: { content: dotBar(1, TOTAL_STEPS), size: "sm", align: "center" } },
      img:      { type: "image", props: { src: IMG_Q1, aspectRatio: "2:1" } },
      question: { type: "text", props: { content: q.q, weight: "bold", size: "md", align: "center" } },
      sub:      { type: "text", props: { content: q.sub, size: "xs", color: "muted", align: "center" } },
      btn_a:    { type: "button", props: { label: q.a, variant: "primary" }, on: { press: { action: "submit", params: { target: `${SNAP_URL}?view=qn&s=${score + q.scoreA}&lang=${lang}` } } } },
      btn_b:    { type: "button", props: { label: q.b, variant: "secondary" }, on: { press: { action: "submit", params: { target: `${SNAP_URL}?view=qn&s=${score + q.scoreB}&lang=${lang}` } } } },
    },
  });
}

// Step 2 — Neynar (text input, image neymar.png)
function viewQNeynar(score: number, lang: Lang) {
  const s = STRINGS[lang];
  return snap({
    root: "root",
    elements: {
      root:     { type: "stack", props: { direction: "vertical", gap: 2, padding: 3 }, children: ["prog", "bar", "img", "question", "sub", "input", "btn_next"] },
      prog:     { type: "text", props: { content: s.qof(2, TOTAL_STEPS), size: "xs", color: "muted", align: "center" } },
      bar:      { type: "text", props: { content: dotBar(2, TOTAL_STEPS), size: "sm", align: "center" } },
      img:      { type: "image", props: { src: IMG_NEYNAR, aspectRatio: "2:1" } },
      question: { type: "text", props: { content: s.neynarQ, weight: "bold", size: "md", align: "center" } },
      sub:      { type: "text", props: { content: s.neynarSub, size: "xs", color: "muted", align: "center" } },
      input:    { type: "text_input", props: { placeholder: s.neynarPlaceholder, id: "neynar_opinion" } },
      btn_next: { type: "button", props: { label: s.neynarNext, variant: "primary" }, on: { press: { action: "submit", params: { target: `${SNAP_URL}?view=q&qi=1&s=${score}&lang=${lang}` } } } },
    },
  });
}

// Steps 3-5 — scored questions (qi = 1..3 → questions[qi])
function viewQGeneric(qi: number, score: number, lang: Lang) {
  const s = STRINGS[lang];
  const q = s.questions[qi];
  if (!q) return viewResult(score, lang, 0, "unknown");

  const step  = qi + 2;
  const isLast = qi === 3;
  const mkUrl  = (add: number) => isLast
    ? `${SNAP_URL}?view=result&s=${score + add}&lang=${lang}`
    : `${SNAP_URL}?view=q&qi=${qi + 1}&s=${score + add}&lang=${lang}`;

  const hasC    = q.c !== undefined;
  const isParty = qi === 2;
  const children = ["prog", "bar", ...(isParty ? ["img"] : []), "question", "sub", "btn_a", "btn_b", ...(hasC ? ["btn_c"] : [])];

  const els: Record<string, object> = {
    root:     { type: "stack", props: { direction: "vertical", gap: isParty ? 2 : 3, padding: 3 }, children },
    prog:     { type: "text", props: { content: s.qof(step, TOTAL_STEPS), size: "xs", color: "muted", align: "center" } },
    bar:      { type: "text", props: { content: dotBar(step, TOTAL_STEPS), size: "sm", align: "center" } },
    question: { type: "text", props: { content: q.q, weight: "bold", size: isParty ? "md" : "lg", align: "center" } },
    sub:      { type: "text", props: { content: q.sub, size: "sm", color: "muted", align: "center" } },
    btn_a:    { type: "button", props: { label: q.a, variant: "primary" }, on: { press: { action: "submit", params: { target: mkUrl(q.scoreA) } } } },
    btn_b:    { type: "button", props: { label: q.b, variant: "secondary" }, on: { press: { action: "submit", params: { target: mkUrl(q.scoreB) } } } },
  };
  if (isParty) els["img"] = { type: "image", props: { src: IMG_PARTY, aspectRatio: "2:1" } };
  if (hasC)    els["btn_c"] = { type: "button", props: { label: q.c!, variant: "secondary" }, on: { press: { action: "submit", params: { target: mkUrl(q.scoreC ?? 0) } } } };

  return snap({ root: "root", elements: els });
}

function viewResult(score: number, lang: Lang, attempts: number, username: string) {
  const s = STRINGS[lang];
  // @jvhbo is the only hetero — everyone else is gay
  const title   = s.resultTitle(attempts);
  const desc    = s.resultDesc(attempts);
  const shareMsg = s.shareText(attempts, username);
  const congrats = s.congratsText(username);

  return snap({
    root: "root",
    elements: {
      root:       { type: "stack", props: { direction: "vertical", gap: 2, padding: 4 }, children: ["emoji", "title", "desc", "btn_share", "btn_congrats", "btn_retry", "btn_lb"] },
      emoji:      { type: "text", props: { content: "🏳️‍🌈", size: "xl", align: "center" } },
      title:      { type: "text", props: { content: title, weight: "bold", size: "xl", align: "center" } },
      desc:       { type: "text", props: { content: desc, size: "sm", align: "center", color: "muted" } },
      btn_share:  { type: "button", props: { label: s.share, variant: "primary" }, on: { press: { action: "compose_cast", params: { text: shareMsg, embeds: [`${SNAP_URL}?view=intro&lang=${lang}`] } } } },
      btn_congrats: { type: "button", props: { label: s.congrats, variant: "secondary" }, on: { press: { action: "compose_cast", params: { text: congrats, embeds: [`${SNAP_URL}?view=intro&lang=${lang}`] } } } },
      btn_retry:  { type: "button", props: { label: s.retry, variant: "secondary" }, on: { press: { action: "submit", params: { target: `${SNAP_URL}?view=intro&lang=${lang}` } } } },
      btn_lb:     { type: "button", props: { label: s.seeResults, variant: "secondary" }, on: { press: { action: "submit", params: { target: `${SNAP_URL}?view=lb&lang=${lang}` } } } },
    },
  });
}

async function viewLeaderboard(lang: Lang) {
  const s = STRINGS[lang];
  const convex = new ConvexHttpClient(CONVEX_URL);
  const results = await convex.query(api.gayQuiz.getLeaderboard, {});

  const rows: string[] = [];
  const els: Record<string, object> = {};

  // Always add @jvhbo as the unique hetero at top
  els["jvhbo"] = { type: "text", props: { content: `👑 @jvhbo — ${s.heteroLabel}`, size: "sm", weight: "bold" } };
  rows.push("jvhbo");

  let shown = 0;
  for (const r of results) {
    if (r.fid === JVHBO_FID) continue; // skip jvhbo from DB results
    const key = `row_${shown}`;
    els[key] = { type: "text", props: { content: `🏳️‍🌈 @${r.username} — ${s.gayLabel(r.attempts)}`, size: "sm" } };
    rows.push(key);
    shown++;
    if (shown >= 6) break;
  }

  if (rows.length === 1) {
    // only jvhbo, no one else yet
    els["empty"] = { type: "text", props: { content: "No one else has taken the quiz yet. Be the first! 🏳️‍🌈", size: "sm", color: "muted", align: "center" } };
    rows.push("empty");
  }

  rows.push("btn_back");
  els["btn_back"] = { type: "button", props: { label: s.leaderboardBack, variant: "secondary" }, on: { press: { action: "submit", params: { target: `${SNAP_URL}?view=intro&lang=${lang}` } } } };

  els["root"] = { type: "stack", props: { direction: "vertical", gap: 2, padding: 3 }, children: ["hdr", ...rows] };
  els["hdr"]  = { type: "text", props: { content: s.leaderboardTitle, weight: "bold", size: "lg", align: "center" } };

  return snap({ root: "root", elements: els });
}

// ── Router ────────────────────────────────────────────────────────────────────

async function handleRequest(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accept = req.headers.get("accept") ?? "";

  if (!accept.includes("application/vnd.farcaster.snap")) {
    return htmlFallback();
  }

  const view  = searchParams.get("view") ?? "intro";
  const lang  = (LANGS.includes(searchParams.get("lang") as Lang) ? searchParams.get("lang") : "en") as Lang;
  const score = Math.max(0, parseInt(searchParams.get("s") ?? "0", 10));
  const qi    = Math.max(0, parseInt(searchParams.get("qi") ?? "1", 10));

  // Extract FID + username from POST body if present
  let fid = 0;
  let username = "unknown";
  if (req.method === "POST") {
    try {
      const body = await req.json().catch(() => ({}));
      ({ fid, username } = extractSnapUser(body));
    } catch (_) {}
  }

  if (view === "lang") {
    const ret = searchParams.get("ret") ?? `${SNAP_URL}?view=intro`;
    return viewLang(ret);
  }
  if (view === "lb")  return viewLeaderboard(lang);
  if (view === "q1")  return viewQ1(score, lang);
  if (view === "qn")  return viewQNeynar(score, lang);
  if (view === "q")   return viewQGeneric(qi, score, lang);

  if (view === "result") {
    // Save result to Convex if we have FID
    let attempts = 1;
    if (fid && fid !== JVHBO_FID) {
      try {
        const convex = new ConvexHttpClient(CONVEX_URL);
        const saved = await convex.mutation(api.gayQuiz.saveResult, { fid, username });
        attempts = saved.attempts;
      } catch (_) {}
    }
    return viewResult(score, lang, attempts, username);
  }

  return viewIntro(lang);
}

export async function GET(req: NextRequest)  { return handleRequest(req); }
export async function POST(req: NextRequest) { return handleRequest(req); }
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SNAP_HEADERS });
}
