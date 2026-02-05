import React from "react";
import type { BattleLogEntry } from "@/lib/tcg/types";

interface BattleLogPanelProps {
  battleLog: BattleLogEntry[];
  show: boolean;
  onToggle: () => void;
  isPvP?: boolean;
  t: (key: string) => string;
}

const effectColors: Record<string, string> = {
  buff: "border-l-green-500 bg-green-900/20",
  debuff: "border-l-red-500 bg-red-900/20",
  destroy: "border-l-orange-500 bg-orange-900/20",
  steal: "border-l-purple-500 bg-purple-900/20",
  draw: "border-l-cyan-500 bg-cyan-900/20",
  move: "border-l-yellow-500 bg-yellow-900/20",
  copy: "border-l-pink-500 bg-pink-900/20",
  special: "border-l-violet-500 bg-violet-900/20",
};

export function BattleLogPanel({ battleLog, show, onToggle, isPvP, t }: BattleLogPanelProps) {
  return (
    <>
      {/* Battle Log Floating Button */}
      <button
        onClick={onToggle}
        className="fixed bottom-20 right-3 w-10 h-10 rounded-full bg-black/80 border border-vintage-gold/40 flex items-center justify-center z-30 hover:bg-black/90 transition-all"
      >
        <span className="text-lg">{"\uD83D\uDCDC"}</span>
      </button>

      {/* Battle Log Panel */}
      {show && (
        <div className="fixed right-0 top-0 bottom-0 w-72 bg-black/95 border-l border-vintage-gold/30 z-40 overflow-y-auto p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-vintage-gold font-bold text-sm uppercase tracking-wider">Battle Log</h3>
            <button onClick={onToggle} className="text-gray-400 hover:text-white text-lg">{"\u2715"}</button>
          </div>
          {battleLog.length === 0 ? (
            <p className="text-gray-500 text-xs">No actions yet...</p>
          ) : (
            <div className="space-y-1.5">
              {battleLog.map((entry, i) => {
                const baseColor = entry.player === "you" ? "text-blue-300" : "text-red-300";
                const effectStyle = entry.effectType ? effectColors[entry.effectType] || "" : "";
                const isAbilityLog = entry.abilityName || entry.effectType;

                return (
                  <div key={i} className={`text-[10px] px-2 py-1.5 rounded border-l-2 ${
                    isAbilityLog ? effectStyle : (entry.player === "you" ? "bg-blue-900/20 border-l-blue-500" : "bg-red-900/20 border-l-red-500")
                  }`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-vintage-gold/70 font-mono">T{entry.turn}</span>
                      <span className={`font-bold ${baseColor}`}>{entry.player === "you" ? "You" : entry.player === "opponent" ? "Opponent" : "CPU"}</span>
                      <span className="text-white/90 font-medium truncate">{entry.cardName}</span>
                      <span className="text-gray-500 ml-auto">L{isPvP ? entry.lane + 1 : entry.lane}</span>
                    </div>
                    <div className="text-[9px] text-gray-300">
                      {entry.action}
                      {entry.powerChange !== undefined && entry.powerChange !== 0 && (
                        <span className={`ml-1 font-bold ${entry.powerChange > 0 ? "text-green-400" : "text-red-400"}`}>
                          {entry.powerChange > 0 ? "+" : ""}{entry.powerChange}
                        </span>
                      )}
                    </div>
                    {entry.targets && entry.targets.length > 0 && (
                      <div className="text-[8px] text-gray-400 mt-0.5">
                        {"\u2192"} {entry.targets.join(", ")}
                      </div>
                    )}
                    {entry.details && (
                      <div className="text-[8px] text-gray-500 italic mt-0.5">{entry.details}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
