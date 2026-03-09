'use client';

import { useState, useEffect, useRef } from 'react';
import { AudioManager } from '@/lib/audio-manager';

interface TypewriterTextProps {
  text: string;
  speed?: number; // ms per character
  className?: string;
  onComplete?: () => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export default function TypewriterText({
  text,
  speed = 20, // Fast typing for mobile
  className = "",
  onComplete,
  scrollContainerRef
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const textEndRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);

        // Play typewriter sound (only for non-whitespace characters)
        if (text[currentIndex] && text[currentIndex].trim()) {
          // Typewriter click sound - short high-pitched tone
          AudioManager.playTone(1200 + Math.random() * 200, 0.02, 0.08);
        }

        // Auto-scroll to bottom of text
        if (scrollContainerRef?.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, speed);

      return () => clearTimeout(timeout);
    } else if (currentIndex === text.length && onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete, scrollContainerRef]);

  return (
    <span className={className}>
      {displayedText}
      {currentIndex < text.length && (
        <span className="animate-pulse">|</span>
      )}
      <span ref={textEndRef} />
    </span>
  );
}
