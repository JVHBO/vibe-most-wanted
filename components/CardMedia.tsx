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
 * Simply renders an img tag - browsers automatically show video thumbnails for MP4/WebM
 * This avoids CORS issues with IPFS
 */
export function CardMedia({ src, alt, className, loading = "lazy", onClick }: CardMediaProps) {
  // Handle undefined src
  if (!src) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt || ''}
      className={className}
      loading={loading}
      onClick={onClick}
      onError={(e) => {
        console.warn('Failed to load media:', src);
        // Try without cache on error
        const img = e.target as HTMLImageElement;
        if (!img.src.includes('?nocache')) {
          img.src = src + '?nocache=' + Date.now();
        }
      }}
    />
  );
}
