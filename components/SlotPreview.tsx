"use client";
import { memo, useState, useEffect } from "react";
import { isBaseAppWebView } from "@/lib/utils/miniapp";

const COMBOS = [
  { name: "Snipers & Bots", rank: "10", color: "#ec4899", win: [0,1,2] },
  { name: "Kings of Vibe",  rank: "K",  color: "#f59e0b", win: [3,4,5] },
  { name: "Chain Breakers", rank: "9",  color: "#a855f7", win: [0,3,6] },
];

type Phase = "fall" | "show" | "win" | "vanish";

export const SlotPreview = memo(function SlotPreview() {
  const isBaseApp = isBaseAppWebView();
  const [phase, setPhase] = useState<Phase>("fall");
  const [ci, setCi] = useState(0);
  const [landed, setLanded] = useState([false,false,false]);

  useEffect(() => {
    if (isBaseApp) return;
    const t: ReturnType<typeof setTimeout>[] = [];
    if (phase === "fall") {
      setLanded([false,false,false]);
      [0,1,2].forEach(col => {
        t.push(setTimeout(() => setLanded(p => { const n=[...p]; n[col]=true; return n; }), col * 130));
      });
      t.push(setTimeout(() => setPhase("show"), 600));
    } else if (phase === "show") {
      t.push(setTimeout(() => setPhase("win"), 400));
    } else if (phase === "win") {
      t.push(setTimeout(() => setPhase("vanish"), 1000));
    } else {
      t.push(setTimeout(() => { setCi(i => (i+1) % COMBOS.length); setPhase("fall"); }, 350));
    }
    return () => t.forEach(clearTimeout);
  }, [isBaseApp, phase]);

  const combo = COMBOS[isBaseApp ? 0 : ci];
  const isWinPhase = isBaseApp ? true : phase === "win";
  const landedState = isBaseApp ? [true, true, true] : landed;

  return (
    <div style={{ position:"absolute", right:0, top:0, bottom:0, width:"55%", display:"flex", alignItems:"center", justifyContent:"center", padding:"4px 6px", opacity: 0.75 }}>
      {/* grid */}
      <div style={{ position:"relative", display:"grid", gridTemplateColumns:"repeat(3,22px)", gridTemplateRows:"repeat(3,26px)", gap:3 }}>
        {Array.from({length:9}, (_,i) => {
          const col = i % 3;
          const isWin = combo.win.includes(i);
          const isLanded = landedState[col];
          const isVanish = !isBaseApp && phase==="vanish";

          return (
            <div key={i} style={{
              width:22, height:26,
              transform: isVanish ? "translateY(-12px)" : isLanded ? "translateY(0)" : "translateY(-20px)",
              opacity: isVanish ? 0 : isLanded ? 1 : 0,
              transition: isBaseApp ? undefined : isVanish
                ? `transform 0.22s ease-in, opacity 0.22s ease-in`
                : `transform 0.2s cubic-bezier(.34,1.56,.64,1) ${col*0.05}s, opacity 0.15s ease ${col*0.05}s`,
            }}>
              <svg width="22" height="26" viewBox="0 0 22 26">
                <rect x="0.5" y="0.5" width="21" height="25" rx="2.5"
                  fill={(isWin && isWinPhase) ? `${combo.color}30` : "rgba(255,255,255,0.06)"}
                  stroke={(isWin && isWinPhase) ? combo.color : "rgba(255,255,255,0.15)"}
                  strokeWidth={(isWin && isWinPhase) ? "2" : "0.8"}
                />
                {(isWin && isWinPhase)
                  ? <text x="11" y="16" textAnchor="middle" fontSize="10" fontWeight="900" fill={combo.color}>{combo.rank}</text>
                  : <>
                    <line x1="3" y1="11" x2="19" y2="11" stroke="rgba(255,255,255,0.09)" strokeWidth="0.8"/>
                    <line x1="3" y1="16" x2="14" y2="16" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8"/>
                  </>
                }
              </svg>
            </div>
          );
        })}

        {/* nome do combo — overlay centralizado sobre o grid */}
        <div style={{
          position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
          pointerEvents:"none",
          opacity: isWinPhase ? 1 : 0,
          transition:"opacity 0.2s",
        }}>
          <span style={{
            fontSize:6, fontWeight:800, color:`${combo.color}bb`,
            textTransform:"uppercase", letterSpacing:0.3,
            textAlign:"center", whiteSpace:"nowrap",
          }}>{combo.name}</span>
        </div>
      </div>
    </div>
  );
});
