"use client";

import { useEffect, useState, useRef, createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { isMiniappMode } from "@/lib/utils/miniapp";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelect } from "@/components/SettingsModal";
import { useMusic } from "@/contexts/MusicContext";
import { AudioManager } from "@/lib/audio-manager";
import { HomeFloatingBackground } from "@/components/HomeFloatingBackground";
import { useDisconnect, useAccount } from "wagmi";

// Farcaster notice text in all 10 supported languages
const FARCASTER_NOTICE: Record<string, string> = {
  "en":    "Best experience inside Farcaster",
  "pt-BR": "Melhor experiência dentro do Farcaster",
  "es":    "Mejor experiencia dentro de Farcaster",
  "hi":    "Farcaster में सर्वोत्तम अनुभव",
  "ru":    "Лучший опыт внутри Farcaster",
  "zh-CN": "在Farcaster内体验最佳",
  "id":    "Pengalaman terbaik di dalam Farcaster",
  "fr":    "Meilleure expérience dans Farcaster",
  "ja":    "Farcaster内で最高の体験を",
  "it":    "Migliore esperienza all'interno di Farcaster",
};
const OPEN_MINIAPP: Record<string, string> = {
  "en":    "Open miniapp →",
  "pt-BR": "Abrir miniapp →",
  "es":    "Abrir miniapp →",
  "hi":    "मिनीऐप खोलें →",
  "ru":    "Открыть →",
  "zh-CN": "打开小程序 →",
  "id":    "Buka miniapp →",
  "fr":    "Ouvrir miniapp →",
  "ja":    "開く →",
  "it":    "Apri miniapp →",
};

/**
 * Context that signals children they are being rendered inside MiniappFrame.
 * page.tsx consumes this to force the miniapp layout (nav at bottom, compact labels).
 */
export const MiniappFrameContext = createContext(false);
export function useMiniappFrameContext() {
  return useContext(MiniappFrameContext);
}

/**
 * MiniappFrame
 *
 * On desktop (>= 480px, outside Farcaster iframe), wraps the app in a
 * phone-like frame with a Warpcast-style chrome bar.
 *
 * Structure:
 *   [Chrome bar]  ← outside the transform div, no overlap with content
 *   [Phone body]  ← transform: translateZ(0), makes fixed children
 *                   position relative to this box instead of the viewport
 *
 * This means position:fixed elements (navbars, modals) stay inside
 * the frame without touching any page code.
 */
export function MiniappFrame({ children }: { children: React.ReactNode }) {
  const [showFrame, setShowFrame] = useState(false);
  const { lang } = useLanguage();
  const { isMusicEnabled, setIsMusicEnabled } = useMusic();
  const { disconnect } = useDisconnect();
  const { isConnected } = useAccount();
  const pathname = usePathname();
  const showFloating = true;
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifStatus, setNotifStatus] = useState<"default" | "granted" | "denied">("default");
  const [seenMenu, setSeenMenu] = useState(true); // true = no dot; set false if first visit
  const menuRef = useRef<HTMLDivElement>(null);
  const [frameX, setFrameX] = useState<number | null>(null);
  const [frameY, setFrameY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [forcedMiniapp, setForcedMiniapp] = useState(false);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleChromeMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragging.current = true;
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - (frameX ?? 0), y: e.clientY - (frameY ?? 0) };
    e.preventDefault();
  };

  useEffect(() => {
    const forced = localStorage.getItem("vbms_force_miniapp") === "1";
    if (forced) setForcedMiniapp(true);
    const isDesktop = window.innerWidth >= 480;
    const shouldFrame = isDesktop && !isMiniappMode() && !forced;
    setShowFrame(shouldFrame);
    if (shouldFrame) {
      const savedPos = localStorage.getItem("vbms_frame_pos");
      if (savedPos) {
        try {
          const { x, y } = JSON.parse(savedPos);
          setFrameX(x); setFrameY(y);
        } catch {
          setFrameX(Math.round((window.innerWidth - 410) / 2));
          setFrameY(80);
        }
      } else {
        setFrameX(Math.round((window.innerWidth - 410) / 2));
        setFrameY(80);
      }
    }
    if ("Notification" in window) {
      setNotifStatus(Notification.permission as "default" | "granted" | "denied");
    }
    if (!localStorage.getItem("vbms_seen_menu")) {
      setSeenMenu(false);
    }
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setFrameX(e.clientX - dragOffset.current.x);
      setFrameY(Math.max(0, e.clientY - dragOffset.current.y));
    };
    const onUp = (e: MouseEvent) => {
      if (dragging.current) {
        dragging.current = false;
        setIsDragging(false);
        const x = e.clientX - dragOffset.current.x;
        const y = Math.max(0, e.clientY - dragOffset.current.y);
        localStorage.setItem("vbms_frame_pos", JSON.stringify({ x, y }));
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const requestNotifications = async () => {
    setMenuOpen(false);
    if (!("Notification" in window)) {
      alert("This browser does not support notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifStatus(permission);
    if (permission === "granted") {
      new Notification("$VBMS Notifications Enabled", {
        body: "You'll receive game alerts from Vibe Most Wanted!",
        icon: "/favicon-32x32.png",
      });
    }
  };

  if (!showFrame) {
    return (
      <MiniappFrameContext.Provider value={forcedMiniapp}>
        {children}
        {forcedMiniapp && (
          <button
            onClick={() => {
              localStorage.removeItem("vbms_force_miniapp");
              setForcedMiniapp(false);
              const isDesktop = window.innerWidth >= 480;
              if (isDesktop && !isMiniappMode()) {
                setFrameX(Math.round((window.innerWidth - 410) / 2));
                setFrameY(80);
                setShowFrame(true);
              }
            }}
            title="Exit miniapp mode"
            style={{
              position: "fixed",
              bottom: "12px",
              right: "12px",
              zIndex: 9999,
              background: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "8px",
              color: "rgba(255,255,255,0.5)",
              fontSize: "11px",
              padding: "5px 10px",
              cursor: "pointer",
              fontFamily: "system-ui, sans-serif",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <span style={{ fontSize: "13px" }}>⊞</span> Exit miniapp
          </button>
        )}
      </MiniappFrameContext.Provider>
    );
  }

  const FRAME_W = 410;
  const CHROME_H = 52;

  return (
    <MiniappFrameContext.Provider value={true}>
    {/* Background */}
    <div style={{
      position: "fixed", inset: 0,
      background: "radial-gradient(ellipse at 50% 30%, #1a1520 0%, #0a0a0a 70%)",
    }}>
      {showFloating && <HomeFloatingBackground />}
    </div>

    {/* Draggable phone shell */}
    {frameX !== null && (
      <div style={{
        position: "fixed",
        left: `${frameX}px`,
        top: `${frameY ?? 0}px`,
        borderRadius: "44px",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 0 0 100px #090a0a, 0 0 60px 20px rgba(0,0,0,0.6)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
        zIndex: 10,
        background: "#0a0a0a",
      }}>

        {/* ── CHROME BAR (outside transform div, no z-index conflict) ── */}
        <div
          ref={menuRef}
          onMouseDown={handleChromeMouseDown}
          className={isDragging ? "cursor-grabbing" : "cursor-grab"}
          style={{
            width: `${FRAME_W}px`,
            height: `${CHROME_H}px`,
            flexShrink: 0,
            background: "#111",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            gap: "10px",
            position: "relative",
          }}
        >
          {/* App icon */}
          <img src="/favicon-32x32.png" alt="$VBMS" style={{ width: "22px", height: "22px", borderRadius: "6px", flexShrink: 0 }} />

          {/* App name */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "12px", fontWeight: 600, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "system-ui, sans-serif" }}>
              $VBMS – Game and Wanted Cast
            </p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px", fontFamily: "system-ui, sans-serif" }}>by jvhbo</p>
          </div>

          {/* ··· menu */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => {
                setMenuOpen(v => !v);
                if (!seenMenu) {
                  setSeenMenu(true);
                  localStorage.setItem("vbms_seen_menu", "1");
                }
              }}
              style={{ position: "relative", width: "30px", height: "30px", borderRadius: "8px", background: menuOpen ? "rgba(255,255,255,0.1)" : "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.65)", fontSize: "15px", letterSpacing: "1px" }}
            >
              ···
              {!seenMenu && (
                <span style={{ position: "absolute", top: "-2px", right: "-2px", width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", border: "1.5px solid #111", pointerEvents: "none" }} />
              )}
            </button>

            {menuOpen && (
              <div style={{ position: "absolute", top: "36px", right: 0, width: "210px", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.7)", zIndex: 999 }}>
                <button onClick={() => { setMenuOpen(false); window.location.reload(); }} style={itemStyle}>
                  <span>↺</span><span>Reload page</span>
                </button>
                <button
                  onClick={requestNotifications}
                  disabled={notifStatus === "denied"}
                  style={{ ...itemStyle, opacity: notifStatus === "denied" ? 0.4 : 1, cursor: notifStatus === "denied" ? "not-allowed" : "pointer" }}
                >
                  <span>{notifStatus === "granted" ? "◆" : notifStatus === "denied" ? "◇" : "◇"}</span>
                  <span>{notifStatus === "granted" ? "Notifications on" : notifStatus === "denied" ? "Notifications blocked" : "Enable notifications"}</span>
                </button>
                <button
                  onClick={() => { setIsMusicEnabled(!isMusicEnabled); }}
                  style={itemStyle}
                >
                  <span>{isMusicEnabled ? "♪" : "♪"}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                    <span>{isMusicEnabled ? "Music on" : "Music off"}</span>
                    <span style={{ marginLeft: "auto", width: "32px", height: "16px", borderRadius: "8px", background: isMusicEnabled ? "#c9a84c" : "rgba(255,255,255,0.15)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
                      <span style={{ position: "absolute", top: "2px", left: isMusicEnabled ? "18px" : "2px", width: "12px", height: "12px", borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                    </span>
                  </span>
                </button>
                <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "0 12px" }} />
                <button onClick={() => { setMenuOpen(false); navigator.clipboard?.writeText("https://vibemostwanted.xyz"); }} style={itemStyle}>
                  <span>⎘</span><span>Copy link</span>
                </button>
                <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "0 12px" }} />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    localStorage.setItem("vbms_force_miniapp", "1");
                    setForcedMiniapp(true);
                    setShowFrame(false);
                  }}
                  style={itemStyle}
                >
                  <span>⊡</span><span>Force miniapp version</span>
                </button>
                {isConnected && (
                  <>
                    <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "0 12px" }} />
                    <button onClick={() => { setMenuOpen(false); disconnect(); }} style={{ ...itemStyle, color: "#f87171" }}>
                      <span>⏻</span><span>Disconnect wallet</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ↓ collapse */}
          <button
            onClick={() => { AudioManager.buttonFlap(); setCollapsed(v => !v); }}
            style={{ width: "30px", height: "30px", borderRadius: "8px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.65)", fontSize: "17px", transition: "transform 0.3s", transform: collapsed ? "rotate(180deg)" : "none" }}
            title={collapsed ? "Expand" : "Collapse"}
          >↓</button>
        </div>

        {/* ── PHONE BODY (transform creates containing block for fixed children) ── */}
        {!collapsed && (
          <div
            data-phone-body="true"
            style={{
              position: "relative",
              width: `${FRAME_W}px`,
              height: "calc(100dvh - 190px)",
              maxHeight: "660px",
              minHeight: "560px",
              background: "#0C0C0C",
              overflow: "hidden",
              // KEY: all position:fixed children are now relative to this box
              transform: "translateZ(0)",
            }}>
            {/*
              Override min-h-screen inside the frame:
              100vh = browser viewport, NOT the frame height.
              Unsetting it removes the dead space between content and bottom nav.
            */}
            <style>{`
              [data-phone-body] .min-h-screen {
                min-height: 100% !important;
              }
              /* Force mobile sizes inside the frame:
                 Tailwind md: breakpoints fire at browser width (desktop),
                 not frame width — override them back to mobile values */
              @media (min-width: 768px) {
                [data-phone-body] .md\\:p-3  { padding: 0.25rem !important; }
                [data-phone-body] .md\\:p-6  { padding: 0.25rem !important; }
                [data-phone-body] .md\\:px-6 { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
                [data-phone-body] .md\\:py-3 { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
                [data-phone-body] .md\\:gap-3 { gap: 0.5rem !important; }
                [data-phone-body] .md\\:gap-6 { gap: 0.25rem !important; }
                [data-phone-body] .md\\:mb-6 { margin-bottom: 0.75rem !important; }
                [data-phone-body] .md\\:mb-8 { margin-bottom: 1rem !important; }
                [data-phone-body] .md\\:text-base { font-size: 0.75rem !important; line-height: 1rem !important; }
                [data-phone-body] .lg\\:p-6  { padding: 0.25rem !important; }
                [data-phone-body] .lg\\:p-3  { padding: 0.25rem !important; }
              }
            `}</style>

            {/* Side buttons (decorative) */}
            <div style={{ position: "absolute", left: "-3px", top: "80px", width: "3px", height: "32px", background: "rgba(255,255,255,0.07)", borderRadius: "2px 0 0 2px" }} />
            <div style={{ position: "absolute", left: "-3px", top: "125px", width: "3px", height: "56px", background: "rgba(255,255,255,0.07)", borderRadius: "2px 0 0 2px" }} />
            <div style={{ position: "absolute", right: "-3px", top: "100px", width: "3px", height: "72px", background: "rgba(255,255,255,0.07)", borderRadius: "0 2px 2px 0" }} />

            {children}
          </div>
        )}
      </div>
    )}

      {/* ── BELOW FRAME: social links + language toggle ── */}
      <div style={{
        position: "fixed",
        bottom: "32px",
        left: "50%",
        transform: "translateX(-50%)",
        width: `${FRAME_W}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 4px",
        zIndex: 2,
      }}>
        {/* Social links */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* Farcaster */}
          <a href="https://farcaster.xyz/jvhbo" target="_blank" rel="noopener noreferrer" title="Farcaster" style={socialIconStyle}>
            <svg width="16" height="16" viewBox="0 0 1000 1000" fill="currentColor">
              <path d="M257.778 155.556H742.222V844.445H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.445H257.778V155.556Z"/>
              <path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 756.616 160 768.889V795.556H155.556C143.283 795.556 133.333 805.505 133.333 817.778V844.445H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z"/>
              <path d="M617.778 746.667C605.505 746.667 595.556 756.616 595.556 768.889V795.556H591.111C578.838 795.556 568.889 805.505 568.889 817.778V844.445H817.778V817.778C817.778 805.505 807.828 795.556 795.556 795.556H791.111V768.889C791.111 756.616 781.162 746.667 768.889 746.667V351.111H793.333L822.222 253.333H644.444V746.667H617.778Z"/>
            </svg>
          </a>
          {/* X / Twitter */}
          <a href="https://x.com/Lowprofile_eth" target="_blank" rel="noopener noreferrer" title="X / Twitter" style={socialIconStyle}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          {/* GitHub */}
          <a href="https://github.com/JVHBO" target="_blank" rel="noopener noreferrer" title="GitHub" style={socialIconStyle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>

        {/* Language toggle */}
        <LanguageSelect />
      </div>

      {/* ── FARCASTER NOTICE ── */}
      <div style={{
        position: "fixed",
        bottom: "12px",
        left: "50%",
        transform: "translateX(-50%)",
        width: `${FRAME_W}px`,
        textAlign: "center",
        padding: "0 4px",
        zIndex: 2,
      }}>
        <a
          href="https://farcaster.xyz/miniapps/0sNKxskaSKsH/vbms---game-and-wanted-cast"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "rgba(160,130,255,0.6)",
            fontSize: "11px",
            fontFamily: "system-ui, sans-serif",
            textDecoration: "none",
            letterSpacing: "0.02em",
            transition: "color 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(160,130,255,0.9)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(160,130,255,0.6)")}
        >
          ⬡ {FARCASTER_NOTICE[lang] || FARCASTER_NOTICE["en"]} — {OPEN_MINIAPP[lang] || OPEN_MINIAPP["en"]}
        </a>
      </div>

    </MiniappFrameContext.Provider>
  );
}

const socialIconStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.35)",
  display: "flex",
  alignItems: "center",
  transition: "color 0.2s",
  textDecoration: "none",
};

const itemStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 16px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  background: "transparent",
  border: "none",
  color: "rgba(255,255,255,0.85)",
  fontSize: "13px",
  fontFamily: "system-ui, sans-serif",
  textAlign: "left",
};
