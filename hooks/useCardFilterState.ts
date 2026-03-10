"use client";

import { useState } from "react";
import type { CollectionId } from "@/lib/collections/index";

/**
 * Card display, filtering and pagination state from page.tsx
 */
export function useCardFilterState() {
  const [sortByPower, setSortByPower] = useState<boolean>(false);
  const [sortAttackByPower, setSortAttackByPower] = useState<boolean>(false);
  const [cardTypeFilter, setCardTypeFilter] = useState<'all' | 'free' | 'nft'>('all');
  const [selectedCollections, setSelectedCollections] = useState<CollectionId[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filteredCount, setFilteredCount] = useState<number>(0);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedRoomMode, setSelectedRoomMode] = useState<'ranked' | 'casual'>('ranked');

  return {
    sortByPower, setSortByPower,
    sortAttackByPower, setSortAttackByPower,
    cardTypeFilter, setCardTypeFilter,
    selectedCollections, setSelectedCollections,
    currentPage, setCurrentPage,
    filteredCount, setFilteredCount,
    isSearching, setIsSearching,
    selectedRoomMode, setSelectedRoomMode,
  };
}
