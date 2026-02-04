import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCardSelection } from '@/app/(game)/hooks/game/useCardSelection';

const card1 = { tokenId: '1', power: 100, collection: 'vibe' };
const card2 = { tokenId: '2', power: 50, collection: 'vibefid' };
const card3 = { tokenId: '3', power: 20, collection: 'nothing' };

describe('useCardSelection', () => {
  it('starts with empty selection', () => {
    const { result } = renderHook(() => useCardSelection(5));
    expect(result.current.selectedCards).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.isFull).toBe(false);
    expect(result.current.totalPower).toBe(0);
  });

  it('toggleCard adds and removes', () => {
    const { result } = renderHook(() => useCardSelection(5));
    act(() => result.current.toggleCard(card1));
    expect(result.current.count).toBe(1);
    expect(result.current.isSelected(card1)).toBe(true);

    act(() => result.current.toggleCard(card1));
    expect(result.current.count).toBe(0);
    expect(result.current.isSelected(card1)).toBe(false);
  });

  it('respects maxSelection limit', () => {
    const { result } = renderHook(() => useCardSelection(2));
    act(() => result.current.toggleCard(card1));
    act(() => result.current.toggleCard(card2));
    expect(result.current.isFull).toBe(true);

    act(() => result.current.toggleCard(card3));
    expect(result.current.count).toBe(2); // card3 not added
    expect(result.current.isSelected(card3)).toBe(false);
  });

  it('calculates totalPower with collection multipliers', () => {
    const { result } = renderHook(() => useCardSelection(5));
    act(() => result.current.toggleCard(card1)); // 100 * 2x = 200
    act(() => result.current.toggleCard(card2)); // 50 * 5x = 250
    expect(result.current.totalPower).toBe(450);
  });

  it('clearSelection resets everything', () => {
    const { result } = renderHook(() => useCardSelection(5));
    act(() => result.current.toggleCard(card1));
    act(() => result.current.toggleCard(card2));
    expect(result.current.count).toBe(2);

    act(() => result.current.clearSelection());
    expect(result.current.count).toBe(0);
    expect(result.current.totalPower).toBe(0);
    expect(result.current.selectedCards).toEqual([]);
  });
});
