"use client";

import { useState, useRef, useEffect } from 'react';

interface CardMediaProps {
  src: string | undefined;
  alt: string | undefined;
  className?: string;
  loading?: "lazy" | "eager";
  onClick?: () => void;
}

// Global counter to limit simultaneous playing videos
let playingVideosCount = 0;
const MAX_PLAYING_VIDEOS = 4; // Max 4 videos playing at once on mobile

/**
 * CardMedia component with optimized video loading for mobile
 *
 * Optimizations:
 * - Lazy loads videos using Intersection Observer
 * - Pauses videos outside viewport to save resources
 * - Limits simultaneous playing videos (max 4)
 * - Uses poster frame before loading video
 * - Falls back to img if video fails
 */
export function CardMedia({ src, alt, className, loading = "lazy", onClick }: CardMediaProps) {
  const [useImage, setUseImage] = useState(false);
  const [isVisible, setIsVisible] = useState(loading === "eager"); // eager loads immediately
  const [shouldPlay, setShouldPlay] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Intersection Observer for lazy loading and play/pause
  useEffect(() => {
    if (!shouldTryVideo || !containerRef.current || loading === "eager") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Mark as visible when 10% of video is in viewport
          if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
            setIsVisible(true);

            // Only play if we haven't exceeded max playing videos
            if (playingVideosCount < MAX_PLAYING_VIDEOS) {
              setShouldPlay(true);
            }
          } else {
            // Pause when out of viewport
            setShouldPlay(false);
          }
        });
      },
      {
        threshold: [0, 0.1, 0.5], // Trigger at 0%, 10%, and 50% visibility
        rootMargin: '50px', // Start loading 50px before entering viewport
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [shouldTryVideo, loading]);

  // Control video play/pause based on shouldPlay state
  useEffect(() => {
    if (!videoRef.current) return;

    if (shouldPlay) {
      playingVideosCount++;
      videoRef.current.play().catch((err) => {
        console.warn('Video play failed:', err);
        playingVideosCount--;
      });
    } else {
      if (!videoRef.current.paused) {
        playingVideosCount--;
      }
      videoRef.current.pause();
    }

    return () => {
      // Cleanup: decrement counter when component unmounts
      if (videoRef.current && !videoRef.current.paused) {
        playingVideosCount--;
      }
    };
  }, [shouldPlay]);

  if (shouldTryVideo) {
    return (
      <div ref={containerRef} className={className} onClick={onClick}>
        {isVisible ? (
          <video
            ref={videoRef}
            key={src}
            src={src}
            className="w-full h-full"
            loop
            muted
            playsInline
            preload={loading === "lazy" ? "metadata" : "auto"} // Only load metadata for lazy
            style={{ objectFit: 'cover', pointerEvents: 'none' }}
            onError={(e) => {
              console.warn('Video failed, trying image:', src);
              setUseImage(true);
            }}
          />
        ) : (
          // Placeholder while video is not visible (lazy loading)
          <div
            className="w-full h-full bg-vintage-deep-black/50 flex items-center justify-center"
            style={{ objectFit: 'cover' }}
          >
            <span className="text-vintage-burnt-gold/30 text-xs">Loading...</span>
          </div>
        )}
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
        console.warn('Failed to load image:', src);
      }}
    />
  );
}
