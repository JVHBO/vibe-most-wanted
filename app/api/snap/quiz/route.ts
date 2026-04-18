import { NextRequest, NextResponse } from "next/server";

const APP_URL = "https://vibemostwanted.xyz";
const SNAP_URL = `${APP_URL}/api/snap/quiz`;

const SNAP_HEADERS = {
  "Content-Type": "application/vnd.farcaster.snap+json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

// ── Languages ─────────────────────────────────────────────────────────────────

type Lang = "en" | "pt" | "es" | "fr" | "it";
const LANGS: Lang[] = ["en", "pt", "es", "fr", "it"];

const LANG_LABELS: Record<Lang, string> = {
  en: "English",
  pt: "Portugues",
  es: "Espanol",
  fr: "Francais",
  it: "Italiano",
};

// ── Translations ──────────────────────────────────────────────────────────────

interface T {
  title: string;
  sub: string;
  start: string;
  qof: (n: number, t: number) => string;
  changeLang: string;
  share: string;
  retry: string;
  questions: { q: string; sub: string; a: string; b: string }[];
  results: { title: string; desc: string }[];
}

const STRINGS: Record<Lang, T> = {
  en: {
    title: "Are You Gay? 🏳️‍🌈",
    sub: "A highly scientific 5-question quiz to discover your true self.",
    start: "Find out the truth",
    qof: (n, t) => `Question ${n} of ${t}`,
    changeLang: "Change Language",
    share: "Share my result",
    retry: "Try again",
    questions: [
      { q: "Have you ever cried watching a TV show alone?", sub: "Be honest. This is a safe space.", a: "Not even close", b: "3 times this week" },
      { q: "Do you organize your wardrobe by color?", sub: "This one reveals a lot.", a: "I just throw stuff in", b: "By color AND texture" },
      { q: "Your opinion on Harry Styles?", sub: "Think carefully.", a: "Who?", b: "Eternal fashion icon" },
      { q: "Have you ever sent a voice message longer than 3 minutes?", sub: "This is the most important question.", a: "Never, that's a crime", b: "Yes, it was necessary" },
      { q: "At a BBQ, how do you eat the sausage?", sub: "No wrong answers... or are there?", a: "Normal, with bread", b: "I refuse to answer that" },
    ],
    results: [
      { title: "A Little Gay", desc: "You're dipping your toes in. Not quite there yet, but the rainbow sees you." },
      { title: "Pretty Gay", desc: "Let's be real. You've been there for a while. You just haven't filed the paperwork." },
      { title: "Very Gay", desc: "At this point it's not a question, it's a lifestyle. Embrace it." },
      { title: "Extremely Gay", desc: "Scientists have named a new shade of rainbow after you. Congratulations." },
      { title: "MAXIMUM GAY", desc: "You are the final boss. You didn't take the quiz — the quiz took you." },
    ],
  },
  pt: {
    title: "Você Seria Gay? 🏳️‍🌈",
    sub: "Um questionário científico com 5 perguntas troll para descobrir a verdade sobre você.",
    start: "Descobrir minha verdade",
    qof: (n, t) => `Pergunta ${n} de ${t}`,
    changeLang: "Mudar Idioma",
    share: "Compartilhar resultado",
    retry: "Tentar de novo",
    questions: [
      { q: "Você já chorou assistindo a uma série sozinho?", sub: "Responda com honestidade. Aqui é seguro.", a: "Não, jamais", b: "Umas 3x essa semana" },
      { q: "Você organiza seu guarda-roupa por cor?", sub: "Esse diz muito sobre você.", a: "Jogo tudo dentro e fecho", b: "Por cor E textura" },
      { q: "Qual sua opinião sobre Harry Styles?", sub: "Pense bem antes de responder.", a: "Quem?", b: "Fashion icon eterno" },
      { q: "Você já mandou áudio de mais de 3 minutos?", sub: "A pergunta mais importante de todas.", a: "Jamais faria isso", b: "Sim, era necessário" },
      { q: "No churrasco, você come a linguiça de qual jeito?", sub: "Não tem resposta errada... ou tem.", a: "Normal, com pão", b: "Não vou responder isso" },
    ],
    results: [
      { title: "Um Pouco Gay", desc: "Você está apenas testando as águas. O arco-íris ainda não te viu, mas ele sabe que você existe." },
      { title: "Bem Gay", desc: "Vamos ser honestos. Você já está há um tempo aqui. Só não assinou os papéis ainda." },
      { title: "Muito Gay", desc: "Já não é uma pergunta, é um estilo de vida. Abrace." },
      { title: "Extremamente Gay", desc: "Cientistas nomearam uma nova cor do arco-íris em sua homenagem. Parabéns." },
      { title: "GAY NÍVEL FINAL", desc: "Você é o boss final. Você não fez o quiz — o quiz te fez." },
    ],
  },
  es: {
    title: "¿Eres Gay? 🏳️‍🌈",
    sub: "Un cuestionario científico de 5 preguntas para descubrir tu verdadero yo.",
    start: "Descubrir la verdad",
    qof: (n, t) => `Pregunta ${n} de ${t}`,
    changeLang: "Cambiar Idioma",
    share: "Compartir resultado",
    retry: "Intentar de nuevo",
    questions: [
      { q: "¿Has llorado viendo una serie solo?", sub: "Sé honesto. Aquí estás seguro.", a: "Ni de lejos", b: "3 veces esta semana" },
      { q: "¿Organizas tu armario por colores?", sub: "Esta dice mucho de ti.", a: "Tiro todo y cierro", b: "Por color Y textura" },
      { q: "¿Qué opinas de Harry Styles?", sub: "Piénsalo bien.", a: "¿Quién?", b: "Icono de moda eterno" },
      { q: "¿Has enviado un audio de más de 3 minutos?", sub: "La pregunta más importante.", a: "Jamás haría eso", b: "Sí, era necesario" },
      { q: "En un asado, ¿cómo comes la salchicha?", sub: "No hay respuesta incorrecta... ¿o sí?", a: "Normal, con pan", b: "Me niego a responder" },
    ],
    results: [
      { title: "Un Poco Gay", desc: "Estás mojando los pies. El arcoíris aún no te ha visto, pero sabe que existes." },
      { title: "Bastante Gay", desc: "Seamos honestos. Ya llevas tiempo aquí. Solo no has firmado los papeles." },
      { title: "Muy Gay", desc: "Ya no es una pregunta, es un estilo de vida. Abrázalo." },
      { title: "Extremadamente Gay", desc: "Los científicos nombraron un nuevo tono del arcoíris en tu honor." },
      { title: "GAY NIVEL MAXIMO", desc: "Eres el jefe final. No hiciste el quiz — el quiz te hizo a ti." },
    ],
  },
  fr: {
    title: "Es-tu Gay? 🏳️‍🌈",
    sub: "Un quiz scientifique de 5 questions pour découvrir ta vraie nature.",
    start: "Découvrir la vérité",
    qof: (n, t) => `Question ${n} sur ${t}`,
    changeLang: "Changer la Langue",
    share: "Partager le résultat",
    retry: "Réessayer",
    questions: [
      { q: "As-tu déjà pleuré en regardant une série seul?", sub: "Sois honnête. C'est un espace sûr.", a: "Absolument pas", b: "3 fois cette semaine" },
      { q: "Organises-tu ta garde-robe par couleur?", sub: "Celle-ci en dit long sur toi.", a: "Je jette tout dedans", b: "Par couleur ET texture" },
      { q: "Ton opinion sur Harry Styles?", sub: "Réfléchis bien.", a: "C'est qui?", b: "Icône de mode éternelle" },
      { q: "As-tu envoyé un vocal de plus de 3 minutes?", sub: "La question la plus importante.", a: "Jamais, c'est un crime", b: "Oui, c'était nécessaire" },
      { q: "Au barbecue, comment manges-tu la saucisse?", sub: "Il n'y a pas de mauvaise réponse... ou si?", a: "Normalement, avec du pain", b: "Je refuse de répondre" },
    ],
    results: [
      { title: "Un Peu Gay", desc: "Tu testes les eaux. L'arc-en-ciel ne t'a pas encore vu, mais il sait que tu existes." },
      { title: "Plutôt Gay", desc: "Soyons honnêtes. Tu es là depuis un moment. Tu n'as juste pas encore signé les papiers." },
      { title: "Très Gay", desc: "Ce n'est plus une question, c'est un mode de vie. Embrasse-le." },
      { title: "Extrêmement Gay", desc: "Les scientifiques ont nommé une nouvelle teinte d'arc-en-ciel en ton honneur." },
      { title: "GAY NIVEAU MAXIMUM", desc: "Tu es le boss final. Tu n'as pas fait le quiz — le quiz t'a fait." },
    ],
  },
  it: {
    title: "Sei Gay? 🏳️‍🌈",
    sub: "Un quiz scientifico di 5 domande per scoprire il tuo vero io.",
    start: "Scopri la verità",
    qof: (n, t) => `Domanda ${n} di ${t}`,
    changeLang: "Cambia Lingua",
    share: "Condividi il risultato",
    retry: "Riprova",
    questions: [
      { q: "Hai mai pianto guardando una serie da solo?", sub: "Sii onesto. Qui sei al sicuro.", a: "Assolutamente no", b: "3 volte questa settimana" },
      { q: "Organizzi il tuo armadio per colore?", sub: "Questa la dice lunga su di te.", a: "Butto tutto dentro", b: "Per colore E texture" },
      { q: "Cosa pensi di Harry Styles?", sub: "Pensaci bene.", a: "Chi?", b: "Icona di moda eterna" },
      { q: "Hai mai inviato un vocale di più di 3 minuti?", sub: "La domanda più importante.", a: "Mai, è un crimine", b: "Sì, era necessario" },
      { q: "Al barbecue, come mangi la salsiccia?", sub: "Non c'è risposta sbagliata... o sì?", a: "Normalmente, col pane", b: "Rifiuto di rispondere" },
    ],
    results: [
      { title: "Un Po' Gay", desc: "Stai testando le acque. L'arcobaleno non ti ha ancora visto, ma sa che esisti." },
      { title: "Abbastanza Gay", desc: "Siamo onesti. Sei qui da un po'. Hai solo non firmato i documenti." },
      { title: "Molto Gay", desc: "Non è più una domanda, è uno stile di vita. Abbraccialo." },
      { title: "Estremamente Gay", desc: "Gli scienziati hanno dedicato una nuova sfumatura dell'arcobaleno in tuo onore." },
      { title: "GAY LIVELLO MASSIMO", desc: "Sei il boss finale. Non hai fatto il quiz — il quiz ha fatto te." },
    ],
  },
};

// ── Score → result tier (all results are gay, just different intensity) ────────
// Score 0→tier0, 1→tier1, 2→tier2, 3→tier3, 4-5→tier4
function getTierIndex(score: number): number {
  if (score === 0) return 0;
  if (score === 1) return 1;
  if (score === 2) return 2;
  if (score === 3) return 3;
  return 4;
}

const TIER_COLORS = ["blue", "teal", "green", "pink", "purple"] as const;
const TIER_EMOJIS = ["🏳️", "🌈", "💅", "✨", "🎉"];
const TOTAL_Q = 5;

// ── Snap builder ──────────────────────────────────────────────────────────────

function snap(ui: object) {
  return NextResponse.json({ version: "2.0", ui }, { headers: SNAP_HEADERS });
}

// ── Views ─────────────────────────────────────────────────────────────────────

function viewLang(returnTo: string) {
  const elements: Record<string, object> = {
    root: { type: "stack", props: { direction: "vertical", gap: 2, padding: 3 }, children: ["hdr", ...LANGS.map(l => `btn_${l}`)] },
    hdr:  { type: "text", props: { content: "Choose your language", weight: "bold", size: "lg", align: "center" } },
  };
  for (const l of LANGS) {
    elements[`btn_${l}`] = {
      type: "button",
      props: { label: LANG_LABELS[l], variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${returnTo}&lang=${l}` } } },
    };
  }
  return snap({ root: "root", elements });
}

function viewIntro(lang: Lang) {
  const s = STRINGS[lang];
  return snap({
    root: "root",
    elements: {
      root:       { type: "stack", props: { direction: "vertical", gap: 3, padding: 4 }, children: ["title", "sub", "btn_start", "btn_lang"] },
      title:      { type: "text", props: { content: s.title, weight: "bold", size: "xl", align: "center" } },
      sub:        { type: "text", props: { content: s.sub, size: "sm", align: "center", color: "muted" } },
      btn_start:  {
        type: "button", props: { label: s.start, variant: "primary" },
        on: { press: { action: "submit", params: { target: `${SNAP_URL}?view=q&n=1&s=0&lang=${lang}` } } },
      },
      btn_lang: {
        type: "button", props: { label: s.changeLang, variant: "secondary" },
        on: { press: { action: "submit", params: { target: `${SNAP_URL}?view=lang&ret=intro&lang=${lang}` } } },
      },
    },
  });
}

function viewQuestion(n: number, score: number, lang: Lang) {
  const s = STRINGS[lang];
  const q = s.questions[n - 1];
  if (!q) return viewResult(score, lang);

  const nextN = n + 1;
  const isLast = nextN > TOTAL_Q;
  const mkUrl = (addScore: number) => isLast
    ? `${SNAP_URL}?view=result&s=${score + addScore}&lang=${lang}`
    : `${SNAP_URL}?view=q&n=${nextN}&s=${score + addScore}&lang=${lang}`;

  const dots = Array.from({ length: TOTAL_Q }, (_, i) => (i < n ? "●" : "○")).join(" ");

  return snap({
    root: "root",
    elements: {
      root:     { type: "stack", props: { direction: "vertical", gap: 3, padding: 4 }, children: ["prog", "dots", "question", "sub", "btn_a", "btn_b", "btn_lang"] },
      prog:     { type: "text", props: { content: s.qof(n, TOTAL_Q), size: "xs", color: "muted", align: "center" } },
      dots:     { type: "text", props: { content: dots, size: "sm", align: "center" } },
      question: { type: "text", props: { content: q.q, weight: "bold", size: "lg", align: "center" } },
      sub:      { type: "text", props: { content: q.sub, size: "sm", color: "muted", align: "center" } },
      btn_a: {
        type: "button", props: { label: q.a, variant: "primary" },
        on: { press: { action: "submit", params: { target: mkUrl(0) } } },
      },
      btn_b: {
        type: "button", props: { label: q.b, variant: "secondary" },
        on: { press: { action: "submit", params: { target: mkUrl(1) } } },
      },
      btn_lang: {
        type: "button", props: { label: s.changeLang, variant: "secondary" },
        on: { press: { action: "submit", params: { target: `${SNAP_URL}?view=lang&ret=q&n=${n}&s=${score}&lang=${lang}` } } },
      },
    },
  });
}

function viewResult(score: number, lang: Lang) {
  const s = STRINGS[lang];
  const tier = getTierIndex(score);
  const r = s.results[tier];
  const emoji = TIER_EMOJIS[tier];
  const pct = Math.round((score / TOTAL_Q) * 100);
  const bar = "█".repeat(score) + "░".repeat(TOTAL_Q - score);
  const shareText = `${emoji} ${r.title} (${pct}% gay)\n\n"${r.desc.split(".")[0]}"\n\nTake the quiz:`;

  return snap({
    root: "root",
    elements: {
      root:      { type: "stack", props: { direction: "vertical", gap: 3, padding: 4 }, children: ["emoji", "title", "bar_row", "desc", "btn_share", "btn_retry"] },
      emoji:     { type: "text", props: { content: emoji, size: "xl", align: "center" } },
      title:     { type: "text", props: { content: `${r.title} · ${pct}%`, weight: "bold", size: "xl", align: "center" } },
      bar_row:   { type: "text", props: { content: bar, align: "center", size: "sm" } },
      desc:      { type: "text", props: { content: r.desc, size: "sm", align: "center", color: "muted" } },
      btn_share: {
        type: "button", props: { label: s.share, variant: "primary" },
        on: { press: { action: "compose_cast", params: { text: shareText, embeds: [`${SNAP_URL}?view=intro&lang=${lang}`] } } },
      },
      btn_retry: {
        type: "button", props: { label: s.retry, variant: "secondary" },
        on: { press: { action: "submit", params: { target: `${SNAP_URL}?view=intro&lang=${lang}` } } },
      },
    },
  });
}

// ── Route handlers ────────────────────────────────────────────────────────────

function handleRequest(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accept = req.headers.get("accept") ?? "";

  if (!accept.includes("application/vnd.farcaster.snap")) {
    return NextResponse.redirect(`${APP_URL}/`);
  }

  const view  = searchParams.get("view") ?? "intro";
  const lang  = (LANGS.includes(searchParams.get("lang") as Lang) ? searchParams.get("lang") : "en") as Lang;
  const n     = parseInt(searchParams.get("n") ?? "1", 10);
  const score = parseInt(searchParams.get("s") ?? "0", 10);

  if (view === "lang") {
    // Build return URL for after language selection
    const ret   = searchParams.get("ret") ?? "intro";
    const retN  = searchParams.get("n") ?? "1";
    const retS  = searchParams.get("s") ?? "0";
    const retUrl = ret === "q"
      ? `${SNAP_URL}?view=q&n=${retN}&s=${retS}`
      : `${SNAP_URL}?view=intro`;
    return viewLang(retUrl);
  }
  if (view === "q")      return viewQuestion(n, score, lang);
  if (view === "result") return viewResult(score, lang);
  return viewIntro(lang);
}

export async function GET(req: NextRequest)  { return handleRequest(req); }
export async function POST(req: NextRequest) { return handleRequest(req); }
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SNAP_HEADERS });
}
