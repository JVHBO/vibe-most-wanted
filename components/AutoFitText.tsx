"use client";
import { useRef, useLayoutEffect, useState, ReactNode } from "react";

interface AutoFitTextProps {
  children: ReactNode;
  className?: string;
  minSize?: number;
  as?: "h1" | "h2" | "span" | "p" | "div";
}

/**
 * Renders text and shrinks font-size if content overflows its container.
 * Use on any element where translated text might be longer than the default.
 */
export function AutoFitText({ children, className = "", minSize = 9, as: Tag = "span" }: AutoFitTextProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    // Reset scale to measure natural size
    el.style.fontSize = "";
    setScale(1);

    const parent = el.parentElement;
    if (!parent) return;

    const parentW = parent.clientWidth;
    const naturalW = el.scrollWidth;

    if (naturalW <= parentW) {
      setScale(1);
      return;
    }

    const naturalSize = parseFloat(getComputedStyle(el).fontSize);
    const ratio = parentW / naturalW;
    const newSize = Math.max(minSize, Math.floor(naturalSize * ratio));
    setScale(newSize / naturalSize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  return (
    // @ts-ignore — dynamic tag
    <Tag
      ref={wrapRef}
      className={`whitespace-nowrap inline-block ${className}`}
      style={scale < 1 ? { fontSize: `${scale * 100}%` } : undefined}
    >
      {children}
    </Tag>
  );
}
