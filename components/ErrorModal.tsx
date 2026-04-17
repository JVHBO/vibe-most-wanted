"use client";

import { useState } from "react";
import { ReportModal } from "@/components/ReportModal";
import { AudioManager } from "@/lib/audio-manager";
import { getLogBuffer } from "@/lib/log-buffer";

interface ErrorModalProps {
  error: string | null;
  context?: string; // ex: "account_creation", "wallet_connect"
  onClose: () => void;
  t: (key: any) => string;
  address?: string;
  fid?: number | null;
  username?: string | null;
  farcasterDisplayName?: string | null;
}

export function ErrorModal({
  error,
  context,
  onClose,
  t,
  address,
  fid,
  username,
  farcasterDisplayName,
}: ErrorModalProps) {
  const [showReport, setShowReport] = useState(false);

  if (!error) return null;

  if (showReport) {
    // Monta descrição pré-preenchida com erro + logs relevantes
    const recentLogs = getLogBuffer()
      .filter(l => l.type === 'error' || l.type === 'unhandled' || l.type === 'app')
      .slice(-5)
      .map(l => `[${l.type}${l.context ? `/${l.context}` : ''}] ${l.message}${l.stack ? `\n  ${l.stack.split('\n')[1]?.trim()}` : ''}`)
      .join('\n');

    const prefilledDescription = [
      `Error: ${error}`,
      context ? `Context: ${context.replace(/_/g, ' ')}` : '',
      recentLogs ? `\nRecent logs:\n${recentLogs}` : '',
    ].filter(Boolean).join('\n');

    return (
      <ReportModal
        isOpen
        onClose={() => { setShowReport(false); onClose(); }}
        t={t}
        address={address}
        fid={fid}
        currentView={context}
        username={username}
        farcasterDisplayName={farcasterDisplayName}
        initialDescription={prefilledDescription}
        initialCategory="bug"
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-red-500/40 bg-[#1a1a1a] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <circle cx="12" cy="16" r="0.5" fill="#ef4444"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Something went wrong</p>
            {context && (
              <p className="text-white/40 text-[10px] uppercase tracking-wider mt-0.5">{context.replace(/_/g, " ")}</p>
            )}
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 text-lg leading-none">✕</button>
        </div>

        {/* Error message */}
        <div className="bg-black/40 rounded-xl px-3 py-2.5 mb-4 border border-white/5">
          <p className="text-red-400/90 text-xs font-mono leading-relaxed break-words">{error}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-xs font-semibold hover:border-white/20 hover:text-white/70 transition-all"
          >
            Dismiss
          </button>
          <button
            onClick={() => { AudioManager.buttonClick(); setShowReport(true); }}
            className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-all flex items-center justify-center gap-1.5"
          >
            <span>🐛</span>
            <span>Report Bug</span>
          </button>
        </div>
      </div>
    </div>
  );
}
