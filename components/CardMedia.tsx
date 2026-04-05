"use client";

import { useState, useRef } from 'react';

interface CardMediaProps {
  src: string | undefined;
  alt: string | undefined;
  className?: string;
  loading?: "lazy" | "eager";
  onClick?: () => void;
}

/**
 * CardMedia component - Simplified for mobile stability
 *
 * Renders video or image based on src URL
 * Uses native browser lazy loading - no complex JS
 *
 * FIX: Removed useEffect that caused flash/flicker on re-renders
 */
export function CardMedia({ src, alt, className, loading = "lazy", onClick }: CardMediaProps) {
  const [useImage, setUseImage] = useState(false);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const retriedRef = useRef(false);
  const prevSrcRef = useRef(src);

  // Reset state when src ACTUALLY changes - using ref comparison avoids flash
  // This is synchronous and happens during render, not in useEffect
  if (src !== prevSrcRef.current) {
    prevSrcRef.current = src;
    if (useImage) setUseImage(false);
    if (error) setError(false);
    retriedRef.current = false;
  }

  if (!src) {
    return null;
  }

  // Check if it's a data URL (base64 image) - these should ALWAYS render as images
  const isDataUrl = src.startsWith('data:');

  // Check if it's a video file
  const srcLower = src.toLowerCase();
  const hasVideoExtension = srcLower.includes('.mp4') || srcLower.includes('.webm') || srcLower.includes('.mov');
  const isIpfs = srcLower.includes('ipfs');

  // VibeFID specific: filebase.io URLs are always video
  const isVibeFID = srcLower.includes('filebase.io');

  // useImage=true always forces image path, even for filebase.io (PNG fallback)
  const shouldTryVideo = !isDataUrl && !useImage && (hasVideoExtension || isVibeFID || isIpfs);

  if (shouldTryVideo && !error) {
    return (
      <video
        key={retryKey}
        src={src}
        className={className}
        loop
        muted
        playsInline
        autoPlay
        preload="auto"
        onClick={onClick}
        style={{ objectFit: 'cover' }}
        onError={() => {
          if (!retriedRef.current) {
            // First failure: retry once after delay (transient network error)
            retriedRef.current = true;
            setTimeout(() => setRetryKey(k => k + 1), 1500);
          } else {
            // Second failure: fall back to image (handles PNG-on-filebase.io case)
            setUseImage(true);
          }
        }}
      />
    );
  }

  // VibeFID error state - show dark placeholder (video unavailable)
  if (error && isVibeFID) {
    return (
      <div
        className={className}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a14', color: '#ffd700', fontSize: '10px', padding: '8px', textAlign: 'center', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}
        onClick={() => { if (src) window.open(src, '_blank'); }}
      >
        <span style={{ fontSize: '18px' }}>▶</span>
        <span style={{ color: '#aaa', fontSize: '9px' }}>VibeFID</span>
      </div>
    );
  }

  // Error fallback for non-VibeFID images - show placeholder
  if (error) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          color: '#ffd700',
          fontSize: '12px',
        }}
      >
        <span>⚠️ Image unavailable</span>
      </div>
    );
  }

  // Regular image rendering
  return (
    <img
      src={src}
      alt={alt || ''}
      className={className}
      loading={loading}
      onClick={onClick}
      style={{ display: 'block' }}
      onLoad={() => {
        console.log('✅ Image loaded successfully:', src);
      }}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        console.error('❌ Image failed to load:', {
          src,
          naturalWidth: target.naturalWidth,
          naturalHeight: target.naturalHeight,
          complete: target.complete,
          currentSrc: target.currentSrc,
        });
        setError(true);
      }}
    />
  );
}
