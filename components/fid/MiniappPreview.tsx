'use client';

import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface MiniappMeta {
  name: string;
  icon_url?: string;
  subtitle?: string;
  description?: string;
  screenshot_urls?: string[];
  splash_image_url?: string;
  home_url?: string;
}

interface MiniappPreviewProps {
  url: string;
}

export function MiniappPreview({ url }: MiniappPreviewProps) {
  const [meta, setMeta] = useState<MiniappMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cacheKey = `miniapp_preview_${url}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setMeta(JSON.parse(cached));
        setLoading(false);
        return;
      }
    } catch {}
    fetch(`/api/fid/miniapp-preview?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => {
        const app = data?.mini_app ?? data?.miniApp ?? null;
        if (app?.name) {
          setMeta(app);
          try { sessionStorage.setItem(cacheKey, JSON.stringify(app)); } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [url]);

  const handleOpen = () => { try { sdk.actions.openUrl(url); } catch { window.open(url, '_blank'); } };

  if (loading) {
    return (
      <div className="w-full mt-2 bg-[#0d1f0d] border-2 border-[#22C55E] h-12 animate-pulse" />
    );
  }

  if (!meta) {
    return (
      <button
        onClick={handleOpen}
        className="w-full mt-2 bg-[#0d1f0d] border-2 border-[#22C55E] shadow-[2px_2px_0px_#000] p-2 flex items-center gap-2 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all text-left"
      >
        <div className="w-8 h-8 bg-[#22C55E] flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[#22C55E] font-bold text-xs">Open Miniapp</p>
          <p className="text-white/50 text-[10px] truncate">{url}</p>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </button>
    );
  }

  const screenshot = meta.screenshot_urls?.[0];

  return (
    <div className="w-full mt-2 border-2 border-[#22C55E] shadow-[2px_2px_0px_#000] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-2 bg-[#0a1a0a]">
        {meta.icon_url ? (
          <img
            src={meta.icon_url}
            alt={meta.name}
            className="w-9 h-9 rounded object-cover flex-shrink-0 border border-[#22C55E]/30"
          />
        ) : (
          <div className="w-9 h-9 bg-[#22C55E] flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-xs truncate">{meta.name}</p>
          <span className="text-[#22C55E] text-[9px] font-bold uppercase tracking-wide">Mini App</span>
        </div>
      </div>

      {/* Description */}
      {(meta.subtitle || meta.description) && (
        <p className="text-white/60 text-[10px] px-2 py-1.5 line-clamp-2 border-t border-[#22C55E]/20">
          {meta.subtitle || meta.description}
        </p>
      )}

      {/* Screenshot */}
      {screenshot && (
        <div className="w-full border-t border-[#22C55E]/20">
          <img src={screenshot} alt="" className="w-full object-cover max-h-36" />
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleOpen}
        className="w-full py-2 bg-[#22C55E] border-t-2 border-[#22C55E] text-black font-black text-xs hover:bg-[#16a34a] transition-colors flex items-center justify-center gap-1"
        style={{ WebkitTextFillColor: 'black' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Open App
      </button>
    </div>
  );
}
