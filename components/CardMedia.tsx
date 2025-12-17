"use client";

import { useState, useEffect } from 'react';

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
 */
export function CardMedia({ src, alt, className, loading = "lazy", onClick }: CardMediaProps) {
  const [useImage, setUseImage] = useState(false);
  const [error, setError] = useState(false);

  // Reset state when src changes - fixes issue where error state persists across different cards
  useEffect(() => {
    setUseImage(false);
    setError(false);
  }, [src]);

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
        key={src}
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
        onLoadedData={() => {
          console.log('Video loaded:', src);
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

  // Regular image rendering (or fallback for non-VibeFID IPFS)
  return (
    <img
      src={src}
      alt={alt || ''}
      className={className}
      loading={loading}
      onClick={onClick}
      onError={(e) => {
        console.error('Image failed to load:', src);
        setError(true);
      }}
    />
  );
}
