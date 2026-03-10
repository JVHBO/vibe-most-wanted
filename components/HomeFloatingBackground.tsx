"use client";

import { useEffect, useRef } from "react";
import { useConvex, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { SOCIAL_QUESTS } from "@/lib/socialQuests";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAccount } from "wagmi";

const DRAWING_KEY = "vmw_drawing_v1";

type SupportedLang = 'pt-BR' | 'en' | 'es' | 'hi' | 'ru' | 'zh-CN' | 'id' | 'fr' | 'ja' | 'it';
const DRAW_HINTS: Record<SupportedLang, { save: string; clear: string }> = {
  'pt-BR': { save: 'CTRL+ENTER salvar', clear: 'ESPAÇO limpar' },
  'en':    { save: 'CTRL+ENTER save',   clear: 'SPACE clear' },
  'es':    { save: 'CTRL+ENTER guardar', clear: 'ESPACIO borrar' },
  'fr':    { save: 'CTRL+ENTER enregistrer', clear: 'ESPACE effacer' },
  'it':    { save: 'CTRL+ENTER salva',  clear: 'SPAZIO cancella' },
  'ru':    { save: 'CTRL+ENTER сохранить', clear: 'ПРОБЕЛ очистить' },
  'zh-CN': { save: 'CTRL+ENTER 保存',   clear: '空格 清除' },
  'ja':    { save: 'CTRL+ENTER 保存',   clear: 'スペース 消去' },
  'hi':    { save: 'CTRL+ENTER सहेजें', clear: 'स्पेस मिटाएं' },
  'id':    { save: 'CTRL+ENTER simpan', clear: 'SPASI hapus' },
};

interface FloatItem {
  id: string;
  href: string;
  type: "vibecard" | "castcard" | "followcard";
  imageUrl?: string;
  pfp?: string;
  username?: string;
  text?: string;
  winnerNum?: number;
  // follow card fields
  displayName?: string;
  description?: string;
  reward?: number;
  bannerUrl?: string;
}

const CACHE_KEY = "vmw_hfb_v22";
const CACHE_DATE_KEY = "vmw_hfb_date_v15";
const VIBEFID_CONVEX = "https://scintillating-mandrill-101.convex.cloud";

// Casts to hide from the background animation
const HIDDEN_CAST_URLS = new Set([
  "https://farcaster.xyz/jvhbo/0x20586a19",
]);

const VIBEMARKET_URL = "https://vibechain.com/market?ref=XCLR1DJ6LQTT";
const LOCAL_VBMS_CARDS: FloatItem[] = [
  { id: "local-leg-1", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/legendary/item-39.png" },
  { id: "local-leg-2", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/legendary/item-52.png" },
  { id: "local-leg-3", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/legendary/item-57.png" },
  { id: "local-leg-4", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/legendary/item-50.png" },
  { id: "local-leg-5", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/legendary/item-55.png" },
  { id: "local-epc-1", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/epic/item-43.png" },
  { id: "local-epc-2", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/epic/item-47.png" },
  { id: "local-epc-3", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/epic/item-44.png" },
  { id: "local-epc-4", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/epic/item-49.png" },
  { id: "local-rar-1", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/rare/item-37.png" },
  { id: "local-rar-2", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/rare/item-42.png" },
  { id: "local-rar-3", href: VIBEMARKET_URL, type: "vibecard", imageUrl: "/cards/rare/item-38.png" },
];

// Only follow quests (no channel/join quests)
const ALL_FOLLOW_QUESTS: FloatItem[] = SOCIAL_QUESTS
  .filter(q => q.type === "follow" && q.pfpUrl)
  .map(q => ({
    id: q.id,
    href: q.url,
    type: "followcard" as const,
    pfp: q.pfpUrl,
    bannerUrl: q.bannerUrl,
    displayName: q.displayName,
    description: q.description,
    reward: q.reward,
  }));

// 3 rotating slots — each cycles through all quests independently
const FOLLOW_SLOTS = 3;
const FOLLOW_BANNERS: FloatItem[] = ALL_FOLLOW_QUESTS.slice(0, FOLLOW_SLOTS);

function makeCastEl(item: FloatItem): HTMLDivElement {
  const card = document.createElement("div");
  card.style.cssText = `
    width:220px;
    background:#1a1a1a;
    border:1px solid rgba(201,168,76,0.5);
    border-radius:10px;
    padding:10px;
    box-sizing:border-box;
    font-family:sans-serif;
    overflow:hidden;
  `;

  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:6px;";

  if (item.pfp) {
    const pfpImg = document.createElement("img");
    pfpImg.src = item.pfp;
    pfpImg.style.cssText = "width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;";
    pfpImg.onerror = () => { pfpImg.style.display = "none"; };
    header.appendChild(pfpImg);
  }

  const nameDiv = document.createElement("div");
  nameDiv.style.cssText = "display:flex;flex-direction:column;min-width:0;flex:1;";

  const displayName = document.createElement("span");
  displayName.style.cssText = "color:#c9a84c;font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
  displayName.textContent = item.username ? `@${item.username}` : "@unknown";
  nameDiv.appendChild(displayName);

  const badgeRow = document.createElement("div");
  badgeRow.style.cssText = "display:flex;align-items:center;gap:4px;";

  const wantedBadge = document.createElement("span");
  wantedBadge.style.cssText = "color:#ef4444;font-size:8px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;";
  wantedBadge.textContent = "WANTED CAST";
  badgeRow.appendChild(wantedBadge);

  if (item.winnerNum !== undefined) {
    const winnerBadge = document.createElement("span");
    winnerBadge.style.cssText = "color:#888;font-size:8px;font-weight:600;";
    winnerBadge.textContent = `· WINNER #${item.winnerNum}`;
    badgeRow.appendChild(winnerBadge);
  }

  nameDiv.appendChild(badgeRow);
  header.appendChild(nameDiv);
  card.appendChild(header);

  if (item.text) {
    const textEl = document.createElement("p");
    textEl.style.cssText = "color:#ccc;font-size:10px;line-height:1.4;margin:0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;";
    textEl.textContent = `"${item.text}"`;
    card.appendChild(textEl);
  }

  return card;
}

function makeFollowEl(item: FloatItem): HTMLDivElement {
  const card = document.createElement("div");
  card.style.cssText = `
    width:260px;
    background:#111;
    border:2px solid #c9a84c;
    border-radius:10px;
    font-family:sans-serif;
    overflow:hidden;
    box-shadow:0 4px 20px rgba(201,168,76,0.2);
  `;

  // Banner
  const bannerWrap = document.createElement("div");
  bannerWrap.style.cssText = "position:relative;width:100%;height:80px;overflow:hidden;";

  if (item.bannerUrl) {
    const bannerImg = document.createElement("img");
    bannerImg.src = item.bannerUrl;
    bannerImg.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
    bannerImg.onerror = () => { bannerWrap.style.background = "#222"; };
    bannerWrap.appendChild(bannerImg);
  } else if (item.pfp) {
    bannerWrap.style.background = "#1a1a1a";
    const pfpBg = document.createElement("img");
    pfpBg.src = item.pfp;
    pfpBg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.45;transform:scale(1.15);";
    bannerWrap.appendChild(pfpBg);
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:absolute;inset:0;background:linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%);";
    bannerWrap.appendChild(overlay);
  } else {
    bannerWrap.style.background = "#1a1a1a";
  }

  card.appendChild(bannerWrap);

  // Body row: pfp + name/desc
  const body = document.createElement("div");
  body.style.cssText = "display:flex;align-items:center;gap:8px;padding:8px 10px 10px;";

  // PFP (fully visible, below banner)
  if (item.pfp) {
    const pfpWrap = document.createElement("div");
    pfpWrap.style.cssText = "flex-shrink:0;width:40px;height:40px;border-radius:50%;border:2px solid #c9a84c;overflow:hidden;background:#222;";
    const pfpImg = document.createElement("img");
    pfpImg.src = item.pfp;
    pfpImg.style.cssText = "width:100%;height:100%;object-fit:cover;";
    pfpImg.onerror = () => { pfpWrap.style.background = "#333"; };
    pfpWrap.appendChild(pfpImg);
    body.appendChild(pfpWrap);
  }

  const info = document.createElement("div");
  info.style.cssText = "flex:1;min-width:0;";

  const name = document.createElement("div");
  name.style.cssText = "color:#fff;font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;";
  name.textContent = item.displayName || "";
  info.appendChild(name);

  if (item.description) {
    const desc = document.createElement("div");
    desc.style.cssText = "color:#888;font-size:9px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
    desc.textContent = item.description;
    info.appendChild(desc);
  }

  const rewardBadge = document.createElement("span");
  rewardBadge.style.cssText = "color:#c9a84c;font-size:10px;font-weight:800;";
  rewardBadge.textContent = `+${item.reward ?? 50} VBMS`;
  info.appendChild(rewardBadge);

  body.appendChild(info);
  card.appendChild(body);

  return card;
}

interface HomeFloatingBackgroundProps {
  onOpenFidModal?: (fid: number) => void;
}

export function HomeFloatingBackground({ onOpenFidModal }: HomeFloatingBackgroundProps = {}) {
  const convex = useConvex();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const routerRef = useRef<ReturnType<typeof useRouter> | null>(null);
  const onOpenFidModalRef = useRef(onOpenFidModal);
  const mountedRef = useRef(true);
  const router = useRouter();
  const rafRef = useRef<number>(0);

  const { lang } = useLanguage();
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);

  useEffect(() => { routerRef.current = router; }, [router]);
  useEffect(() => { onOpenFidModalRef.current = onOpenFidModal; }, [onOpenFidModal]);

  // Drawing upload mutations
  const generateUploadUrl = useMutation(api.drawings.generateUploadUrl);
  const saveDrawingMutation = useMutation(api.drawings.saveDrawing);
  const generateUploadUrlRef = useRef(generateUploadUrl);
  const saveDrawingRef = useRef(saveDrawingMutation);
  useEffect(() => { generateUploadUrlRef.current = generateUploadUrl; }, [generateUploadUrl]);
  useEffect(() => { saveDrawingRef.current = saveDrawingMutation; }, [saveDrawingMutation]);

  // Get connected wallet address for drawing attribution
  const { address: walletAddress } = useAccount();
  const walletAddressRef = useRef(walletAddress);
  useEffect(() => { walletAddressRef.current = walletAddress; }, [walletAddress]);

  // Cache the fetched username so we don't re-query on every draw
  const cachedUsernameRef = useRef<{ address: string; username: string } | null>(null);

  // Drawing canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const hint = hintRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d')!;

    let hasDrawing = false;
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const getHints = () => DRAW_HINTS[langRef.current as SupportedLang] ?? DRAW_HINTS['en'];

    const updateHint = (visible: boolean) => {
      if (!hint) return;
      if (visible) {
        const h = getHints();
        hint.textContent = `[ ${h.save} ]  [ ${h.clear} ]`;
        hint.style.opacity = '1';
      } else {
        hint.style.opacity = '0';
      }
    };

    const isInteractive = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return false;
      if (el.closest('a, button, input, select, textarea, [role="button"]')) return true;
      if (el.closest('[data-href]')) return true;
      return false;
    };

    const launchDrawing = (dataUrl: string) => {
      const container = containerRef.current;
      if (!container) return;
      const W = canvas.width;
      const H = canvas.height;
      const floatEl = document.createElement('div');
      floatEl.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none;opacity:0;`;
      const img = document.createElement('img');
      img.src = dataUrl;
      img.draggable = false;
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';
      floatEl.appendChild(img);
      container.appendChild(floatEl);
      // Start from where it was drawn, rise upward
      floatEl.animate([
        { opacity: 0,   transform: 'translateY(0px)' },
        { opacity: 0.3, transform: 'translateY(-40px)',  offset: 0.06 },
        { opacity: 0.3, transform: `translateY(-${H * 0.5}px)`, offset: 0.6 },
        { opacity: 0,   transform: `translateY(-${H}px)` },
      ], { duration: 22000, easing: 'ease-in', fill: 'forwards' });
      setTimeout(() => { try { container.removeChild(floatEl); } catch {} }, 23000);
    };

    // Auto-launch saved drawing on page load
    const saved = localStorage.getItem(DRAWING_KEY);
    if (saved) {
      hasDrawing = true;
      updateHint(true);
      const img = new Image();
      img.onload = () => {
        // Draw briefly on canvas so user sees it, then float it up after 1s
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setTimeout(() => {
          launchDrawing(saved);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          hasDrawing = false;
          localStorage.removeItem(DRAWING_KEY);
          updateHint(false);
        }, 1200);
      };
      img.src = saved;
    }

    // (upload closure continues below — only called from Ctrl+Enter)
    const _launchWithUpload = (dataUrl: string) => {
      launchDrawing(dataUrl);
      // Upload drawing to share with all users
      const address = walletAddressRef.current;
      if (address) {
        (async () => {
          try {
            // Resolve username (cache per address to avoid repeat queries)
            let username: string | null = null;
            if (cachedUsernameRef.current?.address === address) {
              username = cachedUsernameRef.current.username;
            } else {
              try {
                // Use the convex client directly (one-time query, not subscription)
                const profile = await convex.query(api.profiles.getProfileLite, { address });
                if (profile?.username) {
                  username = profile.username;
                  cachedUsernameRef.current = { address, username: username! };
                }
              } catch {}
            }
            if (!username) return;

            // Compress: draw dataUrl to a smaller JPEG canvas
            const offscreen = document.createElement('canvas');
            offscreen.width = 800;
            offscreen.height = Math.round(800 * canvas.height / canvas.width);
            const octx = offscreen.getContext('2d')!;
            const srcImg = new Image();
            await new Promise<void>((resolve) => {
              srcImg.onload = () => { octx.drawImage(srcImg, 0, 0, offscreen.width, offscreen.height); resolve(); };
              srcImg.src = dataUrl;
            });

            offscreen.toBlob(async (blob) => {
              if (!blob) return;
              try {
                const uploadUrl = await generateUploadUrlRef.current({});
                const result = await fetch(uploadUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'image/jpeg' },
                  body: blob,
                });
                const { storageId } = await result.json();
                await saveDrawingRef.current({
                  storageId,
                  authorAddress: address,
                  authorUsername: username!,
                });
              } catch (e) {
                console.warn('Drawing upload failed:', e);
              }
            }, 'image/jpeg', 0.4);
          } catch (e) {
            console.warn('Drawing share failed:', e);
          }
        })();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDrawing) return;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(e.clientX, e.clientY);
      ctx.strokeStyle = 'rgba(201,168,76,0.85)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (isInteractive(e.clientX, e.clientY)) return;
      e.preventDefault(); // prevent browser drag/text-selection capturing mousemove
      isDrawing = true;
      lastX = e.clientX;
      lastY = e.clientY;
      ctx.beginPath();
      ctx.arc(e.clientX, e.clientY, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(201,168,76,0.85)';
      ctx.fill();
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 0 || !isDrawing) return;
      isDrawing = false;
      hasDrawing = true;
      updateHint(true);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      // Ctrl+Enter: save drawing + launch as floating element
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && hasDrawing) {
        e.preventDefault();
        const dataUrl = canvas.toDataURL('image/png');
        try { localStorage.setItem(DRAWING_KEY, dataUrl); } catch {}
        _launchWithUpload(dataUrl);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasDrawing = false;
        updateHint(false);
        return;
      }

      // Space: clear drawing
      if (e.code === 'Space' && hasDrawing) {
        e.preventDefault();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        localStorage.removeItem(DRAWING_KEY);
        hasDrawing = false;
        updateHint(false);
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown, { passive: false });
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    async function load() {
      try {
        const today = new Date().toISOString().split("T")[0];
        let apiItems: FloatItem[] | null = null;

        if (localStorage.getItem(CACHE_DATE_KEY) === today) {
          const raw = localStorage.getItem(CACHE_KEY);
          if (raw) apiItems = JSON.parse(raw);
        }

        if (!apiItems) {
          // Fetch VibeFID high-rarity cards — reduced to 6
          let cards: Array<{ _id: string; fid: number; cardImageUrl: string }> = [];
          try {
            const res = await fetch(`${VIBEFID_CONVEX}/api/query`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                path: "farcasterCards:getHighRarityCards",
                args: { limit: 10 },
                format: "json",
              }),
            });
            if (res.ok) {
              const data = await res.json();
              cards = Array.isArray(data.value) ? data.value : [];
            }
          } catch {}

          // Fetch 20 most recent auction winners
          type HistoryItem = {
            _id: string;
            warpcastUrl?: string;
            castAuthorPfp?: string;
            castAuthorUsername?: string;
            castText?: string;
          };
          let winners: HistoryItem[] = [];
          try {
            winners = (await convex.query(api.castAuctions.getAuctionHistory, { limit: 16 })) as HistoryItem[];
          } catch {}

          const validWinners = winners.filter(w => w.warpcastUrl && !HIDDEN_CAST_URLS.has(w.warpcastUrl) && (w.castAuthorPfp || w.castAuthorUsername));
          const castItems: FloatItem[] = [...validWinners].reverse().map((w, idx) => ({
            id: w._id,
            href: w.warpcastUrl!,
            type: "castcard" as const,
            pfp: w.castAuthorPfp,
            username: w.castAuthorUsername,
            text: w.castText,
            winnerNum: idx + 1,
          }));

          apiItems = [
            ...cards.filter(c => c.cardImageUrl).map(c => ({
              id: c._id,
              href: `/fid/${c.fid}`,
              type: "vibecard" as const,
              imageUrl: c.cardImageUrl,
            })),
            ...castItems,
          ];

          localStorage.setItem(CACHE_KEY, JSON.stringify(apiItems));
          localStorage.setItem(CACHE_DATE_KEY, today);
        }

        // Fetch shared drawings from Convex (one-time query, not subscription)
        let sharedDrawings: Array<{ _id: string; authorUsername: string; url: string | null; createdAt: number }> = [];
        try {
          sharedDrawings = await convex.query(api.drawings.getRecentDrawings, {});
        } catch {}

        if (!mountedRef.current) return;

        // Combine: api items + local cards (fewer) + follow banners
        const items: FloatItem[] = [...(apiItems ?? []), ...LOCAL_VBMS_CARDS, ...FOLLOW_BANNERS];
        if (!items.length) return;

        const container = containerRef.current;
        if (!container) return;

        const W = window.innerWidth;
        const H = window.innerHeight;
        container.innerHTML = "";

        // Display shared drawings in background with staggered delays
        for (const drawing of sharedDrawings) {
          if (!drawing.url) continue;
          const drawEl = document.createElement('div');
          drawEl.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none;`;

          const drawImg = document.createElement('img');
          drawImg.src = drawing.url;
          drawImg.draggable = false;
          drawImg.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';
          drawEl.appendChild(drawImg);

          const label = document.createElement('div');
          label.style.cssText = `
            position:absolute;
            bottom:20px;
            right:20px;
            color:rgba(201,168,76,0.7);
            font-size:11px;
            font-family:monospace;
            pointer-events:none;
            text-shadow:0 1px 3px rgba(0,0,0,0.8);
          `;
          label.textContent = `@${drawing.authorUsername}`;
          drawEl.appendChild(label);

          container.appendChild(drawEl);

          const delay = Math.random() * 30000; // 0-30s stagger
          drawEl.animate([
            { opacity: 0, transform: 'translateY(0px)' },
            { opacity: 0.25, transform: 'translateY(-40px)', offset: 0.06 },
            { opacity: 0.25, transform: `translateY(-${H * 0.5}px)`, offset: 0.6 },
            { opacity: 0, transform: `translateY(-${H}px)` },
          ], { duration: 25000, delay, easing: 'ease-in', fill: 'forwards' });

          setTimeout(() => { try { container.removeChild(drawEl); } catch {} }, delay + 26000);
        }

        const loadedFlags: boolean[] = [];

        const particles: Array<{
          el: HTMLDivElement;
          x: number;
          w: number;
          h: number;
          rise: number;
          drift: number;
          dur: number;
          phase: number;
          maxOpacity: number;
          idx: number;
          // follow cycling
          followCycleIdx?: number;
          prevT?: number;
        }> = [];

        let followSeenCount = 0;

        items.forEach((item, idx) => {
          const isFollow = item.type === "followcard";
          const isCast = item.type === "castcard";
          const w = isFollow ? 260 : isCast ? 220 : 80;
          const h = isFollow ? 162 : isCast ? 110 : 112;
          const x = 20 + Math.random() * (W - w - 40);
          const drift = (Math.random() - 0.5) * 80;
          const dur = (11 + Math.random() * 5) * 1000; // same range for all elements
          // Follow slots evenly spaced; rest random
          const slotIdx = followSeenCount;
          const phase = isFollow ? (followSeenCount++ / FOLLOW_SLOTS) : Math.random();

          loadedFlags[idx] = isCast || isFollow;

          const el = document.createElement("div");
          el.className = "cursor-pointer";
          el.style.cssText = `
            position:absolute;
            left:${x}px;
            top:0px;
            width:${w}px;
            height:${h}px;
            border-radius:${isCast || isFollow ? "10px" : "8px"};
            ${isFollow ? "" : "overflow:hidden;"}
            opacity:0;
            will-change:transform,opacity;
            pointer-events:none;
            user-select:none;
            -webkit-user-select:none;
          `;

          el.dataset.href = item.href;
          el.addEventListener("mouseenter", () => { el.style.filter = "brightness(1.6)"; });
          el.addEventListener("mouseleave", () => { el.style.filter = ""; });
          el.addEventListener("click", (e) => {
            e.preventDefault();
            const href = el.dataset.href || item.href;
            // vibecard /fid/N → open modal instead of navigating
            if (item.type === "vibecard") {
              const match = href.match(/\/fid\/(\d+)/);
              if (match) {
                const fidNum = parseInt(match[1]);
                if (onOpenFidModalRef.current) { onOpenFidModalRef.current(fidNum); return; }
                window.dispatchEvent(new CustomEvent('open-fid-modal', { detail: { fid: fidNum } }));
                return;
              }
            }
            if (href.startsWith("http")) window.open(href, "_blank", "noopener");
            else routerRef.current?.push(href);
          });

          if (isFollow) {
            el.appendChild(makeFollowEl(item));
            el.style.pointerEvents = "auto";
          } else if (isCast) {
            el.appendChild(makeCastEl(item));
            el.style.pointerEvents = "auto";
          } else {
            const img = document.createElement("img");
            img.src = item.imageUrl!;
            img.alt = "";
            img.draggable = false;
            img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;user-select:none;-webkit-user-select:none;";
            img.onload = () => {
              loadedFlags[idx] = true;
              el.style.pointerEvents = "auto";
            };
            img.onerror = () => { el.style.display = "none"; };
            el.appendChild(img);
          }

          container.appendChild(el);
          particles.push({
            el, x, w, h,
            rise: H + h + 20,
            drift, dur, phase,
            maxOpacity: isFollow ? 0.85 : isCast ? 0.7 : 0.25,
            idx,
            // follow cycling: next quest = slotIdx + FOLLOW_SLOTS
            ...(isFollow ? { followCycleIdx: slotIdx + FOLLOW_SLOTS, prevT: phase } : {}),
          });
        });

        let startTime: number | null = null;

        function frame(now: number) {
          if (!mountedRef.current) return;
          if (!startTime) startTime = now;

          for (const p of particles) {
            const t = ((now - startTime) / p.dur + p.phase) % 1;
            const y = H + p.h - t * p.rise;
            const dx = Math.sin(t * Math.PI * 2) * p.drift * 0.5 + t * p.drift * 0.5;

            p.el.style.transform = `translateY(${y.toFixed(1)}px) translateX(${dx.toFixed(1)}px)`;

            if (!loadedFlags[p.idx]) {
              p.el.style.opacity = "0";
            } else {
              const opacity = t < 0.08 ? (t / 0.08) * p.maxOpacity
                            : t > 0.92 ? ((1 - t) / 0.08) * p.maxOpacity
                            : p.maxOpacity;
              p.el.style.opacity = opacity.toFixed(3);
            }

            // Follow cycling: when t wraps, swap to next quest
            if (p.followCycleIdx !== undefined && p.prevT !== undefined) {
              if (t < p.prevT - 0.5) {
                const nextQuest = ALL_FOLLOW_QUESTS[p.followCycleIdx % ALL_FOLLOW_QUESTS.length];
                p.followCycleIdx++;
                p.el.dataset.href = nextQuest.href;
                p.el.innerHTML = "";
                const inner = makeFollowEl({
                  id: nextQuest.id, href: nextQuest.href, type: "followcard",
                  pfp: nextQuest.pfp, bannerUrl: nextQuest.bannerUrl,
                  displayName: nextQuest.displayName, description: nextQuest.description,
                  reward: nextQuest.reward,
                });
                p.el.appendChild(inner);
              }
              p.prevT = t;
            }
          }

          rafRef.current = requestAnimationFrame(frame);
        }

        rafRef.current = requestAnimationFrame(frame);

      } catch (e) {
        console.warn("HomeFloatingBackground:", e);
      }
    }

    load();
    return () => {
      mountedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [convex]);

  return (
    <>
      <div
        ref={containerRef}
        style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}
      />
      <canvas
        ref={canvasRef}
        className="tour-drawing-canvas"
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1 }}
      />
      <div
        ref={hintRef}
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 2,
          opacity: 0,
          transition: "opacity 0.6s",
          color: "rgba(201,168,76,0.45)",
          fontSize: "10px",
          fontFamily: "monospace",
          letterSpacing: "0.05em",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        [SPACE] limpar desenho
      </div>
    </>
  );
}
