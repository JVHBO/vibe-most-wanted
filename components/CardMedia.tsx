"use client";

import { useState } from 'react';

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

  if (!src) {
    return null;
  }

  // Check if it's a video file
  const srcLower = src.toLowerCase();
  const hasVideoExtension = srcLower.includes('.mp4') || srcLower.includes('.webm') || srcLower.includes('.mov');
  const isIpfs = srcLower.includes('ipfs');
  const shouldTryVideo = hasVideoExtension || (isIpfs && !useImage);

  if (shouldTryVideo) {
    return (
      <video
        key={src}
        src={src}
        className={className}
        loop
        muted
        playsInline
        autoPlay={loading === "eager"} // Only autoplay for eager (battle cards)
        preload={loading === "lazy" ? "none" : "metadata"} // Lazy = don't preload
        onClick={onClick}
        style={{ objectFit: 'cover', pointerEvents: 'none' }}
        onError={(e) => {
          console.warn('Video failed, trying image:', src);
          setUseImage(true);
        }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt || ''}
      className={className}
      loading={loading}
      onClick={onClick}
      onError={(e) => {
        console.warn('Failed to load image:', src);
      }}
    />
  );
}
