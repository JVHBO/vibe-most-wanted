"use client";

interface CardMediaProps {
  src: string | undefined;
  alt: string | undefined;
  className?: string;
  loading?: "lazy" | "eager";
  onClick?: () => void;
}

/**
 * CardMedia component
 * Auto-detects MP4/WebM and renders as looping video
 * Falls back to img for regular images
 */
export function CardMedia({ src, alt, className, loading = "lazy", onClick }: CardMediaProps) {
  // Handle undefined src
  if (!src) {
    return null;
  }

  // Check if it's a video file
  const srcLower = src.toLowerCase();
  const isVideo = srcLower.includes('.mp4') || srcLower.includes('.webm') || srcLower.includes('.mov');

  if (isVideo) {
    return (
      <video
        src={src}
        className={className}
        autoPlay
        loop
        muted
        playsInline
        onClick={onClick}
        style={{ objectFit: 'cover', pointerEvents: 'none' }}
        onError={(e) => {
          console.warn('Failed to load video:', src);
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
