import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DefenseDeckModal } from '@/app/(game)/components/modals/DefenseDeckModal';
import type { Card } from '@/lib/types/card';

vi.mock('@/components/CardMedia', () => ({
  CardMedia: (props: any) => <img src={props.src} alt={props.alt || ''} />,
}));
vi.mock('@/components/NotEnoughCardsGuide', () => ({
  NotEnoughCardsGuide: () => <div data-testid="not-enough">Not enough cards</div>,
}));
vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}));
vi.mock('@/lib/audio-manager', () => ({
  AudioManager: { buttonClick: vi.fn(), buttonSuccess: vi.fn(), selectCardByRarity: vi.fn() },
}));
vi.mock('@/lib/power-utils', () => ({
  getCardDisplayPower: (c: any) => c.power || 0,
}));
vi.mock('@/lib/collections/index', () => ({
  getCardUniqueId: (c: any) => `${c.collection}-${c.tokenId}`,
  filterCardsByCollections: (cards: any[], cols: string[]) => cards.filter((c: any) => cols.includes(c.collection)),
}));
vi.mock('@/lib/nft', () => ({
  isSameCard: (a: any, b: any) => a.tokenId === b.tokenId && a.collection === b.collection,
}));

const mockNfts: Card[] = [
  { tokenId: '1', name: 'Card 1', imageUrl: '/c1.png', power: 100, collection: 'vibe', rarity: 'Common' },
  { tokenId: '2', name: 'Card 2', imageUrl: '/c2.png', power: 200, collection: 'vibe', rarity: 'Rare' },
  { tokenId: '3', name: 'Card 3', imageUrl: '/c3.png', power: 300, collection: 'vibe', rarity: 'Epic' },
  { tokenId: '4', name: 'Card 4', imageUrl: '/c4.png', power: 400, collection: 'vibe', rarity: 'Legendary' },
  { tokenId: '5', name: 'Card 5', imageUrl: '/c5.png', power: 500, collection: 'vibe', rarity: 'Mythic' },
];

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  nfts: mockNfts,
  status: 'loaded',
  selectedCards: [] as any[],
  setSelectedCards: vi.fn(),
  handSize: 5,
  defenseDeckCollection: 'all' as const,
  setDefenseDeckCollection: vi.fn(),
  defenseDeckSortByPower: false,
  setDefenseDeckSortByPower: vi.fn(),
  soundEnabled: false,
  selectStrongest: vi.fn(),
  clearSelection: vi.fn(),
  saveDefenseDeck: vi.fn(async () => {}),
  t: (k: string) => k,
};

describe('DefenseDeckModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<DefenseDeckModal {...baseProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders title when open', () => {
    render(<DefenseDeckModal {...baseProps} />);
    expect(screen.getByText(/Defense Deck/)).toBeInTheDocument();
  });

  it('shows Select Strongest button when no cards selected', () => {
    render(<DefenseDeckModal {...baseProps} />);
    expect(screen.getByText('Select Strongest')).toBeInTheDocument();
  });

  it('shows Clear button when cards are selected', () => {
    render(<DefenseDeckModal {...baseProps} selectedCards={[mockNfts[0]]} />);
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('disables save when not enough cards selected', () => {
    render(<DefenseDeckModal {...baseProps} selectedCards={[mockNfts[0]]} />);
    const saveBtn = screen.getByText('Select 4 more');
    expect(saveBtn).toBeDisabled();
  });

  it('enables save when hand is full', () => {
    render(<DefenseDeckModal {...baseProps} selectedCards={mockNfts} />);
    const saveBtn = screen.getByText('Save Defense Deck');
    expect(saveBtn).not.toBeDisabled();
  });

  it('shows not enough cards guide when nfts < handSize', () => {
    render(<DefenseDeckModal {...baseProps} nfts={[mockNfts[0]]} />);
    expect(screen.getByTestId('not-enough')).toBeInTheDocument();
  });
});
