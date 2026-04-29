"use client";

import Link from "next/link";
import { AudioManager } from "@/lib/audio-manager";

interface PageHeaderProps {
  title: string;
  backHref?: string;
  onBack?: () => void;
  soundEnabled?: boolean;
  right?: React.ReactNode;
}

export function PageHeader({ title, backHref = "/", onBack, soundEnabled, right }: PageHeaderProps) {
  const handleBack = () => {
    if (soundEnabled) AudioManager.buttonClick();
    if (onBack) onBack();
  };

  return (
    <div
      style={{
        background: 'rgba(26,26,26,0.97)',
        borderBottom: '2px solid rgba(255,215,0,0.25)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '0 8px',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        flexShrink: 0,
      }}
    >
      {/* Back */}
      {onBack ? (
        <button
          onClick={handleBack}
          style={{ background: '#CC2222', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0 }}
        >
          ← BACK
        </button>
      ) : (
        <Link
          href={backHref}
          onClick={() => { if (soundEnabled) AudioManager.buttonClick(); }}
          style={{ background: '#CC2222', color: '#fff', borderRadius: 6, padding: '5px 12px', fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', flexShrink: 0 }}
        >
          ← BACK
        </Link>
      )}

      {/* Title */}
      <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 900, color: '#FFD700', letterSpacing: '0.08em', textTransform: 'uppercase', flex: 1, textAlign: 'center' }}>
        {title}
      </span>

      {/* Right slot */}
      <div style={{ flexShrink: 0, minWidth: 60, display: 'flex', justifyContent: 'flex-end' }}>
        {right ?? null}
      </div>
    </div>
  );
}
