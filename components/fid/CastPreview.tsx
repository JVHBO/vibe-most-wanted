'use client';

import { useState, useEffect } from 'react';

interface CastPreviewProps {
  castUrl: string;
  compact?: boolean;
}

interface CastData {
  text: string;
  author: {
    username: string;
    display_name?: string;
    pfp_url?: string;
  };
  embeds?: Array<{
    url?: string;
    metadata?: { image?: { url?: string } };
  }>;
  timestamp?: string;
}

export function CastPreview({ castUrl, compact = false }: CastPreviewProps) {
  const [cast, setCast] = useState<CastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!castUrl) return;
    // Check sessionStorage cache first
    const cacheKey = `cast_preview_${castUrl}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setCast(JSON.parse(cached));
        setLoading(false);
        return;
      }
    } catch {}
    setLoading(true);
    setError(false);
    fetch(`/api/cast-by-url?url=${encodeURIComponent(castUrl)}`)
      .then(r => r.json())
      .then(d => {
        if (d.cast) {
          setCast(d.cast);
          try { sessionStorage.setItem(cacheKey, JSON.stringify(d.cast)); } catch {}
        } else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [castUrl]);

  if (loading) {
    return (
      <div className="mt-2 border-2 border-black bg-[#1A1A1A] p-2 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#333] rounded-full" />
          <div className="h-3 w-24 bg-[#333] rounded" />
        </div>
        <div className="h-3 w-full bg-[#333] rounded mt-2" />
      </div>
    );
  }

  if (error || !cast) {
    return (
      <a
        href={castUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block border-2 border-black bg-[#1A1A1A] p-2 text-xs text-vintage-gold/70 hover:text-vintage-gold transition-colors"
      >
        View cast →
      </a>
    );
  }

  const imgUrl = cast.embeds?.[0]?.metadata?.image?.url ||
    (cast.embeds?.[0]?.url?.match(/\.(jpg|jpeg|png|gif|webp)/i) ? cast.embeds[0].url : null);

  const timeAgo = cast.timestamp ? (() => {
    const s = Math.floor((Date.now() - new Date(cast.timestamp).getTime()) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  })() : '';

  return (
    <a
      href={castUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block border-2 border-black bg-[#111] shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] transition-all"
    >
      <div className="p-2">
        <div className="flex items-center gap-2 mb-1">
          {cast.author.pfp_url ? (
            <img src={cast.author.pfp_url} alt="" className="w-5 h-5 rounded-full flex-shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-[#333] flex-shrink-0" />
          )}
          <span className="text-white font-bold text-xs truncate">
            {cast.author.display_name || cast.author.username}
          </span>
          <span className="text-zinc-500 text-[10px] flex-shrink-0">@{cast.author.username}</span>
          {timeAgo && <span className="text-zinc-600 text-[10px] ml-auto flex-shrink-0">{timeAgo}</span>}
        </div>
        <p className={`text-zinc-300 text-xs leading-relaxed ${compact ? 'line-clamp-2' : 'line-clamp-3'}`}>
          {cast.text}
        </p>
        {!compact && imgUrl && (
          <img src={imgUrl} alt="" className="mt-1.5 w-full max-h-32 object-cover border border-zinc-700" />
        )}
      </div>
      <div className="border-t border-zinc-800 px-2 py-1 flex items-center gap-1">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9945ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span className="text-[9px] text-zinc-500">Warpcast</span>
      </div>
    </a>
  );
}
