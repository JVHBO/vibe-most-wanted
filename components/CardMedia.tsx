"use client";

interface CardMediaProps {
  src: string | undefined;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  onClick?: () => void;
}

/**
 * CardMedia component
 * Renders video for MP4/WebM files, image for everything else
 * Images will show video thumbnails for IPFS videos without extensions
 */
export function CardMedia({ src, alt, className, loading = "lazy", onClick }: CardMediaProps) {
  // Handle undefined src
  if (!src) {
    return null;
  }

  // Check if URL suggests it's a video by extension
  const urlLower = src.toLowerCase();
  const isVideo = urlLower.includes('.mp4') || urlLower.includes('.webm') || urlLower.includes('.mov');

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
        style={{ objectFit: 'cover' }}
      />
    );
  }

  // Default to image (works for both images and will show video thumbnail for IPFS)
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onClick={onClick}
    />
  );
}
