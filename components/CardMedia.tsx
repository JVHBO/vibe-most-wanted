"use client";

interface CardMediaProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  onClick?: () => void;
}

/**
 * CardMedia component
 * Automatically detects if the source is an MP4/WebM video or image
 * and renders the appropriate HTML element
 */
export function CardMedia({ src, alt, className, loading = "lazy", onClick }: CardMediaProps) {
  const isVideo = src?.toLowerCase().endsWith('.mp4') || src?.toLowerCase().endsWith('.webm');

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
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    );
  }

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
