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

// ── Questions ─────────────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: 1,
    q: "Você já chorou assistindo a uma série sozinho(a)?",
    sub: "Responda com honestidade. Tá seguro aqui.",
    a: { label: "Não, nem um pouco", score: 0 },
    b: { label: "Umas 3x essa semana", score: 1 },
  },
  {
    id: 2,
    q: "Você organiza seu guarda-roupa por cor?",
    sub: "Esse diz muito sobre você.",
    a: { label: "Jogo tudo dentro e fecho", score: 0 },
    b: { label: "Por cor E textura", score: 1 },
  },
  {
    id: 3,
    q: "Qual a sua opinião sobre Harry Styles?",
    sub: "Pense bem antes de responder.",
    a: { label: "Quem?", score: 0 },
    b: { label: "Fashion icon eterno", score: 1 },
  },
  {
    id: 4,
    q: "No churrasco, você come a linguiça de qual jeito?",
    sub: "Não tem resposta errada... ou tem.",
    a: { label: "Normal, com pão", score: 0 },
    b: { label: "Não vou responder isso", score: 1 },
  },
  {
    id: 5,
    q: "Você já mandou áudio de mais de 3 minutos para alguém?",
    sub: "Última pergunta. A mais importante.",
    a: { label: "Jamais faria isso", score: 0 },
    b: { label: "Sim, era necessário", score: 1 },
  },
];

// ── Results ───────────────────────────────────────────────────────────────────

const RESULTS = [
  {
    min: 0, max: 1,
    title: "Hétero Raiz",
    emoji: "🪵",
    desc: "Você não tem moleza nenhuma. Provavelmente assiste MMA e chama torrada de 'biscoito'.",
    color: "gray",
  },
  {
    min: 2, max: 2,
    title: "Hétero Flexível",
    emoji: "🤔",
    desc: "Você diz que não tem nada a ver, mas aquelas escolhas... Só você sabe.",
    color: "blue",
  },
  {
    min: 3, max: 3,
    title: "Bi-Curioso",
    emoji: "🌈",
    desc: "Você está numa jornada de autoconhecimento. Não tem pressa. O universo aguarda.",
    color: "teal",
  },
  {
    min: 4, max: 4,
    title: "Quase Lá",
    emoji: "💅",
    desc: "Você está a um áudio de 3 minutos de aceitar quem você realmente é.",
    color: "pink",
  },
  {
    min: 5, max: 5,
    title: "Bem-vindo ao Time",
    emoji: "🎉",
    desc: "Parabéns! Você respondeu com sua alma. A comunidade te recebe de braços abertos.",
    color: "purple",
  },
];

function getResult(score: number) {
  return RESULTS.find(r => score >= r.min && score <= r.max) ?? RESULTS[0];
}

// ── Snap builder ──────────────────────────────────────────────────────────────

function snapResponse(ui: object) {
  return NextResponse.json(
    { version: "2.0", ui },
    { headers: SNAP_HEADERS }
  );
}

// ── Views ─────────────────────────────────────────────────────────────────────

function viewIntro() {
  return snapResponse({
    root: "root",
    elements: {
      root: { type: "stack", props: { direction: "vertical", gap: 3, padding: 4 }, children: ["title", "sub", "btn_start"] },
      title: { type: "text", props: { content: "🏳️ Você seria gay? 🏳️", weight: "bold", size: "xl", align: "center" } },
      sub:   { type: "text", props: { content: "Um questionário científico com 5 perguntas troll para descobrir a verdade sobre você mesmo.", size: "sm", align: "center", color: "muted" } },
      btn_start: {
        type: "button",
        props: { label: "Descobrir minha verdade", variant: "primary" },
        on: { press: { action: "submit", params: { target: `${SNAP_URL}?view=q&n=1&s=0` } } },
      },
    },
  });
}

function viewQuestion(n: number, score: number) {
  const q = QUESTIONS[n - 1];
  if (!q) return viewResult(score);

  const nextN = n + 1;
  const urlA = nextN > QUESTIONS.length
    ? `${SNAP_URL}?view=result&s=${score + q.a.score}`
    : `${SNAP_URL}?view=q&n=${nextN}&s=${score + q.a.score}`;
  const urlB = nextN > QUESTIONS.length
    ? `${SNAP_URL}?view=result&s=${score + q.b.score}`
    : `${SNAP_URL}?view=q&n=${nextN}&s=${score + q.b.score}`;

  const progress = `Pergunta ${n} de ${QUESTIONS.length}`;
  const dots = Array.from({ length: QUESTIONS.length }, (_, i) => (i < n ? "●" : "○")).join(" ");

  return snapResponse({
    root: "root",
    elements: {
      root:     { type: "stack", props: { direction: "vertical", gap: 3, padding: 4 }, children: ["prog", "dots", "question", "sub", "btn_a", "btn_b"] },
      prog:     { type: "text", props: { content: progress, size: "xs", color: "muted", align: "center" } },
      dots:     { type: "text", props: { content: dots, size: "sm", align: "center" } },
      question: { type: "text", props: { content: q.q, weight: "bold", size: "lg", align: "center" } },
      sub:      { type: "text", props: { content: q.sub, size: "sm", color: "muted", align: "center" } },
      btn_a: {
        type: "button",
        props: { label: q.a.label, variant: "primary" },
        on: { press: { action: "submit", params: { target: urlA } } },
      },
      btn_b: {
        type: "button",
        props: { label: q.b.label, variant: "secondary" },
        on: { press: { action: "submit", params: { target: urlB } } },
      },
    },
  });
}

function viewResult(score: number) {
  const r = getResult(score);
  const pct = Math.round((score / QUESTIONS.length) * 100);
  const bar = "█".repeat(score) + "░".repeat(QUESTIONS.length - score);
  const shareText = `Fiz o quiz "Você seria gay?" no @vibemostwanted e o resultado foi: ${r.emoji} ${r.title} (${pct}%) ${r.desc.split(".")[0]}. Descubra o seu!`;

  return snapResponse({
    root: "root",
    elements: {
      root:    { type: "stack", props: { direction: "vertical", gap: 3, padding: 4 }, children: ["emoji", "title", "bar_row", "desc", "btn_share", "btn_retry"] },
      emoji:   { type: "text", props: { content: r.emoji, size: "xl", align: "center" } },
      title:   { type: "text", props: { content: `${r.title} · ${pct}%`, weight: "bold", size: "xl", align: "center" } },
      bar_row: { type: "text", props: { content: bar, align: "center", size: "sm" } },
      desc:    { type: "text", props: { content: r.desc, size: "sm", align: "center", color: "muted" } },
      btn_share: {
        type: "button",
        props: { label: "Compartilhar resultado", variant: "primary" },
        on: { press: { action: "compose_cast", params: { text: shareText, embeds: [`${SNAP_URL}?view=intro`] } } },
      },
      btn_retry: {
        type: "button",
        props: { label: "Tentar de novo", variant: "secondary" },
        on: { press: { action: "submit", params: { target: `${SNAP_URL}?view=intro` } } },
      },
    },
  });
}

// ── Route handlers ────────────────────────────────────────────────────────────

function handleRequest(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accept = req.headers.get("accept") ?? "";

  // Redirect browsers to home
  if (!accept.includes("application/vnd.farcaster.snap")) {
    return NextResponse.redirect(`${APP_URL}/`);
  }

  const view  = searchParams.get("view") ?? "intro";
  const n     = parseInt(searchParams.get("n") ?? "1", 10);
  const score = parseInt(searchParams.get("s") ?? "0", 10);

  if (view === "q")      return viewQuestion(n, score);
  if (view === "result") return viewResult(score);
  return viewIntro();
}

export async function GET(req: NextRequest)  { return handleRequest(req); }
export async function POST(req: NextRequest) { return handleRequest(req); }
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SNAP_HEADERS });
}
