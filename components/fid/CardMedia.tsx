"use client";

import { useState, useRef, useEffect, memo } from 'react';

interface CardMediaProps {
  src: string | undefined;
  alt: string | undefined;
  className?: string;
  loading?: "lazy" | "eager";
  onClick?: () => void;
}

function CardMediaComponent({ src, alt, className, loading = "lazy", onClick }: CardMediaProps) {
  const [useImage, setUseImage] = useState(false);
  const [error, setError] = useState(false);
  const prevSrcRef = useRef(src);

  useEffect(() => {
    if (src !== prevSrcRef.current) {
      prevSrcRef.current = src;
      setUseImage(false);
      setError(false);
    }
  }, [src]);

  if (!src) return null;

  const isDataUrl = src.startsWith('data:');
  const srcLower = src.toLowerCase();
  const hasVideoExtension = srcLower.includes('.mp4') || srcLower.includes('.webm') || srcLower.includes('.mov');
  const isIpfs = srcLower.includes('ipfs');
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
        onError={() => {
          // Always try image fallback first before showing error
          setUseImage(true);
        }}
      />
    );
  }

  if (error && isVibeFID) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', color: '#fff', fontSize: '10px', padding: '10px', textAlign: 'center', flexDirection: 'column' }}>
        <a href={src} target="_blank" rel="noopener noreferrer" style={{ color: '#ffd700' }}>Open</a>
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
      style={{ background: '#1a1a1a' }}
      onError={() => setError(true)}
    />
  );
}

export const CardMedia = memo(CardMediaComponent);
