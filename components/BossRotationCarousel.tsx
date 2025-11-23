/**
 * Boss Rotation Carousel Component
 *
 * Displays all 25 bosses in the raid rotation with swipeable/draggable carousel
 * Each boss card shows collection info and marketplace link
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { BOSS_ROTATION_ORDER, BOSS_RARITY_ORDER, getBossCard } from '@/lib/raid-boss';
import { COLLECTIONS } from '@/lib/collections';
import { CardMedia } from '@/components/CardMedia';
import type { BossCard } from '@/lib/raid-boss';

interface BossRotationCarouselProps {
  currentBossIndex: number;
  onSelectBoss?: (index: number) => void;
  t: (key: string, params?: Record<string, any>) => string;
}

export function BossRotationCarousel({
  currentBossIndex,
  onSelectBoss,
  t,
}: BossRotationCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Scroll to current boss on mount or when it changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = 280; // Card width + gap
      const scrollPosition = currentBossIndex * cardWidth - container.clientWidth / 2 + cardWidth / 2;
      container.scrollTo({
        left: scrollPosition,
        behavior: 'smooth',
      });
    }
  }, [currentBossIndex]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Touch drag handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    const x = e.touches[0].pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Get all bosses in rotation
  const allBosses: Array<{
    index: number;
    boss: BossCard;
    collectionId: string;
    collectionName: string;
    marketplaceUrl?: string;
    buttonText?: string;
  }> = [];

  for (let i = 0; i < 25; i++) {
    const collectionId = BOSS_ROTATION_ORDER[i];
    const rarity = BOSS_RARITY_ORDER[i];
    const boss = getBossCard(collectionId, rarity);
    const collection = COLLECTIONS[collectionId];

    if (boss && collection) {
      allBosses.push({
        index: i,
        boss,
        collectionId,
        collectionName: collection.displayName,
        marketplaceUrl: collection.marketplaceUrl,
        buttonText: collection.buttonText,
      });
    }
  }

  return (
    <div className="relative w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 px-2">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          {t('raid.rotation.title', { default: 'Boss Rotation Schedule' })}
        </h3>
        <div className="text-sm text-gray-400">
          {t('raid.rotation.count', { default: `${allBosses.length} Bosses` })}
        </div>
      </div>

      {/* Carousel */}
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`
          flex gap-4 overflow-x-auto pb-4 px-2
          scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-gray-800
          ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}
        `}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#9333ea #1f2937',
        }}
      >
        {allBosses.map(({ index, boss, collectionId, collectionName, marketplaceUrl, buttonText }) => (
          <div
            key={index}
            className={`
              flex-shrink-0 w-64 rounded-lg border-2 overflow-hidden transition-all
              ${index === currentBossIndex
                ? 'border-yellow-400 shadow-lg shadow-yellow-400/50 scale-105'
                : 'border-gray-700 hover:border-purple-500'
              }
              bg-gradient-to-b from-gray-800 to-gray-900
            `}
          >
            {/* Boss Image */}
            <div className="relative h-64 bg-gray-900">
              <CardMedia
                src={boss.imageUrl}
                alt={boss.name}
                className="w-full h-full object-cover"
              />

              {/* Current Boss Badge */}
              {index === currentBossIndex && (
                <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">
                  ⚡ CURRENT
                </div>
              )}

              {/* Boss Number */}
              <div className="absolute top-2 left-2 bg-black/70 text-white text-sm font-bold px-2 py-1 rounded">
                #{index + 1}
              </div>

              {/* Rarity Badge */}
              <div className={`
                absolute bottom-2 left-2 text-xs font-bold px-2 py-1 rounded
                ${boss.rarity === 'Mythic' ? 'bg-red-500 text-white' :
                  boss.rarity === 'Legendary' ? 'bg-orange-500 text-white' :
                  boss.rarity === 'Epic' ? 'bg-purple-500 text-white' :
                  boss.rarity === 'Rare' ? 'bg-blue-500 text-white' :
                  'bg-gray-500 text-white'
                }
              `}>
                {boss.rarity}
              </div>
            </div>

            {/* Boss Info */}
            <div className="p-3 space-y-2">
              {/* Boss Name */}
              <h4 className="text-lg font-bold text-white truncate">
                {boss.name}
              </h4>

              {/* Collection */}
              <p className="text-sm text-gray-400">
                {collectionName}
              </p>

              {/* Boss HP */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-red-400">❤️</span>
                <span className="text-white">
                  {(boss.hp / 1_000_000).toFixed(0)}M HP
                </span>
              </div>

              {/* Power */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-yellow-400">⚡</span>
                <span className="text-white">
                  {boss.power} Power
                </span>
              </div>

              {/* Description */}
              {boss.description && (
                <p className="text-xs text-gray-500 line-clamp-2">
                  {boss.description}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {/* View Details Button */}
                {onSelectBoss && (
                  <button
                    onClick={() => onSelectBoss(index)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-3 py-2 rounded transition-colors"
                  >
                    {index === currentBossIndex ? t('raid.viewCurrent', { default: 'View' }) : t('raid.preview', { default: 'Preview' })}
                  </button>
                )}

                {/* Marketplace Button */}
                {marketplaceUrl && (
                  <a
                    href={marketplaceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-3 py-2 rounded transition-colors text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {buttonText || t('raid.buyPacks', { default: 'Buy Packs' })}
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Hint */}
      <div className="text-center text-xs text-gray-500 mt-2">
        {t('raid.dragHint', { default: '← Drag or swipe to browse bosses →' })}
      </div>
    </div>
  );
}
