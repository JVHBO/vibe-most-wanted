"use client";

import { useState, useEffect, useRef } from 'react';

interface CardMediaProps {
  src: string | undefined;
  alt: string | undefined;
  className?: string;
  loading?: "lazy" | "eager";
  onClick?: () => void;
}

/**
 * CardMedia component
 * Converts MP4/WebM videos to static image (first frame)
 * This ensures compatibility with foil effects and better performance
 */
export function CardMedia({ src, alt, className, loading = "lazy", onClick }: CardMediaProps) {
  const [imageSrc, setImageSrc] = useState<string | undefined>(src);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!src) return;

    // Check if URL suggests it's a video by extension
    const urlLower = src.toLowerCase();
    const isVideo = urlLower.includes('.mp4') || urlLower.includes('.webm') || urlLower.includes('.mov');

    if (isVideo) {
      // Create video element to capture first frame
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';

      video.addEventListener('loadeddata', () => {
        // Seek to first frame
        video.currentTime = 0.1;
      });

      video.addEventListener('seeked', () => {
        try {
          // Create canvas to capture frame
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 400;
          canvas.height = video.videoHeight || 600;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert to PNG
            const pngDataUrl = canvas.toDataURL('image/png');
            setImageSrc(pngDataUrl);
          }
        } catch (error) {
          console.warn('Failed to convert video to image, using original src:', error);
          setImageSrc(src);
        }
      });

      video.addEventListener('error', () => {
        console.warn('Video failed to load, using original src');
        setImageSrc(src);
      });

      video.src = src;
      videoRef.current = video;
    } else {
      setImageSrc(src);
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.src = '';
        videoRef.current = null;
      }
    };
  }, [src]);

  // Handle undefined src
  if (!src || !imageSrc) {
    return null;
  }

  return (
    <img
      src={imageSrc}
      alt={alt || ''}
      className={className}
      loading={loading}
      onClick={onClick}
    />
  );
}
