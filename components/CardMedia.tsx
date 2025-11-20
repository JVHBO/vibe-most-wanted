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
 * CardMedia component
 * Tries to render as video first (for IPFS MP4s without extensions)
 * Falls back to img if video fails to load
 */
export function CardMedia({ src, alt, className, loading = "lazy", onClick }: CardMediaProps) {
  const [useImage, setUseImage] = useState(false);

  // Handle undefined src
  if (!src) {
    return null;
  }

  // Check if it's obviously a video file by extension
  const srcLower = src.toLowerCase();
  const hasVideoExtension = srcLower.includes('.mp4') || srcLower.includes('.webm') || srcLower.includes('.mov');

  // For IPFS URLs without extension, also try video
  const isIpfs = srcLower.includes('ipfs');
  const shouldTryVideo = hasVideoExtension || (isIpfs && !useImage);

  if (shouldTryVideo) {
    return (
      <video
        key={src}
        src={src}
        className={className}
        autoPlay
        loop
        muted
        playsInline
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
