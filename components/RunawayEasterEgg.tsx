"use client";

import { useState, useEffect, useRef } from "react";

export function RunawayEasterEgg() {
  const [position, setPosition] = useState({ x: 85, y: 60 }); // Start right side (85% x, 60% y)
  const [isRunning, setIsRunning] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!imageRef.current) return;

      const rect = imageRef.current.getBoundingClientRect();
      const imageCenterX = rect.left + rect.width / 2;
      const imageCenterY = rect.top + rect.height / 2;

      // Calculate distance from mouse to image center
      const dx = e.clientX - imageCenterX;
      const dy = e.clientY - imageCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If mouse gets within 200px, run away!
      const FLEE_DISTANCE = 200;
      if (distance < FLEE_DISTANCE) {
        setIsRunning(true);

        // Generate new random position (prefer sides where there's no content)
        // 60% chance to go to sides (0-15% or 85-100%), 40% chance anywhere
        const preferSides = Math.random() > 0.4;
        let newX: number;

        if (preferSides) {
          // Go to left side (0-15%) or right side (85-100%)
          const goLeft = Math.random() > 0.5;
          newX = goLeft ? Math.random() * 15 : 85 + Math.random() * 15;
        } else {
          // Can go anywhere
          newX = Math.random() * 100;
        }

        const newY = Math.random() * 90; // 0% to 90% vertical

        setPosition({ x: newX, y: newY });

        // Reset running animation after movement
        setTimeout(() => setIsRunning(false), 600);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={imageRef}
      className={`fixed pointer-events-none z-0 transition-all duration-500 ease-out ${
        isRunning ? 'scale-110 rotate-12' : 'scale-100 rotate-0'
      }`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: `translate(-50%, -50%)`,
        width: 'min(400px, 90vw)',
        height: 'min(400px, 90vw)',
        opacity: 0.05,
        mixBlendMode: 'screen',
        cursor: 'none',
      }}
    >
      <img
        src="/easteregg-background.png"
        alt=""
        className="w-full h-full object-contain select-none"
        draggable={false}
      />
    </div>
  );
}
