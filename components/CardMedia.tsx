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
  const prevSrcRef = useRef(src);

  // Reset state when src ACTUALLY changes - using ref comparison avoids flash
  // This is synchronous and happens during render, not in useEffect
  if (src !== prevSrcRef.current) {
    prevSrcRef.current = src;
    if (useImage) setUseImage(false);
    if (error) setError(false);
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
  
  // VibeFID specific: filebase.io URLs should NEVER fallback to image
  const isVibeFID = srcLower.includes('filebase.io');
  
  const shouldTryVideo = !isDataUrl && (hasVideoExtension || (isIpfs && !useImage));

  if (shouldTryVideo && !error) {
    return (
      <video
        src={src}
        className={className}
        loop
        muted
        playsInline
        autoPlay
        preload="auto"
        onClick={onClick}
        style={{ objectFit: 'cover' }}
        onError={(e) => {
          console.error('Video failed to load:', src);
          if (isVibeFID) {
            // VibeFID: show error, NEVER fallback to image
            setError(true);
          } else {
            // Other collections: fallback to image
            setUseImage(true);
          }
        }}
      />
    );
  }

  // VibeFID error state - show link instead of image fallback
  if (error && isVibeFID) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', color: '#fff', fontSize: '10px', padding: '10px', textAlign: 'center', flexDirection: 'column' }}>
        <a href={src} target="_blank" rel="noopener noreferrer" style={{ color: '#ffd700' }}>
          Open
        </a>
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
      onError={(e) => {
        console.error('Image failed to load:', src);
        setError(true);
      }}
    />
  );
}
