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
  const [error, setError] = useState(false);

  if (!src) {
    return null;
  }

  // Check if it's a data URL (base64 image) - these should ALWAYS render as images
  const isDataUrl = src.startsWith('data:');

  // Check if it's a video file
  const srcLower = src.toLowerCase();
  const hasVideoExtension = srcLower.includes('.mp4') || srcLower.includes('.webm') || srcLower.includes('.mov');
  const isIpfs = srcLower.includes('ipfs');
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
        autoPlay // Always autoplay (muted videos are safe)
        preload="auto" // Always preload to ensure IPFS videos load
        onClick={onClick}
        style={{ objectFit: 'cover' }}
        onError={(e) => {
          console.error('❌ Video failed to load:', src);
          setUseImage(true);
          setError(true);
        }}
        onLoadedData={() => {
          console.log('✅ Video loaded:', src);
        }}
      />
    );
  }

  // If error, show placeholder with IPFS link (but NOT for data URLs)
  if (error && isIpfs && !isDataUrl) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', color: '#fff', fontSize: '12px', padding: '20px', textAlign: 'center', flexDirection: 'column' }}>
        <div>⚠️ IPFS Loading Failed</div>
        <a href={src} target="_blank" rel="noopener noreferrer" style={{ color: '#ffd700', marginTop: '10px', textDecoration: 'underline' }}>
          Open in IPFS
        </a>
      </div>
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
        console.error('❌ Image failed to load:', src);
        setError(true);
      }}
    />
  );
}
